import type { Frames } from '../frames.js';

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const u24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const u32 = (n: number) => [...u24(n), (n >>> 24) & 255];

function chunk(tag: string, payload: Uint8Array | number[]): Uint8Array {
	const out = new Uint8Array(8 + payload.length + (payload.length & 1));
	out.set([...ascii(tag), ...u32(payload.length)]);
	out.set(payload, 8);
	return out;
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of parts) out.set(p, (at += p.length) - p.length);
	return out;
}

/** The image chunks (ALPH, VP8, VP8L) of a still WebP, without RIFF header or VP8X. */
function imageChunks(webp: Uint8Array): Uint8Array[] {
	const view = new DataView(webp.buffer, webp.byteOffset);
	const chunks: Uint8Array[] = [];
	for (let at = 12; at + 8 <= webp.length;) {
		const tag = String.fromCharCode(...webp.subarray(at, at + 4));
		const end = at + 8 + view.getUint32(at + 4, true);
		if (['ALPH', 'VP8 ', 'VP8L'].includes(tag)) chunks.push(webp.subarray(at, end + (end & 1)));
		at = end + (end & 1);
	}
	return chunks;
}

export async function encodeWebp(
	{ frames, fps, width, height }: Frames,
	quality = 0.8
): Promise<Blob> {
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d')!;
	const duration = Math.round(1000 / fps);
	const anmf: Uint8Array[] = [];
	for (const frame of frames) {
		ctx.putImageData(frame, 0, 0);
		const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
		// Safari and Firefox (sometimes) fall back to PNG instead of failing.
		if (blob.type !== 'image/webp') throw new Error('This browser cannot encode WebP');
		const header = [...u24(0), ...u24(0), ...u24(width - 1), ...u24(height - 1), ...u24(duration)];
		// 0b10: draw without blending, so transparent pixels clear the previous frame.
		const body = concat([
			new Uint8Array([...header, 0b10]),
			...imageChunks(new Uint8Array(await blob.arrayBuffer()))
		]);
		anmf.push(chunk('ANMF', body));
	}
	const vp8x = chunk('VP8X', [0x10 | 0x02, 0, 0, 0, ...u24(width - 1), ...u24(height - 1)]);
	const anim = chunk('ANIM', [0, 0, 0, 0, 0, 0]);
	const body = concat([new Uint8Array(ascii('WEBP')), vp8x, anim, ...anmf]);
	return new Blob([new Uint8Array([...ascii('RIFF'), ...u32(body.length)]), body], {
		type: 'image/webp'
	});
}

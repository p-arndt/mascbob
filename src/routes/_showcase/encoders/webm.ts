import type { Frames } from '../frames.js';

// Chromium's WebCodecs refuses `alpha: 'keep'`, so the alpha plane is encoded as a second VP9
// stream (alpha as luma) and muxed into BlockAdditions, the way WebM carries VP9 alpha.
export async function encodeWebm(f: Frames, opts: { bitrate?: number } = {}): Promise<Blob> {
	const { frames, fps, width, height } = f;
	const bitrate = opts.bitrate ?? 600_000;
	const [color, alpha] = await Promise.all([
		encode(bitrate, (i, us) => new VideoFrame(frames[i].data, rgba(us))),
		encode(bitrate / 4, (i, us) => new VideoFrame(alphaPlane(frames[i]), i420(us)))
	]);

	function rgba(timestamp: number): VideoFrameBufferInit {
		return { format: 'RGBA', codedWidth: width, codedHeight: height, timestamp };
	}
	function i420(timestamp: number): VideoFrameBufferInit {
		return { format: 'I420', codedWidth: width, codedHeight: height, timestamp };
	}

	async function encode(bitrate: number, frame: (i: number, us: number) => VideoFrame) {
		const chunks: Uint8Array[] = [];
		let failure: unknown;
		const encoder = new VideoEncoder({
			output: (chunk) => {
				const data = new Uint8Array(chunk.byteLength);
				chunk.copyTo(data);
				chunks.push(data);
			},
			error: (e) => (failure = e)
		});
		encoder.configure({ codec: 'vp09.00.10.08', width, height, bitrate, framerate: fps });
		for (let i = 0; i < frames.length; i++) {
			const vf = frame(i, Math.round((i * 1e6) / fps));
			// Both streams must key on the same frames or seeking desyncs color and alpha.
			encoder.encode(vf, { keyFrame: i % (fps * 2) === 0 });
			vf.close();
		}
		await encoder.flush();
		encoder.close();
		if (failure) throw failure;
		return chunks;
	}

	const ms = (i: number) => Math.round((i * 1000) / fps);
	const clusters: Uint8Array[] = [];
	let blocks: Uint8Array[] = [];
	let start = 0;
	const flush = () => {
		if (blocks.length) clusters.push(el(0x1f43b675, uint(0xe7, start), ...blocks));
	};
	color.forEach((data, i) => {
		const key = i % (fps * 2) === 0;
		if (key) {
			flush();
			blocks = [];
			start = ms(i);
		}
		const t = ms(i) - start;
		const block = new Uint8Array([0x81, (t >> 8) & 0xff, t & 0xff, 0, ...data]);
		blocks.push(
			el(
				0xa0,
				el(0xa1, block),
				el(0x75a1, el(0xa6, uint(0xee, 1), el(0xa5, alpha[i]))),
				...(key ? [] : [el(0xfb, int16(ms(i - 1) - ms(i)))])
			)
		);
	});
	flush();

	const header = el(
		0x1a45dfa3,
		uint(0x4286, 1),
		uint(0x42f7, 1),
		uint(0x42f2, 4),
		uint(0x42f3, 8),
		el(0x4282, text('webm')),
		uint(0x4287, 4),
		uint(0x4285, 2)
	);
	const info = el(
		0x1549a966,
		uint(0x2ad7b1, 1_000_000),
		el(0x4d80, text('mascbob')),
		el(0x5741, text('mascbob')),
		el(0x4489, float(ms(frames.length)))
	);
	const track = el(
		0xae,
		uint(0xd7, 1),
		uint(0x73c5, 1),
		uint(0x83, 1),
		el(0x86, text('V_VP9')),
		uint(0x23e383, Math.round(1e9 / fps)),
		uint(0x55ee, 1),
		el(0xe0, uint(0xb0, width), uint(0xba, height), uint(0x53c0, 1))
	);
	const segment = el(0x18538067, info, el(0x1654ae6b, track), ...clusters);
	return new Blob([header, segment] as BlobPart[], { type: 'video/webm' });
}

function alphaPlane({ data, width, height }: ImageData): Uint8Array {
	const luma = width * height;
	const chroma = Math.ceil(width / 2) * Math.ceil(height / 2);
	const out = new Uint8Array(luma + chroma * 2).fill(128);
	for (let p = 0; p < luma; p++) out[p] = data[p * 4 + 3];
	return out;
}

function el(id: number, ...children: Uint8Array[]): Uint8Array {
	const body = concat(children);
	return concat([bytes(id), size(body.length), body]);
}

function size(n: number): Uint8Array {
	let len = 1;
	while (n >= 2 ** (7 * len) - 1) len++;
	const out = bytes(n, len);
	out[0] |= 0x80 >> (len - 1);
	return out;
}

function bytes(n: number, len = Math.max(1, Math.ceil(Math.log2(n + 1) / 8))): Uint8Array {
	const out = new Uint8Array(len);
	for (let i = len - 1; i >= 0; i--, n = Math.floor(n / 256)) out[i] = n & 0xff;
	return out;
}

const uint = (id: number, n: number) => el(id, bytes(n));
const int16 = (n: number) => new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
const text = (s: string) => new TextEncoder().encode(s);

function float(n: number): Uint8Array {
	const out = new Uint8Array(8);
	new DataView(out.buffer).setFloat64(0, n);
	return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

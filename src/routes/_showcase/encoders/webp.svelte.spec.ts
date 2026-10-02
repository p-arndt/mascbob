import { expect, it } from 'vitest';
import { encodeWebp } from './webp.js';
import { alphaAt, decode, slidingSquare } from './fixture.js';

it('encodes a looping animated WebP with alpha', async () => {
	const blob = await encodeWebp(slidingSquare());
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const text = new TextDecoder('latin1').decode(bytes);
	expect(text.slice(0, 4)).toBe('RIFF');
	expect(new DataView(bytes.buffer).getUint32(4, true)).toBe(bytes.length - 8);
	expect(text.slice(8, 16)).toBe('WEBPVP8X');
	expect(bytes[20] & 0x12).toBe(0x12);
	expect(text.slice(30, 34)).toBe('ANIM');
	expect(text.match(/ANMF/g)).toHaveLength(4);

	const { frameCount, loops, pixels } = await decode(blob);
	expect(frameCount).toBe(4);
	expect(loops).toBe(Infinity);
	expect([pixels.width, pixels.height]).toEqual([64, 48]);
	expect(alphaAt(pixels, 5, 15)).toBe(255);
	expect(alphaAt(pixels, 50, 5)).toBe(0);
});

it('shows the browser can load it as an image', async () => {
	const img = new Image();
	img.src = URL.createObjectURL(await encodeWebp(slidingSquare()));
	await img.decode();
	expect([img.naturalWidth, img.naturalHeight]).toEqual([64, 48]);
});

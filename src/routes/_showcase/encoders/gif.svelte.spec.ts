import { expect, it } from 'vitest';
import { encodeGif } from './gif.js';
import { alphaAt, decode, slidingSquare } from './fixture.js';

it('encodes a looping, transparent GIF with every frame', async () => {
	const blob = encodeGif(slidingSquare());
	const text = new TextDecoder('latin1').decode(await blob.arrayBuffer());
	expect(text.startsWith('GIF89a')).toBe(true);
	expect(text).toContain('NETSCAPE2.0');

	const { frameCount, loops, pixels } = await decode(blob);
	expect(frameCount).toBe(4);
	expect(loops).toBe(Infinity);
	expect([pixels.width, pixels.height]).toEqual([64, 48]);
	expect(alphaAt(pixels, 5, 15)).toBe(255);
	expect(alphaAt(pixels, 50, 5)).toBe(0);
});

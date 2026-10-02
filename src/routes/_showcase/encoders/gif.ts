import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Frames } from '../frames.js';

export function encodeGif({ frames, fps, width, height }: Frames): Blob {
	const gif = GIFEncoder();
	for (const frame of frames) {
		// GIF has no partial alpha, so only nearly solid pixels survive and the rest collapse
		// into one (0,0,0,0) palette entry: soft glows and shadows would otherwise turn into hard
		// rings in their full, unblended color.
		const data = frame.data.slice();
		for (let i = 3; i < data.length; i += 4) {
			if (data[i] < 200) data[i - 3] = data[i - 2] = data[i - 1] = data[i] = 0;
			else data[i] = 255;
		}
		const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
		const index = applyPalette(data, palette, 'rgba4444');
		const transparentIndex = palette.findIndex((c) => c[3] === 0);
		gif.writeFrame(index, width, height, {
			palette,
			delay: 1000 / fps,
			repeat: 0,
			transparent: transparentIndex >= 0,
			transparentIndex
		});
	}
	gif.finish();
	return new Blob([gif.bytes()], { type: 'image/gif' });
}

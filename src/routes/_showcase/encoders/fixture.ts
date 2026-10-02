import type { Frames } from '../frames.js';

/** A red square sliding right across a transparent canvas. */
export function slidingSquare(count = 4, width = 64, height = 48): Frames {
	const frames = Array.from({ length: count }, (_, i) => {
		const image = new ImageData(width, height);
		for (let y = 10; y < 30; y++)
			for (let x = 0; x < 20; x++) image.data.set([255, 0, 0, 255], (y * width + x + i * 8) * 4);
		return image;
	});
	return { frames, fps: 10, width, height };
}

/** Decodes with the browser and returns the frame count, loop count and first frame's pixels. */
export async function decode(blob: Blob) {
	const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type: blob.type });
	await decoder.tracks.ready;
	const track = decoder.tracks.selectedTrack!;
	const { image } = await decoder.decode({ frameIndex: 0 });
	const canvas = new OffscreenCanvas(image.displayWidth, image.displayHeight);
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(image, 0, 0);
	const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
	image.close();
	return { frameCount: track.frameCount, loops: track.repetitionCount, pixels };
}

export const alphaAt = (p: ImageData, x: number, y: number) => p.data[(y * p.width + x) * 4 + 3];

import { describe, expect, it } from 'vitest';
import { encodeWebm } from './webm.js';

function squares(count: number, size: number) {
	const canvas = new OffscreenCanvas(size, size);
	const g = canvas.getContext('2d')!;
	const frames: ImageData[] = [];
	for (let i = 0; i < count; i++) {
		g.clearRect(0, 0, size, size);
		g.fillStyle = '#e03020';
		g.fillRect(size / 4 + i, size / 4, size / 2, size / 2);
		frames.push(g.getImageData(0, 0, size, size));
	}
	return { frames, fps: 30, width: size, height: size };
}

async function play(blob: Blob) {
	const video = document.createElement('video');
	video.muted = true;
	video.src = URL.createObjectURL(blob);
	await new Promise((resolve, reject) => {
		video.onloadeddata = resolve;
		video.onerror = () => reject(video.error);
	});
	return video;
}

async function pixels(video: HTMLVideoElement, time: number, points: [number, number][]) {
	video.currentTime = time;
	await new Promise((resolve) => (video.onseeked = resolve));
	const g = new OffscreenCanvas(video.videoWidth, video.videoHeight).getContext('2d')!;
	g.drawImage(video, 0, 0);
	return points.map(([x, y]) => [...g.getImageData(x, y, 1, 1).data]);
}

describe('encodeWebm', () => {
	it('writes a webm the browser plays at the right size and length', async () => {
		const blob = await encodeWebm(squares(30, 64));
		const head = new Uint8Array(await blob.arrayBuffer());
		expect([...head.slice(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
		expect(new TextDecoder().decode(head.slice(0, 64))).toContain('webm');

		const video = await play(blob);
		expect([video.videoWidth, video.videoHeight]).toEqual([64, 64]);
		expect(video.duration).toBeCloseTo(1, 1);
	});

	it('keeps the background transparent', async () => {
		const video = await play(await encodeWebm(squares(30, 64)));
		const [corner, center] = await pixels(video, 0.5, [
			[2, 2],
			[32, 32]
		]);
		expect(corner[3]).toBeLessThan(8);
		expect(center[3]).toBeGreaterThan(247);
		expect(center[0]).toBeGreaterThan(200);
	});
});

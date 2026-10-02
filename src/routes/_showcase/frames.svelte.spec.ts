import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Mascot } from '$lib/index.js';
import { snapshotSvg } from './exporter.js';
import { fitLoops, loopDuration, renderFrames } from './frames.js';

function animatedSvg() {
	const { container } = render(Mascot, { motion: 'full' });
	return snapshotSvg(
		container.querySelector('svg')!,
		{ width: 160, height: 240 },
		{ animated: true }
	);
}

const same = (a: ImageData, b: ImageData) => a.data.every((v, i) => v === b.data[i]);

describe('loopDuration', () => {
	it('takes the longest loop, counting alternating loops twice', () => {
		const svg =
			'<g style="animation:loop0 1000ms ease-in-out 0ms infinite alternate"/>' +
			'<g style="animation:loop1 1500ms cubic-bezier(0.4, 0, 0.2, 1) -80ms infinite normal"/>';
		expect(loopDuration(svg)).toBe(2000);
		expect(loopDuration(svg, 1200)).toBe(1200);
		expect(loopDuration('<svg/>')).toBe(0);
	});
});

describe('renderFrames', () => {
	it('renders duration × fps transparent frames that move', async () => {
		const svg = animatedSvg();
		const { frames, fps, width, height } = await renderFrames(svg, {
			width: 80,
			height: 120,
			fps: 10,
			duration: 2000
		});
		expect(fps).toBe(10);
		expect([width, height]).toEqual([80, 120]);
		expect(frames).toHaveLength(20);
		expect(frames[0].width).toBe(80);
		// The corner is background: nothing is painted there.
		expect(frames[0].data[3]).toBe(0);
		expect(frames[0].data.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
		expect(same(frames[0], frames[5])).toBe(false);
	});

	it('paints the same moment every time', async () => {
		const svg = animatedSvg();
		const opts = { width: 80, height: 120, fps: 10, duration: 300 };
		const [a, b] = [await renderFrames(svg, opts), await renderFrames(svg, opts)];
		a.frames.forEach((frame, i) => expect(same(frame, b.frames[i])).toBe(true));
	});

	it('comes back to the first frame after a common period', async () => {
		// 500ms loops: alternating ones take 1s there and back, the rest go round twice.
		const svg = animatedSvg().replace(/(loop\d+) \d+ms/g, '$1 500ms');
		const { frames } = await renderFrames(svg, { width: 80, height: 120, fps: 10, duration: 1100 });
		expect(same(frames[0], frames[3])).toBe(false);
		expect(same(frames[0], frames[10])).toBe(true);
	});

	it('renders 90 frames at 512 × 512', async () => {
		const svg = animatedSvg();
		const { frames } = await renderFrames(svg, {
			width: 512,
			height: 512,
			fps: 30,
			duration: 3000
		});
		expect(frames).toHaveLength(90);
	});
});

describe('fitLoops', () => {
	it('retimes each loop to a whole number of cycles in the clip', () => {
		const svg =
			'<g style="animation:loop0 1150ms ease-in-out -80ms infinite normal"/>' +
			'<g style="animation:loop1 3200ms ease-in-out 0ms infinite alternate"/>';
		const fitted = fitLoops(svg, 3000);
		expect(fitted).toContain('loop0 1000ms ease-in-out -80ms infinite normal');
		expect(fitted).toContain('loop1 1500ms ease-in-out 0ms infinite alternate');
	});

	it('makes the real mascot wrap without a jump', async () => {
		const svg = fitLoops(animatedSvg(), 1000);
		// One frame past the clip: the last one must be the first one again.
		const { frames } = await renderFrames(svg, { width: 80, height: 120, fps: 10, duration: 1100 });
		expect(same(frames[0], frames[10])).toBe(true);
		expect(same(frames[0], frames[5])).toBe(false);
	});
});

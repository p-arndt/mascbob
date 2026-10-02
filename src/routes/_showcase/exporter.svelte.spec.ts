import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Mascot } from '$lib/index.js';
import { snapshotSvg, svgToPng } from './exporter.js';

describe('snapshotSvg', () => {
	it('bakes the theme into a standalone file', async () => {
		const { container } = render(Mascot, { theme: { base: 'og', accent: '#12ab34' } });
		const svg = container.querySelector('svg')!;
		const text = snapshotSvg(svg, { width: 160, height: 240 });
		const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
		expect(doc.querySelector('parsererror')).toBeNull();
		expect(doc.documentElement.getAttribute('width')).toBe('160');
		// Custom properties and classes only exist on the page, not in the file.
		expect(text).not.toContain('var(');
		expect(text).not.toContain('class=');
		expect(text).toContain('rgb(18, 171, 52)');
	});

	it('keeps a still export free of animation', () => {
		const { container } = render(Mascot, { motion: 'full' });
		const text = snapshotSvg(container.querySelector('svg')!, { width: 160, height: 240 });
		expect(text).not.toContain('@keyframes');
		expect(text).not.toContain('animation:');
	});

	it('carries the idle loops into an animated export', () => {
		const { container } = render(Mascot, { motion: 'full' });
		const text = snapshotSvg(
			container.querySelector('svg')!,
			{ width: 160, height: 240 },
			{ animated: true }
		);
		const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
		expect(doc.querySelector('parsererror')).toBeNull();
		const css = doc.querySelector('style')!.textContent!;
		expect(css).toMatch(/@keyframes loop0\{/);
		expect(css).toContain('prefers-reduced-motion');
		// Every keyframe set the file references is defined in it, with resolved values only.
		const used = [...doc.querySelectorAll('[style*="animation:"]')].flatMap((el) =>
			el
				.getAttribute('style')!
				.match(/animation:([^;]+)/)![1]
				.split(/,(?![^(]*\))/)
				.map((loop) => loop.trim().split(' ')[0])
		);
		expect(used.length).toBeGreaterThan(1);
		for (const name of used) expect(css).toContain(`@keyframes ${name}{`);
		expect(text).not.toContain('var(');
		// The entrance pop plays once on the page; a file has nothing to enter.
		expect(css).not.toContain('scale(0.6)');
		expect(text).toMatch(/animation:loop\d+ \d+ms [^;]+ -?\d+ms infinite/);
	});

	it('exports a still file under reduced motion', () => {
		const { container } = render(Mascot, { motion: 'reduced' });
		const text = snapshotSvg(
			container.querySelector('svg')!,
			{ width: 160, height: 240 },
			{ animated: true }
		);
		expect(text).not.toContain('@keyframes');
	});

	it('rasterizes to a png', async () => {
		const { container } = render(Mascot, {});
		const text = snapshotSvg(container.querySelector('svg')!, { width: 160, height: 240 });
		const png = await svgToPng(text, 160, 240, 1);
		expect(png.type).toBe('image/png');
		expect(png.size).toBeGreaterThan(1000);
	});
});

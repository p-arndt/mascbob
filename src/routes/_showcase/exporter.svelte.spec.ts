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

	it('rasterizes to a png', async () => {
		const { container } = render(Mascot, {});
		const text = snapshotSvg(container.querySelector('svg')!, { width: 160, height: 240 });
		const png = await svgToPng(text, 160, 240, 1);
		expect(png.type).toBe('image/png');
		expect(png.size).toBeGreaterThan(1000);
	});
});

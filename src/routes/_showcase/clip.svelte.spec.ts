import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Mascot } from '$lib/index.js';
import { renderClip } from './clip.js';
import { snapshotSvg } from './exporter.js';

const MAGIC = { gif: 'GIF8', webp: 'RIFF', webm: '\x1aE\xdf\xa3' } as const;

describe('renderClip', () => {
	for (const format of ['gif', 'webp', 'webm'] as const) {
		it(`exports the mascot as a looping ${format}`, async () => {
			const { container } = render(Mascot, { motion: 'full', mood: 'love' });
			const size = { width: 160, height: 240 };
			const svg = snapshotSvg(container.querySelector('svg')!, size, { animated: true });
			const blob = await renderClip(svg, size, format, 128);
			const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
			expect(String.fromCharCode(...head)).toBe(MAGIC[format]);
			expect(blob.size).toBeGreaterThan(1000);
		});
	}
});

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';

describe('Shell', () => {
	it.each(['og', 'noir'] as const)(
		'outlines the head and lights its far edge in %s',
		async (theme) => {
			const { container } = render(Mascot, { theme });
			const keyLine = container.querySelector<SVGPathElement>('.key-line');
			expect(keyLine).not.toBeNull();
			const line = getComputedStyle(keyLine!);
			expect(parseFloat(line.strokeWidth)).toBeGreaterThan(1);
			expect(parseFloat(line.opacity)).toBeGreaterThan(0.3);

			const rim = container.querySelector<SVGPathElement>('.rim');
			expect(rim).not.toBeNull();
			expect(getComputedStyle(rim!).fill).not.toBe('none');
			const clip = rim!.closest('g[clip-path]')?.getAttribute('clip-path') ?? '';
			expect(clip).toMatch(/-shell-clip\)$/);
			const mask = rim!.getAttribute('mask')?.match(/#([^)]+)/)?.[1];
			expect(mask && container.querySelector(`mask[id="${mask}"]`)).toBeTruthy();
		}
	);

	it('tints the sheen with the body instead of pure white', async () => {
		const { container } = render(Mascot, { theme: 'noir' });
		const stop = container.querySelector<SVGStopElement>('.stop-sheen');
		expect(stop).not.toBeNull();
		expect(getComputedStyle(stop!).stopColor).not.toMatch(/^rgb\(255, 255, 255\)$/);
	});
});

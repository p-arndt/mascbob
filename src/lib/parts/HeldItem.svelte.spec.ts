import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';

describe('held items', () => {
	it.each(['sword', 'microphone', 'phone'] as const)(
		'holds %s through mood changes and stops loops under reduced motion',
		async (heldItem) => {
			const { container, rerender } = render(Mascot, { heldItem, mood: 'talking', motion: 'full' });
			const item = container.querySelector(`[data-held-item="${heldItem}"]`)!;
			expect(item.closest('[data-grab]')?.getAttribute('data-grab')).toBe('arm-right');
			const fore = item.closest('.fore')!;
			expect(getComputedStyle(fore).animationName).not.toBe('none');
			await rerender({ mood: 'sleepy', motion: 'reduced' });
			expect(container.querySelectorAll('[data-held-item]')).toHaveLength(1);
			for (const el of [fore, ...item.querySelectorAll('*')]) {
				expect(getComputedStyle(el).animationName).toBe('none');
			}
			await rerender({ heldItem: 'none' });
			expect(container.querySelector('[data-held-item]')).toBeNull();
		}
	);

	it('gestures with the microphone only while talking', async () => {
		const { container, rerender } = render(Mascot, { heldItem: 'microphone', motion: 'full' });
		const fore = container.querySelector('.arm-r .fore')!;
		expect(getComputedStyle(fore).animationName).toBe('none');
		await rerender({ mood: 'talking' });
		expect(getComputedStyle(fore).animationName).toMatch(/gesture$/);
	});

	it('supports critter and omits items for head-only avatars and other anatomy', () => {
		expect(
			render(Mascot, { heldItem: 'sword', species: 'critter' }).container.querySelector(
				'[data-held-item]'
			)
		).not.toBeNull();
		expect(
			render(Mascot, { heldItem: 'sword', body: false }).container.querySelector('[data-held-item]')
		).toBeNull();
		expect(
			render(Mascot, { heldItem: 'sword', species: 'octo' }).container.querySelector(
				'[data-held-item]'
			)
		).toBeNull();
	});
});

import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';
import { ACCESSORIES } from './accessories.js';

describe('accessories and effects', () => {
	it('renders every accessory without errors', async () => {
		const { container } = render(Mascot, { accessories: [...ACCESSORIES] });
		for (const cls of ['.crown', '.bow-knot', '.rim', '.star', '.cuff', '.antenna-tip', '.ring']) {
			expect(container.querySelector(cls), cls).not.toBeNull();
		}
	});

	it('blooms the sprout flower only when happy', async () => {
		const { container, rerender } = render(Mascot, { accessories: ['sprout'], mood: 'idle' });
		expect(container.querySelector('.flower.shown')).toBeNull();
		await rerender({ mood: 'happy' });
		expect(container.querySelector('.flower.shown')).not.toBeNull();
	});

	it('draws the thought bubble for thinking', async () => {
		const { container } = render(Mascot, { mood: 'thinking' });
		expect(container.querySelectorAll('.dot')).toHaveLength(3);
	});

	it('bursts particles on every boop and cleans them up', async () => {
		const { container } = render(Mascot, { label: 'Buddy', motion: 'full' });
		const button = page.getByRole('button', { name: 'Buddy' });
		await button.click();
		await button.click();
		await expect.poll(() => container.querySelectorAll('.shot').length).toBe(2);
		expect(container.querySelectorAll('.shot .pp').length).toBeGreaterThan(10);
		await expect.poll(() => container.querySelectorAll('.shot').length, { timeout: 3000 }).toBe(0);
	});

	it('skips bursts under reduced motion', async () => {
		const { container } = render(Mascot, { label: 'Buddy', motion: 'reduced' });
		await page.getByRole('button', { name: 'Buddy' }).click();
		expect(container.querySelector('.shot')).toBeNull();
	});

	it('pops confetti when the mood turns happy', async () => {
		const { container, rerender } = render(Mascot, { mood: 'idle', motion: 'full' });
		expect(container.querySelector('.shot')).toBeNull();
		await rerender({ mood: 'love' });
		await expect.poll(() => container.querySelectorAll('.shot').length).toBe(1);
	});
});

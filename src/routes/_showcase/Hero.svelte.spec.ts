import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Hero from './Hero.svelte';

describe('Hero', () => {
	it('headlines with the current mood', async () => {
		const { container } = render(Hero);
		expect(container.querySelector('.word')?.textContent).toContain('happy.');
	});

	it('cycles a prop when its value is clicked and keeps the code in sync', async () => {
		const { container } = render(Hero);
		await page.getByRole('button', { name: 'mood: happy, next' }).click();
		await expect.element(page.getByRole('button', { name: 'mood: listening, next' })).toBeVisible();
		expect(container.querySelector('.word')?.textContent).toContain('curious.');
		await page.getByRole('button', { name: 'theme: og, next' }).click();
		await expect.element(page.getByRole('button', { name: 'theme: volt, next' })).toBeVisible();
	});

	it('puts the mascot above its mood word on a phone', async () => {
		await page.viewport(390, 844);
		const { container } = render(Hero);
		const figure = container.querySelector('.figure')!.getBoundingClientRect();
		const word = container.querySelector('.word')!.getBoundingClientRect();
		expect(figure.bottom).toBeLessThanOrEqual(word.top);
		expect(word.top).toBeLessThan(844);
	});
});

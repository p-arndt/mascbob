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
});

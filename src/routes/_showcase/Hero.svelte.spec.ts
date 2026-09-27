import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Hero from './Hero.svelte';

describe('Hero', () => {
	it('makes the whole cast react from a button', async () => {
		render(Hero);
		const love = page.getByRole('button', { name: 'Love' });
		await love.click();
		await expect.element(love).toHaveClass(/active/);
	});

	it('maps number keys to the reactions in button order', async () => {
		render(Hero);
		await userEvent.keyboard('3');
		await expect.element(page.getByRole('button', { name: 'Surprise' })).toHaveClass(/active/);
	});

	it('leaves number keys alone while typing', async () => {
		const { container } = render(Hero);
		const input = document.createElement('input');
		container.append(input);
		input.focus();
		await userEvent.keyboard('2');
		await expect.element(page.getByRole('button', { name: 'Love' })).not.toHaveClass(/active/);
	});
});

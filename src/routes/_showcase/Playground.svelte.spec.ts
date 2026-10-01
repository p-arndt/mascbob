import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('https://example.com/') } }));

describe('Studio controls', () => {
	it('keeps percentage inputs and sliders in sync, with individual resets', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Mossbob preset' }).click();
		await expect
			.element(page.getByRole('button', { name: 'Head', exact: true }))
			.not.toBeInTheDocument();
		const percent = page.getByRole('spinbutton', { name: 'Body width percent' });
		await percent.fill('156');
		await page.getByRole('tab', { name: 'Companion', exact: true }).click();
		await expect
			.element(page.getByRole('slider', { name: 'Body width', exact: true }))
			.toHaveValue('1.56');
		await percent.fill('999');
		await page.getByRole('tab', { name: 'Companion', exact: true }).click();
		await expect.element(percent).toHaveValue(180);
		await percent.fill('');
		await page.getByRole('tab', { name: 'Companion', exact: true }).click();
		await expect.element(percent).toHaveValue(180);
		await page.getByRole('button', { name: 'Reset Body width', exact: true }).click();
		await expect.element(percent).toHaveValue(100);
		await page.getByRole('button', { name: 'Restore Mossbob starting look' }).click();
		await expect.element(percent).toHaveValue(110);
	});

	it('restores Bob’s head shape and hides unused avatar proportions', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Bob preset' }).click();
		await page.getByRole('button', { name: 'orb', exact: true }).click();
		await page.getByRole('button', { name: 'Restore Bob starting look' }).click();
		await expect
			.element(page.getByRole('button', { name: 'capsule', exact: true }))
			.toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Head', exact: true }).click();
		await expect
			.element(page.getByRole('spinbutton', { name: 'Body width percent' }))
			.not.toBeInTheDocument();
	});

	it('separates colors from anatomy and offers a quick accessory clear', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Critterbob preset' }).click();
		await page.getByRole('tab', { name: 'Colors', exact: true }).click();
		await expect
			.element(page.getByRole('slider', { name: 'Body width', exact: true }))
			.not.toBeInTheDocument();
		await page.getByRole('tab', { name: 'Gear', exact: true }).click();
		await page.getByRole('button', { name: 'Remove all accessories' }).click();
		await expect
			.element(page.getByRole('button', { name: 'Remove all accessories' }))
			.not.toBeInTheDocument();
	});
});

describe('Studio on a phone', () => {
	it('fits one screen and scrolls only its controls, without pinning to the page', async () => {
		await page.viewport(390, 844);
		const { container } = render(Playground);
		const card = container.querySelector<HTMLElement>('.playground')!;
		const stage = container.querySelector<HTMLElement>('.stage')!;
		const body = container.querySelector<HTMLElement>('.panel-body')!;
		expect(getComputedStyle(stage).position).not.toBe('sticky');
		expect(card.offsetHeight).toBeLessThanOrEqual(844);
		expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
		expect(getComputedStyle(body).overflowY).toBe('auto');
	});
});

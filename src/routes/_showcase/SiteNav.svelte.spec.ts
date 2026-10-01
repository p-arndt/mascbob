import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SiteNav from './SiteNav.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('https://example.com/docs') } }));

describe('SiteNav on a phone', () => {
	it('opens a menu that leads back home and closes after a pick', async () => {
		await page.viewport(390, 844);
		const { container } = render(SiteNav);
		const menu = container.querySelector<HTMLElement>('#site-menu')!;

		await page.getByRole('button', { name: 'Menu' }).click();
		expect(menu.matches(':popover-open')).toBe(true);

		const home = page.getByRole('link', { name: 'Home', exact: true });
		await expect.element(home).toHaveAttribute('href', '/');
		await expect
			.element(page.getByRole('link', { name: 'Docs' }).last())
			.toHaveAttribute('aria-current', 'page');

		// A hash link keeps the page, so clicking it must close the menu itself.
		menu
			.querySelector<HTMLAnchorElement>('a[href="/#moods"]')!
			.addEventListener('click', (e) => e.preventDefault());
		await page.getByRole('link', { name: 'Moods' }).last().click();
		expect(menu.matches(':popover-open')).toBe(false);
	});
});

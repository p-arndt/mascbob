import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('https://example.com/') } }));

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

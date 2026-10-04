import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import TabIcon from './TabIcon.svelte';
import { favicon, showInTab } from './favicon.svelte.js';
import { DESIGN_KEY } from './design.js';

const STATIC = '/favicon.svg';

describe('TabIcon', () => {
	let link: HTMLLinkElement;
	beforeEach(() => {
		// Other specs share this origin; a design they saved would hand the tab to the studio.
		localStorage.removeItem(DESIGN_KEY);
		link = document.createElement('link');
		link.rel = 'icon';
		link.href = STATIC;
		// Ahead of the test runner's own icon link, which querySelector would otherwise find.
		document.head.prepend(link);
	});
	afterEach(() => {
		link.remove();
		favicon.look = null;
		favicon.studio = false;
	});

	const icon = () => decodeURIComponent(link.href.replace('data:image/svg+xml,', ''));

	it('draws the current look into the favicon and restores the static one on unmount', async () => {
		const { unmount } = render(TabIcon);
		showInTab({ mood: 'love', theme: 'lilac' }, 'hero');
		await expect.poll(() => link.href).toMatch(/^data:image\/svg\+xml,/);
		expect(icon()).toContain('viewBox="26 30 148 148"');
		const love = icon();

		showInTab({ mood: 'grumpy', theme: 'bred' }, 'hero');
		await expect.poll(icon).not.toBe(love);

		unmount();
		expect(link.href).toContain(STATIC);
	});

	it('lets the studio take over and keeps the hero autoplay from reclaiming it', () => {
		showInTab({ mood: 'happy' }, 'hero');
		showInTab({ mood: 'sad' }, 'studio');
		showInTab({ mood: 'wink' }, 'hero');
		flushSync();
		expect(favicon.look?.mood).toBe('sad');
	});
});

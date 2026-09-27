import { afterEach, describe, expect, it } from 'vitest';
import { SCHEME_KEY, pinScheme, pinnedScheme } from './scheme.js';

describe('color scheme', () => {
	afterEach(() => {
		delete document.documentElement.dataset.theme;
		localStorage.removeItem(SCHEME_KEY);
	});

	it('follows the system until something is pinned', () => {
		expect(pinnedScheme()).toBeNull();
	});

	it('pins on <html> and remembers the choice', () => {
		pinScheme('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(localStorage.getItem(SCHEME_KEY)).toBe('dark');
		expect(pinnedScheme()).toBe('dark');
		pinScheme('light');
		expect(pinnedScheme()).toBe('light');
	});

	it('ignores values it did not write', () => {
		document.documentElement.dataset.theme = 'sepia';
		expect(pinnedScheme()).toBeNull();
	});
});

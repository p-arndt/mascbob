export type Scheme = 'light' | 'dark';

/** Must match the key the boot script in app.html reads before first paint. */
export const SCHEME_KEY = 'mascott-theme';

/** The scheme pinned on <html>, or null while the page follows the system. */
export function pinnedScheme(): Scheme | null {
	const theme = document.documentElement.dataset.theme;
	return theme === 'light' || theme === 'dark' ? theme : null;
}

/** Pins a scheme for this page and remembers it for the next visit. */
export function pinScheme(scheme: Scheme) {
	document.documentElement.dataset.theme = scheme;
	try {
		localStorage.setItem(SCHEME_KEY, scheme);
	} catch {
		// Private mode without storage: the choice still holds for this visit.
	}
}

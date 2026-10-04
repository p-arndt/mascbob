import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('app shell', () => {
	it('lets the page reach under the phone chrome, so safe-area insets are not always zero', () => {
		const html = readFileSync(new URL('./app.html', import.meta.url), 'utf8');
		const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)![1];
		expect(viewport.split(/,\s*/)).toContain('viewport-fit=cover');
	});
});

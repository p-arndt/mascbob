import { describe, expect, it } from 'vitest';
import { THEMES, resolveTheme, themeStyle, type ThemeName } from './themes.js';

describe('resolveTheme', () => {
	it('returns presets by name', () => {
		expect(resolveTheme('ice')).toEqual(THEMES.ice);
	});

	it('defaults to og', () => {
		expect(resolveTheme()).toEqual(THEMES.og);
		expect(resolveTheme('unknown' as ThemeName)).toEqual(THEMES.og);
	});

	it('overrides single colors on top of a base', () => {
		const theme = resolveTheme({ base: 'mocha', eye: '#00ff00', cheek: undefined });
		expect(theme).toEqual({ ...THEMES.mocha, eye: '#00ff00' });
	});
});

describe('themeStyle', () => {
	it('emits private custom properties for every color', () => {
		const style = themeStyle(THEMES.og);
		expect(style).toContain('--_mascott-eye: #1d1d1f');
		expect(style.split('; ')).toHaveLength(Object.keys(THEMES.og).length);
	});
});

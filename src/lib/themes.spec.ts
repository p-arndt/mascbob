import { describe, expect, it } from 'vitest';
import { THEMES, resolveTheme, themeStyle, type ThemeName } from './themes.js';

describe('resolveTheme', () => {
	it('returns presets by name', () => {
		expect(resolveTheme('mint')).toEqual(THEMES.mint);
	});

	it('defaults to aurora', () => {
		expect(resolveTheme()).toEqual(THEMES.aurora);
		expect(resolveTheme('unknown' as ThemeName)).toEqual(THEMES.aurora);
	});

	it('overrides single colors on top of a base', () => {
		const theme = resolveTheme({ base: 'peach', eye: '#00ff00', cheek: undefined });
		expect(theme).toEqual({ ...THEMES.peach, eye: '#00ff00' });
	});
});

describe('themeStyle', () => {
	it('emits private custom properties for every color', () => {
		const style = themeStyle(THEMES.aurora);
		expect(style).toContain('--_mascott-eye: #6d5dfc');
		expect(style.split('; ')).toHaveLength(Object.keys(THEMES.aurora).length);
	});
});

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

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

describe('THEMES', () => {
	const keys = Object.keys(THEMES.og).sort();

	it.each(Object.entries(THEMES))('%s defines every color as hex', (_, theme) => {
		expect(Object.keys(theme).sort()).toEqual(keys);
		for (const value of Object.values(theme)) expect(value).toMatch(/^#[0-9a-f]{6}$/);
	});

	// The face ink plate is painted in `eye` straight onto the body, so it must read on both
	// light and dark bodies.
	it.each(Object.entries(THEMES))('%s keeps the face readable on the body', (_, theme) => {
		expect(contrast(theme.eye, theme.bodyMid)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(theme.eye, theme.bodyLight)).toBeGreaterThanOrEqual(3);
	});

	// The accent plate is the offset misprint behind the ink plate; if it melts into the ink or
	// the body, the screen-print look disappears.
	it.each(Object.entries(THEMES))('%s keeps the misprint visible', (_, theme) => {
		expect(contrast(theme.accent, theme.eye)).toBeGreaterThanOrEqual(2);
		expect(contrast(theme.accent, theme.bodyMid)).toBeGreaterThanOrEqual(1.8);
	});

	it('gives every colorway its own body and accent', () => {
		const pairs = Object.values(THEMES).map((t) => `${t.bodyMid}/${t.accent}`);
		expect(new Set(pairs).size).toBe(pairs.length);
	});
});

describe('themeStyle', () => {
	it('emits private custom properties for every color', () => {
		const style = themeStyle(THEMES.og);
		expect(style).toContain('--_mascbob-eye: #1d1d1f');
		expect(style.split('; ')).toHaveLength(Object.keys(THEMES.og).length);
	});
});

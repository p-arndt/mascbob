import { describe, expect, it } from 'vitest';
import {
	LIBRARY_DEFAULTS,
	STUDIO_START,
	fromQuery,
	mascotAttrs,
	stageStyle,
	svelteFile,
	themeOverrides,
	toQuery,
	type StudioConfig
} from './studio.js';

const config = (p: Partial<StudioConfig> = {}): StudioConfig => ({ ...LIBRARY_DEFAULTS, ...p });

describe('share links', () => {
	it('round-trips a configuration', () => {
		const c = config({
			...STUDIO_START,
			shape: 'orb',
			body: false,
			float: false,
			effects: false,
			colors: { accent: '#12ab34', bodyMid: '#eeeeee' },
			reactions: ['pet', 'shy'],
			stage: '#ffe4d6'
		});
		expect(fromQuery(new URLSearchParams(toQuery(c)))).toEqual(c);
	});

	it('is empty for the library defaults', () => {
		expect(toQuery(LIBRARY_DEFAULTS)).toBe('');
	});

	it('ignores invalid values', () => {
		const c = fromQuery(
			new URLSearchParams('mood=evil&acc=halo,ring&size=9999&accent=zzz&shoes=heels')
		);
		expect(c.mood).toBe('idle');
		expect(c.accessories).toEqual(['halo']);
		expect(c.size).toBe(160);
		expect(c.colors).toEqual({});
		expect(c.shoes).toBe('none');
		expect(fromQuery(new URLSearchParams('stage=chartreuse')).stage).toBe('tint');
	});

	it('keeps stage presets readable', () => {
		expect(fromQuery(new URLSearchParams(toQuery(config({ stage: 'dark' })))).stage).toBe('dark');
	});
});

describe('stage backdrop', () => {
	it('tints from the accent and follows the page scheme', () => {
		expect(stageStyle('tint', '#ff5a1f')).toEqual({
			background: 'color-mix(in srgb, #ff5a1f 14%, var(--bg))',
			scheme: null
		});
	});

	it('pins a scheme that keeps text readable on fixed colors', () => {
		expect(stageStyle('dark', '#000000').scheme).toBe('dark');
		expect(stageStyle('#fdf6d8', '#000000').scheme).toBe('light');
		expect(stageStyle('#1c2a4a', '#000000').scheme).toBe('dark');
	});

	it('never leaks into the generated code', () => {
		expect(mascotAttrs(config({ stage: '#123456' }))).toEqual([]);
	});
});

describe('code generation', () => {
	it('only spells out what differs from the library defaults', () => {
		expect(mascotAttrs(LIBRARY_DEFAULTS)).toEqual([]);
		expect(svelteFile(LIBRARY_DEFAULTS)).toContain('<Mascot />');
	});

	it('writes gear only for the full body', () => {
		const names = (c: StudioConfig) => mascotAttrs(c).map((a) => a.name);
		expect(names(config({ outfit: 'scarf', shoes: 'boots' }))).toEqual(['outfit', 'shoes']);
		expect(names(config({ outfit: 'scarf', body: false }))).toEqual(['body']);
	});

	it('turns custom colors into a theme object on top of the preset', () => {
		const file = svelteFile(config({ theme: 'bred', colors: { accent: '#00ff00' } }));
		expect(file).toContain("theme={{ base: 'bred', accent: '#00ff00' }}");
		expect(file).toContain("import { Mascot } from 'mascott';");
	});

	it('lists reactions only when they differ from the defaults', () => {
		expect(mascotAttrs(config({ reactions: ['shy', 'pet'] }))).toEqual([
			{ name: 'reactions', value: "['pet', 'shy']", expr: true }
		]);
		expect(svelteFile(config({ reactions: [] }))).toContain('reactions={false}');
		expect(fromQuery(new URLSearchParams(toQuery(config({ reactions: [] })))).reactions).toEqual(
			[]
		);
	});

	it('derives lighter and darker body shades from one picked color', () => {
		const t = themeOverrides(config({ colors: { bodyMid: '#808080' } }));
		expect(t.bodyMid).toBe('#808080');
		expect(parseInt(t.bodyLight!.slice(1, 3), 16)).toBeGreaterThan(0x80);
		expect(parseInt(t.bodyDark!.slice(1, 3), 16)).toBeLessThan(0x80);
	});
});

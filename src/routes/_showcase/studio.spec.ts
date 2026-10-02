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

it('shares and exports a creature with custom proportions', () => {
	const c = config({ species: 'critter', proportions: { ears: 1.8, legs: 0.4 } });
	expect(fromQuery(new URLSearchParams(toQuery(c)))).toEqual(c);
	expect(svelteFile(c)).toContain('species="critter"');
	expect(svelteFile(c)).toContain('proportions={{ legs: 0.4, ears: 1.8 }}');
});

it('shares and exports octo with its tentacle length', () => {
	const c = config({ species: 'octo', proportions: { arms: 1.6 } });
	expect(fromQuery(new URLSearchParams(toQuery(c)))).toEqual(c);
	expect(svelteFile(c)).toContain('species="octo"');
	expect(svelteFile(c)).toContain('proportions={{ arms: 1.6 }}');
});

describe('share links', () => {
	it('round-trips snail anatomy and exports the species', () => {
		const c = config({ species: 'snail', proportions: { body: 1.6, height: 0.5, arms: 1.8 } });
		expect(fromQuery(new URLSearchParams(toQuery(c)))).toEqual(c);
		expect(svelteFile(c)).toContain('species="snail"');
	});
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

	it('round-trips motion, interactivity and a fixed talking level', () => {
		const c = config({
			mood: 'talking',
			motion: 'reduced',
			interactive: false,
			level: 0.35,
			stage: 'paper'
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
		const odd = fromQuery(new URLSearchParams('motion=slow&level=2'));
		expect(odd.motion).toBe('auto');
		expect(odd.level).toBeNull();
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
		expect(stageStyle('paper', '#000000').scheme).toBe('light');
	});

	it('draws the paper preset in pure CSS', () => {
		expect(stageStyle('paper', '#000000').background).toMatch(/^(repeating-|radial-)?.*gradient\(/);
		expect(stageStyle('paper', '#000000').background).not.toMatch(/url\(/);
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
		expect(file).toContain("import { Mascot } from 'mascbob';");
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

	it('writes the talking level only while talking', () => {
		expect(mascotAttrs(config({ mood: 'talking', level: 0.6 }))).toEqual([
			{ name: 'mood', value: 'talking' },
			{ name: 'level', value: '0.6', expr: true }
		]);
		expect(mascotAttrs(config({ mood: 'happy', level: 0.6 })).map((a) => a.name)).toEqual(['mood']);
		expect(mascotAttrs(config({ mood: 'talking' })).map((a) => a.name)).toEqual(['mood']);
	});

	it('serializes motion and a static mascot', () => {
		const file = svelteFile(config({ motion: 'reduced', interactive: false, reactions: [] }));
		expect(file).toContain('motion="reduced"');
		expect(file).toContain('interactive={false}');
		// Reactions need interactive, so listing them would be noise.
		expect(file).not.toContain('reactions');
	});

	it('derives lighter and darker body shades from one picked color', () => {
		const t = themeOverrides(config({ colors: { bodyMid: '#808080' } }));
		expect(t.bodyMid).toBe('#808080');
		expect(parseInt(t.bodyLight!.slice(1, 3), 16)).toBeGreaterThan(0x80);
		expect(parseInt(t.bodyDark!.slice(1, 3), 16)).toBeLessThan(0x80);
	});
});

it('shares held items and exports them only for full-body bob and critter', () => {
	const c = config({ heldItem: 'phone' });
	expect(fromQuery(new URLSearchParams(toQuery(c)))).toEqual(c);
	expect(svelteFile(c)).toContain('heldItem="phone"');
	expect(svelteFile({ ...c, body: false })).not.toContain('heldItem');
	expect(svelteFile({ ...c, species: 'snail' })).not.toContain('heldItem');
	expect(fromQuery(new URLSearchParams('heldItem=invalid')).heldItem).toBe('none');
});

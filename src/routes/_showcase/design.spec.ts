import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESIGN_KEY, saveDesign, savedDesign, tabLook } from './design.js';
import { STUDIO_START } from './studio.js';

function stubStorage(store = new Map<string, string>()) {
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value)
	});
	return store;
}

describe('saved studio design', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('is null until something was designed', () => {
		stubStorage();
		expect(savedDesign()).toBeNull();
	});

	it('round-trips a design through storage in its share-link form', () => {
		const store = stubStorage();
		const design = { ...STUDIO_START, species: 'snail' as const, theme: 'mint' as const };
		saveDesign(design);
		expect(store.get(DESIGN_KEY)).toContain('species=snail');
		expect(savedDesign()).toMatchObject({ species: 'snail', theme: 'mint' });
	});

	it('survives storage that throws, as in private mode', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('denied');
			},
			setItem: () => {
				throw new Error('denied');
			}
		});
		expect(() => saveDesign(STUDIO_START)).not.toThrow();
		expect(savedDesign()).toBeNull();
	});

	it('shows the design’s species, colors and face in the tab', () => {
		const look = tabLook({ ...STUDIO_START, species: 'critter', eyes: 'cat' });
		expect(look).toMatchObject({ species: 'critter', eyes: 'cat', mood: STUDIO_START.mood });
	});
});

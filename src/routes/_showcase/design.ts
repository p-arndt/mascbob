import type { Look } from './favicon.svelte.js';
import { fromQuery, themeProp, toQuery, type StudioConfig } from './studio.js';

/** The studio design is stored in its share-link form, so loading it goes through the same checks. */
export const DESIGN_KEY = 'mascbob-design';

/** The mascot last designed in the studio, kept across pages and visits; null if there is none. */
export function savedDesign(): StudioConfig | null {
	try {
		const query = localStorage.getItem(DESIGN_KEY);
		return query === null ? null : fromQuery(new URLSearchParams(query));
	} catch {
		return null;
	}
}

export function saveDesign(config: StudioConfig) {
	try {
		localStorage.setItem(DESIGN_KEY, toQuery(config));
	} catch {
		// Private mode without storage: the design still holds until the page closes.
	}
}

/** What of a design the browser tab shows. */
export function tabLook(c: StudioConfig): Look {
	return {
		mood: c.mood,
		theme: themeProp(c),
		shape: c.shape,
		eyes: c.eyes,
		accessories: c.accessories,
		species: c.species,
		proportions: c.proportions
	};
}

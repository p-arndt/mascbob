import type { ComponentProps } from 'svelte';
import type { Mascot } from '$lib/index.js';

export type Look = Pick<
	ComponentProps<typeof Mascot>,
	'mood' | 'theme' | 'shape' | 'eyes' | 'accessories'
>;

/**
 * What the browser tab shows. The hero drives it until someone designs their own mascot in the
 * studio; after that the hero's autoplay must not keep yanking the icon back.
 */
export const favicon = $state<{ look: Look | null; studio: boolean }>({
	look: null,
	studio: false
});

export function showInTab(look: Look, from: 'hero' | 'studio') {
	if (from === 'hero' && favicon.studio) return;
	if (from === 'studio') favicon.studio = true;
	favicon.look = look;
}

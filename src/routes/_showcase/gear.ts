import { creatureGeometry, creatureViewTop } from '$lib/species.js';
import type { Proportions, Shape, Species } from '$lib/index.js';

/** Where a piece of gear sits, so its preview tile can zoom in on that part of the figure. */
export type GearSlot = 'head' | 'face' | 'outfit' | 'shoes' | 'hand';

/**
 * A square window onto the figure: `width`, `left` and `top` are fractions of the tile's side.
 * `body` says whether the preview renders the full figure or just the head.
 */
export interface GearCrop {
	body: boolean;
	width: number;
	left: number;
	top: number;
}

const UNIFIED: readonly Species[] = ['moss', 'wisp', 'octo', 'snail'];

/** Fits the square `[y, y + side]` centered on `cx` (viewBox units) into the tile. */
function frame(viewTop: number, y: number, side: number, cx = 100): Omit<GearCrop, 'body'> {
	return { width: 200 / side, left: 0.5 - cx / side, top: -(y - viewTop) / side };
}

export function gearCrop(
	slot: GearSlot,
	species: Species,
	shape: Shape,
	proportions: Proportions = {}
): GearCrop {
	const { head, build } = creatureGeometry(species, shape, undefined, proportions, true);
	if (slot === 'face' && !UNIFIED.includes(species)) {
		const side = head.halfWidth * 2 + 12;
		return { body: false, ...frame(0, (head.top + head.bottom) / 2 - side * 0.55, side) };
	}
	if (slot === 'face') slot = 'head';
	// Bob and critter wear head gear on a bare head; the margin leaves room for hats and halos.
	if (slot === 'head' && !UNIFIED.includes(species)) {
		const side = Math.max(head.bottom - head.top + 44, head.halfWidth * 2 + 36);
		return { body: false, ...frame(0, Math.max(0, head.top - 38), side) };
	}
	const viewTop = creatureViewTop(species, head, build, proportions);
	if (slot === 'head') {
		const h = build.viewHeight - viewTop;
		// The snail's head sits beside its shell, so it needs the whole figure; the others are crowns.
		if (species === 'snail') return { body: true, ...frame(viewTop, viewTop - (200 - h) / 2, 200) };
		return { body: true, ...frame(viewTop, viewTop, h * 0.8) };
	}
	if (slot === 'shoes') return { body: true, ...frame(viewTop, build.groundY - 54, 72) };
	if (slot === 'hand') {
		// Items sit in the hand on the viewer's right and stick up past the shoulder.
		const side = build.hipY - build.torsoTop + 70;
		return { body: true, ...frame(viewTop, build.torsoTop - 50, side, 118) };
	}
	const side = Math.max(96, build.hipY - build.torsoTop + 28);
	return { body: true, ...frame(viewTop, (build.torsoTop + build.hipY) / 2 - side / 2, side) };
}

/** `party-hat` reads as "party hat" on a tile. */
export const gearLabel = (value: string) => value.replaceAll('-', ' ');

import type { Shape } from './types.js';

/** All drawing happens in a 200×200 viewBox. */
export const VIEWBOX = 200;
export const CENTER_X = 100;

export interface ShapeDef {
	d: string;
	/** Topmost y of the silhouette, where head accessories sit. */
	top: number;
	/** Lowest y, the pivot for squash and the anchor of the shadow. */
	bottom: number;
	/** Half width at eye height, to place hands and ears. */
	halfWidth: number;
	/** Continuous creatures may attach hands below the face at a different width. */
	handHalfWidth?: number;
	/**
	 * Half width 16 units below `top`, where a hat's rim meets the head. Hats size from this
	 * rather than `halfWidth` so they hug narrow crowns (egg, cloud) instead of overhanging.
	 */
	crownHalfWidth: number;
}

export const SHAPE_DEFS: Record<Shape, ShapeDef> = {
	// Tall pill: with a body it reads as one capsule from head to hips (the collar hides the seam).
	capsule: {
		d: 'M52 88C52 58 72 36 100 36C128 36 148 58 148 88L148 146C148 162 136 172 100 172C64 172 52 162 52 146Z',
		top: 36,
		bottom: 172,
		halfWidth: 48,
		crownHalfWidth: 35
	},
	pebble: {
		d: 'M100 38C148 38 170 72 170 112C170 150 140 170 100 170C60 170 30 150 30 112C30 72 52 38 100 38Z',
		top: 38,
		bottom: 170,
		halfWidth: 70,
		crownHalfWidth: 47
	},
	orb: {
		d: 'M100 36A68 68 0 1 1 99.99 36Z',
		top: 36,
		bottom: 172,
		halfWidth: 68,
		crownHalfWidth: 43
	},
	squircle: {
		d: 'M100 38C152 38 166 54 166 104C166 154 152 170 100 170C48 170 34 154 34 104C34 54 48 38 100 38Z',
		top: 38,
		bottom: 170,
		halfWidth: 66,
		crownHalfWidth: 54
	},
	bean: {
		d: 'M100 30C140 30 158 58 158 98L158 132C158 162 134 174 100 174C66 174 42 162 42 132L42 98C42 58 60 30 100 30Z',
		top: 30,
		bottom: 174,
		halfWidth: 58,
		crownHalfWidth: 41
	},
	ghost: {
		d: 'M100 36C144 36 166 66 166 106L166 162Q155 152 144 162Q133 172 122 162Q111 152 100 162Q89 172 78 162Q67 152 56 162Q45 172 34 162L34 106C34 66 56 36 100 36Z',
		top: 36,
		bottom: 168,
		halfWidth: 66,
		crownHalfWidth: 45
	},
	// The ears poke above `top` on purpose: hats sit on the crown between them, not on the tips.
	cat: {
		d: 'M36 110C36 84 40 64 46 54L48 30Q50 20 58 26L80 44Q100 40 120 44L142 26Q150 20 152 30L154 54C160 64 164 84 164 110C164 150 138 170 100 170C62 170 36 150 36 110Z',
		top: 44,
		bottom: 170,
		halfWidth: 64,
		crownHalfWidth: 56
	},
	egg: {
		d: 'M100 28C136 28 160 76 160 116C160 150 134 172 100 172C66 172 40 150 40 116C40 76 64 28 100 28Z',
		top: 28,
		bottom: 172,
		halfWidth: 58,
		crownHalfWidth: 33
	},
	// Slightly bulging sides so it reads as an old CRT set rather than a squircle.
	tv: {
		d: 'M48 46L152 46Q172 46 172 66Q175 105 172 144Q172 164 152 164L48 164Q28 164 28 144Q25 105 28 66Q28 46 48 46Z',
		top: 46,
		bottom: 164,
		halfWidth: 72,
		crownHalfWidth: 71
	},
	cloud: {
		d: 'M60 168C40 168 30 154 38 140C26 134 26 108 42 104C34 80 52 62 72 68C72 38 128 38 128 68C148 62 166 80 158 104C174 108 174 134 162 140C170 154 160 168 140 168Z',
		top: 46,
		bottom: 168,
		halfWidth: 62,
		crownHalfWidth: 27
	}
};

/** Unit heart centered on the origin, spanning roughly -0.5..0.5. */
export const HEART_PATH =
	'M0 .36C-.1 .26-.52 .02-.52-.24C-.52-.5-.2-.6 0-.34C.2-.6 .52-.5 .52-.24C.52 .02 .1 .26 0 .36Z';

/** Four-point sparkle centered on the origin, radius 1. */
export const SPARKLE_PATH = 'M0-1Q.14-.14 1 0Q.14 .14 0 1Q-.14 .14-1 0Q-.14-.14 0-1Z';

export function clamp(v: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, v));
}

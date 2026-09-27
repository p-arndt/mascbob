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
}

export const SHAPE_DEFS: Record<Shape, ShapeDef> = {
	pebble: {
		d: 'M100 38C148 38 170 72 170 112C170 150 140 170 100 170C60 170 30 150 30 112C30 72 52 38 100 38Z',
		top: 38,
		bottom: 170,
		halfWidth: 70
	},
	orb: {
		d: 'M100 36A68 68 0 1 1 99.99 36Z',
		top: 36,
		bottom: 172,
		halfWidth: 68
	},
	squircle: {
		d: 'M100 38C152 38 166 54 166 104C166 154 152 170 100 170C48 170 34 154 34 104C34 54 48 38 100 38Z',
		top: 38,
		bottom: 170,
		halfWidth: 66
	},
	bean: {
		d: 'M100 30C140 30 158 58 158 98L158 132C158 162 134 174 100 174C66 174 42 162 42 132L42 98C42 58 60 30 100 30Z',
		top: 30,
		bottom: 174,
		halfWidth: 58
	},
	ghost: {
		d: 'M100 36C144 36 166 66 166 106L166 162Q155 152 144 162Q133 172 122 162Q111 152 100 162Q89 172 78 162Q67 152 56 162Q45 172 34 162L34 106C34 66 56 36 100 36Z',
		top: 36,
		bottom: 168,
		halfWidth: 66
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

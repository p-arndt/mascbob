import { clamp } from '../geometry.js';
import type { EyeStyle } from '../types.js';

export const EYE_SIZES: Record<EyeStyle, { w: number; h: number }> = {
	round: { w: 16, h: 20 },
	pill: { w: 11, h: 24 },
	wide: { w: 22, h: 14 },
	dot: { w: 10, h: 11 }
};

export interface EyeShape {
	lift: number;
	/** Lid on the eye's left edge (viewer's perspective). */
	lidLeft: number;
	lidRight: number;
}

/**
 * An eye as two cubic curves: the top edge and the bottom edge. Control
 * points at 2/3 of the height make each curve a near-perfect half ellipse, so
 * the same path morphs smoothly between open, lidded, crescent and closed.
 */
export function eyePath(cx: number, cy: number, w: number, h: number, s: EyeShape): string {
	const x0 = cx - w / 2;
	const x1 = cx + w / 2;
	const k = (2 / 3) * Math.max(h, 1.5);
	const topL = cy - k * (1 - clamp01(s.lidLeft));
	const topR = cy - k * (1 - clamp01(s.lidRight));
	// Never let the lower lid overtake the upper one, or the path folds over itself.
	const bottom = Math.max(cy + k * (1 - 2 * Math.min(s.lift, 0.95)), Math.min(topL, topR) + 1);
	return (
		`M${r(x0)} ${r(cy)}C${r(x0)} ${r(topL)} ${r(x1)} ${r(topR)} ${r(x1)} ${r(cy)}` +
		`C${r(x1)} ${r(bottom)} ${r(x0)} ${r(bottom)} ${r(x0)} ${r(cy)}Z`
	);
}

/** Mouth as a closed shape: a smile/frown curve on top and a second curve below it that opens the mouth. */
export function mouthPath(
	cx: number,
	y: number,
	width: number,
	curve: number,
	open: number
): string {
	const x0 = cx - width / 2;
	const x1 = cx + width / 2;
	const top = y + curve * 2;
	const bottom = top + Math.max(open, 0) * 2;
	return `M${r(x0)} ${r(y)}Q${r(cx)} ${r(top)} ${r(x1)} ${r(y)}Q${r(cx)} ${r(bottom)} ${r(x0)} ${r(y)}Z`;
}

/** Cat mouth ("ω"): two small bumps meeting in the middle, drawn as an open stroke. */
export function catMouthPath(cx: number, y: number, width: number, depth: number): string {
	const x0 = cx - width / 2;
	const x1 = cx + width / 2;
	const q = width / 4;
	const low = y + depth * 2;
	return `M${r(x0)} ${r(y)}Q${r(x0 + q)} ${r(low)} ${r(cx)} ${r(y)}Q${r(x1 - q)} ${r(low)} ${r(x1)} ${r(y)}`;
}

/**
 * A squeezed-shut eye as a chevron: `>` for the left eye and `<` for the right,
 * both pointing at the nose so the pair reads as "> <".
 */
export function chevronPath(cx: number, cy: number, w: number, h: number, side: Side): string {
	const tip = side === 'left' ? cx + w / 2 : cx - w / 2;
	const back = side === 'left' ? cx - w / 2 : cx + w / 2;
	return `M${r(back)} ${r(cy - h / 2)}L${r(tip)} ${r(cy)}L${r(back)} ${r(cy + h / 2)}`;
}

/**
 * A brow dash centered on `cx`. `tilt` > 0 raises the end nearest the face's
 * middle (worried), < 0 lowers it (cross); the result is mirrored per side.
 */
export function browPath(cx: number, y: number, len: number, tilt: number, side: Side): string {
	const inner = side === 'left' ? 1 : -1;
	const dy = (tilt * len) / 2;
	const xIn = cx + (inner * len) / 2;
	const xOut = cx - (inner * len) / 2;
	return `M${r(xOut)} ${r(y + dy)}L${r(xIn)} ${r(y - dy)}`;
}

export type Side = 'left' | 'right';

function clamp01(v: number): number {
	return clamp(v, 0, 1);
}

function r(v: number): number {
	return Math.round(v * 100) / 100;
}

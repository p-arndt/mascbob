import { clamp } from '../geometry.js';
import type { EyeStyle } from '../types.js';

export type Side = 'left' | 'right';

export const EYE_SIZES: Record<EyeStyle, { w: number; h: number }> = {
	round: { w: 16, h: 20 },
	pill: { w: 11, h: 24 },
	wide: { w: 22, h: 14 },
	dot: { w: 10, h: 11 }
};

/** Distance between LED centers, in head units. */
export const LED_STEP = 4.6;
export const LED_TOP = 73;
export const LED_ROWS = 13;

/** Bounds of the pill-shaped LED patch; unlit LEDs are drawn as one patterned rect over it. */
export function ledArea(width: number) {
	const cols = Math.max(3, Math.floor(width / LED_STEP) + 1);
	const height = (LED_ROWS - 1) * LED_STEP;
	const halfW = ((cols - 1) * LED_STEP) / 2 + LED_STEP * 0.6;
	const radius = height / 2 + LED_STEP * 0.6;
	return {
		x: 100 - halfW,
		y: LED_TOP + height / 2 - radius,
		width: halfW * 2,
		height: radius * 2,
		radius,
		/** Center of the first column, so the pattern lines up with the lit LEDs. */
		firstX: 100 - ((cols - 1) * LED_STEP) / 2
	};
}

export interface LedDot {
	id: number;
	x: number;
	y: number;
	/** Diagonal index, used to stagger the power-on sweep. */
	wave: number;
}

/**
 * The LED matrix under the shell: a pill-shaped patch of dots centered on
 * x = 100. Corner dots are dropped so the patch has no hard rectangular edge.
 */
export function ledGrid(width: number): LedDot[] {
	const cols = Math.max(3, Math.floor(width / LED_STEP) + 1);
	const x0 = 100 - ((cols - 1) * LED_STEP) / 2;
	const height = (LED_ROWS - 1) * LED_STEP;
	const radius = height / 2 + LED_STEP * 0.6;
	const halfW = ((cols - 1) * LED_STEP) / 2 + LED_STEP * 0.6;
	const cy = LED_TOP + height / 2;
	const dots: LedDot[] = [];
	for (let r = 0; r < LED_ROWS; r++) {
		for (let c = 0; c < cols; c++) {
			const x = x0 + c * LED_STEP;
			const y = LED_TOP + r * LED_STEP;
			// Pill test: distance from the pill's straight core segment.
			const dx = Math.max(0, Math.abs(x - 100) - (halfW - radius));
			if (Math.hypot(dx, y - cy) > radius) continue;
			dots.push({ id: r * cols + c, x, y, wave: r + c });
		}
	}
	return dots;
}

export interface EyeShape {
	cx: number;
	cy: number;
	w: number;
	h: number;
	lift: number;
	/** Lid on the eye's left edge (viewer's perspective). */
	lidLeft: number;
	lidRight: number;
	heart: number;
	/** 0..1 crossfade to the pressed "> <" chevrons. */
	squeeze: number;
	side: Side;
	/** Catchlight strength 0..1. */
	shine: number;
}

export interface MouthShape {
	cx: number;
	y: number;
	width: number;
	/** Positive smiles, negative frowns. */
	curve: number;
	open: number;
	round: number;
	cat: number;
	tongue: number;
}

export interface Segment {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	alpha: number;
}

export interface Blush {
	x: number;
	y: number;
	alpha: number;
}

export interface FaceScene {
	eyes: EyeShape[];
	mouth: MouthShape;
	brows: Segment[];
	blush: Blush[];
	/** 0..1 anime "///" stripes over the blush. */
	blushLines: number;
}

export interface DotLight {
	/** Face light in the eye color. */
	main: number;
	/** Blush and tongue, in the cheek color. */
	pink: number;
	/** Catchlight. */
	white: number;
}

/** Features thinner than this still light one full row, like a real LED line. */
const MIN_THICKNESS = LED_STEP * 0.75;
const STROKE = LED_STEP * 0.42;

/** Signed distance (negative inside) to coverage: a dot fades over roughly one LED step. */
function coverage(d: number): number {
	return clamp(0.5 - d / (LED_STEP * 0.9), 0, 1);
}

/** Thin lines sit on a row, otherwise they'd light two rows at half strength and look blurry. */
function snapRow(y: number): number {
	return LED_TOP + Math.round((y - LED_TOP) / LED_STEP) * LED_STEP;
}

function band(y: number, top: number, bottom: number, dx: number): number {
	const thickness = bottom - top;
	if (thickness < MIN_THICKNESS) {
		const mid = snapRow((top + bottom) / 2);
		return Math.max(Math.abs(y - mid) - MIN_THICKNESS / 2, dx);
	}
	return Math.max(Math.abs(y - (top + bottom) / 2) - thickness / 2, dx);
}

function segmentDistance(x: number, y: number, s: Omit<Segment, 'alpha'>): number {
	const vx = s.x1 - s.x0;
	const vy = s.y1 - s.y0;
	const len2 = vx * vx + vy * vy || 1;
	const t = clamp(((x - s.x0) * vx + (y - s.y0) * vy) / len2, 0, 1);
	return Math.hypot(x - (s.x0 + t * vx), y - (s.y0 + t * vy));
}

export function eyeDistance(x: number, y: number, e: EyeShape): number {
	const half = e.w / 2;
	const dx = Math.abs(x - e.cx) - half;
	const u = clamp((x - e.cx) / half, -1, 1);
	const column = Math.sqrt(1 - u * u);
	const radius = (e.h / 2) * column;
	const lid = e.lidLeft + (e.lidRight - e.lidLeft) * ((u + 1) / 2);
	const top = e.cy - radius * (1 - clamp(lid, 0, 1));
	const bottom = Math.max(e.cy + radius * (1 - 2 * Math.min(e.lift, 0.95)), top);
	return band(y, top, bottom, dx);
}

/** The classic implicit heart, (x² + y² − 1)³ − x²y³ ≤ 0, scaled to the eye. */
export function heartDistance(x: number, y: number, e: EyeShape): number {
	const s = Math.max(e.w, e.h) * 0.62;
	const X = (x - e.cx) / s;
	const Y = (e.cy - y) / s + 0.15;
	const f = (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3;
	return clamp(f * 14, -1, 1) * LED_STEP;
}

/** "> <": each eye points toward the nose. */
export function chevronDistance(x: number, y: number, e: EyeShape): number {
	const w = e.w * 0.5;
	const h = e.w * 0.55;
	const dir = e.side === 'left' ? 1 : -1;
	const tip = { x: e.cx + dir * w * 0.6, y: e.cy };
	const a = { x0: e.cx - dir * w * 0.6, y0: e.cy - h, x1: tip.x, y1: tip.y };
	const b = { x0: tip.x, y0: tip.y, x1: e.cx - dir * w * 0.6, y1: e.cy + h };
	return Math.min(segmentDistance(x, y, a), segmentDistance(x, y, b)) - STROKE;
}

export function mouthDistance(x: number, y: number, m: MouthShape): number {
	const half = m.width / 2;
	const dx = Math.abs(x - m.cx) - half;
	const u = clamp((x - m.cx) / half, -1, 1);
	const bow = 1 - u * u;
	const open = Math.max(m.open, 0) * bow;
	if (open >= MIN_THICKNESS) {
		const top = m.y + m.curve * bow;
		return band(y, top, top + open, dx);
	}
	// A thin mouth is a one-LED line. Rows are counted from the center outward, so even a
	// gentle smile lifts its corners by a full row instead of rounding into a flat dash.
	const curve =
		Math.abs(m.curve) < 1 ? 0 : Math.sign(m.curve) * Math.max(Math.abs(m.curve), LED_STEP * 1.1);
	const lineY = snapRow(m.y + curve) - Math.round((curve * (1 - bow)) / LED_STEP) * LED_STEP;
	return Math.max(Math.abs(y - lineY) - MIN_THICKNESS / 2, dx);
}

export function roundMouthDistance(x: number, y: number, m: MouthShape): number {
	const rx = Math.max(2.6, m.width * 0.36);
	const ry = Math.max(m.open / 2, 2.6);
	const cy = m.y + m.open / 2;
	const r = Math.hypot((x - m.cx) / rx, (y - cy) / ry);
	return Math.abs(r - 1) * Math.min(rx, ry) - STROKE;
}

/** "ω": two small u-curves side by side. */
export function catMouthDistance(x: number, y: number, m: MouthShape): number {
	const quarter = Math.max(9, m.width * 0.8) / 4;
	const side = x < m.cx ? -1 : 1;
	const cx = m.cx + side * quarter;
	const u = clamp((x - cx) / quarter, -1, 1);
	const depth = 2.6 + Math.max(0, m.curve) * 0.3;
	const lineY = snapRow(m.y - depth / 2) + depth * (1 - u * u);
	return Math.max(Math.abs(y - lineY) - MIN_THICKNESS / 2, Math.abs(x - m.cx) - quarter * 2);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How strongly one LED at (x, y) is lit by the face. */
export function lightAt(x: number, y: number, scene: FaceScene): DotLight {
	let main = 0;
	let white = 0;
	for (const e of scene.eyes) {
		const plain = coverage(eyeDistance(x, y, e));
		const shapes = lerp(plain, coverage(heartDistance(x, y, e)), clamp(e.heart, 0, 1));
		main = Math.max(main, lerp(shapes, coverage(chevronDistance(x, y, e)), clamp(e.squeeze, 0, 1)));
		if (e.shine > 0) {
			const d = Math.hypot(x - (e.cx + e.w * 0.22), y - (e.cy - e.h * 0.22)) - LED_STEP * 0.4;
			white = Math.max(white, coverage(d) * e.shine * plain);
		}
	}
	for (const b of scene.brows) {
		if (b.alpha > 0.01)
			main = Math.max(main, coverage(segmentDistance(x, y, b) - STROKE) * b.alpha);
	}

	const m = scene.mouth;
	const cat = clamp(m.cat, 0, 1);
	const round = clamp(m.round, 0, 1) * (1 - cat);
	const plainMouth = coverage(mouthDistance(x, y, m)) * (1 - cat) * (1 - round);
	main = Math.max(
		main,
		plainMouth,
		coverage(roundMouthDistance(x, y, m)) * round,
		coverage(catMouthDistance(x, y, m)) * cat
	);

	let pink = 0;
	if (m.tongue > 0.01 && m.open > 2) {
		const ty = m.y + m.curve + m.open * 0.8;
		const r = Math.hypot((x - m.cx) / (m.width * 0.24), (y - ty) / Math.max(m.open * 0.35, 1.8));
		pink = coverage((r - 1) * LED_STEP) * m.tongue * (1 - cat) * (1 - round);
	}
	for (const b of scene.blush) {
		const inside = coverage(Math.hypot(x - b.x, (y - b.y) * 1.5) - 6.5);
		// The stripes light every other diagonal inside the blush.
		const stripe = Math.round((x - y) / LED_STEP) % 2 === 0 ? scene.blushLines * 0.5 : 0;
		pink = Math.max(pink, inside * clamp(b.alpha + stripe, 0, 1));
	}

	return { main, pink, white };
}

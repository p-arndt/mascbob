import { clamp } from '../geometry.js';
import type { EyeStyle } from '../types.js';

export type Side = 'left' | 'right';

export interface EyeStyleConfig {
	w: number;
	h: number;
	/** Superellipse exponent: 2 = oval, higher = boxier. */
	round: number;
	/** Resting upper lid at the inner (nose) and outer end, as a fraction of the height. */
	lidInner?: number;
	lidOuter?: number;
	/** Size of the white glint relative to the default. */
	glint?: number;
}

/** Base eye per style. Resting lids are part of the style so moods still add their own on top. */
export const EYE_SIZES: Record<EyeStyle, EyeStyleConfig> = {
	round: { w: 15, h: 21, round: 2.4 },
	pill: { w: 10, h: 25, round: 2.2 },
	wide: { w: 23, h: 14, round: 3 },
	dot: { w: 10, h: 11, round: 2 },
	square: { w: 16, h: 17, round: 5 },
	sleepy: { w: 18, h: 18, round: 2.6, lidInner: 0.42, lidOuter: 0.46 },
	cat: { w: 20, h: 16, round: 2.3, lidInner: 0.32, lidOuter: 0 },
	puppy: { w: 17, h: 20, round: 2.2, lidInner: 0.04, lidOuter: 0.36 },
	sparkle: { w: 17, h: 22, round: 2.2, glint: 1.7 }
};

/**
 * Stacks a mood's lid on the style's resting lid (the mood covers what is still open).
 * The resting lid lifts as the eye opens past 1, so a sleepy eye still widens in surprise,
 * and mostly gives way to a happy crescent, which would otherwise be squashed to a line.
 */
export function eyeLids(
	style: EyeStyleConfig,
	mood: { open: number; lift: number; lidInner: number; lidOuter: number }
): { inner: number; outer: number } {
	const awake = clamp((1.25 - mood.open) / 0.25, 0, 1) * (1 - clamp(mood.lift / 0.8, 0, 1) * 0.7);
	const stack = (rest: number, lid: number) => {
		const r = clamp(rest * awake, 0, 1);
		return r + (1 - r) * clamp(lid, 0, 1);
	};
	return {
		inner: stack(style.lidInner ?? 0, mood.lidInner),
		outer: stack(style.lidOuter ?? 0, mood.lidOuter)
	};
}

/** How far the accent print plate sits off the ink plate at rest, in head units. */
export const MISPRINT = { x: 1.6, y: 1.2 };

export interface EyeShape {
	cx: number;
	cy: number;
	w: number;
	/** Current height, after `open` and blinking. */
	h: number;
	round: number;
	/** 0..1; around 0.8 the lower edge arches up into a happy crescent. */
	lift: number;
	/** Lid drop at the left and right end, as a fraction of the height. */
	lidLeft: number;
	lidRight: number;
	/**
	 * 0..1 moves the top edge down onto the bottom edge, after lids and crescent: 1 closes
	 * the eye as a shutter onto the lower lid instead of squashing it to the middle.
	 */
	lidDrop?: number;
}

/** Share of a blink's travel done by the lower lid; real lids close mostly from above. */
export const BLINK_LOWER = 0.15;

/**
 * How blinking and downward gaze close the eye: the lower lid rises a little (a symmetric
 * height scale around the center) and the upper lid covers the rest by dropping.
 */
export function eyeClosure(blink: number, down: number): { hScale: number; lidDrop: number } {
	const b = clamp(blink, 0, 1);
	const gaze = clamp(down, 0, 1) * 0.3;
	return {
		hScale: 1 - BLINK_LOWER * 2 * b,
		lidDrop: 1 - (1 - b) * (1 - gaze)
	};
}

type Point = [number, number];

const fmt = (n: number) => Math.round(n * 100) / 100;

/** Closed Catmull-Rom spline through the points, as cubic Béziers: smooth outlines from few samples. */
export function smoothPath(points: Point[]): string {
	const n = points.length;
	if (n < 3) return '';
	let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
	for (let i = 0; i < n; i++) {
		const p0 = points[(i - 1 + n) % n];
		const p1 = points[i];
		const p2 = points[(i + 1) % n];
		const p3 = points[(i + 2) % n];
		const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
	}
	return d + 'Z';
}

/** Minimum stroke of a shut eye, so a blink reads as a brush line instead of vanishing. */
const SHUT = 2.8;
const SAMPLES = 10;

/**
 * Samples the eye as a top and a bottom edge and closes it into one path, so open,
 * shut, lidded and crescent eyes are all the same shape and tween into each other.
 */
export function eyeOutline(e: EyeShape): Point[] {
	const hw = Math.max(0.5, e.w / 2);
	const full = Math.max(0, e.h) / 2;
	const lift = clamp(e.lift / 0.8, 0, 1);
	const drop = clamp(e.lidDrop ?? 0, 0, 1);
	const top: Point[] = [];
	const bottom: Point[] = [];
	for (let i = 0; i <= SAMPLES; i++) {
		// Cosine spacing packs samples at the ends, where the curvature is.
		const u = -Math.cos((i / SAMPLES) * Math.PI);
		const x = e.cx + u * hw;
		const edge = Math.pow(1 - Math.pow(Math.abs(u), e.round), 1 / e.round);
		let t = e.cy - full * edge;
		let b = e.cy + full * edge;
		// A shut eye lies along the lower lid; boxy styles would close into a "⊔", so the lower
		// edge relaxes toward an oval as the lid comes down (quadratic, so gaze droop barely moves it).
		b = Math.min(b, b + (e.cy + full * Math.sqrt(1 - u * u) - b) * drop * drop);
		// Crescent: the lower edge becomes the upper one pushed down by a band, which arches the eye.
		const band = Math.max(full * 0.62, SHUT + 1) * edge;
		b = b + (Math.min(b, t + band) - b) * lift;
		const lid = e.cy - full + full * 2 * (e.lidLeft + (e.lidRight - e.lidLeft) * ((u + 1) / 2));
		t = Math.min(Math.max(t, lid), b);
		t += (b - t) * drop;
		// A lens-shaped minimum keeps shut eyes as a tapered stroke.
		const min = SHUT * Math.sqrt(1 - u * u);
		if (b - t < min) {
			const mid = (t + b) / 2;
			t = mid - min / 2;
			b = mid + min / 2;
		}
		top.push([x, t]);
		bottom.push([x, b]);
	}
	return [...top, ...bottom.slice(1, -1).reverse()];
}

export interface MouthShape {
	cx: number;
	y: number;
	width: number;
	/** Positive smiles, negative frowns. */
	curve: number;
	/** Gap between the lips. */
	open: number;
	/** 0..1 pulls the mouth into a round "o". */
	round: number;
	/** Raises the right corner and lowers the left by this much (negative: the reverse). */
	skew?: number;
}

/**
 * The mouth is two quadratic lips between shared corners. Filled and stroked with a
 * round join, a shut mouth reads as a single marker line and an open one as a shape.
 */
export function mouthPath(m: MouthShape): string {
	const round = clamp(m.round, 0, 1);
	const open = Math.max(0, m.open);
	const width = m.width + (Math.max(open * 1.3, 5) - m.width) * round;
	const curve = m.curve * (1 - round);
	const hw = width / 2;
	// Corners ride up with the smile so the lips curve around the middle.
	const corner = m.y - curve * 0.5;
	const bend = curve * 1.5;
	const upper = corner + bend * (1 - clamp(open / 8, 0, 0.75)) - open * round * 0.9;
	const lower = corner + bend + open * 1.8 - open * round * 0.8;
	// A round "o" has no corners to tip.
	const skew = (m.skew ?? 0) * (1 - round);
	const cl = corner + skew;
	const cr = corner - skew;
	return `M${fmt(m.cx - hw)} ${fmt(cl)}Q${fmt(m.cx)} ${fmt(upper)} ${fmt(m.cx + hw)} ${fmt(cr)}Q${fmt(m.cx)} ${fmt(lower)} ${fmt(m.cx - hw)} ${fmt(cl)}Z`;
}

/**
 * How far a smile reaches the eyes, 0..1: a real (Duchenne) smile pushes the cheeks up
 * and the lower lids with them; a polite one only moves the mouth.
 */
export function duchenne(curve: number, round = 0): number {
	return clamp((curve * (1 - clamp(round, 0, 1)) - 3) / 2.5, 0, 1);
}

/**
 * A brow as one quadratic stroke with a slight arch. Slanted brows flatten, since a
 * cross or worried brow reads as a straight dash.
 */
export function browPath(x0: number, y0: number, x1: number, y1: number, tilt: number): string {
	const arch = Math.hypot(x1 - x0, y1 - y0) * 0.14 * (1 - clamp(Math.abs(tilt) * 1.6, 0, 0.8));
	return `M${fmt(x0)} ${fmt(y0)}Q${fmt((x0 + x1) / 2)} ${fmt((y0 + y1) / 2 - arch * 2)} ${fmt(x1)} ${fmt(y1)}`;
}

/** "ω": two little arcs meeting in the middle. */
export function catMouthPath(cx: number, y: number, width: number): string {
	const q = width / 4;
	return `M${fmt(cx - q * 2)} ${fmt(y - 1)}Q${fmt(cx - q)} ${fmt(y + q * 1.3)} ${fmt(cx)} ${fmt(y - 0.5)}Q${fmt(cx + q)} ${fmt(y + q * 1.3)} ${fmt(cx + q * 2)} ${fmt(y - 1)}`;
}

export interface HalftoneDot {
	x: number;
	y: number;
	/** Radius at full blush; scaled by the blush amount at render time. */
	r: number;
}

/**
 * A printed cheek: a hex grid of dots whose size falls off toward the edge, the way
 * halftone renders a soft gradient with a single ink.
 */
export function halftone(rx: number, ry: number, step = 3.2): HalftoneDot[] {
	const dots: HalftoneDot[] = [];
	const rowH = step * 0.866;
	for (let row = -Math.ceil(ry / rowH); row <= Math.ceil(ry / rowH); row++) {
		const y = row * rowH;
		const shift = row % 2 === 0 ? 0 : step / 2;
		for (let x = -Math.ceil(rx / step) * step + shift; x <= rx; x += step) {
			const d = Math.hypot(x / rx, y / ry);
			if (d >= 1) continue;
			dots.push({ x, y, r: step * 0.5 * Math.pow(1 - d, 0.6) });
		}
	}
	return dots.filter((d) => d.r > 0.25);
}

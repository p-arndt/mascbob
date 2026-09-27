import { describe, expect, it } from 'vitest';
import { MOOD_CONFIGS } from '../moods.js';
import {
	catMouthPath,
	eyeOutline,
	halftone,
	mouthPath,
	smoothPath,
	type EyeShape,
	type MouthShape
} from './face.js';

const eye = (p: Partial<EyeShape> = {}): EyeShape => ({
	cx: 80,
	cy: 96,
	w: 15,
	h: 21,
	round: 2.4,
	lift: 0,
	lidLeft: 0,
	lidRight: 0,
	...p
});

const bounds = (points: [number, number][]) => ({
	minY: Math.min(...points.map((p) => p[1])),
	maxY: Math.max(...points.map((p) => p[1])),
	minX: Math.min(...points.map((p) => p[0])),
	maxX: Math.max(...points.map((p) => p[0]))
});

/** Vertical extent of the outline at the column closest to x. */
const column = (points: [number, number][], x: number) => {
	const near = points.filter((p) => Math.abs(p[0] - x) < 0.01);
	return Math.max(...near.map((p) => p[1])) - Math.min(...near.map((p) => p[1]));
};

describe('eyeOutline', () => {
	it('spans the eye size around its center', () => {
		const b = bounds(eyeOutline(eye()));
		expect(b.minX).toBeCloseTo(72.5);
		expect(b.maxX).toBeCloseTo(87.5);
		expect(b.minY).toBeCloseTo(85.5);
		expect(b.maxY).toBeCloseTo(106.5);
	});

	it('keeps a shut eye as a thin stroke instead of vanishing', () => {
		const shut = eyeOutline(eye({ h: 0 }));
		const b = bounds(shut);
		expect(b.maxY - b.minY).toBeGreaterThan(2);
		expect(b.maxY - b.minY).toBeLessThan(4);
		expect(b.maxX - b.minX).toBeCloseTo(15);
	});

	it('arches into a crescent when lifted', () => {
		const open = eyeOutline(eye());
		const happy = eyeOutline(eye({ lift: 0.8 }));
		expect(column(happy, 80)).toBeLessThan(column(open, 80) * 0.7);
		// The top edge stays where it was: the eye is cut from below.
		expect(bounds(happy).minY).toBeCloseTo(bounds(open).minY);
	});

	it('drops the lid on one side only', () => {
		const lidded = eyeOutline(eye({ lidRight: 0.5 }));
		const top = (x: number) =>
			Math.min(...lidded.filter((p) => Math.abs(p[0] - x) < 0.01).map((p) => p[1]));
		const xs = lidded.map((p) => p[0]);
		const rightX = Math.max(...xs.filter((x) => x < 87));
		expect(top(rightX)).toBeGreaterThan(top(80));
	});
});

describe('smoothPath', () => {
	it('closes a cubic path through every point', () => {
		const d = smoothPath([
			[0, 0],
			[10, 0],
			[10, 10]
		]);
		expect(d.startsWith('M0 0')).toBe(true);
		expect(d.match(/C/g)).toHaveLength(3);
		expect(d.endsWith('Z')).toBe(true);
	});
});

describe('mouthPath', () => {
	const mouth = (p: Partial<MouthShape> = {}): MouthShape => ({
		cx: 100,
		y: 118,
		width: 12,
		curve: 3,
		open: 0,
		round: 0,
		...p
	});
	const ys = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((x) => Number(x[2]));

	it('draws a shut smile as coinciding lips that dip in the middle', () => {
		const [cornerY, upper, , lower] = ys(mouthPath(mouth()));
		expect(upper).toBeCloseTo(lower);
		expect(upper).toBeGreaterThan(cornerY);
	});

	it('opens the lower lip for an open mouth', () => {
		const [, upper, , lower] = ys(mouthPath(mouth({ open: 8 })));
		expect(lower - upper).toBeGreaterThan(10);
	});

	it('pulls into a narrow round shape', () => {
		const xs = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((x) => Number(x[1]));
		const wide = xs(mouthPath(mouth({ width: 20, open: 6 })));
		const round = xs(mouthPath(mouth({ width: 20, open: 6, round: 1 })));
		expect(Math.max(...round) - Math.min(...round)).toBeLessThan(
			Math.max(...wide) - Math.min(...wide)
		);
	});

	it('draws a cat mouth as two arcs', () => {
		expect(catMouthPath(100, 118, 12).match(/Q/g)).toHaveLength(2);
	});
});

describe('halftone', () => {
	it('stays inside the ellipse with dots shrinking toward the edge', () => {
		const dots = halftone(10, 6, 2.5);
		expect(dots.length).toBeGreaterThan(10);
		for (const d of dots) expect(Math.hypot(d.x / 10, d.y / 6)).toBeLessThan(1);
		const center = dots.reduce((a, b) => (Math.hypot(a.x, a.y) < Math.hypot(b.x, b.y) ? a : b));
		expect(Math.max(...dots.map((d) => d.r))).toBe(center.r);
	});
});

describe('talking vs idle', () => {
	it('reads differently even between syllables', () => {
		const idle = MOOD_CONFIGS.idle.face;
		const talking = MOOD_CONFIGS.talking.face;
		expect(talking.mouthOpen).toBeGreaterThan(idle.mouthOpen + 2);
		expect(talking.left.brow).toBeGreaterThan(idle.left.brow);
	});
});

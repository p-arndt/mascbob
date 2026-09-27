import { describe, expect, it } from 'vitest';
import { MOOD_CONFIGS } from '../moods.js';
import { EYE_STYLES } from '../types.js';
import {
	EYE_SIZES,
	catMouthPath,
	eyeClosure,
	eyeLids,
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

describe('eye closure', () => {
	const closed = (blink: number, down = 0, p: Partial<EyeShape> = {}) => {
		const c = eyeClosure(blink, down);
		return eyeOutline(eye({ ...p, h: (p.h ?? 21) * c.hScale, lidDrop: c.lidDrop }));
	};
	const commands = (d: string) => d.replace(/-?[\d.]+/g, '#');

	it('blinks as a shutter: the top edge travels much further than the bottom', () => {
		const open = bounds(closed(0));
		const shut = bounds(closed(1));
		const topTravel = shut.minY - open.minY;
		const bottomTravel = open.maxY - shut.maxY;
		expect(topTravel).toBeGreaterThan(bottomTravel * 4);
		expect(bottomTravel).toBeGreaterThan(0);
		// Closed into a thin line in the lower part of the eye, not the middle.
		expect(column(closed(1), 80)).toBeLessThan(4);
		expect(
			Math.min(
				...closed(1)
					.filter((p) => Math.abs(p[0] - 80) < 0.01)
					.map((p) => p[1])
			)
		).toBeGreaterThan(96 + 21 * 0.25);
	});

	it('closes every style into a thin, gently curved line', () => {
		for (const style of EYE_STYLES) {
			const base = EYE_SIZES[style];
			const lids = eyeLids(base, { open: 1, lift: 0, lidInner: 0, lidOuter: 0 });
			const shut = closed(1, 0, {
				w: base.w,
				h: base.h,
				round: base.round,
				lidLeft: lids.outer,
				lidRight: lids.inner
			});
			const half = shut.length / 2;
			for (let i = 1; i < half; i++) {
				const top = shut[i];
				const bottom = shut[shut.length - i];
				expect(bottom[1] - top[1], style).toBeLessThan(4);
			}
			expect(bounds(shut).maxY - bounds(shut).minY, style).toBeLessThan(base.h * 0.5);
		}
	});

	it('moves the top edge down part way mid-blink', () => {
		const open = bounds(closed(0));
		const half = bounds(closed(0.5));
		expect(half.minY).toBeGreaterThan(open.minY + 21 * 0.3);
		expect(open.maxY - half.maxY).toBeLessThan(21 * 0.1);
	});

	it('droops the upper lid when looking down', () => {
		const ahead = bounds(closed(0, 0));
		const down = bounds(closed(0, 1));
		expect(down.minY).toBeGreaterThan(ahead.minY + 21 * 0.2);
		expect(down.maxY).toBeCloseTo(ahead.maxY);
	});

	it('keeps the path command structure across lid drops', () => {
		for (const style of EYE_STYLES) {
			const base = EYE_SIZES[style];
			const lids = eyeLids(base, { open: 1, lift: 0.8, lidInner: 0, lidOuter: 0 });
			const shape = { w: base.w, round: base.round, lidLeft: lids.outer, lidRight: lids.inner };
			const ref = commands(smoothPath(eyeOutline(eye(shape))));
			for (const lidDrop of [0, 0.3, 0.7, 1]) {
				for (const lift of [0, 0.8]) {
					const d = smoothPath(eyeOutline(eye({ ...shape, lift, lidDrop })));
					expect(commands(d), `${style} ${lidDrop} ${lift}`).toBe(ref);
				}
			}
		}
	});
});

describe('eye styles', () => {
	const mood = { open: 1, lift: 0, lidInner: 0, lidOuter: 0 };
	const styled = (style: (typeof EYE_STYLES)[number], p: Partial<typeof mood> = {}) => {
		const base = EYE_SIZES[style];
		const lids = eyeLids(base, { ...mood, ...p });
		const h = base.h * Math.min(1, p.open ?? 1);
		return eyeOutline(
			eye({
				w: base.w,
				h,
				round: base.round,
				lift: p.lift ?? 0,
				lidLeft: lids.outer,
				lidRight: lids.inner
			})
		);
	};

	it('has a size for every style', () => {
		for (const style of EYE_STYLES) {
			const base = EYE_SIZES[style];
			expect(base.w, style).toBeGreaterThan(0);
			expect(base.h, style).toBeGreaterThan(0);
			expect(base.round, style).toBeGreaterThanOrEqual(2);
		}
	});

	it('blinks every style shut into a thin stroke', () => {
		for (const style of EYE_STYLES) {
			const b = bounds(styled(style, { open: 0 }));
			expect(b.maxY - b.minY, style).toBeLessThan(4);
		}
	});

	it('forms a crescent in every style', () => {
		for (const style of EYE_STYLES) {
			const open = styled(style);
			const happy = styled(style, { lift: 0.8 });
			expect(column(happy, 80), style).toBeLessThan(column(open, 80));
			expect(column(happy, 80), style).toBeGreaterThan(2.8);
		}
	});

	it('keeps plain styles unlidded', () => {
		expect(eyeLids(EYE_SIZES.round, mood)).toEqual({ inner: 0, outer: 0 });
		expect(eyeLids(EYE_SIZES.round, { ...mood, lidOuter: 0.5 }).outer).toBe(0.5);
	});

	it('rests the sleepy eye half-lidded and stacks mood lids on top', () => {
		const rest = eyeLids(EYE_SIZES.sleepy, mood);
		expect(rest.inner).toBeGreaterThan(0.3);
		expect(rest.outer).toBeGreaterThan(0.3);
		const sad = eyeLids(EYE_SIZES.sleepy, { ...mood, lidOuter: 0.5 });
		expect(sad.outer).toBeGreaterThan(rest.outer);
		expect(sad.outer).toBeLessThan(1);
		expect(column(styled('sleepy'), 80)).toBeLessThan(EYE_SIZES.sleepy.h * 0.7);
	});

	it('opens the resting lid in surprise', () => {
		const surprised = eyeLids(EYE_SIZES.sleepy, { ...mood, open: 1.25 });
		expect(surprised).toEqual({ inner: 0, outer: 0 });
	});

	it('slants the cat eye up and the puppy eye down toward the outside', () => {
		const cat = eyeLids(EYE_SIZES.cat, mood);
		const puppy = eyeLids(EYE_SIZES.puppy, mood);
		expect(cat.inner).toBeGreaterThan(cat.outer + 0.2);
		expect(puppy.outer).toBeGreaterThan(puppy.inner + 0.2);
	});

	it('gives the sparkle eye a bigger glint', () => {
		expect(EYE_SIZES.sparkle.glint).toBeGreaterThan(1);
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

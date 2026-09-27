import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS } from '../geometry.js';
import {
	ACCESSORIES,
	BAND_END_Y,
	MONOCLE,
	bandControlY,
	chainPath,
	contactShadows,
	monocleAnchor,
	monocleHook,
	propellerSpin,
	starPath,
	templeLine
} from './accessories.js';

const SHAPES = ['capsule', 'tv', 'egg', 'cat', 'cloud', 'orb', 'pebble'] as const;

/** Even-odd ray cast against a flattened SVG path, enough to tell inside from outside. */
function inside(shape: (typeof SHAPES)[number], x: number, y: number): boolean {
	return new Outline(SHAPE_DEFS[shape].d).contains(x, y);
}

class Outline {
	private pts: [number, number][] = [];
	constructor(d: string) {
		const tokens = d.match(/[MLCQAZ]|-?\d*\.?\d+/gi)!;
		let i = 0;
		let cur: [number, number] = [0, 0];
		let cmd = '';
		const num = () => Number(tokens[i++]);
		while (i < tokens.length) {
			if (/[A-Z]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
			if (cmd === 'M' || cmd === 'L') {
				cur = [num(), num()];
				this.pts.push(cur);
			} else if (cmd === 'C' || cmd === 'Q') {
				const n = cmd === 'C' ? 3 : 2;
				const c: [number, number][] = [cur];
				for (let k = 0; k < n; k++) c.push([num(), num()]);
				for (let s = 1; s <= 24; s++) this.pts.push(bezier(c, s / 24));
				cur = c[n];
			} else if (cmd === 'A') {
				const r = num();
				i += 4;
				const end: [number, number] = [num(), num()];
				// Only the orb uses an arc: a full circle through its top point.
				const cy = end[1] + r;
				for (let s = 0; s <= 48; s++) {
					const a = (s / 48) * Math.PI * 2;
					this.pts.push([100 + Math.sin(a) * r, cy - Math.cos(a) * r]);
				}
				cur = end;
			} else if (cmd === 'Z') {
				continue;
			}
		}
	}
	contains(x: number, y: number): boolean {
		let hit = false;
		const p = this.pts;
		for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
			const [xa, ya] = p[a];
			const [xb, yb] = p[b];
			if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) hit = !hit;
		}
		return hit;
	}
}

function bezier(c: [number, number][], t: number): [number, number] {
	let pts = c;
	while (pts.length > 1) {
		pts = pts
			.slice(1)
			.map((p, k) => [pts[k][0] + (p[0] - pts[k][0]) * t, pts[k][1] + (p[1] - pts[k][1]) * t]);
	}
	return pts[0];
}

describe('accessories', () => {
	it('has unique names', () => {
		expect(new Set(ACCESSORIES).size).toBe(ACCESSORIES.length);
	});

	it('includes the decorative extras', () => {
		expect(ACCESSORIES).toEqual(
			expect.arrayContaining(['crown', 'bow', 'glasses', 'star-clip', 'beanie'])
		);
	});

	it('includes the costume extras', () => {
		expect(ACCESSORIES).toEqual(
			expect.arrayContaining(['party-hat', 'propeller', 'horns', 'flower', 'monocle', 'mustache'])
		);
	});

	it('whirls the propeller when excited and rests it when low', () => {
		expect(propellerSpin('happy')).toBeGreaterThan(0);
		expect(propellerSpin('happy')).toBeLessThan(propellerSpin('idle'));
		expect(propellerSpin('sleepy')).toBe(0);
		expect(propellerSpin('sad')).toBe(0);
	});

	it('builds a closed ten-point star within its radius', () => {
		const d = starPath(10);
		expect(d.startsWith('M0.00 -10.00')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		const nums = d.match(/-?\d+\.\d+/g)!.map(Number);
		expect(nums).toHaveLength(20);
		for (const n of nums) expect(Math.abs(n)).toBeLessThanOrEqual(10);
	});

	describe.each(SHAPES)('on the %s head', (shape) => {
		const { top: t, halfWidth: hw } = SHAPE_DEFS[shape];

		it('rests the headphone band just above the crown', () => {
			const c = bandControlY(BAND_END_Y, t - 6);
			const [, apexY] = bezier(
				[
					[100 - hw - 2, BAND_END_Y],
					[100 - hw - 2, c],
					[100 + hw + 2, c],
					[100 + hw + 2, BAND_END_Y]
				],
				0.5
			);
			expect(apexY).toBeCloseTo(t - 6, 6);
			expect(t - apexY).toBeLessThan(8);
		});

		it('runs the glasses temples out to the head edge', () => {
			const l = templeLine(hw);
			expect(l.x0 - l.x1).toBeGreaterThanOrEqual(2);
			expect(l.x1).toBeCloseTo(Math.min(61.5, 100 - hw + 3));
			expect(l.y1).toBeLessThan(l.y0);
			expect(inside(shape, l.x1, l.y1)).toBe(true);
		});

		it('pins the monocle chain inside the head', () => {
			const a = monocleAnchor(hw);
			expect(inside(shape, a.x, a.y)).toBe(true);
			expect(inside(shape, 100 + hw + 12, a.y)).toBe(false);
		});

		it('clips every contact shadow to a spot near the head', () => {
			for (const sh of contactShadows(ACCESSORIES, t, hw)) {
				expect(sh.cy).toBeGreaterThan(t - 2);
				expect(Math.abs(sh.cx - 100)).toBeLessThan(hw + 10);
			}
		});
	});

	it('keeps the chain hooked to the monocle rim as it drops', () => {
		for (const d of [0, 0.5, 1]) {
			const h = monocleHook(d);
			const center = { x: MONOCLE.cx + 4 * d, y: MONOCLE.cy + 18 * d };
			expect(Math.hypot(h.x - center.x, h.y - center.y)).toBeCloseTo(MONOCLE.r, 6);
		}
		expect(monocleHook(0).x).toBeCloseTo(120 + MONOCLE.r * Math.SQRT1_2);
		expect(monocleHook(1).y).toBeGreaterThan(monocleHook(0).y);
	});

	it('hangs the chain below both ends, deeper when the ends are closer', () => {
		const ctrlY = (d: string) => Number(d.split('Q')[1].split(' ')[1]);
		const far = chainPath({ x: 130, y: 107 }, { x: 160, y: 138 });
		const near = chainPath({ x: 140, y: 125 }, { x: 160, y: 138 });
		expect(far.startsWith('M130.00 107.00Q')).toBe(true);
		expect(far.endsWith('160.00 138.00')).toBe(true);
		expect(ctrlY(far)).toBeGreaterThan(138);
		expect(ctrlY(near) - 138).toBeGreaterThan(ctrlY(far) - 138);
	});

	it('casts shadows only for worn head accessories, down and right of the light', () => {
		expect(contactShadows(['glasses', 'monocle', 'mustache', 'halo'], 36, 48)).toEqual([]);
		expect(contactShadows(['horns', 'ears'], 36, 48)).toHaveLength(4);
		const [beanie] = contactShadows(['beanie'], 36, 48);
		expect(beanie.cx).toBeGreaterThan(100);
		expect(beanie.cy).toBeGreaterThan(36 + 22);
	});
});

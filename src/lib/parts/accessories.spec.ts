import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS } from '../geometry.js';
import { SHAPES } from '../types.js';
import {
	ACCESSORIES,
	BAND_END_Y,
	CAP_RISE,
	HATS,
	HEADWEAR,
	MONOCLE,
	NIGHTCAP_LENGTH,
	TOPPERS,
	bandControlY,
	beanieWidth,
	capWidth,
	chainPath,
	contactShadows,
	counterSquash,
	followSwing,
	hatLift,
	headwear,
	hornOffset,
	monocleAnchor,
	monocleHook,
	mustacheTilt,
	nightcapBend,
	nightcapRoot,
	nightcapShape,
	nightcapWidth,
	propellerSpin,
	propellerWidth,
	starPath,
	templeLine
} from './accessories.js';

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
		const { top: t, halfWidth: hw, crownHalfWidth: cw } = SHAPE_DEFS[shape];

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

		it('declares the crown half width the head really has 16 units below the top', () => {
			expect(inside(shape, 100 - cw, t + 16)).toBe(true);
			expect(inside(shape, 100 + cw, t + 16)).toBe(true);
			expect(inside(shape, 100 - cw - 1.5, t + 16) && inside(shape, 100 + cw + 1.5, t + 16)).toBe(
				false
			);
		});

		it('fits the hats to the crown without overhanging it', () => {
			// Knit and cloth hug the head at their rim; a few units stand for the fabric's thickness.
			for (const w of [beanieWidth(cw), capWidth(cw), nightcapWidth(cw)]) {
				expect(inside(shape, 100 - (w - 6), t + 18)).toBe(true);
				expect(inside(shape, 100 + (w - 6), t + 18)).toBe(true);
			}
			const pw = propellerWidth(cw);
			expect(inside(shape, 100 - pw, t + 16)).toBe(true);
			expect(inside(shape, 100 + pw, t + 16)).toBe(true);
		});

		it('roots the horns on the head', () => {
			const x = 100 - hornOffset(cw);
			// The horn's base runs ±8 along its own -14° frame, 6 units below its anchor.
			const a = (-14 * Math.PI) / 180;
			for (const lx of [-8, 8]) {
				const px = x + lx * Math.cos(a) - 6 * Math.sin(a);
				const py = t + 12 + lx * Math.sin(a) + 6 * Math.cos(a);
				expect(inside(shape, px, py)).toBe(true);
				expect(inside(shape, 200 - px, py)).toBe(true);
			}
		});

		it('flops the nightcap tip within the viewBox', () => {
			for (const bend of [0, nightcapBend('idle'), nightcapBend('sleepy') + 25]) {
				const { d, tip } = nightcapShape(nightcapWidth(cw), t, bend);
				expect(d.endsWith('Z')).toBe(true);
				expect(tip.x).toBeLessThan(200 - 6);
				expect(tip.y).toBeGreaterThan(0);
			}
		});

		it('pins the monocle chain inside the head', () => {
			const a = monocleAnchor(hw);
			expect(inside(shape, a.x, a.y)).toBe(true);
			expect(inside(shape, 100 + hw + 12, a.y)).toBe(false);
		});

		it('clips every contact shadow to a spot near the head', () => {
			for (const sh of contactShadows(ACCESSORIES, t, hw, cw)) {
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
		expect(
			contactShadows(['glasses', 'monocle', 'mustache', 'halo', 'shades', 'headband'], 36, 48, 35)
		).toEqual([]);
		expect(contactShadows(['horns', 'ears'], 36, 48, 35)).toHaveLength(4);
		const [beanie] = contactShadows(['beanie'], 36, 48, 35);
		expect(beanie.cx).toBeGreaterThan(100);
		expect(beanie.cy).toBeGreaterThan(36 + 22);
		for (const hat of ['cap', 'nightcap'] as const) {
			const [sh] = contactShadows([hat], 36, 48, 35);
			expect(sh.cy).toBeGreaterThan(36 + 16);
			expect(sh.rx).toBeLessThanOrEqual(35 + 7);
		}
	});

	it('registers the new hats and eyewear', () => {
		expect(ACCESSORIES).toEqual(expect.arrayContaining(['cap', 'nightcap', 'shades', 'headband']));
		for (const a of HEADWEAR) expect(ACCESSORIES).toContain(a);
	});
});

describe('headwear slot', () => {
	it('wears only the first hat listed', () => {
		const w = headwear(['glasses', 'beanie', 'crown', 'cap']);
		expect(w.hat).toBe('beanie');
		expect(w.worn).toEqual(['glasses', 'beanie']);
	});

	it('keeps everything that is not headwear, once', () => {
		expect(headwear(['ears', 'bow', 'ears', 'headband']).worn).toEqual(['ears', 'bow', 'headband']);
		expect(headwear([]).hat).toBeNull();
	});

	it('grows one topper on a bare head', () => {
		const w = headwear(['sprout', 'antenna']);
		expect(w.worn).toEqual(['sprout']);
		expect(w.seat).toBe(0);
	});

	it('stands a topper on the cap and drops it under hats with no room', () => {
		const onCap = headwear(['antenna', 'cap']);
		expect(onCap.worn).toEqual(['antenna', 'cap']);
		expect(onCap.seat).toBeGreaterThan(CAP_RISE);
		for (const hat of HATS.filter((h) => h !== 'cap')) {
			expect(headwear(['antenna', hat]).worn).toEqual([hat]);
		}
		for (const topper of TOPPERS) expect(HATS).not.toContain(topper);
	});
});

describe('follow-through', () => {
	it('lifts a hat only while the head falls away from it, by a couple of units', () => {
		expect(hatLift(6)).toBe(0);
		expect(hatLift(-4)).toBeLessThan(0);
		expect(hatLift(-40)).toBeCloseTo(-2.5);
	});

	it('swings tall items against the lean and clamps the swing', () => {
		expect(followSwing(0, 0)).toBe(0);
		expect(followSwing(-5, 0)).toBeLessThan(0);
		expect(followSwing(5, 0)).toBeGreaterThan(0);
		expect(Math.abs(followSwing(100, 100))).toBeLessThanOrEqual(16);
	});

	it('counters the squash around the anchor', () => {
		const anchor = { x: 100, y: 96 };
		expect(counterSquash(anchor, anchor, 1.2, 0.8)).toEqual(anchor);
		const p = counterSquash({ x: 112, y: 88 }, anchor, 1.2, 0.8);
		expect(p.x).toBeCloseTo(110);
		expect(p.y).toBeCloseTo(86);
	});

	it('droops the nightcap when sleepy and bends further the more it droops', () => {
		expect(nightcapBend('sleepy')).toBeGreaterThan(nightcapBend('idle'));
		const up = nightcapShape(40, 36, nightcapBend('idle')).tip;
		const down = nightcapShape(40, 36, nightcapBend('sleepy')).tip;
		expect(down.y).toBeGreaterThan(up.y);
		const root = nightcapRoot(40, 36);
		expect(Math.hypot(up.x - root.x, up.y - root.y)).toBeCloseTo(NIGHTCAP_LENGTH);
	});

	it('tilts the mustache ends with the mouth curve', () => {
		expect(mustacheTilt(0)).toBe(0);
		expect(mustacheTilt(3)).toBeCloseTo(6);
		expect(mustacheTilt(-4)).toBeLessThan(0);
	});
});

import { describe, expect, it } from 'vitest';
import {
	GRAB_LIMITS,
	legStretch,
	legSwing,
	pullHead,
	reachArm,
	rubber,
	swing,
	type Point
} from './grab.js';
import { limbEnd, type ArmAngles } from './parts/body.js';

const O: Point = { x: 0, y: 0 };
const UPPER = 17;
const FORE = 15;
const SHOULDER: Point = { x: 48, y: 150 };

function joints(angles: ArmAngles, shoulder = SHOULDER) {
	const elbow = limbEnd(shoulder.x, shoulder.y, angles.a1, UPPER);
	const wrist = limbEnd(elbow.x, elbow.y, angles.a1 + angles.a2, FORE);
	return { elbow, wrist };
}

function around(p: Point, r: number, deg: number): Point {
	const t = (deg * Math.PI) / 180;
	return { x: p.x + Math.cos(t) * r, y: p.y + Math.sin(t) * r };
}

describe('swing', () => {
	it('is positive for clockwise turns on screen (y down)', () => {
		expect(swing(O, { x: 10, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90);
		expect(swing(O, { x: 10, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(-90);
	});

	it('is zero without a turn, regardless of distance', () => {
		expect(swing(O, { x: 5, y: 5 }, { x: 20, y: 20 })).toBeCloseTo(0);
	});

	it('measures around the pivot', () => {
		const p = { x: 100, y: 50 };
		expect(swing(p, { x: 110, y: 50 }, { x: 100, y: 60 })).toBeCloseTo(90);
	});

	it('wraps across ±180 to the short way round', () => {
		expect(swing(O, around(O, 10, 170), around(O, 10, -170))).toBeCloseTo(20);
		expect(swing(O, around(O, 10, -170), around(O, 10, 170))).toBeCloseTo(-20);
	});

	it('stays within -180..180', () => {
		for (let a = -360; a <= 360; a += 15) {
			for (let b = -360; b <= 360; b += 15) {
				const s = swing(O, around(O, 10, a), around(O, 10, b));
				expect(s).toBeGreaterThanOrEqual(-180);
				expect(s).toBeLessThanOrEqual(180);
			}
		}
	});
});

describe('reachArm', () => {
	const REST: ArmAngles = { a1: 20, a2: -6 };
	const reachable: Point[] = [];
	for (let deg = 0; deg < 360; deg += 20) {
		for (const r of [4, 10, 18, 25, 31]) reachable.push(around(SHOULDER, r, deg));
	}

	it.each(reachable.map((t) => [t.x.toFixed(2), t.y.toFixed(2), t] as const))(
		'lands the wrist on (%s, %s)',
		(_x, _y, target) => {
			for (const prev of [REST, { a1: 20, a2: 40 }, { a1: 0, a2: 0 }]) {
				const { wrist } = joints(reachArm(target, SHOULDER, UPPER, FORE, prev));
				expect(wrist.x).toBeCloseTo(target.x, 2);
				expect(wrist.y).toBeCloseTo(target.y, 2);
			}
		}
	);

	it.each([0, 45, 90, 135, 180, 225, 270, 315])(
		'straightens toward an out-of-reach target at %i°',
		(deg) => {
			const target = around(SHOULDER, 80, deg);
			const angles = reachArm(target, SHOULDER, UPPER, FORE, REST);
			expect(Math.abs(angles.a2)).toBeLessThan(2);
			const { wrist } = joints(angles);
			expect(Math.hypot(wrist.x - SHOULDER.x, wrist.y - SHOULDER.y)).toBeCloseTo(UPPER + FORE, 1);
			const dir = swing(SHOULDER, wrist, target);
			expect(Math.abs(dir)).toBeLessThan(1);
		}
	);

	it('does not stretch an arm that can reach', () => {
		for (const target of reachable) {
			expect(reachArm(target, SHOULDER, UPPER, FORE, REST).stretch).toBe(1);
		}
	});

	it('stretches like rubber past its reach: one to one at first, then ever less', () => {
		const reach = UPPER + FORE;
		const at = (d: number) => reachArm(around(SHOULDER, d, 90), SHOULDER, UPPER, FORE, REST);
		expect(at(reach + 2).stretch * reach).toBeCloseTo(reach + 2, 0);
		expect(at(reach * 2).stretch).toBeGreaterThan(1.6);
		expect(at(reach * 2).stretch).toBeLessThan(2);
		expect(at(reach * 50).stretch).toBeLessThanOrEqual(GRAB_LIMITS.arm);
	});

	it('keeps the bend direction of prev while bent', () => {
		for (let deg = 0; deg < 360; deg += 30) {
			const target = around(SHOULDER, 18, deg);
			const neg = reachArm(target, SHOULDER, UPPER, FORE, { a1: 20, a2: -30 });
			const pos = reachArm(target, SHOULDER, UPPER, FORE, { a1: 20, a2: 30 });
			expect(neg.a2).toBeLessThan(-25);
			expect(pos.a2).toBeGreaterThan(25);
		}
	});

	it('prefers the outward elbow when prev is straight', () => {
		for (let deg = 0; deg < 360; deg += 30) {
			const target = around(SHOULDER, 18, deg);
			const free = reachArm(target, SHOULDER, UPPER, FORE, { a1: 0, a2: 0 });
			const neg = reachArm(target, SHOULDER, UPPER, FORE, { a1: 0, a2: -30 });
			const pos = reachArm(target, SHOULDER, UPPER, FORE, { a1: 0, a2: 30 });
			const outward = Math.min(joints(neg).elbow.x, joints(pos).elbow.x);
			expect(joints(free).elbow.x).toBeCloseTo(outward, 6);
		}
	});

	it('prefers the outward elbow for a nearly straight reach even against prev', () => {
		const target = around(SHOULDER, 31.5, 90);
		const a = reachArm(target, SHOULDER, UPPER, FORE, { a1: 0, a2: -30 });
		const b = reachArm(target, SHOULDER, UPPER, FORE, { a1: 0, a2: 30 });
		expect(joints(a).elbow.x).toBeCloseTo(joints(b).elbow.x, 6);
	});

	it('keeps a1 on the same turn as prev', () => {
		for (const prevA1 of [-540, -350, -180, 0, 170, 190, 350, 720]) {
			for (let deg = 0; deg < 360; deg += 30) {
				const target = around(SHOULDER, 20, deg);
				const { a1 } = reachArm(target, SHOULDER, UPPER, FORE, { a1: prevA1, a2: -10 });
				expect(Math.abs(a1 - prevA1)).toBeLessThanOrEqual(180);
			}
		}
	});

	it('returns the current pose unchanged for the current wrist', () => {
		const prev: ArmAngles = { a1: 30, a2: -50 };
		const next = reachArm(joints(prev).wrist, SHOULDER, UPPER, FORE, prev);
		expect(next.a1).toBeCloseTo(prev.a1);
		expect(next.a2).toBeCloseTo(prev.a2);
	});
});

describe('pullHead', () => {
	const pivot: Point = { x: 100, y: 130 };
	const from: Point = { x: 100, y: 80 };

	it('does nothing without a pull', () => {
		const r = pullHead(pivot, from, from);
		expect(r.angle).toBeCloseTo(0);
		expect(r.stretch).toBeCloseTo(1);
	});

	it('bends clockwise when pulled toward +x, nearly one to one at first', () => {
		const r = pullHead(pivot, from, around(pivot, 50, -90 + 10));
		expect(r.angle).toBeGreaterThan(9.5);
		expect(r.angle).toBeLessThan(10);
		expect(r.stretch).toBeCloseTo(1);
	});

	it('bends ever less the further it is pulled, never past the head limit', () => {
		const at = (deg: number) => pullHead(pivot, from, around(pivot, 50, -90 + deg)).angle;
		expect(at(40) - at(20)).toBeLessThan(at(20));
		expect(at(170)).toBeLessThan(GRAB_LIMITS.head);
		expect(at(-170)).toBeGreaterThan(-GRAB_LIMITS.head);
		expect(at(90)).toBeGreaterThan(GRAB_LIMITS.head * 0.8);
	});

	it('stretches when pulled away from the neck and squashes when pushed in', () => {
		expect(pullHead(pivot, from, { x: 100, y: 75 }).stretch).toBeCloseTo(1.1, 1);
		expect(pullHead(pivot, from, { x: 100, y: 85 }).stretch).toBeCloseTo(0.9, 1);
	});

	it('keeps stretching further out, but never past the limits', () => {
		const [lo, hi] = GRAB_LIMITS.stretch;
		const at = (y: number) => pullHead(pivot, from, { x: 100, y }).stretch;
		expect(at(0)).toBeGreaterThan(at(40));
		expect(at(-40)).toBeGreaterThan(at(0));
		expect(at(-2000)).toBeLessThanOrEqual(hi);
		expect(at(-2000)).toBeGreaterThan(hi - 0.01);
		expect(at(pivot.y)).toBeGreaterThanOrEqual(lo);
	});

	it('survives a grab right on the pivot', () => {
		const r = pullHead(pivot, pivot, { x: 100, y: 100 });
		expect(Number.isFinite(r.angle)).toBe(true);
		expect(Number.isFinite(r.stretch)).toBe(true);
	});
});

describe('legSwing', () => {
	const hip: Point = { x: 80, y: 220 };
	const foot = around(hip, 40, 90);
	const turned = (deg: number) => around(hip, 40, 90 + deg);

	it('follows small swings for both legs', () => {
		expect(legSwing(hip, foot, turned(5), -1)).toBeCloseTo(5, 0);
		expect(legSwing(hip, foot, turned(-5), -1)).toBeCloseTo(-5, 0);
		expect(legSwing(hip, foot, turned(5), 1)).toBeCloseTo(5, 0);
		expect(legSwing(hip, foot, turned(-5), 1)).toBeCloseTo(-5, 0);
	});

	it('lets the left leg swing far out but only a little in, with soft limits', () => {
		expect(legSwing(hip, foot, turned(60), -1)).toBeGreaterThan(45);
		expect(legSwing(hip, foot, turned(170), -1)).toBeLessThan(GRAB_LIMITS.legOut);
		expect(legSwing(hip, foot, turned(170), -1)).toBeGreaterThan(
			legSwing(hip, foot, turned(120), -1)
		);
		expect(legSwing(hip, foot, turned(-60), -1)).toBeGreaterThan(-GRAB_LIMITS.legIn);
		expect(legSwing(hip, foot, turned(-60), -1)).toBeLessThan(-GRAB_LIMITS.legIn * 0.9);
	});

	it('mirrors the limits for the right leg', () => {
		expect(legSwing(hip, foot, turned(-60), 1)).toBeCloseTo(-legSwing(hip, foot, turned(60), -1));
		expect(legSwing(hip, foot, turned(60), 1)).toBeCloseTo(-legSwing(hip, foot, turned(-60), -1));
	});

	it('swings the left foot toward -x when positive', () => {
		const deg = legSwing(hip, foot, turned(30), -1);
		const end = around(hip, 40, 90 + deg);
		expect(end.x).toBeLessThan(foot.x);
	});
});

describe('rubber', () => {
	it('follows one to one at first and approaches its limit without passing it', () => {
		expect(rubber(1, 50)).toBeCloseTo(1, 2);
		expect(rubber(-1, 50)).toBeCloseTo(-1, 2);
		expect(rubber(50, 50)).toBeLessThan(50);
		expect(rubber(500, 50)).toBeLessThanOrEqual(50);
		expect(rubber(500, 50)).toBeGreaterThan(49.9);
	});
});

describe('legStretch', () => {
	const hip: Point = { x: 80, y: 220 };
	const foot: Point = { x: 80, y: 260 };

	it('grows the leg as its foot is pulled away from the hip, softly up to the limit', () => {
		expect(legStretch(hip, foot, foot)).toBeCloseTo(0);
		expect(legStretch(hip, foot, { x: 80, y: 265 })).toBeCloseTo(5, 0);
		expect(legStretch(hip, foot, { x: 80, y: 2000 })).toBeLessThanOrEqual(GRAB_LIMITS.legGrow);
	});

	it('only shrinks a little when pushed toward the hip', () => {
		const pushed = legStretch(hip, foot, hip);
		expect(pushed).toBeLessThan(0);
		expect(pushed).toBeGreaterThanOrEqual(-GRAB_LIMITS.legShrink);
	});
});

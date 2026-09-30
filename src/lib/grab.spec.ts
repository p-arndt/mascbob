import { describe, expect, it } from 'vitest';
import {
	GRAB_LIMITS,
	headWarp,
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
	const pivot: Point = { x: 100, y: 166 };
	const from: Point = { x: 100, y: 66 };
	const pulled = (dx: number, dy: number) =>
		pullHead(pivot, from, { x: from.x + dx, y: from.y + dy });

	it('does nothing without a pull', () => {
		const p = pulled(0, 0);
		expect(p.x).toBeCloseTo(0);
		expect(p.y).toBeCloseTo(0);
	});

	it.each([
		[1, 0],
		[-1, 0],
		[0, -1],
		[0.7, -0.7],
		[-0.7, 0.3]
	])('follows a small pull toward (%d, %d) one to one', (x, y) => {
		const p = pulled(x * 5, y * 5);
		expect(p.x).toBeCloseTo(x * 5, 0);
		expect(p.y).toBeCloseTo(y * 5, 0);
	});

	it('follows sideways pulls sideways instead of turning them upward', () => {
		const p = pulled(120, 0);
		expect(p.x).toBeGreaterThan(80);
		expect(Math.abs(p.y)).toBeLessThan(1);
	});

	it('resists more the further it is pulled, in every direction', () => {
		const { head } = GRAB_LIMITS;
		expect(pulled(1000, 0).x).toBeLessThanOrEqual(head.side * 100);
		expect(pulled(-1000, 0).x).toBeGreaterThanOrEqual(-head.side * 100);
		expect(pulled(0, -1000).y).toBeGreaterThanOrEqual(-head.out * 100);
		expect(pulled(200, 0).x - pulled(100, 0).x).toBeLessThan(pulled(100, 0).x);
	});

	it('never pushes the grabbed spot past the neck', () => {
		expect(pulled(0, 1000).y).toBeLessThanOrEqual(GRAB_LIMITS.head.in * 100);
		expect(pulled(0, 1000).y).toBeLessThan(pivot.y - from.y);
	});

	it('survives a grab right on the pivot', () => {
		const p = pullHead(pivot, pivot, { x: 130, y: 100 });
		expect(Number.isFinite(p.x)).toBe(true);
		expect(Number.isFinite(p.y)).toBe(true);
	});
});

describe('headWarp', () => {
	const apply = ([a, b, c, d]: number[], p: Point): Point => ({
		x: a * p.x + c * p.y,
		y: b * p.x + d * p.y
	});

	it('is the identity without a pull', () => {
		headWarp({ x: 10, y: -80 }, { x: 0, y: 0 }).forEach((v, i) =>
			expect(v).toBeCloseTo([1, 0, 0, 1][i])
		);
	});

	it('carries the grabbed spot along with the pull', () => {
		const grab = { x: 20, y: -90 };
		const pull = { x: 35, y: -12 };
		const p = apply(headWarp(grab, pull), grab);
		expect(p.x).toBeCloseTo(grab.x + pull.x);
		expect(p.y).toBeCloseTo(grab.y + pull.y);
	});

	it('keeps the neck in place', () => {
		const warp = headWarp({ x: 0, y: -100 }, { x: 40, y: -30 });
		const neck = apply(warp, { x: 0, y: 0 });
		expect(neck.x).toBeCloseTo(0);
		expect(neck.y).toBeCloseTo(0);
	});

	it('turns rather than skews a head pulled sideways', () => {
		const [a, b, , d] = headWarp({ x: 0, y: -100 }, { x: 60, y: 0 });
		// A pure rotation has a = d and b = -c; a pure skew would leave a = 1 and b = 0.
		expect(b).toBeGreaterThan(0.2);
		expect(Math.abs(a - d)).toBeLessThan(0.1);
	});

	it('only stretches a head pulled straight out', () => {
		const [a, b, c, d] = headWarp({ x: 0, y: -100 }, { x: 0, y: -50 });
		expect(a).toBeCloseTo(1);
		expect(b).toBeCloseTo(0);
		expect(c).toBeCloseTo(0);
		expect(d).toBeCloseTo(1.5);
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

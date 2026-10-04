import { describe, expect, it } from 'vitest';
import {
	absence,
	approach,
	arc,
	blocksHeadroom,
	dangle,
	entryStart,
	fall,
	fly,
	hopDuration,
	letGo,
	offScreen,
	onScreen,
	pickEntrance,
	pickEntryTarget,
	pickHop,
	rotate,
	standX,
	stretch,
	throwVelocity,
	unwind,
	type Box,
	type HeadroomHit,
	type Flight,
	type Swing
} from './buddy.js';

const view = { top: 1000, height: 800, inset: 68 };
const box = (top: number, left = 100, width = 400): Box => ({ left, top, width, height: 200 });

describe('page buddy', () => {
	it('keeps its feet on the surface it stands on', () => {
		expect(standX(box(0), 50)).toBe(110);
		expect(standX(box(0), 300)).toBe(300);
		expect(standX(box(0), 900)).toBe(490);
		// A surface narrower than its feet puts it in the middle.
		expect(standX(box(0, 100, 12), 0)).toBe(106);
	});

	it('only stands where its head clears the nav and its feet are on screen', () => {
		expect(onScreen(box(1100), view)).toBe(false);
		expect(onScreen(box(1300), view)).toBe(true);
		expect(onScreen(box(1790), view)).toBe(false);
		expect(onScreen(box(600), view)).toBe(false);
	});

	it('only stands where nothing it would cover sits right above', () => {
		const nothing: HeadroomHit = {
			own: false,
			ancestor: false,
			ignored: false,
			text: false,
			media: false,
			painted: false
		};
		const hit = (h: Partial<HeadroomHit>) => blocksHeadroom({ ...nothing, ...h });
		// Bare layout, its own card and the page around it are just backdrop.
		expect(hit({})).toBe(false);
		expect(hit({ ancestor: true, painted: true })).toBe(false);
		expect(hit({ own: true, text: true })).toBe(false);
		expect(hit({ ignored: true, painted: true })).toBe(false);
		// The line above, a picture or someone else's card would end up behind it.
		expect(hit({ text: true })).toBe(true);
		expect(hit({ ancestor: true, text: true })).toBe(true);
		expect(hit({ media: true })).toBe(true);
		expect(hit({ painted: true })).toBe(true);
	});

	it('hops to a surface in reach, never the one it stands on', () => {
		const from = { x: 300, y: 500 };
		const ground = box(500);
		const step = box(420, 450, 200);
		const far = box(500, 1400, 200);
		const high = box(100);
		for (const roll of [0, 0.5, 0.999]) {
			expect(pickHop(from, [ground, step, far, high], () => roll)).toBe(1);
		}
		expect(pickHop(from, [ground, far, high])).toBe(-1);
	});

	it('prefers a close surface over a distant one', () => {
		const from = { x: 300, y: 500 };
		const boxes = [box(470, 520, 100), box(140, 600, 100)];
		const picks = [0.1, 0.3, 0.5, 0.7].map((roll) => pickHop(from, boxes, () => roll));
		expect(picks.filter((i) => i === 0).length).toBeGreaterThan(picks.length / 2);
	});

	it('hops in an arc that starts and ends on its two spots', () => {
		const from = { x: 0, y: 500 };
		const to = { x: 300, y: 400 };
		expect(arc(from, to, 0)).toEqual(from);
		expect(arc(from, to, 1)).toEqual(to);
		expect(arc(from, to, 0.5).y).toBeLessThan(400 - 40);
	});

	it('keeps hops snappy whatever the distance', () => {
		expect(hopDuration({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(380);
		expect(hopDuration({ x: 0, y: 0 }, { x: 0, y: 5000 })).toBe(1000);
	});
});

describe('leaving the screen and coming back', () => {
	const span = { left: 0, right: 1440 };
	const size = 54;

	it('only counts as gone once none of it shows, with the nav hiding the top', () => {
		expect(offScreen({ x: 300, y: 1400 }, view, size)).toBeNull();
		expect(offScreen({ x: 300, y: 1820 }, view, size)).toBeNull();
		expect(offScreen({ x: 300, y: 1860 }, view, size)).toBe('bottom');
		expect(offScreen({ x: 300, y: 1060 }, view, size)).toBe('top');
		expect(offScreen({ x: 300, y: 1080 }, view, size)).toBeNull();
	});

	it('stays away for a few seconds after a fall, but barely when following a scroll', () => {
		for (const roll of [0, 0.5, 0.999]) {
			const fell = absence('fell', () => roll);
			expect(fell).toBeGreaterThanOrEqual(2000);
			expect(fell).toBeLessThanOrEqual(5000);
			expect(absence('scrolled', () => roll)).toBeLessThan(800);
		}
		expect(absence('fell', () => 0)).not.toBe(absence('fell', () => 0.9));
	});

	it('follows a scrolling reader in from the side they scrolled toward', () => {
		for (const roll of [0, 0.5, 0.999]) {
			expect(pickEntrance('top', () => roll, true)).toBe('above');
			expect(pickEntrance('bottom', () => roll, true)).toBe('below');
		}
	});

	it('comes back from every edge after a fall, mostly from below', () => {
		const rolls = Array.from({ length: 100 }, (_, i) => i / 100);
		const picks = rolls.map((r) => pickEntrance('bottom', () => r));
		expect(new Set(picks)).toEqual(new Set(['below', 'above', 'left', 'right']));
		expect(picks.filter((p) => p === 'below').length).toBe(50);
		expect(new Set(rolls.map((r) => pickEntrance(null, () => r)))).toEqual(
			new Set(['above', 'left', 'right'])
		);
	});

	it('comes back onto a surface near the edge it enters over', () => {
		const boxes = [box(1450, 100, 300), box(1450, 1000, 300), box(1300, 600, 200)];
		expect(pickEntryTarget('left', boxes, view, span, () => 0)).toBe(0);
		expect(pickEntryTarget('right', boxes, view, span, () => 0)).toBe(1);
		expect(pickEntryTarget('below', [box(1100), box(1560)], view, span, () => 0)).toBe(1);
		expect(pickEntryTarget('above', [], view, span)).toBe(-1);
	});

	it('waits for its entrance just out of sight', () => {
		const target = box(1450);
		for (const entrance of ['left', 'right', 'above', 'below'] as const) {
			const start = entryStart(entrance, target, view, span, size, () => 0.5);
			expect(offScreen(start, view, size) ?? (start.x < 0 || start.x > 1440)).toBeTruthy();
		}
		const left = entryStart('left', target, view, span, size);
		expect(left.x + size / 2).toBeLessThan(span.left);
		expect(left.y).toBeLessThan(target.top);
		const above = entryStart('above', target, view, span, size, () => 0.5);
		expect(above.x).toBe(300);
		expect(above.y).toBeLessThan(view.top);
	});
});

describe('smoothing the page buddy', () => {
	it('eases toward a target at the same pace whatever the frame rate', () => {
		let fast = 0;
		for (let i = 0; i < 4; i++) fast = approach(fast, 100, 1 / 120);
		const slow = approach(0, 100, 1 / 30);
		expect(fast).toBeCloseTo(slow);
		expect(slow).toBeGreaterThan(0);
		expect(slow).toBeLessThan(100);
		expect(approach(40, 40, 1)).toBe(40);
	});

	it('drops whole spins so it gets up the short way round', () => {
		expect(unwind(375)).toBeCloseTo(15);
		expect(unwind(-370)).toBeCloseTo(-10);
		expect(unwind(190)).toBeCloseTo(-170);
		expect(unwind(12)).toBeCloseTo(12);
	});
});

describe('throwing the page buddy', () => {
	const walls = { left: 20, right: 1400, top: -10000 };
	const at = (x: number, y: number, vx = 0, vy = 0, spin = 0): Flight => ({
		x,
		y,
		vx,
		vy,
		angle: 0,
		spin
	});
	const simulate = (
		start: Flight,
		boxes: Box[],
		seconds = 3,
		fps = 60,
		bounds = walls,
		from = -1
	) => {
		let flight = start;
		let ground = from;
		let top = start.y;
		let slid = false;
		for (let t = 0; t < seconds; t += 1 / fps) {
			const next = fly(flight, 1 / fps, boxes, bounds, ground);
			flight = next.flight;
			ground = next.ground;
			slid ||= ground >= 0 && next.landed < 0;
			top = Math.min(top, flight.y);
			if (next.landed >= 0) return { flight, landed: next.landed, t, top, slid };
		}
		return { flight, landed: -1, t: seconds, top, slid };
	};

	it('falls onto the perch below and stands on its top edge', () => {
		const { flight, landed } = simulate(at(200, 300), [box(380)]);
		expect(landed).toBe(0);
		expect(flight).toEqual({ x: 200, y: 380, vx: 0, vy: 0, angle: 0, spin: 0 });
	});

	it('bounces off a hard landing before it settles', () => {
		const first = fall(at(200, 370, 100, 2000), 1 / 60, [box(380)], walls);
		expect(first.landed).toBe(-1);
		expect(first.ground).toBe(-1);
		expect(first.impact).toBe(true);
		expect(first.flight.vy).toBeLessThan(0);
		// Skidding on the ground sets it tumbling the way it slides.
		expect(first.flight.spin).toBeGreaterThan(0);
		expect(simulate(first.flight, [box(380)]).landed).toBe(0);
	});

	it('passes perches it is not over and rises through them from below', () => {
		expect(simulate(at(800, 300), [box(380)], 0.5).landed).toBe(-1);
		const up = fall(at(200, 400, 0, -1500), 1 / 60, [box(380)], walls);
		expect(up.landed).toBe(-1);
		expect(up.flight.y).toBeLessThan(380);
	});

	it('bounces back off the sides of the screen', () => {
		const next = fall(at(1395, 0, 1200), 1 / 60, [], walls);
		expect(next.flight.x).toBe(1400);
		expect(next.flight.vx).toBeLessThan(0);
	});

	it('never leaves through the sides, however hard it is thrown', () => {
		for (const vx of [-4200, 4200]) {
			let flight = at(700, 0, vx, -3000);
			for (let i = 0; i < 120; i++) {
				flight = fly(flight, 1 / 30, [], walls).flight;
				expect(flight.x).toBeGreaterThanOrEqual(20);
				expect(flight.x).toBeLessThanOrEqual(1400);
			}
		}
		// Already past a wall, it heads back in instead of flipping back out.
		expect(fall(at(1450, 0, -300), 1 / 60, [], walls).flight.vx).toBeLessThan(0);
	});

	it('bounces off the top of the screen and comes back down', () => {
		const bounds = { ...walls, top: 100 };
		const up = simulate(at(200, 600, 0, -4000), [box(700)], 3, 60, bounds);
		expect(up.top).toBe(100);
		expect(up.landed).toBe(0);
		const hit = fall(at(200, 105, 300, -2000), 1 / 60, [], bounds).flight;
		expect(hit.y).toBe(100);
		// It loses about half its speed against the ceiling.
		expect(hit.vy).toBeGreaterThan(0);
		expect(hit.vy).toBeLessThan(1200);
	});

	it('flies the same arc at any frame rate', () => {
		const landing = (fps: number) =>
			simulate(at(100, 300, 900, -1400), [box(500, 0, 1400)], 3, fps);
		const smooth = landing(120);
		for (const fps of [60, 30, 12]) {
			const rough = landing(fps);
			expect(rough.landed).toBe(0);
			expect(Math.abs(rough.flight.x - smooth.flight.x)).toBeLessThan(15);
			expect(Math.abs(rough.t - smooth.t)).toBeLessThan(1 / fps + 0.01);
		}
	});

	it('hits a thin perch at full speed instead of skipping past it', () => {
		// One 30 fps frame carries it 80 px sideways, from before the perch to well past it.
		const thin = box(400, 210, 20);
		const flight = at(200, 395, 2400, 600);
		expect(fall(flight, 1 / 30, [thin], walls).impact).toBe(false);
		expect(fly(flight, 1 / 30, [thin], walls).impact).toBe(true);
	});

	it('keeps sliding after a landing instead of sticking where it touched down', () => {
		const { flight, landed, slid } = simulate(at(200, 360, 900, 0), [box(380, 0, 1400)]);
		expect(landed).toBe(0);
		expect(slid).toBe(true);
		expect(flight.x).toBeGreaterThan(300);
		expect(flight.vx).toBe(0);
		expect(flight.spin).toBe(0);
	});

	it('skids further on its back than on its feet', () => {
		const floor = [box(380, 0, 1400)];
		const feet = simulate(at(200, 380, 600), floor, 3, 60, walls, 0).flight.x;
		const lying = simulate({ ...at(200, 380, 600), angle: 90 }, floor, 3, 60, walls, 0).flight.x;
		expect(lying).toBeGreaterThan(feet);
	});

	it('slides off the end of a surface and drops onto the next one', () => {
		const short = box(380, 100, 200);
		const below = box(520, 0, 1400);
		const { landed, flight } = simulate(at(250, 380, 700), [short, below], 4, 60, walls, 0);
		expect(landed).toBe(1);
		expect(flight.x).toBeGreaterThan(300);
	});

	it('tips over and tumbles in a fast skid, then flops onto its side, back or feet', () => {
		const floor = [box(380, 0, 1400)];
		const fast = simulate(at(100, 380, 2000), floor, 4, 60, walls, 0).flight;
		expect(Math.abs(fast.angle)).toBeGreaterThanOrEqual(90);
		expect(fast.angle % 90).toBe(0);
		// A slow shuffle only leans it and it ends up on its feet again.
		expect(simulate(at(100, 380, 300), floor, 3, 60, walls, 0).flight.angle).toBe(0);
	});

	it('bounces off the side of the screen while sliding', () => {
		const next = fall(at(1395, 380, 1200), 1 / 60, [box(380, 0, 1500)], walls, 0);
		expect(next.flight.x).toBe(1400);
		expect(next.flight.vx).toBeLessThan(0);
		expect(next.ground).toBe(0);
	});

	it('slows down in the air and its spin dies away', () => {
		const { flight } = simulate(at(200, 0, 1000, 0, 600), [], 1);
		expect(flight.vx).toBeLessThan(1000);
		expect(flight.vx).toBeGreaterThan(700);
		expect(flight.spin).toBeLessThan(600);
		expect(flight.spin).toBeGreaterThan(100);
		expect(flight.angle).toBeGreaterThan(200);
	});

	it('throws with the pointer speed of the last moments, capped', () => {
		const slow = throwVelocity([
			{ x: 0, y: 0, t: 0 },
			{ x: 0, y: 0, t: 500 },
			{ x: 30, y: -15, t: 550 }
		]);
		expect(slow.x).toBeCloseTo(600);
		expect(slow.y).toBeCloseTo(-300);
		const fast = throwVelocity([
			{ x: 0, y: 0, t: 0 },
			{ x: 5000, y: 0, t: 10 }
		]);
		expect(Math.hypot(fast.x, fast.y)).toBeCloseTo(4200);
		expect(throwVelocity([{ x: 1, y: 1, t: 0 }])).toEqual({ x: 0, y: 0 });
	});

	it('hits the highest surface it falls through in one step', () => {
		const next = fall(at(200, 300, 0, 600), 1 / 10, [box(340), box(320)], walls);
		expect(next.impact).toBe(true);
		expect(next.flight.y).toBe(320);
	});

	// A flick at 1500 px/s, sampled like pointer events at 120 Hz.
	const flick = (until: number, from = 0) =>
		Array.from({ length: Math.floor((until - from) / 8) + 1 }, (_, i) => {
			const t = from + i * 8;
			return { x: t * 1.5, y: -t * 0.5, t };
		});

	it('reads the throw through a jittery or repeated last sample', () => {
		const samples = flick(200);
		const jittered = samples.map((s, i) => ({ ...s, x: s.x + (i % 2 ? 3 : -3) }));
		expect(throwVelocity(jittered).x).toBeCloseTo(1500, -2);
		// Letting go reports the spot of the last move once more, a moment later.
		const end = samples.at(-1)!;
		const repeated = [...samples, { ...end, t: end.t + 30 }];
		expect(throwVelocity(repeated).x).toBeCloseTo(1500, -1);
		// Repeated after a real rest, it is a drop.
		expect(Math.abs(throwVelocity([...samples, { ...end, t: end.t + 150 }]).x)).toBeLessThan(1);
	});

	it('drops instead of throwing after the pointer rested', () => {
		const samples = flick(200);
		expect(Math.abs(throwVelocity(samples, 330).x)).toBeLessThan(1);
		// A frame without a pointer event is not a rest.
		expect(throwVelocity(samples, 216).x).toBeCloseTo(1500, -1);
	});
});

describe('holding the page buddy', () => {
	// Held by the head: the grab point is above the center of mass.
	const head: { x: number; y: number } = { x: 0, y: -18 };
	const gyration = 28;
	const run = (s: Swing, accel: { x: number; y: number }, seconds: number, fps = 60) => {
		const angles: number[] = [];
		for (let t = 0; t < seconds; t += 1 / fps) {
			s = dangle(s, head, accel, 1 / fps, gyration);
			angles.push(s.angle);
		}
		return { swing: s, angles };
	};

	it('hangs still below the grab point', () => {
		expect(run({ angle: 0, spin: 0 }, { x: 0, y: 0 }, 1).swing.angle).toBeCloseTo(0);
	});

	it('lags behind the hand, swings back and settles', () => {
		// Pulled to the right, its body trails to the left: a clockwise tilt.
		const pulled = run({ angle: 0, spin: 0 }, { x: 8000, y: 0 }, 0.08).swing;
		expect(pulled.angle).toBeGreaterThan(0);
		expect(pulled.spin).toBeGreaterThan(0);
		const { swing, angles } = run(pulled, { x: 0, y: 0 }, 4);
		expect(Math.min(...angles)).toBeLessThan(0);
		expect(Math.abs(swing.angle)).toBeLessThan(2);
		// Its tilt moves on smoothly from one frame to the next.
		for (let i = 1; i < angles.length; i++) {
			expect(Math.abs(angles[i] - angles[i - 1])).toBeLessThan(12);
		}
	});

	it('tips over when held by its feet', () => {
		const feet = { x: 0.5, y: 30 };
		let s: Swing = { angle: 0, spin: 0 };
		for (let i = 0; i < 240; i++) s = dangle(s, feet, { x: 0, y: 0 }, 1 / 60, gyration);
		expect(Math.abs(s.angle)).toBeCloseTo(180, -1);
	});

	it('swings the same at any frame rate', () => {
		const at60 = run({ angle: 30, spin: 0 }, { x: 0, y: 0 }, 0.5, 60).swing.angle;
		const at20 = run({ angle: 30, spin: 0 }, { x: 0, y: 0 }, 0.5, 20).swing.angle;
		expect(Math.abs(at60 - at20)).toBeLessThan(3);
	});

	it('leaves the hand with its swing as spin', () => {
		const still = letGo({ angle: 0, spin: 0 }, head, { x: 500, y: -200 });
		expect(still).toEqual({ vx: 500, vy: -200, spin: 0 });
		// Swinging clockwise under the hand, its body is moving to the left.
		const swinging = letGo({ angle: 0, spin: 300 }, head, { x: 0, y: 0 });
		expect(swinging.spin).toBe(300);
		expect(swinging.vx).toBeLessThan(0);
		expect(swinging.vy).toBeCloseTo(0);
		expect(letGo({ angle: 0, spin: 9000 }, head, { x: 0, y: 0 }).spin).toBe(720);
	});

	it('stretches along its flight around its center, keeping its size', () => {
		const center = { x: 0, y: -40 };
		expect(stretch(0, 0, center)).toBe('none');
		const parse = (m: string) => m.slice(7, -1).split(', ').map(Number);
		const [a, b, c, d, e, f] = parse(stretch(0, 3000, center));
		expect(d).toBeGreaterThan(1.1);
		expect(a).toBeLessThan(1);
		expect(a * d - b * c).toBeCloseTo(1);
		// The center stays put.
		expect(a * center.x + c * center.y + e).toBeCloseTo(center.x);
		expect(b * center.x + d * center.y + f).toBeCloseTo(center.y);
		const diagonal = parse(stretch(1000, 1000, center));
		const along = rotate({ x: 1, y: 0 }, 45);
		const out = {
			x: diagonal[0] * along.x + diagonal[2] * along.y,
			y: diagonal[1] * along.x + diagonal[3] * along.y
		};
		expect(Math.hypot(out.x, out.y)).toBeGreaterThan(1.05);
		expect(out.y / out.x).toBeCloseTo(1);
	});
});

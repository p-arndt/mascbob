import { describe, expect, it } from 'vitest';
import { Gait, STEP_TIME, STEP_TRAVEL, walkSpeed, type WalkPose, type Walking } from './walk.js';

const DT = 1 / 60;

/** Runs the gait for `seconds`, moving the body the way a page would at `walkSpeed`. */
function run(gait: Gait, walking: Walking, seconds: number, start = 0) {
	const frames: { x: number; pose: WalkPose }[] = [];
	const dir = walking === -1 || walking === 1 ? walking : 0;
	let x = start;
	for (let t = 0; t < seconds; t += DT) {
		x += (dir * STEP_TRAVEL * DT) / STEP_TIME;
		frames.push({ x, pose: gait.advance(DT, walking) });
	}
	return frames;
}

describe('walk cycle', () => {
	it('keeps a planted foot still on the ground while the body moves over it', () => {
		for (const dir of [-1, 1] as const) {
			const frames = run(new Gait(), dir, 3);
			for (const side of [-1, 1] as const) {
				let plantedAt: number | null = null;
				for (const { x, pose } of frames) {
					const foot = pose.feet[side];
					if (foot.lift > 0) {
						plantedAt = null;
						continue;
					}
					const ground = x + foot.dx;
					plantedAt ??= ground;
					expect(Math.abs(ground - plantedAt)).toBeLessThan(0.6);
				}
			}
		}
	});

	it('never spreads the feet much further than a step from their resting spots', () => {
		const frames = run(new Gait(), 1, 4);
		for (const { pose } of frames) {
			for (const side of [-1, 1] as const) {
				expect(Math.abs(pose.feet[side].dx)).toBeLessThanOrEqual(STEP_TRAVEL + 1.5);
			}
		}
	});

	it('steps with the leading foot first and then alternates', () => {
		const frames = run(new Gait(), -1, 4 * STEP_TIME);
		const lifted = frames
			.map(({ pose }) => (pose.feet[-1].lift > 0 ? -1 : pose.feet[1].lift > 0 ? 1 : 0))
			.filter((side, i, all) => side !== 0 && side !== all[i - 1]);
		expect(lifted.slice(0, 4)).toEqual([-1, 1, -1, 1]);
	});

	it('marches on the spot without moving the feet sideways', () => {
		const frames = run(new Gait(), true, 2);
		expect(frames.some(({ pose }) => pose.feet[-1].lift > 5)).toBe(true);
		expect(frames.some(({ pose }) => pose.feet[1].lift > 5)).toBe(true);
		for (const { pose } of frames) {
			expect(pose.feet[-1].dx).toBe(0);
			expect(pose.feet[1].dx).toBe(0);
			// One foot at a time.
			expect(Math.min(pose.feet[-1].lift, pose.feet[1].lift)).toBe(0);
		}
	});

	it('swings the arm opposite the stepping leg forward', () => {
		const frames = run(new Gait(), true, 2);
		const mid = frames.filter(({ pose }) => pose.feet[-1].lift > 10);
		expect(mid.length).toBeGreaterThan(0);
		for (const { pose } of mid) {
			expect(pose.arms[1]).toBeGreaterThan(0);
			expect(pose.arms[-1]).toBeLessThan(0);
		}
	});

	it('eases in instead of starting at full sway', () => {
		const gait = new Gait();
		const first = run(gait, 1, 0.05);
		const later = run(gait, 1, 1);
		const sway = (f: { pose: WalkPose }[]) =>
			Math.max(...f.map(({ pose }) => Math.abs(pose.shift)));
		expect(sway(first)).toBeLessThan(sway(later) / 2);
	});

	it('closes its stance and comes to rest once it stops', () => {
		const gait = new Gait();
		run(gait, 1, 1.1);
		expect(gait.busy).toBe(true);
		const stopping = run(gait, false, 1.5);
		const end = stopping.at(-1)!.pose;
		expect(gait.busy).toBe(false);
		expect(end.feet[-1]).toEqual({ dx: 0, lift: 0 });
		expect(end.feet[1]).toEqual({ dx: 0, lift: 0 });
		expect(end.bob).toBeCloseTo(0, 2);
		// Standing still, every foot that comes back home is lifted, never dragged.
		for (const side of [-1, 1] as const) {
			let last = stopping[0].pose.feet[side];
			for (const { pose } of stopping) {
				const foot = pose.feet[side];
				if (foot.lift === 0 && last.lift === 0)
					expect(Math.abs(foot.dx - last.dx)).toBeLessThan(0.6);
				last = foot;
			}
		}
	});

	it('scales the matching walk speed with the size', () => {
		expect(walkSpeed(200)).toBeCloseTo(STEP_TRAVEL / STEP_TIME);
		expect(walkSpeed(54)).toBeCloseTo(walkSpeed(200) * 0.27);
	});
});

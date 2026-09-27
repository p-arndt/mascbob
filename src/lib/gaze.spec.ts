import { describe, expect, it } from 'vitest';
import { SACCADE_BLINK, SACCADE_MIN, aimAt, saccade } from './gaze.js';

describe('aimAt', () => {
	it('looks toward the pointer and stays within -1..1', () => {
		const right = aimAt(300, 0, 200);
		expect(right.x).toBeGreaterThan(0.5);
		expect(right.y).toBe(0);
		const far = aimAt(-5000, 5000, 200);
		expect(Math.hypot(far.x, far.y)).toBeLessThanOrEqual(1);
		expect(far.x).toBeLessThan(0);
		expect(far.y).toBeGreaterThan(0);
	});

	it('responds strongly to small moves and saturates for far ones', () => {
		const near = aimAt(60, 0, 200).x;
		const twice = aimAt(120, 0, 200).x;
		const far = aimAt(2000, 0, 200).x;
		expect(twice).toBeLessThan(near * 2);
		expect(far).toBeGreaterThan(0.95);
	});

	it('focuses only when the pointer is close', () => {
		expect(aimAt(0, 0, 200).focus).toBe(1);
		expect(aimAt(60, 0, 200).focus).toBeGreaterThan(0.5);
		expect(aimAt(400, 0, 200).focus).toBe(0);
	});

	it('looks straight ahead when the pointer is on the face', () => {
		expect(aimAt(0, 0, 200)).toMatchObject({ x: 0, y: 0 });
	});
});

describe('saccade', () => {
	it('holds tiny moves and jumps on real ones', () => {
		const o = { x: 0, y: 0 };
		expect(saccade(o, { x: SACCADE_MIN / 2, y: 0 }).jump).toBe(false);
		expect(saccade(o, { x: SACCADE_MIN, y: 0 }).jump).toBe(true);
	});

	it('blinks only on big jumps', () => {
		const o = { x: -0.4, y: 0 };
		expect(saccade(o, { x: 0, y: 0 }).blink).toBe(false);
		expect(saccade(o, { x: -0.4 + SACCADE_BLINK, y: 0 }).blink).toBe(true);
	});
});

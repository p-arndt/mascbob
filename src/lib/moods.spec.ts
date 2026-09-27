import { describe, expect, it } from 'vitest';
import { MOOD_CONFIGS, moodConfig } from './moods.js';
import { MOODS, type Mood } from './types.js';

describe('moods', () => {
	it('has a config for every mood', () => {
		expect(Object.keys(MOOD_CONFIGS).sort()).toEqual([...MOODS].sort());
	});

	it.each(MOODS)('%s keeps its face parameters in drawable ranges', (mood) => {
		const { face, floatSpeed } = moodConfig(mood);
		for (const eye of [face.left, face.right]) {
			expect(eye.open).toBeGreaterThanOrEqual(0);
			expect(eye.scale).toBeGreaterThan(0);
			for (const v of [eye.lift, eye.lidInner, eye.lidOuter, eye.heart]) {
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
		expect(Math.abs(face.gazeX)).toBeLessThanOrEqual(1);
		expect(Math.abs(face.gazeY)).toBeLessThanOrEqual(1);
		expect(face.mouthOpen).toBeGreaterThanOrEqual(0);
		expect(face.cheeks).toBeGreaterThanOrEqual(0);
		expect(floatSpeed).toBeGreaterThan(0);
	});

	it('winks with exactly one eye', () => {
		const { face } = moodConfig('wink');
		expect(face.left.lift).toBe(0);
		expect(face.right.lift).toBeGreaterThan(0.5);
	});

	it('falls back to idle for unknown moods', () => {
		expect(moodConfig('nope' as Mood)).toBe(MOOD_CONFIGS.idle);
	});
});

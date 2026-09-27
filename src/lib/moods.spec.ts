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
			expect(Math.abs(eye.browTilt)).toBeLessThanOrEqual(1);
			expect(Math.abs(eye.browLift)).toBeLessThanOrEqual(6);
			for (const v of [eye.lift, eye.lidInner, eye.lidOuter, eye.heart, eye.brow]) {
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
		expect(Math.abs(face.gazeX)).toBeLessThanOrEqual(1);
		expect(Math.abs(face.gazeY)).toBeLessThanOrEqual(1);
		expect(face.mouthOpen).toBeGreaterThanOrEqual(0);
		expect(face.cheeks).toBeGreaterThanOrEqual(0);
		for (const v of [face.mouthCat, face.mouthRound, face.tongue, face.blushLines]) {
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
		expect(floatSpeed).toBeGreaterThan(0);
	});

	it('winks with exactly one eye', () => {
		const { face } = moodConfig('wink');
		expect(face.left.lift).toBe(0);
		expect(face.right.lift).toBeGreaterThan(0.5);
		// A brow over the closed eye made the wink read as a squint.
		expect(face.right.brow).toBe(0);
	});

	it('looks away and blushes when shy', () => {
		const { face } = moodConfig('shy');
		expect(face.gazeY).toBeGreaterThan(0);
		expect(Math.abs(face.gazeX)).toBeGreaterThan(0.3);
		expect(face.cheeks).toBe(1);
	});

	it('frowns with lowered inner brows when grumpy and raised ones when sad', () => {
		const grumpy = moodConfig('grumpy').face;
		const sad = moodConfig('sad').face;
		expect(grumpy.left.brow).toBe(1);
		expect(grumpy.left.browTilt).toBeLessThan(0);
		expect(sad.left.browTilt).toBeGreaterThan(0);
	});

	it('raises one brow more than the other while thinking', () => {
		const { face } = moodConfig('thinking');
		expect(face.right.browLift).toBeGreaterThan(face.left.browLift);
	});

	it('uses the round mouth for surprised and a tongue-out grin for wink', () => {
		expect(moodConfig('surprised').face.mouthRound).toBe(1);
		expect(moodConfig('wink').face.tongue).toBe(1);
	});

	it('only draws brows and blush marks where a mood asks for them', () => {
		const { face } = moodConfig('idle');
		expect(face.left.brow + face.right.brow + face.blushLines).toBe(0);
	});

	it('falls back to idle for unknown moods', () => {
		expect(moodConfig('nope' as Mood)).toBe(MOOD_CONFIGS.idle);
	});
});

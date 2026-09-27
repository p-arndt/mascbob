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

	it('waves with both eyes open and winks without waving', () => {
		const waving = moodConfig('waving');
		expect(waving.hands).toBe('wave');
		expect(waving.face.left.open).toBe(1);
		expect(waving.face.right.open).toBe(1);
		expect(moodConfig('wink').hands).not.toBe('wave');
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

	it('keeps faint resting brows so mood changes move them instead of fading them in', () => {
		for (const mood of ['idle', 'happy', 'love'] as const) {
			const { face } = moodConfig(mood);
			expect(face.left.brow, mood).toBeGreaterThan(0);
			expect(face.left.brow, mood).toBeLessThan(0.5);
		}
		expect(moodConfig('wink').face.left.brow).toBeGreaterThan(0);
		expect(moodConfig('idle').face.blushLines).toBe(0);
	});

	it('pulls the mouth to one side with skew', () => {
		expect(moodConfig('thinking').face.mouthSkew).toBe(-1.5);
		expect(moodConfig('wink').face.mouthSkew).toBe(1.5);
		expect(moodConfig('grumpy').face.mouthSkew).not.toBe(0);
		expect(moodConfig('idle').face.mouthSkew).toBe(0);
	});

	it('laughs with squeezed crescents and a wide open grin', () => {
		const { face, effect } = moodConfig('laughing');
		expect(face.left.lift).toBeGreaterThanOrEqual(0.8);
		expect(face.left.open).toBeLessThan(1);
		expect(face.mouthOpen).toBeGreaterThan(moodConfig('happy').face.mouthOpen);
		expect(face.mouthCurve).toBeGreaterThan(4);
		expect(effect).toBe('sparkles');
	});

	it('narrows the eyes and lowers the brows when focused', () => {
		const { face } = moodConfig('focused');
		expect(face.left.open).toBeLessThan(1);
		expect(face.left.browLift).toBeLessThan(0);
		expect(face.gazeY).toBeGreaterThan(0);
		expect(face.mouthOpen).toBe(0);
		expect(face.mouthX).not.toBe(0);
	});

	it('raises one brow and tilts the head when curious', () => {
		const { face, effect } = moodConfig('curious');
		expect(face.left.browLift - face.right.browLift).toBeGreaterThan(2);
		expect(Math.abs(face.tilt)).toBeGreaterThanOrEqual(8);
		expect(face.mouthRound).toBeGreaterThan(0.5);
		expect(effect).toBe('question');
	});

	it('widens small eyes under worried brows and sweats when nervous', () => {
		const { face, effect } = moodConfig('nervous');
		expect(face.left.open).toBeGreaterThan(1);
		expect(face.left.scale).toBeLessThan(1);
		expect(face.left.browTilt).toBeGreaterThan(0);
		expect(face.mouthCurve).toBeLessThan(0);
		expect(effect).toBe('sweat');
	});

	it('falls back to idle for unknown moods', () => {
		expect(moodConfig('nope' as Mood)).toBe(MOOD_CONFIGS.idle);
	});
});

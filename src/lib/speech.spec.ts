import { describe, expect, it } from 'vitest';
import { CLOSED_LIPS, VOWELS, createBabble, createLaugh, createVisemes } from './speech.js';

/** Deterministic PRNG so the babble is reproducible. */
function seeded(seed: number) {
	return () => {
		seed = (seed * 16807) % 2147483647;
		return (seed - 1) / 2147483646;
	};
}

describe('createBabble', () => {
	const samples = (seed: number) => {
		const babble = createBabble(seeded(seed));
		return Array.from({ length: 600 }, (_, i) => babble.level(i * 16));
	};

	it('stays within 0..1', () => {
		for (const l of samples(1)) {
			expect(l).toBeGreaterThanOrEqual(0);
			expect(l).toBeLessThanOrEqual(1);
		}
	});

	it('opens wide and shuts fully between beats', () => {
		const levels = samples(7);
		expect(Math.max(...levels)).toBeGreaterThan(0.6);
		expect(levels.filter((l) => l < 0.05).length).toBeGreaterThan(levels.length * 0.1);
	});

	it('opens several separate syllables per second', () => {
		const levels = samples(3);
		let onsets = 0;
		for (let i = 1; i < levels.length; i++) if (levels[i - 1] < 0.1 && levels[i] >= 0.1) onsets++;
		// 600 frames ≈ 9.6 s.
		expect(onsets).toBeGreaterThan(15);
	});
});

describe('createVisemes', () => {
	const onsets = (seed: number, n = 2000) => {
		const v = createVisemes(seeded(seed));
		return Array.from({ length: n }, () => v.onset());
	};

	it('never repeats a vowel twice in a row', () => {
		const picks = onsets(5);
		for (let i = 1; i < picks.length; i++) expect(picks[i].vowel).not.toBe(picks[i - 1].vowel);
	});

	it('uses every vowel', () => {
		expect(new Set(onsets(11).map((o) => o.vowel)).size).toBe(VOWELS.length);
	});

	it('starts about a quarter of syllables with closed lips', () => {
		const picks = onsets(9);
		const closed = picks.filter((o) => o.lead === CLOSED_LIPS).length / picks.length;
		expect(closed).toBeGreaterThan(0.2);
		expect(closed).toBeLessThan(0.3);
		expect(CLOSED_LIPS.press).toBe(1);
		for (const v of VOWELS) expect(v.press).toBe(0);
	});
});

describe('createLaugh', () => {
	it('pulses in bursts of 4 to 6 quick "ha"s with pauses between', () => {
		const laugh = createLaugh(seeded(4));
		const levels = Array.from({ length: 1200 }, (_, i) => laugh.level(i * 5));
		for (const l of levels) {
			expect(l).toBeGreaterThanOrEqual(0);
			expect(l).toBeLessThanOrEqual(1);
		}
		// Split into bursts at silences and count the peaks inside each.
		const bursts: number[] = [];
		let peaks = 0;
		for (let i = 1; i < levels.length - 1; i++) {
			if (levels[i] === 0 && levels[i - 1] > 0) {
				bursts.push(peaks);
				peaks = 0;
			}
			if (levels[i] > levels[i - 1] && levels[i] >= levels[i + 1] && levels[i] > 0.3) peaks++;
		}
		expect(bursts.length).toBeGreaterThan(2);
		for (const b of bursts) {
			expect(b).toBeGreaterThanOrEqual(4);
			expect(b).toBeLessThanOrEqual(6);
		}
	});
});

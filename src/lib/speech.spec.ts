import { describe, expect, it } from 'vitest';
import { createBabble } from './speech.js';

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

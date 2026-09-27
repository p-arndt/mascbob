import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS } from '../geometry.js';
import { BURST_LIFETIME, boopBurst, burst, confettiPop, mulberry32 } from './effects.js';

describe('burst', () => {
	const base = {
		cx: 100,
		cy: 100,
		rx: 50,
		ry: 50,
		count: 12,
		kinds: ['star', 'dot'] as const,
		tones: ['accent', 'cheek'] as const,
		arc: [-Math.PI, 0] as [number, number],
		reach: [20, 30] as [number, number],
		gravity: [10, 20] as [number, number],
		size: [4, 6] as [number, number],
		duration: [600, 800] as [number, number],
		stagger: 40
	};

	it('is deterministic for a seeded rng', () => {
		expect(burst({ ...base, rng: mulberry32(7) })).toEqual(burst({ ...base, rng: mulberry32(7) }));
	});

	it('spreads particles across the arc and throws them against gravity', () => {
		const ps = burst({ ...base, rng: mulberry32(3) });
		expect(ps).toHaveLength(12);
		expect(ps.some((p) => p.dx < 0)).toBe(true);
		expect(ps.some((p) => p.dx > 0)).toBe(true);
		for (const p of ps) {
			// Every particle falls back down after its apex.
			expect(p.fall).toBeGreaterThan(p.rise);
			expect(p.rise).toBeLessThan(0);
			expect(p.size).toBeGreaterThanOrEqual(4);
			expect(p.size).toBeLessThanOrEqual(6);
			expect(p.delay).toBeLessThanOrEqual(40);
		}
	});

	it('cycles through the requested kinds', () => {
		const ps = burst({ ...base, count: 4, rng: mulberry32(1) });
		expect(ps.map((p) => p.kind)).toEqual(['star', 'dot', 'star', 'dot']);
	});
});

describe('presets', () => {
	for (const [name, shape] of Object.entries(SHAPE_DEFS)) {
		it(`fit within their lifetime and stay near the head (${name})`, () => {
			for (const ps of [boopBurst(shape, mulberry32(1)), confettiPop(shape, mulberry32(2))]) {
				expect(ps.length).toBeGreaterThan(0);
				for (const p of ps) {
					expect(p.delay + p.duration).toBeLessThanOrEqual(BURST_LIFETIME);
					expect(Math.abs(p.x + p.dx - 100)).toBeLessThan(110);
					expect(p.y + p.rise).toBeGreaterThan(-20);
				}
			}
		});
	}

	it('uses the theme tones only', () => {
		const tones = new Set(boopBurst(SHAPE_DEFS.orb, mulberry32(9)).map((p) => p.tone));
		for (const tone of tones) expect(['accent', 'cheek', 'eye', 'light']).toContain(tone);
	});
});

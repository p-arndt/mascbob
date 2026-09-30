import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS } from '../geometry.js';
import {
	BLAST_LIFETIME,
	BURST_LIFETIME,
	LOOPS,
	WAVE_PERIOD,
	boopBurst,
	burst,
	confettiPop,
	headBlast,
	mulberry32,
	waveDelay
} from './effects.js';

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

	it('blasts all around the head within its lifetime', () => {
		for (const shape of Object.values(SHAPE_DEFS)) {
			const ps = headBlast(shape, mulberry32(4));
			expect(ps.some((p) => p.dx < -20)).toBe(true);
			expect(ps.some((p) => p.dx > 20)).toBe(true);
			for (const p of ps) expect(p.delay + p.duration).toBeLessThanOrEqual(BLAST_LIFETIME);
		}
	});

	it('uses the theme tones only', () => {
		const tones = new Set(boopBurst(SHAPE_DEFS.orb, mulberry32(9)).map((p) => p.tone));
		for (const tone of tones) expect(['accent', 'cheek', 'eye', 'light']).toContain(tone);
	});
});

describe('ambient loops', () => {
	/** True when a/b is close to a ratio of small whole numbers, i.e. the pair replays in step. */
	const locked = (a: number, b: number) => {
		for (let p = 1; p <= 4; p++)
			for (let q = 1; q <= 4; q++) if (Math.abs(a / b - p / q) < 0.02) return true;
		return false;
	};

	for (const [name, loops] of Object.entries(LOOPS)) {
		it(`gives every ${name} particle its own incommensurate period`, () => {
			for (let i = 0; i < loops.length; i++)
				for (let j = i + 1; j < loops.length; j++) {
					expect(locked(loops[i].period, loops[j].period), `${i} vs ${j}`).toBe(false);
				}
		});
	}

	it('offsets the two sides of the sound waves by half a period', () => {
		for (const i of [0, 1, 2]) expect(waveDelay(i, 1) - waveDelay(i, -1)).toBe(WAVE_PERIOD / 2);
	});
});

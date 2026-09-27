import { describe, expect, it } from 'vitest';
import { ACCESSORIES, propellerSpin, starPath } from './accessories.js';

describe('accessories', () => {
	it('has unique names', () => {
		expect(new Set(ACCESSORIES).size).toBe(ACCESSORIES.length);
	});

	it('includes the decorative extras', () => {
		expect(ACCESSORIES).toEqual(
			expect.arrayContaining(['crown', 'bow', 'glasses', 'star-clip', 'beanie'])
		);
	});

	it('includes the costume extras', () => {
		expect(ACCESSORIES).toEqual(
			expect.arrayContaining(['party-hat', 'propeller', 'horns', 'flower', 'monocle', 'mustache'])
		);
	});

	it('whirls the propeller when excited and rests it when low', () => {
		expect(propellerSpin('happy')).toBeGreaterThan(0);
		expect(propellerSpin('happy')).toBeLessThan(propellerSpin('idle'));
		expect(propellerSpin('sleepy')).toBe(0);
		expect(propellerSpin('sad')).toBe(0);
	});

	it('builds a closed ten-point star within its radius', () => {
		const d = starPath(10);
		expect(d.startsWith('M0.00 -10.00')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		const nums = d.match(/-?\d+\.\d+/g)!.map(Number);
		expect(nums).toHaveLength(20);
		for (const n of nums) expect(Math.abs(n)).toBeLessThanOrEqual(10);
	});
});

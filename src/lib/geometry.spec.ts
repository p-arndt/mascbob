import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS, eyePath, mouthPath } from './geometry.js';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const open = { lift: 0, lidLeft: 0, lidRight: 0 };

describe('eyePath', () => {
	it('draws a closed shape that spans the eye width', () => {
		const d = eyePath(80, 96, 16, 20, open);
		expect(d.startsWith('M72 96')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		const xs = numbers(d).filter((_, i) => i % 2 === 0);
		expect(Math.min(...xs)).toBe(72);
		expect(Math.max(...xs)).toBe(88);
	});

	it('is symmetric when open', () => {
		const ys = numbers(eyePath(80, 96, 16, 20, open)).filter((_, i) => i % 2 === 1);
		expect(96 - Math.min(...ys)).toBeCloseTo(Math.max(...ys) - 96, 5);
	});

	it('keeps the lower lid below the upper lid for any lift', () => {
		for (const lift of [0, 0.5, 0.8, 1, 5]) {
			const ys = numbers(eyePath(80, 96, 16, 20, { ...open, lift })).filter((_, i) => i % 2 === 1);
			const [, , topCtrl1, topCtrl2, , , bottomCtrl] = ys;
			expect(bottomCtrl).toBeGreaterThan(Math.min(topCtrl1, topCtrl2));
		}
	});

	it('tilts the top edge with uneven lids', () => {
		const ys = numbers(eyePath(80, 96, 16, 20, { lift: 0, lidLeft: 0.6, lidRight: 0 })).filter(
			(_, i) => i % 2 === 1
		);
		expect(ys[1]).toBeGreaterThan(ys[2]);
	});
});

describe('mouthPath', () => {
	it('curves up for positive curve and down for negative', () => {
		expect(numbers(mouthPath(100, 116, 12, 3, 0))[3]).toBe(122);
		expect(numbers(mouthPath(100, 116, 12, -3, 0))[3]).toBe(110);
	});

	it('opens below the top curve', () => {
		const n = numbers(mouthPath(100, 116, 12, 3, 4));
		expect(n[7]).toBe(n[3] + 8);
	});

	it('ignores negative openings', () => {
		expect(mouthPath(100, 116, 12, 3, -4)).toBe(mouthPath(100, 116, 12, 3, 0));
	});
});

describe('shapes', () => {
	it.each(Object.entries(SHAPE_DEFS))('%s fits the viewBox', (_, s) => {
		expect(s.top).toBeGreaterThan(20);
		expect(s.bottom + 14).toBeLessThan(200);
		expect(100 + s.halfWidth + 22).toBeLessThanOrEqual(200);
	});
});

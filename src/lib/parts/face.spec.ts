import { describe, expect, it } from 'vitest';
import { browPath, catMouthPath, chevronPath, eyePath, mouthPath } from './face.js';

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

describe('catMouthPath', () => {
	it('dips twice and meets in the middle at the base line', () => {
		const n = numbers(catMouthPath(100, 116, 12, 2));
		expect(n).toEqual([94, 116, 97, 120, 100, 116, 103, 120, 106, 116]);
	});
});

describe('chevronPath', () => {
	it('points both eyes at the nose, like "> <"', () => {
		const left = numbers(chevronPath(80, 96, 10, 8, 'left'));
		const right = numbers(chevronPath(120, 96, 10, 8, 'right'));
		expect(left).toEqual([75, 92, 85, 96, 75, 100]);
		expect(right).toEqual([125, 92, 115, 96, 125, 100]);
	});
});

describe('browPath', () => {
	it('is flat without tilt', () => {
		const [, y0, , y1] = numbers(browPath(80, 80, 10, 0, 'left'));
		expect(y0).toBe(y1);
	});

	it('raises the inner end for positive tilt on both sides', () => {
		// Left eye: the inner end is on the right; right eye: on the left.
		const [lx0, ly0, lx1, ly1] = numbers(browPath(80, 80, 10, 0.4, 'left'));
		expect(lx1).toBeGreaterThan(lx0);
		expect(ly1).toBeLessThan(ly0);
		const [rx0, ry0, rx1, ry1] = numbers(browPath(120, 80, 10, 0.4, 'right'));
		expect(rx1).toBeLessThan(rx0);
		expect(ry1).toBeLessThan(ry0);
	});

	it('lowers the inner end for negative tilt', () => {
		const [, y0, , y1] = numbers(browPath(80, 80, 10, -0.5, 'left'));
		expect(y1).toBeGreaterThan(y0);
	});
});

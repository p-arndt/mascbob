import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS } from './geometry.js';
import { SHAPES } from './types.js';

/** Every point of the path, control points included: a conservative hull of the silhouette. */
function hullPoints(d: string): { x: number; y: number }[] {
	const points: { x: number; y: number }[] = [];
	for (const [, cmd, args] of d.matchAll(/([MLCQAZ])([^MLCQAZ]*)/g)) {
		const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
		if (cmd === 'A') {
			// rx ry rotation large-arc sweep x y: pad the end point by the radius on every side.
			for (let i = 0; i + 7 <= n.length; i += 7) {
				const [rx, ry, , , , x, y] = n.slice(i, i + 7);
				points.push({ x: x - rx, y }, { x: x + rx, y: y + 2 * ry });
			}
		} else {
			for (let i = 0; i + 1 < n.length; i += 2) points.push({ x: n[i], y: n[i + 1] });
		}
	}
	return points;
}

const defs = Object.entries(SHAPE_DEFS);

describe('shapes', () => {
	it('defines every shape', () => {
		expect(Object.keys(SHAPE_DEFS).sort()).toEqual([...SHAPES].sort());
	});

	it.each(defs)('%s fits the viewBox', (_, s) => {
		expect(s.top).toBeGreaterThan(20);
		expect(s.bottom + 14).toBeLessThan(200);
		expect(100 + s.halfWidth + 22).toBeLessThanOrEqual(200);
	});

	it.each(defs)('%s is a closed path inside the viewBox', (_, s) => {
		expect(s.d).toMatch(/^M\d/);
		expect(s.d.trim().endsWith('Z')).toBe(true);
		for (const p of hullPoints(s.d)) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThanOrEqual(200);
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThanOrEqual(200);
		}
	});

	it.each(defs)('%s leaves room for the face and matches its bounds', (_, s) => {
		expect(s.halfWidth).toBeGreaterThanOrEqual(48);
		expect(s.top).toBeLessThan(60);
		expect(s.crownHalfWidth).toBeGreaterThan(20);
		expect(s.crownHalfWidth).toBeLessThanOrEqual(s.halfWidth);
		expect(s.bottom).toBeGreaterThan(150);
		// Ears may poke past `top`, but nothing hangs below the declared bottom (the squash pivot).
		const ys = hullPoints(s.d).map((p) => p.y);
		expect(Math.max(...ys)).toBeLessThanOrEqual(s.bottom + 4);
	});
});

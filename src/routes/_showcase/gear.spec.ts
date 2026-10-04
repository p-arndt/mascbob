import { describe, expect, it } from 'vitest';
import { FOOT_COLLAR } from '$lib/parts/body.js';
import { creatureGeometry, creatureViewTop } from '$lib/species.js';
import { gearCrop, gearLabel } from './gear.js';

/** The visible window in viewBox units, from a crop's tile fractions. */
function window(c: ReturnType<typeof gearCrop>, viewTop = 0) {
	const side = 200 / c.width;
	const height = side / (c.aspect ?? 1);
	return { x: -c.left * side, y: viewTop - c.top * side + (side - height) / 2, side, height };
}

describe('gear preview crops', () => {
	it('shows bob and critter head gear on a bare head', () => {
		for (const species of ['bob', 'critter'] as const) {
			const c = gearCrop('head', species, 'capsule');
			expect(c.body).toBe(false);
			const w = window(c);
			expect(w.side).toBeLessThan(200);
			expect(w.x + w.side / 2).toBe(100);
		}
	});

	it('zooms on the face for eye styles, closer than for head gear', () => {
		const face = gearCrop('face', 'bob', 'capsule');
		expect(face.body).toBe(false);
		expect(window(face).side).toBeLessThan(window(gearCrop('head', 'bob', 'capsule')).side);
		expect(gearCrop('face', 'wisp', 'capsule')).toEqual(gearCrop('head', 'wisp', 'capsule'));
	});

	it('frames the whole snail but only the crown of the other companions', () => {
		expect(window(gearCrop('head', 'snail', 'capsule')).side).toBe(200);
		const octo = gearCrop('head', 'octo', 'capsule');
		expect(octo.body).toBe(true);
		expect(window(octo).side).toBeLessThan(200);
	});

	it('zooms on the feet, following longer legs down', () => {
		const shoes = window(gearCrop('shoes', 'bob', 'capsule'));
		const longLegs = window(gearCrop('shoes', 'bob', 'capsule', { legs: 1.8 }));
		expect(shoes.side).toBeLessThan(150);
		expect(longLegs.y).toBeGreaterThan(shoes.y);
	});

	it('fits both boots and the tallest skate collar into the shoes window', () => {
		for (const species of ['bob', 'critter'] as const) {
			const { head, build } = creatureGeometry(species, 'capsule', undefined, {}, true);
			const viewTop = creatureViewTop(species, head, build);
			const w = window(gearCrop('shoes', species, 'capsule'), viewTop);
			const toe = build.legX + 33.5 * build.footScale;
			expect(w.x).toBeLessThan(100 - toe);
			expect(w.x + w.side).toBeGreaterThan(100 + toe);
			expect(w.y).toBeLessThan(build.groundY - FOOT_COLLAR.skates * build.footScale);
			expect(w.y + w.height).toBeGreaterThan(build.groundY);
		}
	});

	it('leans the held-item window toward the holding hand', () => {
		const hand = window(gearCrop('hand', 'bob', 'capsule'));
		expect(hand.x + hand.side / 2).toBeGreaterThan(100);
	});
});

it('labels gear in plain words', () => {
	expect(gearLabel('party-hat')).toBe('party hat');
	expect(gearLabel('cap')).toBe('cap');
});

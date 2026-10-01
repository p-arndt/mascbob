import { describe, expect, it } from 'vitest';
import { creatureGeometry, resolveProportions, SPECIES } from './species.js';
import { BUILD_DEFS } from './parts/body.js';
import { SHAPE_DEFS } from './geometry.js';

describe('creature geometry', () => {
	it('preserves the original Bob geometry with no options', () => {
		const g = creatureGeometry('bob', 'capsule', undefined);
		expect(g.head).toEqual(SHAPE_DEFS.capsule);
		expect(g.build).toEqual(BUILD_DEFS.standard);
	});
	it('keeps unified species legless even when passed a standing build', () => {
		for (const species of ['moss', 'wisp', 'octo', 'snail'] as const) {
			const g = creatureGeometry(species, 'cat', 'lanky');
			expect(g.build.legs).toBe(false);
			expect(g).toEqual(creatureGeometry(species, 'orb', undefined));
		}
	});
	it('changes anatomy dimensions together, keeping the ground below the hips', () => {
		const g = creatureGeometry('critter', 'capsule', undefined, {
			height: 1.2,
			legs: 0.7,
			arms: 1.3
		});
		expect(g.build.upperArm).toBeCloseTo(BUILD_DEFS.chibi.upperArm * 1.3);
		expect(g.build.hipY).toBeGreaterThan(BUILD_DEFS.chibi.hipY);
		expect(g.build.groundY - g.build.hipY).toBeCloseTo(
			(BUILD_DEFS.chibi.groundY - BUILD_DEFS.chibi.hipY) * 0.7
		);
		expect(g.build.viewHeight).toBeGreaterThan(g.build.groundY);
	});
	it('ignores body proportions in avatar mode', () => {
		for (const species of SPECIES) {
			expect(
				creatureGeometry(
					species,
					'capsule',
					undefined,
					{ height: 1.3, body: 1.3, tail: 1.3 },
					false
				)
			).toEqual(creatureGeometry(species, 'capsule', undefined, {}, false));
		}
	});
	it('sanitizes non-finite and out-of-range proportions', () => {
		const p = resolveProportions({ head: Infinity, body: NaN, height: -2, arms: 8 });
		expect(p).toMatchObject({ head: 1, body: 1, height: 0.4, arms: 1.8, legs: 1 });
	});
	it('sizes octo tentacles without changing its face or bell', () => {
		const regular = creatureGeometry('octo', 'capsule', undefined);
		const long = creatureGeometry('octo', 'capsule', undefined, { arms: 1.8 });
		expect(long.head).toEqual(regular.head);
		expect(long.build.groundY).toBeGreaterThan(regular.build.groundY);
		expect(long.build.viewHeight).toBeGreaterThan(long.build.groundY);
	});
	it('keeps the face scale fixed while sizing unified crowns and repositions hands with body width', () => {
		for (const species of ['moss', 'wisp'] as const) {
			const regular = creatureGeometry(species, 'capsule', undefined);
			const wide = creatureGeometry(species, 'capsule', undefined, { body: 1.3 });
			const crown = creatureGeometry(species, 'capsule', undefined, { head: 1.3 });
			expect(wide.head.handHalfWidth).toBeGreaterThan(regular.head.handHalfWidth!);
			expect(wide.head.halfWidth).toBe(regular.head.halfWidth);
			expect(wide.head.top).toBe(regular.head.top);
			expect(crown.build.headScale).toBe(1);
			expect(crown.head.top).toBeLessThan(regular.head.top);
			expect(crown.head.bottom).toBe(regular.head.bottom);
		}
	});
});

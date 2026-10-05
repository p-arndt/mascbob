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
	it('keeps short limbs and narrow torsos proportionate without restricting lengths', () => {
		for (const build of Object.keys(BUILD_DEFS) as (keyof typeof BUILD_DEFS)[]) {
			const base = BUILD_DEFS[build];
			const { build: b } = creatureGeometry('bob', 'capsule', build, {
				body: 0.4,
				height: 0.4,
				arms: 0.4,
				legs: 0.4
			});
			expect(b.legX).toBeCloseTo(base.legX * 0.4);
			expect(b.legWidth).toBeCloseTo(base.legWidth * 0.4);
			expect(b.footScale).toBeCloseTo(base.footScale * 0.4);
			expect(b.armWidth).toBeCloseTo(base.armWidth * Math.sqrt(0.4));
			expect(b.torso.round).toBeCloseTo(base.torso.round * 0.4);
			expect(b.upperArm).toBeCloseTo(base.upperArm * 0.4);
		}
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
	it('thickens arms and slightly widens shoulders with muscle, only on jointed arms', () => {
		const strong = creatureGeometry('bob', 'capsule', undefined, { muscle: 1.6 });
		expect(strong.build.armWidth).toBeCloseTo(BUILD_DEFS.standard.armWidth * 1.6);
		expect(strong.build.upperArm).toBe(BUILD_DEFS.standard.upperArm);
		expect(strong.build.torso.max).toBeGreaterThan(BUILD_DEFS.standard.torso.max);
		expect(strong.build.torso.max).toBeLessThan(BUILD_DEFS.standard.torso.max * 1.6);
		expect(
			creatureGeometry('critter', 'capsule', undefined, { muscle: 1.6 }).build.armWidth
		).toBeCloseTo(BUILD_DEFS.chibi.armWidth * 1.6);
		for (const species of ['moss', 'wisp', 'octo', 'snail'] as const)
			expect(creatureGeometry(species, 'capsule', undefined, { muscle: 1.6 })).toEqual(
				creatureGeometry(species, 'capsule', undefined)
			);
	});
	it('ignores body proportions in avatar mode', () => {
		for (const species of SPECIES) {
			expect(
				creatureGeometry(
					species,
					'capsule',
					undefined,
					{ height: 1.3, body: 1.3, tail: 1.3, muscle: 1.3 },
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

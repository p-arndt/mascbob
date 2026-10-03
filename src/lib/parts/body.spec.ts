import { describe, expect, it } from 'vitest';
import { MOODS } from '../types.js';
import {
	BUILDS,
	BUILD_DEFS,
	BODY_VIEWBOX_HEIGHT,
	FOOT_SCALE,
	LEG_X,
	buildDef,
	torsoOuterWidth,
	type BuildDef,
	FOREARM,
	HIP_Y,
	OUTFITS,
	SHOES,
	legBottomY,
	collarTopY,
	shortsBottomY,
	BODY_GROUND_Y,
	TORSO_TOP,
	torsoHalfWidth,
	torsoPath,
	shoulderX,
	SHOULDER_Y,
	UPPER_ARM,
	armJoints,
	bodyPose,
	coreBeat,
	floatingHands,
	limbEnd
} from './body.js';

describe('limbEnd', () => {
	it('hangs straight down at 0 degrees', () => {
		const p = limbEnd(10, 20, 0, 5);
		expect(p.x).toBeCloseTo(10);
		expect(p.y).toBeCloseTo(25);
	});

	it('swings toward -x (outward for the left arm) for positive angles', () => {
		const p = limbEnd(0, 0, 90, 5);
		expect(p.x).toBeCloseTo(-5);
		expect(p.y).toBeCloseTo(0);
	});
});

describe('armJoints', () => {
	it('chains the upper arm and forearm from the shoulder', () => {
		const { shoulder, elbow, wrist } = armJoints({ a1: 0, a2: 0 }, 2);
		expect(shoulder).toEqual({ x: shoulderX(48), y: SHOULDER_Y + 2 });
		expect(elbow.y).toBeCloseTo(SHOULDER_Y + 2 + UPPER_ARM);
		expect(wrist.y).toBeCloseTo(SHOULDER_Y + 2 + UPPER_ARM + FOREARM);
	});
});

describe('bodyPose', () => {
	it('raises both arms for the up pose', () => {
		const p = bodyPose('up', 'happy');
		expect(p.left.a1).toBeGreaterThan(90);
		expect(p.right.a1).toBeGreaterThan(90);
	});

	it('waves with the right forearm pointing up', () => {
		const p = bodyPose('wave', 'waving');
		expect(p.swing).toBe('wave');
		expect(p.swingArm).toBe('right');
		expect(p.right.a1 + p.right.a2).toBeGreaterThan(135);
	});

	it('brings the thinking hand up to the chin', () => {
		const pose = bodyPose('think', 'thinking').right;
		const { shoulder, wrist } = armJoints(pose);
		// Under the capsule's chin (bottom 172), well inside the shoulder.
		expect(wrist.y).toBeGreaterThan(165);
		expect(wrist.y).toBeLessThan(178);
		expect(wrist.x).toBeGreaterThan(shoulder.x + 18);
		// A forearm folded back past ~110° piles the hand onto the shoulder joint.
		expect(Math.abs(pose.a2)).toBeLessThan(110);
		expect(Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y)).toBeGreaterThan(20);
	});

	it('brings the hands in toward the chest when in love', () => {
		const love = armJoints(bodyPose('up', 'love').left).wrist;
		const rest = armJoints(bodyPose('rest', 'idle').left).wrist;
		expect(love.x).toBeGreaterThan(rest.x + 15);
	});

	it('slumps the shoulders when sad or sleepy', () => {
		expect(bodyPose('rest', 'sad').drop).toBeGreaterThan(0);
		expect(bodyPose('rest', 'sleepy').drop).toBeGreaterThan(0);
		expect(bodyPose('rest', 'idle').drop).toBe(0);
	});

	it('has a pose for every mood', () => {
		for (const mood of MOODS) expect(bodyPose('rest', mood).left).toBeDefined();
	});
});

describe('coreBeat', () => {
	it('beats faster when excited and slower when sleepy', () => {
		const idle = coreBeat('idle').period;
		expect(coreBeat('happy').period).toBeLessThan(idle);
		expect(coreBeat('love').period).toBeLessThan(idle);
		expect(coreBeat('surprised').period).toBeLessThan(idle);
		expect(coreBeat('sleepy')).toEqual({ period: expect.any(Number), mode: 'dim' });
		expect(coreBeat('sleepy').period).toBeGreaterThan(idle);
		expect(coreBeat('sad').mode).toBe('flicker');
	});
});

describe('floatingHands', () => {
	it('keeps resting hands outside the head', () => {
		const { left, right } = floatingHands('rest', 'idle', 64);
		expect(left.x).toBeLessThan(100 - 64);
		expect(right).toEqual(left);
	});

	it('raises the right hand to wave', () => {
		const { left, right } = floatingHands('wave', 'waving', 64);
		expect(right.y).toBeLessThan(left.y);
	});
});

describe('OUTFITS', () => {
	it('starts with the bare default and offers several outfits', () => {
		expect(OUTFITS[0]).toBe('none');
		expect(OUTFITS).toContain('puffer');
		for (const outfit of ['overalls', 'jersey', 'tie', 'cape'] as const) {
			expect(OUTFITS).toContain(outfit);
		}
		expect(OUTFITS.length).toBeGreaterThanOrEqual(4);
		expect(new Set(OUTFITS).size).toBe(OUTFITS.length);
	});
});

describe('SHOES', () => {
	it('lists plain feet first, then the shoe styles', () => {
		expect(SHOES).toEqual([
			'none',
			'sneakers',
			'hightops',
			'boots',
			'slippers',
			'rainboots',
			'skates'
		]);
	});

	it('keeps slippers low and rainboots and skates tall', () => {
		expect(legBottomY('slippers')).toBeGreaterThan(legBottomY('sneakers'));
		expect(legBottomY('rainboots')).toBeLessThan(legBottomY('hightops'));
		expect(legBottomY('skates')).toBeLessThan(legBottomY('hightops'));
	});

	it('ends the overalls shorts above every collar and below the hips', () => {
		for (const shoes of SHOES) {
			expect(shortsBottomY(shoes)).toBeLessThan(collarTopY(shoes));
			expect(shortsBottomY(shoes)).toBeGreaterThan(HIP_Y);
		}
	});

	it('ends the legs inside the foot, higher for taller shoes', () => {
		for (const shoes of SHOES) {
			expect(legBottomY(shoes)).toBeLessThan(BODY_GROUND_Y);
		}
		expect(legBottomY('hightops')).toBeLessThan(legBottomY('sneakers'));
		expect(legBottomY('sneakers')).toBeLessThan(legBottomY('none'));
	});
});

describe('torso', () => {
	it('stays a little narrower than the head, and compact under wide heads', () => {
		expect(torsoHalfWidth(40)).toBe(36);
		expect(torsoHalfWidth(48)).toBeLessThan(48);
		expect(torsoHalfWidth(70)).toBe(44);
	});

	it('spans from the torso top down to the hips', () => {
		const ys = (torsoPath(48).match(/-?\d+(\.\d+)?/g) ?? [])
			.map(Number)
			.filter((_, i) => i % 2 === 1);
		expect(Math.min(...ys)).toBe(TORSO_TOP);
		expect(Math.max(...ys)).toBe(HIP_Y);
	});
});

describe('builds', () => {
	const legged = BUILDS.filter((b) => BUILD_DEFS[b].legs);
	const pathYs = (d: string) =>
		(d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);

	it('starts with the standard build and has a definition for each', () => {
		expect(BUILDS[0]).toBe('standard');
		for (const build of BUILDS) expect(buildDef(build)).toBe(BUILD_DEFS[build]);
		expect(buildDef(undefined)).toBe(BUILD_DEFS.standard);
	});

	it('keeps the standard build on the original proportions', () => {
		const b = BUILD_DEFS.standard;
		expect(b).toMatchObject({
			viewHeight: BODY_VIEWBOX_HEIGHT,
			groundY: BODY_GROUND_Y,
			torsoTop: TORSO_TOP,
			hipY: HIP_Y,
			shoulderY: SHOULDER_Y,
			upperArm: UPPER_ARM,
			forearm: FOREARM,
			legX: LEG_X,
			footScale: FOOT_SCALE,
			headScale: 1,
			headY: 0,
			legs: true,
			motion: 'stand'
		});
		expect(torsoPath(48, b)).toBe(
			'M52 162Q52 136 78 136L122 136Q148 136 148 162L148 188C148 206 126.4 214 100 214C73.6 214 52 206 52 188Z'
		);
		expect(torsoHalfWidth(70, b)).toBe(44);
		expect(shoulderX(48, b)).toBe(55);
	});

	it.each(BUILDS)('fits the %s figure inside its viewBox', (build) => {
		const b = BUILD_DEFS[build];
		expect(b.hipY).toBeLessThanOrEqual(b.groundY);
		expect(b.groundY).toBeLessThan(b.viewHeight);
		const ys = pathYs(torsoPath(torsoHalfWidth(48, b), b));
		expect(Math.min(...ys)).toBe(b.torsoTop);
		expect(Math.max(...ys)).toBeCloseTo(b.hipY);
	});

	it.each(legged)('keeps the %s legs under the torso in every shoe', (build) => {
		const b = BUILD_DEFS[build];
		const legTop = b.hipY - 10;
		for (const shoes of SHOES) {
			expect(legBottomY(shoes, b)).toBeGreaterThan(legTop);
			expect(legBottomY(shoes, b)).toBeLessThan(b.groundY);
			expect(shortsBottomY(shoes, b)).toBeGreaterThan(b.hipY);
		}
		expect(b.legX + b.legWidth / 2).toBeLessThan(torsoHalfWidth(48, b) * b.torso.hip);
	});

	it.each(legged)('lets the %s hands hang down to the hips', (build) => {
		const b = BUILD_DEFS[build];
		const x = shoulderX(torsoHalfWidth(48, b), b);
		const { wrist } = armJoints(bodyPose('rest', 'idle').left, 0, x, b);
		expect(wrist.y).toBeGreaterThan(b.hipY - 8);
		expect(wrist.y).toBeLessThan(b.groundY - 30);
	});

	it('keeps the blob hands off the ground', () => {
		const b = BUILD_DEFS.blob;
		const x = shoulderX(torsoHalfWidth(48, b), b);
		const { wrist } = armJoints(bodyPose('rest', 'idle').left, 0, x, b);
		expect(b.legs).toBe(false);
		expect(b.motion).toBe('float');
		expect(wrist.y).toBeLessThan(b.groundY - 12);
	});

	it('shapes each build distinctly', () => {
		const std = BUILD_DEFS.standard;
		const widest = (b: BuildDef) => torsoOuterWidth(torsoHalfWidth(48, b), b);
		expect(widest(BUILD_DEFS.chubby)).toBeGreaterThan(widest(std) + 10);
		expect(widest(BUILD_DEFS.lanky)).toBeLessThan(widest(std) - 8);
		const legLength = (b: BuildDef) => b.groundY - b.hipY;
		expect(legLength(BUILD_DEFS.lanky)).toBeGreaterThan(legLength(std));
		expect(legLength(BUILD_DEFS.chubby)).toBeLessThan(legLength(std));
		expect(legLength(BUILD_DEFS.chibi)).toBeLessThan(legLength(std));
		expect(BUILD_DEFS.chibi.headScale).toBeGreaterThan(1);
		expect(BUILD_DEFS.lanky.headScale).toBeLessThan(1);
		// A bell: the blob is widest at its base, which is also where it touches the ground.
		const blob = BUILD_DEFS.blob;
		expect(blob.torso.hip).toBeGreaterThan(blob.torso.shoulder);
		expect(blob.hipY).toBe(blob.groundY);
	});
});

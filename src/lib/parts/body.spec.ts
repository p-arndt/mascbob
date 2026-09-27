import { describe, expect, it } from 'vitest';
import { MOODS } from '../types.js';
import {
	FOREARM,
	HIP_Y,
	OUTFITS,
	SHOES,
	legBottomY,
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
		const { wrist } = armJoints(bodyPose('think', 'thinking').right);
		expect(wrist.y).toBeLessThan(SHOULDER_Y + 5);
		expect(wrist.x).toBeGreaterThan(shoulderX(48));
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
		expect(OUTFITS.length).toBeGreaterThanOrEqual(4);
		expect(new Set(OUTFITS).size).toBe(OUTFITS.length);
	});
});

describe('SHOES', () => {
	it('lists plain feet first, then the shoe styles', () => {
		expect(SHOES).toEqual(['none', 'sneakers', 'hightops', 'boots']);
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
	it('stays compact under wide heads', () => {
		expect(torsoHalfWidth(40)).toBe(40);
		expect(torsoHalfWidth(70)).toBe(48);
	});

	it('spans from the torso top down to the hips', () => {
		const ys = (torsoPath(48).match(/-?\d+(\.\d+)?/g) ?? [])
			.map(Number)
			.filter((_, i) => i % 2 === 1);
		expect(Math.min(...ys)).toBe(TORSO_TOP);
		expect(Math.max(...ys)).toBe(HIP_Y);
	});
});

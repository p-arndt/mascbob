import type { HandPose, Mood } from '../types.js';

/** Outfits for the full-body figure. The bare shell is the default; everything else is opt-in. */
export const OUTFITS = ['none', 'puffer', 'hoodie', 'scarf', 'bowtie'] as const;
export type Outfit = (typeof OUTFITS)[number];

/** Footwear for the full-body figure. `none` keeps plain rounded feet in the body colors. */
export const SHOES = ['none', 'sneakers', 'hightops', 'boots'] as const;
export type Shoes = (typeof SHOES)[number];

/** Full-body mode draws in a 200×300 viewBox: the head keeps its 200×200 coordinates on top. */
export const BODY_VIEWBOX_HEIGHT = 300;
/** Where the soles touch the ground; squash, rocking and the shadow all anchor here. */
export const BODY_GROUND_Y = 274;
/** Torso top (hidden under the head) and bottom (where the legs start). */
export const TORSO_TOP = 136;
export const HIP_Y = 214;
/** Collar band that hides the seam between head and torso. */
export const COLLAR_Y = 142;
export const COLLAR_H = 30;
export const SHOULDER_Y = 184;
export const UPPER_ARM = 17;
export const FOREARM = 15;
/** Legs sit this far left/right of the center line. */
export const LEG_X = 17;
/** Sneaker height from sole bottom to the top of the upper. */
export const SNEAKER_H = 36;
/** Feet are drawn in local units and scaled up by this much. */
export const FOOT_SCALE = 1.22;

/**
 * Height of each foot's collar (the opening the leg steps into) above the ground, in local
 * foot units. Plain feet have no collar; the leg simply merges into the foot.
 */
export const FOOT_COLLAR: Record<Shoes, number> = {
	none: 12,
	sneakers: 24,
	hightops: 36,
	boots: 33
};

/** Where the fixed part of the leg ends: at the collar, where the foot's ankle stub takes over. */
export function legBottomY(shoes: Shoes): number {
	return BODY_GROUND_Y - (FOOT_COLLAR[shoes] ?? FOOT_COLLAR.none) * FOOT_SCALE;
}

/** The torso stays compact under wide heads, otherwise it'd read as a barrel. */
export function torsoHalfWidth(headHalfWidth: number): number {
	return Math.min(headHalfWidth, 48);
}

/** Lower half of the capsule: straight sides, rounded hips. */
export function torsoPath(hw: number): string {
	const l = 100 - hw;
	const r = 100 + hw;
	return (
		`M${l} ${TORSO_TOP}L${r} ${TORSO_TOP}L${r} ${HIP_Y - 26}` +
		`C${r} ${HIP_Y - 8} ${100 + hw * 0.55} ${HIP_Y} 100 ${HIP_Y}` +
		`C${100 - hw * 0.55} ${HIP_Y} ${l} ${HIP_Y - 8} ${l} ${HIP_Y - 26}Z`
	);
}

/** Left shoulder x; the right arm mirrors around x = 100. */
export function shoulderX(torsoHw: number): number {
	return 100 - torsoHw + 3;
}

/**
 * Mitten with a tiny thumb. The wrist sits at the origin and the fingers point
 * along +y; the thumb is on +x, which faces the torso for a hanging left arm.
 */
export const MITTEN_PATH =
	'M-5.2 1.6C-6.4 7.4-5 12.6 0 12.6C5 12.6 6.3 8 5.7 5.4C7.7 5.7 9 3.9 8.2 2.1C7.4 .6 5.7 .7 4.7 1.9C4 -1 -4.6 -1 -5.2 1.6Z';

/** Arm angles in degrees, 0 = hanging straight down, positive = swung outward/up. */
export interface ArmAngles {
	/** Upper arm at the shoulder. */
	a1: number;
	/** Forearm relative to the upper arm. */
	a2: number;
}

/** Looping motion laid on top of a pose: `wave` swings the forearm, the rest are subtler. */
export type ArmSwing = 'none' | 'wave' | 'cheer' | 'gesture';

export interface BodyPose {
	left: ArmAngles;
	/** Mirrored: the same numbers give a symmetric pose. */
	right: ArmAngles;
	/** Which arm carries the swing. */
	swing: ArmSwing;
	swingArm: 'left' | 'right' | 'both';
	/** Shoulders sag by this many units (sad, sleepy). */
	drop: number;
}

const REST: ArmAngles = { a1: 20, a2: -6 };

const HAND_POSES: Record<HandPose, BodyPose> = {
	rest: { left: REST, right: REST, swing: 'none', swingArm: 'both', drop: 0 },
	up: {
		left: { a1: 140, a2: 18 },
		right: { a1: 140, a2: 18 },
		swing: 'cheer',
		swingArm: 'both',
		drop: 0
	},
	wave: {
		left: REST,
		right: { a1: 112, a2: 50 },
		swing: 'wave',
		swingArm: 'right',
		drop: 0
	},
	think: {
		left: { a1: -8, a2: -86 },
		right: { a1: -18, a2: -136 },
		swing: 'none',
		swingArm: 'both',
		drop: 0
	}
};

/** Body language that only makes sense for a mood, layered over the hand pose. */
const MOOD_POSES: Partial<Record<Mood, BodyPose>> = {
	listening: {
		left: REST,
		right: { a1: 96, a2: 70 },
		swing: 'none',
		swingArm: 'both',
		drop: 0
	},
	talking: {
		left: REST,
		right: { a1: 30, a2: 78 },
		swing: 'gesture',
		swingArm: 'right',
		drop: 0
	},
	surprised: {
		left: { a1: 118, a2: 48 },
		right: { a1: 118, a2: 48 },
		swing: 'none',
		swingArm: 'both',
		drop: 0
	},
	love: {
		left: { a1: -16, a2: -70 },
		right: { a1: -16, a2: -70 },
		swing: 'none',
		swingArm: 'both',
		drop: 0
	},
	sad: {
		left: { a1: 5, a2: -3 },
		right: { a1: 5, a2: -3 },
		swing: 'none',
		swingArm: 'both',
		drop: 3
	},
	sleepy: {
		left: { a1: 9, a2: -4 },
		right: { a1: 9, a2: -4 },
		swing: 'none',
		swingArm: 'both',
		drop: 2
	},
	// Hands fidgeting together low in front.
	shy: {
		left: { a1: -8, a2: -58 },
		right: { a1: -8, a2: -58 },
		swing: 'none',
		swingArm: 'both',
		drop: 1.5
	},
	grumpy: {
		left: { a1: -20, a2: -84 },
		right: { a1: -14, a2: -96 },
		swing: 'none',
		swingArm: 'both',
		drop: 0
	}
};

export function bodyPose(hands: HandPose, mood: Mood): BodyPose {
	return MOOD_POSES[mood] ?? HAND_POSES[hands] ?? HAND_POSES.rest;
}

/** End point of a limb of length `len` leaving (x, y) at angle `deg` (0 = down, positive = toward -x). */
export function limbEnd(x: number, y: number, deg: number, len: number) {
	const r = (deg * Math.PI) / 180;
	return { x: x - Math.sin(r) * len, y: y + Math.cos(r) * len };
}

/** Joint positions of the left arm (mirror x around 100 for the right one). */
export function armJoints(angles: ArmAngles, drop = 0, x = shoulderX(48)) {
	const shoulder = { x, y: SHOULDER_Y + drop };
	const elbow = limbEnd(shoulder.x, shoulder.y, angles.a1, UPPER_ARM);
	const wrist = limbEnd(elbow.x, elbow.y, angles.a1 + angles.a2, FOREARM);
	return { shoulder, elbow, wrist };
}

export type CoreMode = 'beat' | 'dim' | 'flicker';

/** Heartbeat of the chest core: seconds per beat and how it glows. */
export function coreBeat(mood: Mood): { period: number; mode: CoreMode } {
	switch (mood) {
		case 'surprised':
			return { period: 0.5, mode: 'beat' };
		case 'love':
			return { period: 0.6, mode: 'beat' };
		case 'happy':
			return { period: 0.72, mode: 'beat' };
		case 'wink':
		case 'shy':
		case 'talking':
			return { period: 0.9, mode: 'beat' };
		case 'sleepy':
			return { period: 2.8, mode: 'dim' };
		case 'sad':
			return { period: 2.2, mode: 'flicker' };
		case 'grumpy':
		case 'thinking':
			return { period: 1.4, mode: 'beat' };
		default:
			return { period: 1.15, mode: 'beat' };
	}
}

/** Floating hand placement in head-only mode: center point plus a tilt in degrees. */
export interface FloatingHand {
	x: number;
	y: number;
	rot: number;
}

/**
 * Where the floating hands hover beside a head of half width `hw`. Returned for
 * the left hand in its own mirrored frame (x measured outward from the head's
 * edge), so both sides share the same numbers.
 */
export function floatingHands(
	hands: HandPose,
	mood: Mood,
	hw: number
): { left: FloatingHand; right: FloatingHand } {
	const edge = 100 - hw;
	const at = (out: number, y: number, rot: number): FloatingHand => ({ x: edge - out, y, rot });
	const rest = at(12, 136, 18);
	switch (mood) {
		case 'surprised':
			return { left: at(4, 104, 160), right: at(4, 104, 160) };
		case 'love':
			return { left: at(-26, 162, -70), right: at(-26, 162, -70) };
		case 'sad':
			return { left: at(8, 146, 6), right: at(8, 146, 6) };
		case 'sleepy':
			return { left: at(10, 144, 10), right: at(10, 144, 10) };
		case 'listening':
			return { left: rest, right: at(8, 110, 150) };
		case 'grumpy':
			return { left: at(-18, 158, -60), right: at(-22, 164, -80) };
		case 'shy':
			return { left: at(-20, 166, -60), right: at(-20, 166, -60) };
	}
	switch (hands) {
		case 'up':
			return { left: at(16, 84, 150), right: at(16, 84, 150) };
		case 'wave':
			return { left: rest, right: at(14, 90, 160) };
		case 'think':
			return { left: rest, right: at(-hw + 30, 160, -140) };
		default:
			return { left: rest, right: rest };
	}
}

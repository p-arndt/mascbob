import type { HandPose, Mood } from '../types.js';

/** Outfits for the full-body figure. The bare shell is the default; everything else is opt-in. */
export const OUTFITS = [
	'none',
	'puffer',
	'hoodie',
	'scarf',
	'bowtie',
	'overalls',
	'jersey',
	'tie',
	'cape'
] as const;
export type Outfit = (typeof OUTFITS)[number];

/** Footwear for the full-body figure. `none` keeps plain rounded feet in the body colors. */
export const SHOES = [
	'none',
	'sneakers',
	'hightops',
	'boots',
	'slippers',
	'rainboots',
	'skates'
] as const;
export type Shoes = (typeof SHOES)[number];

/** Body proportions for the full-body figure. */
export const BUILDS = ['standard', 'chubby', 'lanky', 'chibi', 'blob'] as const;
export type Build = (typeof BUILDS)[number];

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
 * Torso silhouette. Widths are multiples of the torso half width (see `torsoHalfWidth`):
 * the sides run from `shoulder` at the top out (or in) to `belly` at `bellyY`, then to
 * `hip` where the rounded bottom starts, `round` units above the hips.
 */
export interface TorsoDef {
	/** Torso half width as a share of the head's half width, capped at `max`. */
	ratio: number;
	max: number;
	shoulder: number;
	belly: number;
	bellyY: number;
	hip: number;
	round: number;
	/** How far out the bottom curve's control point sits, 0..1: higher is a flatter base. */
	base: number;
	/** Where the arms attach, as a share of the torso half width. */
	arms: number;
}

export interface BuildDef {
	viewHeight: number;
	groundY: number;
	torsoTop: number;
	/** Torso bottom; for legless builds it is the ground contact. */
	hipY: number;
	shoulderY: number;
	upperArm: number;
	forearm: number;
	armWidth: number;
	legs: boolean;
	legX: number;
	legWidth: number;
	footScale: number;
	torso: TorsoDef;
	/** The head scales around its bottom by this much, then shifts down by `headY`. */
	headScale: number;
	headY: number;
	/** Standing figures shift their weight; `float` bobs in the air like the bare head. */
	motion: 'stand' | 'float';
}

export const BUILD_DEFS: Record<Build, BuildDef> = {
	standard: {
		viewHeight: BODY_VIEWBOX_HEIGHT,
		groundY: BODY_GROUND_Y,
		torsoTop: TORSO_TOP,
		hipY: HIP_Y,
		shoulderY: SHOULDER_Y,
		upperArm: UPPER_ARM,
		forearm: FOREARM,
		armWidth: 14,
		legs: true,
		legX: LEG_X,
		legWidth: 17,
		footScale: FOOT_SCALE,
		torso: {
			ratio: 1,
			max: 48,
			shoulder: 1,
			belly: 1,
			bellyY: HIP_Y - 26,
			hip: 1,
			round: 26,
			base: 0.55,
			arms: 1
		},
		headScale: 1,
		headY: 0,
		motion: 'stand'
	},
	// Pear-shaped: narrow shoulders, a belly that bulges past the arms, short thick legs.
	chubby: {
		viewHeight: 292,
		groundY: 266,
		torsoTop: TORSO_TOP,
		hipY: 222,
		shoulderY: 186,
		upperArm: 16,
		forearm: 14,
		armWidth: 16,
		legs: true,
		legX: 21,
		legWidth: 20,
		footScale: 1.3,
		torso: {
			ratio: 1.12,
			max: 56,
			shoulder: 0.9,
			belly: 1.14,
			bellyY: 194,
			hip: 1.02,
			round: 20,
			base: 0.62,
			arms: 1.08
		},
		headScale: 1,
		headY: 0,
		motion: 'stand'
	},
	// Tall and thin: a narrow torso that tapers to the hips, long legs and arms, smaller head.
	lanky: {
		viewHeight: 340,
		groundY: 314,
		torsoTop: TORSO_TOP,
		hipY: 220,
		shoulderY: 184,
		upperArm: 22,
		forearm: 20,
		armWidth: 11,
		legs: true,
		legX: 13,
		legWidth: 13,
		footScale: 1.08,
		torso: {
			ratio: 0.78,
			max: 38,
			shoulder: 1,
			belly: 0.92,
			bellyY: 196,
			hip: 0.86,
			round: 18,
			base: 0.55,
			arms: 0.95
		},
		headScale: 0.9,
		headY: 0,
		motion: 'stand'
	},
	// Big head on a tiny body with stubby legs.
	chibi: {
		viewHeight: 266,
		groundY: 240,
		torsoTop: TORSO_TOP,
		hipY: 202,
		shoulderY: 180,
		upperArm: 12,
		forearm: 11,
		armWidth: 12,
		legs: true,
		legX: 14,
		legWidth: 16,
		footScale: 1,
		torso: {
			ratio: 0.72,
			max: 36,
			shoulder: 1,
			belly: 1.04,
			bellyY: 188,
			hip: 1,
			round: 16,
			base: 0.6,
			arms: 1
		},
		headScale: 1.12,
		headY: 0,
		motion: 'stand'
	},
	// No legs: a bell of a body that rests on its own flat base and bobs like the bare head.
	blob: {
		viewHeight: 260,
		groundY: 234,
		torsoTop: TORSO_TOP,
		hipY: 234,
		shoulderY: 190,
		upperArm: 11,
		forearm: 10,
		armWidth: 14,
		legs: false,
		legX: LEG_X,
		legWidth: 17,
		footScale: FOOT_SCALE,
		torso: {
			ratio: 1.18,
			max: 62,
			shoulder: 0.8,
			belly: 1.04,
			bellyY: 206,
			hip: 1.14,
			round: 16,
			base: 0.86,
			arms: 0.98
		},
		headScale: 1,
		headY: 0,
		motion: 'float'
	}
};

const STANDARD = BUILD_DEFS.standard;

export function buildDef(build: Build | undefined): BuildDef {
	return (build && BUILD_DEFS[build]) || STANDARD;
}

/**
 * Height of each foot's collar (the opening the leg steps into) above the ground, in local
 * foot units. Plain feet have no collar; the leg simply merges into the foot.
 */
export const FOOT_COLLAR: Record<Shoes, number> = {
	none: 8,
	sneakers: 24,
	hightops: 36,
	boots: 33,
	slippers: 14,
	rainboots: 40,
	// Wheels lift the boot, so its collar sits higher than a hightop's.
	skates: 44
};

/** Where the leg ends: a little below the collar, hidden inside the shoe or foot. */
export function legBottomY(shoes: Shoes, b: BuildDef = STANDARD): number {
	return b.groundY - ((FOOT_COLLAR[shoes] ?? FOOT_COLLAR.none) - 6) * b.footScale;
}

/** Top of a shoe's collar in figure coordinates. */
export function collarTopY(shoes: Shoes, b: BuildDef = STANDARD): number {
	return b.groundY - (FOOT_COLLAR[shoes] ?? FOOT_COLLAR.none) * b.footScale;
}

/**
 * Where the overalls' shorts end on the leg: just below the hips, above the collar so tall
 * shoes never swallow the hem. Short legs in tall shoes have no room for that; the hem then
 * tucks into the shoe, which is drawn over it.
 */
export function shortsBottomY(shoes: Shoes, b: BuildDef = STANDARD): number {
	return Math.max(Math.min(b.hipY + 10, collarTopY(shoes, b) - 2), b.hipY + 3);
}

/** The torso stays compact under wide heads, otherwise it'd read as a barrel. */
export function torsoHalfWidth(headHalfWidth: number, b: BuildDef = STANDARD): number {
	return Math.min(headHalfWidth * b.torso.ratio, b.torso.max);
}

/** Widest point of the torso of half width `hw`, for fabric that has to cover all of it. */
export function torsoOuterWidth(hw: number, b: BuildDef = STANDARD): number {
	const t = b.torso;
	return hw * Math.max(t.shoulder, t.belly, t.hip);
}

/**
 * Lower half of the capsule: sides from shoulder over the belly to the hips, rounded bottom.
 * The head normally hides the top; the shoulders are rounded for when it is pulled up off it.
 */
export function torsoPath(hw: number, b: BuildDef = STANDARD): string {
	const t = b.torso;
	const top = b.torsoTop;
	const round = Math.min(hw * t.shoulder * 0.4, 16);
	const shoulders = (l: number, r: number) =>
		`M${l} ${top + round}Q${l} ${top} ${l + round} ${top}L${r - round} ${top}Q${r} ${top} ${r} ${top + round}`;
	const hip = b.hipY;
	const end = hip - t.round;
	if (t.shoulder === 1 && t.belly === 1 && t.hip === 1) {
		const l = 100 - hw;
		const r = 100 + hw;
		return (
			shoulders(l, r) +
			`L${r} ${end}` +
			`C${r} ${hip - (t.round * 4) / 13} ${100 + hw * t.base} ${hip} 100 ${hip}` +
			`C${100 - hw * t.base} ${hip} ${l} ${hip - (t.round * 4) / 13} ${l} ${end}Z`
		);
	}
	const s = hw * t.shoulder;
	const m = hw * t.belly;
	const h = hw * t.hip;
	const upper = (t.bellyY - top) / 2;
	const lower = (end - t.bellyY) / 2;
	// Each side is two cubics with vertical tangents at the shoulder, belly and hip, so the
	// silhouette stays smooth whether it bulges or tapers.
	const side = (k: 1 | -1) => ({
		down:
			`C${100 + k * s} ${top + upper} ${100 + k * m} ${t.bellyY - upper} ${100 + k * m} ${t.bellyY}` +
			`C${100 + k * m} ${t.bellyY + lower} ${100 + k * h} ${end - lower} ${100 + k * h} ${end}`,
		up:
			`C${100 + k * h} ${end - lower} ${100 + k * m} ${t.bellyY + lower} ${100 + k * m} ${t.bellyY}` +
			`C${100 + k * m} ${t.bellyY - upper} ${100 + k * s} ${top + upper} ${100 + k * s} ${top + round}`
	});
	return (
		shoulders(100 - s, 100 + s) +
		side(1).down +
		`C${100 + h} ${hip - (t.round * 4) / 13} ${100 + h * t.base} ${hip} 100 ${hip}` +
		`C${100 - h * t.base} ${hip} ${100 - h} ${hip - (t.round * 4) / 13} ${100 - h} ${end}` +
		side(-1).up +
		'Z'
	);
}

/** Left shoulder x; the right arm mirrors around x = 100. */
export function shoulderX(torsoHw: number, b: BuildDef = STANDARD): number {
	return 100 - torsoHw * b.torso.arms + 3;
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
export function armJoints(angles: ArmAngles, drop = 0, x = shoulderX(48), b: BuildDef = STANDARD) {
	const shoulder = { x, y: b.shoulderY + drop };
	const elbow = limbEnd(shoulder.x, shoulder.y, angles.a1, b.upperArm);
	const wrist = limbEnd(elbow.x, elbow.y, angles.a1 + angles.a2, b.forearm);
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
		case 'waving':
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

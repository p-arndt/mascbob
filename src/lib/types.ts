export const MOODS = [
	'idle',
	'happy',
	'listening',
	'thinking',
	'talking',
	'surprised',
	'sleepy',
	'sad',
	'love',
	'wink',
	'grumpy',
	'shy',
	'waving'
] as const;
export type Mood = (typeof MOODS)[number];

export const SHAPES = ['capsule', 'pebble', 'orb', 'squircle', 'bean', 'ghost'] as const;
export type Shape = (typeof SHAPES)[number];

export const EYE_STYLES = ['round', 'pill', 'wide', 'dot'] as const;
export type EyeStyle = (typeof EYE_STYLES)[number];

export { ACCESSORIES, type Accessory } from './parts/accessories.js';
export { OUTFITS, SHOES, type Outfit, type Shoes } from './parts/body.js';

export type Effect = 'sparkles' | 'waves' | 'dots' | 'zzz' | 'tear' | 'hearts';
export type HandPose = 'rest' | 'up' | 'wave' | 'think';

/** Gaze target: follow the pointer, glance around on its own, stay still, or a fixed direction in -1..1. */
export type LookAt = 'pointer' | 'wander' | 'none' | { x: number; y: number };

export type Motion = 'auto' | 'full' | 'reduced';

export interface EyeParams {
	/** 0 = closed, 1 = fully open; values above 1 widen the eye. */
	open: number;
	scale: number;
	/** Pushes the lower lid up; around 0.8 turns the eye into a happy crescent. */
	lift: number;
	lidInner: number;
	lidOuter: number;
	/** Crossfade from the regular eye to a heart. */
	heart: number;
	/** Visibility 0..1 of the glowing brow dash above the eye. */
	brow: number;
	/** Brow angle: positive raises the inner end (worried), negative lowers it (cross). */
	browTilt: number;
	/** Moves the brow up (positive) or down, in head units. */
	browLift: number;
}

export interface FaceParams {
	left: EyeParams;
	right: EyeParams;
	gazeX: number;
	gazeY: number;
	mouthWidth: number;
	/** Positive smiles, negative frowns. */
	mouthCurve: number;
	mouthOpen: number;
	mouthX: number;
	/** Crossfade from the regular mouth to a cat mouth ("ω"), 0..1. */
	mouthCat: number;
	/** Crossfade from the regular mouth to a round "o", 0..1. */
	mouthRound: number;
	/** Tongue inside the open mouth, 0..1. */
	tongue: number;
	cheeks: number;
	/** Anime blush hatch marks (///) over the cheeks, 0..1. */
	blushLines: number;
	tilt: number;
	/** Vertical stretch of the body; negative squashes. */
	stretch: number;
}

export interface MoodConfig {
	face: FaceParams;
	effect: Effect | null;
	hands: HandPose;
	/** Seconds per float cycle. */
	floatSpeed: number;
}

export interface ThemeColors {
	/** Three body colors, from highlight to rim. */
	bodyLight: string;
	bodyMid: string;
	bodyDark: string;
	visor: string;
	eye: string;
	cheek: string;
	accent: string;
}

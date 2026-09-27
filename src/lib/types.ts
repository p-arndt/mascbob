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
	'grumpy'
] as const;
export type Mood = (typeof MOODS)[number];

export const SHAPES = ['pebble', 'orb', 'squircle', 'bean', 'ghost'] as const;
export type Shape = (typeof SHAPES)[number];

export const EYE_STYLES = ['round', 'pill', 'wide', 'dot'] as const;
export type EyeStyle = (typeof EYE_STYLES)[number];

export { ACCESSORIES, type Accessory } from './parts/accessories.js';
export { OUTFITS, type Outfit } from './parts/body.js';

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
	cheeks: number;
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

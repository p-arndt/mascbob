import type { EyeParams, FaceParams, Mood, MoodConfig } from './types.js';

const eye = (p: Partial<EyeParams> = {}): EyeParams => ({
	open: 1,
	scale: 1,
	lift: 0,
	lidInner: 0,
	lidOuter: 0,
	heart: 0,
	...p
});

const face = (p: Partial<FaceParams> & { eyes?: Partial<EyeParams> } = {}): FaceParams => {
	const { eyes, ...rest } = p;
	return {
		left: eye(eyes),
		right: eye(eyes),
		gazeX: 0,
		gazeY: 0,
		mouthWidth: 12,
		mouthCurve: 3,
		mouthOpen: 0,
		mouthX: 0,
		cheeks: 0.5,
		tilt: 0,
		stretch: 0,
		...rest
	};
};

const crescent = { lift: 0.8 };

export const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
	idle: { face: face(), effect: null, hands: 'rest', floatSpeed: 3.2 },
	happy: {
		face: face({ eyes: crescent, mouthWidth: 18, mouthCurve: 6, mouthOpen: 4, cheeks: 1 }),
		effect: 'sparkles',
		hands: 'up',
		floatSpeed: 1.6
	},
	listening: {
		face: face({ eyes: { open: 1.1, scale: 1.1 }, mouthWidth: 8, mouthCurve: 1, tilt: -6 }),
		effect: 'waves',
		hands: 'rest',
		floatSpeed: 2.6
	},
	thinking: {
		face: face({
			eyes: { open: 0.85, lidOuter: 0.25 },
			gazeX: 0.7,
			gazeY: -0.8,
			mouthWidth: 9,
			mouthCurve: -1,
			mouthX: 5,
			tilt: 5
		}),
		effect: 'dots',
		hands: 'think',
		floatSpeed: 3.6
	},
	talking: {
		face: face({ mouthWidth: 14, mouthCurve: 3, cheeks: 0.6 }),
		effect: null,
		hands: 'wave',
		floatSpeed: 2.4
	},
	surprised: {
		face: face({
			eyes: { open: 1.2, scale: 1.25 },
			mouthWidth: 8,
			mouthCurve: 0,
			mouthOpen: 9,
			cheeks: 0.3,
			stretch: 0.06
		}),
		effect: 'sparkles',
		hands: 'up',
		floatSpeed: 1.4
	},
	sleepy: {
		face: face({ eyes: { open: 0.08 }, mouthWidth: 7, mouthCurve: 1, cheeks: 0.4, tilt: 8 }),
		effect: 'zzz',
		hands: 'rest',
		floatSpeed: 5
	},
	sad: {
		face: face({
			eyes: { open: 0.9, lidOuter: 0.5 },
			gazeY: 0.4,
			mouthWidth: 12,
			mouthCurve: -5,
			cheeks: 0.2,
			tilt: -4,
			stretch: -0.04
		}),
		effect: 'tear',
		hands: 'rest',
		floatSpeed: 4.4
	},
	love: {
		face: face({ eyes: { heart: 1 }, mouthWidth: 16, mouthCurve: 6, mouthOpen: 3, cheeks: 1 }),
		effect: 'hearts',
		hands: 'up',
		floatSpeed: 2
	},
	wink: {
		face: {
			...face({ mouthWidth: 16, mouthCurve: 6, mouthOpen: 2, cheeks: 0.8, tilt: 4 }),
			right: eye(crescent)
		},
		effect: 'sparkles',
		hands: 'wave',
		floatSpeed: 2.4
	},
	grumpy: {
		face: face({
			eyes: { open: 0.8, lidInner: 0.55 },
			mouthWidth: 12,
			mouthCurve: -3,
			cheeks: 0.2
		}),
		effect: null,
		hands: 'rest',
		floatSpeed: 4
	}
};

export function moodConfig(mood: Mood): MoodConfig {
	return MOOD_CONFIGS[mood] ?? MOOD_CONFIGS.idle;
}

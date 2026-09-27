import type { EyeParams, FaceParams, Mood, MoodConfig } from './types.js';

const eye = (p: Partial<EyeParams> = {}): EyeParams => ({
	open: 1,
	scale: 1,
	lift: 0,
	lidInner: 0,
	lidOuter: 0,
	heart: 0,
	brow: 0,
	browTilt: 0,
	browLift: 0,
	...p
});

type FaceInput = Partial<Omit<FaceParams, 'left' | 'right'>> & {
	/** Applied to both eyes; `left` / `right` are merged on top for asymmetric looks. */
	eyes?: Partial<EyeParams>;
	left?: Partial<EyeParams>;
	right?: Partial<EyeParams>;
};

const face = (p: FaceInput = {}): FaceParams => {
	const { eyes, left, right, ...rest } = p;
	return {
		left: eye({ ...eyes, ...left }),
		right: eye({ ...eyes, ...right }),
		gazeX: 0,
		gazeY: 0,
		mouthWidth: 12,
		mouthCurve: 3,
		mouthOpen: 0,
		mouthX: 0,
		mouthSkew: 0,
		mouthCat: 0,
		mouthRound: 0,
		tongue: 0,
		cheeks: 0.5,
		blushLines: 0,
		tilt: 0,
		stretch: 0,
		...rest
	};
};

const crescent = { lift: 0.8 };
// Resting brows stay faintly printed, so a mood change moves them instead of fading them in.
const faintBrow = { brow: 0.3 };

export const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
	idle: { face: face({ eyes: faintBrow }), effect: null, hands: 'rest', floatSpeed: 3.2 },
	happy: {
		face: face({
			eyes: { ...crescent, ...faintBrow, scale: 1.08, browLift: 1.5 },
			mouthWidth: 18,
			mouthCurve: 5,
			mouthOpen: 4.5,
			tongue: 1,
			cheeks: 1,
			blushLines: 0.8,
			stretch: 0.03
		}),
		effect: 'sparkles',
		hands: 'up',
		floatSpeed: 1.6
	},
	listening: {
		face: face({
			eyes: { open: 1.1, scale: 1.12, brow: 0.55, browLift: 2.5, browTilt: 0.15 },
			mouthWidth: 7,
			mouthCurve: 1,
			mouthRound: 0.35,
			mouthOpen: 1.5,
			tilt: -7
		}),
		effect: 'waves',
		hands: 'rest',
		floatSpeed: 2.6
	},
	thinking: {
		face: face({
			eyes: { open: 0.85, lidOuter: 0.25, brow: 1 },
			// One brow up, one down: the classic "hmm".
			left: { browLift: -1, browTilt: -0.25 },
			right: { browLift: 3.5, browTilt: 0.1, open: 0.95, lidOuter: 0.1 },
			gazeX: 0.7,
			gazeY: -0.8,
			mouthWidth: 9,
			mouthCurve: -1.5,
			mouthX: 5,
			mouthSkew: -1.5,
			tilt: 6
		}),
		effect: 'dots',
		hands: 'think',
		floatSpeed: 3.6
	},
	talking: {
		face: face({
			// Smiling eyes and raised brows keep talking readable between syllables.
			eyes: { scale: 1.04, lift: 0.25, brow: 0.7, browLift: 1.5 },
			mouthWidth: 14,
			mouthCurve: 3,
			mouthOpen: 2.5,
			tongue: 0.7,
			cheeks: 0.65
		}),
		effect: null,
		hands: 'wave',
		floatSpeed: 2.4
	},
	surprised: {
		face: face({
			eyes: { open: 1.2, scale: 1.25, brow: 1, browLift: 4, browTilt: 0.2 },
			mouthWidth: 9,
			mouthCurve: 0,
			mouthOpen: 10,
			mouthRound: 1,
			cheeks: 0.3,
			stretch: 0.07
		}),
		effect: 'sparkles',
		hands: 'up',
		floatSpeed: 1.4
	},
	sleepy: {
		face: face({
			eyes: { open: 0.08, lift: 0.3 },
			gazeY: 0.3,
			mouthWidth: 5,
			mouthCurve: 0,
			mouthOpen: 3,
			mouthRound: 1,
			cheeks: 0.45,
			tilt: 9,
			stretch: -0.03
		}),
		effect: 'zzz',
		hands: 'rest',
		floatSpeed: 5
	},
	sad: {
		face: face({
			eyes: { open: 0.95, scale: 1.08, lidOuter: 0.5, brow: 1, browTilt: 0.45, browLift: 1 },
			gazeY: 0.45,
			mouthWidth: 11,
			mouthCurve: -4,
			mouthOpen: 0.6,
			cheeks: 0.25,
			tilt: -5,
			stretch: -0.05
		}),
		effect: 'tear',
		hands: 'rest',
		floatSpeed: 4.4
	},
	love: {
		face: face({
			eyes: { heart: 1, scale: 1.05, ...faintBrow, browLift: 1.5 },
			mouthWidth: 14,
			mouthCurve: 5,
			mouthOpen: 3,
			tongue: 0.5,
			cheeks: 1,
			blushLines: 1,
			tilt: -3
		}),
		effect: 'hearts',
		hands: 'up',
		floatSpeed: 2
	},
	wink: {
		face: face({
			// A thin closed arch, not a squint: no brow pressing down on it.
			left: { scale: 1.08, ...faintBrow, browLift: 1 },
			right: { open: 0.5, lift: 0.8 },
			mouthWidth: 15,
			mouthCurve: 4,
			mouthOpen: 2.5,
			mouthX: 2,
			mouthSkew: 1.5,
			tongue: 1,
			cheeks: 0.9,
			tilt: 5
		}),
		effect: 'sparkles',
		// Waving has its own mood; a wink while waving read as a squint.
		hands: 'rest',
		floatSpeed: 2.4
	},
	waving: {
		face: face({
			// Both eyes open and bright, brows up: a hello, not a wink.
			eyes: { scale: 1.06, lift: 0.3, brow: 0.6, browLift: 2.5, browTilt: 0.1 },
			mouthWidth: 16,
			mouthCurve: 4.5,
			mouthOpen: 3.5,
			tongue: 0.8,
			cheeks: 0.8,
			tilt: -4
		}),
		effect: null,
		hands: 'wave',
		floatSpeed: 2.2
	},
	shy: {
		face: face({
			// Glancing down and away, blushing hard, lips pressed into a tiny smile.
			eyes: { open: 0.85, lidOuter: 0.15, scale: 0.95, brow: 0.6, browTilt: 0.3, browLift: 1 },
			gazeX: -0.6,
			gazeY: 0.55,
			mouthWidth: 6,
			mouthCurve: 1.5,
			cheeks: 1,
			blushLines: 1,
			tilt: -8,
			stretch: -0.02
		}),
		effect: null,
		hands: 'rest',
		floatSpeed: 3.4
	},
	grumpy: {
		face: face({
			eyes: { open: 0.75, lidInner: 0.6, brow: 1, browTilt: -0.55, browLift: -1 },
			gazeY: 0.15,
			mouthWidth: 11,
			mouthCurve: -3,
			mouthX: -2,
			mouthSkew: -1,
			cheeks: 0.15,
			stretch: -0.03
		}),
		effect: null,
		hands: 'rest',
		floatSpeed: 4
	},
	laughing: {
		face: face({
			// Squeezed shut by the cheeks; the ha-ha pulses come from the face on top of this grin.
			eyes: { ...crescent, open: 0.75, scale: 1.04, brow: 0.6, browLift: 2, browTilt: 0.25 },
			mouthWidth: 20,
			mouthCurve: 6,
			mouthOpen: 6,
			tongue: 0.8,
			cheeks: 1,
			blushLines: 0.5,
			tilt: -6,
			stretch: 0.05
		}),
		effect: 'sparkles',
		hands: 'up',
		floatSpeed: 1.3
	},
	focused: {
		face: face({
			eyes: {
				open: 0.72,
				lidInner: 0.2,
				lidOuter: 0.15,
				brow: 0.9,
				browLift: -1.5,
				browTilt: -0.3
			},
			gazeY: 0.35,
			mouthWidth: 8,
			mouthCurve: -0.4,
			mouthX: 3,
			cheeks: 0.3,
			tilt: 2,
			stretch: -0.01
		}),
		effect: null,
		hands: 'rest',
		floatSpeed: 3.8
	},
	curious: {
		face: face({
			eyes: { open: 1.1, scale: 1.1 },
			left: { brow: 1, browLift: 4.5, browTilt: 0.15 },
			right: { brow: 0.7, browLift: 0.5, browTilt: -0.1 },
			gazeX: 0.25,
			gazeY: -0.2,
			mouthWidth: 6,
			mouthCurve: 0.5,
			mouthOpen: 3,
			mouthRound: 0.8,
			cheeks: 0.45,
			tilt: 10
		}),
		effect: 'question',
		hands: 'think',
		floatSpeed: 2.8
	},
	nervous: {
		face: face({
			// Wide open but small: pinned pupils under worried brows.
			eyes: { open: 1.15, scale: 0.85, brow: 1, browTilt: 0.5, browLift: 2.5 },
			mouthWidth: 16,
			mouthCurve: -1.2,
			mouthOpen: 2,
			mouthSkew: 0.8,
			cheeks: 0.2,
			tilt: -3,
			stretch: -0.03
		}),
		effect: 'sweat',
		hands: 'rest',
		floatSpeed: 1.8
	}
};

export function moodConfig(mood: Mood): MoodConfig {
	return MOOD_CONFIGS[mood] ?? MOOD_CONFIGS.idle;
}

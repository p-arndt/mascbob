import { getContext, setContext } from 'svelte';
import type { ShapeDef } from './geometry.js';
import type { Accessory, EyeStyle, FaceParams, Mood, MoodConfig, Outfit, Shoes } from './types.js';

/**
 * Live state that `Mascot.svelte` shares with its parts. Every field is a
 * reactive getter, so parts read it directly in markup and `$derived`.
 */
export interface MascotContext {
	/** Prefix for SVG ids; shared defs are `${uid}-glow`, `${uid}-soft`, `${uid}-body`, `${uid}-hand`. */
	readonly uid: string;
	/** Mood currently shown (a boop briefly overrides the `mood` prop with `happy`). */
	readonly mood: Mood;
	readonly config: MoodConfig;
	/** Tweened face parameters, already interpolated between moods. */
	readonly face: FaceParams;
	/** 0 = eyes open, 1 = mid-blink. */
	readonly blink: number;
	/** Where the eyes look, -1..1 on both axes (pointer/wander plus the mood's own gaze). */
	readonly gazeX: number;
	readonly gazeY: number;
	/** Extra mouth opening 0..1 from speech. */
	readonly talk: number;
	readonly shape: ShapeDef;
	readonly eyes: EyeStyle;
	readonly accessories: readonly Accessory[];
	readonly hovered: boolean;
	/** Pointer is held down on the mascot. */
	readonly pressed: boolean;
	/** Increments on every boop; watch it to trigger one-shot reactions. */
	readonly boops: number;
	/** Animations should be skipped or reduced. */
	readonly reduced: boolean;
	/** Full-body mode. */
	readonly body: boolean;
	readonly outfit: Outfit;
	readonly shoes: Shoes;
	/**
	 * Degrees the whole figure currently rocks around its base (hover lean toward the
	 * pointer plus wobbles from boops, mood changes and fidgets). Positive leans right.
	 * Useful for secondary motion, e.g. antennas or ears that lag the other way.
	 */
	readonly lean: number;
	/** Vertical hop offset in viewBox units, negative while airborne (boop, mood change, fidget). */
	readonly hop: number;
	/** Current head scale around its bottom: > 1 on x and < 1 on y while squashed (press, landing). */
	readonly squashX: number;
	readonly squashY: number;
	/** False while the mount pop-in plays (~650 ms); true immediately under reduced motion. */
	readonly entered: boolean;
	/** False while scrolled out of view; skip timers and per-frame work then. */
	readonly onscreen: boolean;
}

const KEY = Symbol('mascott');

export function setMascot(ctx: MascotContext): void {
	setContext(KEY, ctx);
}

export function getMascot(): MascotContext {
	return getContext<MascotContext>(KEY);
}

export const svgRef = (uid: string, name: string) => `url(#${uid}-${name})`;

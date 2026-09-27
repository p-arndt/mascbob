import { clamp } from '../geometry.js';

export const ACCESSORIES = [
	'halo',
	'antenna',
	'ears',
	'sprout',
	'headphones',
	'crown',
	'bow',
	'glasses',
	'star-clip',
	'beanie',
	'party-hat',
	'propeller',
	'horns',
	'flower',
	'monocle',
	'mustache',
	'cap',
	'nightcap',
	'shades',
	'headband'
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

/**
 * Hats share one slot on top of the head. Stacking two brims never looks right, so only the
 * first one listed is worn.
 */
export const HATS = ['crown', 'beanie', 'propeller', 'party-hat', 'cap', 'nightcap'] as const;
export type Hat = (typeof HATS)[number];

/** Things that grow out of the top of the head; also one at a time, they'd share a stem. */
export const TOPPERS = ['antenna', 'sprout'] as const;
export type Topper = (typeof TOPPERS)[number];

export const HEADWEAR: readonly Accessory[] = [...HATS, ...TOPPERS];

/** How high the baseball cap's button sits above the head top. */
export const CAP_RISE = 5;

/**
 * How far a topper is raised to poke out of each hat. Hats that aren't listed have a pompom,
 * point or rotor where the topper would go, so they leave no room for one.
 */
const SEATS: Partial<Record<Hat, number>> = { cap: CAP_RISE + 2 };

export interface Headwear {
	/** The accessories actually drawn, in the given order. */
	worn: Accessory[];
	hat: Hat | null;
	/** How far a worn topper is raised to stand on the hat, 0 when bare-headed. */
	seat: number;
}

/** Resolves the headwear slot: one hat, and one topper as long as the hat can seat it. */
export function headwear(list: readonly Accessory[]): Headwear {
	const hat = (list.find((a) => (HATS as readonly string[]).includes(a)) as Hat) ?? null;
	const seat = hat ? SEATS[hat] : 0;
	const topper =
		seat === undefined
			? null
			: ((list.find((a) => (TOPPERS as readonly string[]).includes(a)) as Topper) ?? null);
	const worn = [...new Set(list)].filter((a) => !HEADWEAR.includes(a) || a === hat || a === topper);
	return { worn, hat, seat: seat ?? 0 };
}

/**
 * Rigid items (crown, glasses, monocle, party hat, horns, cap, shades) keep their shape while
 * the head squashes: they're wrapped in the inverse scale around where they touch the head.
 * Soft ones (beanie, bow, flower, nightcap, headband) squash along.
 *
 * Where `p`, drawn in squashed head space, ends up once counter-scaled around `anchor`.
 */
export function counterSquash(p: Point, anchor: Point, sx: number, sy: number): Point {
	return { x: anchor.x + (p.x - anchor.x) / sx, y: anchor.y + (p.y - anchor.y) / sy };
}

/**
 * Follow-through for worn hats: `lag` is how far a spring chasing the hop trails it. Only a
 * falling head (negative lag, the spring still above it) leaves the hat behind, so it lifts a
 * little on landing and settles late; on take-off it stays seated instead of sinking in.
 */
export function hatLift(lag: number): number {
	return clamp(lag * 0.3, -2.5, 0);
}

/**
 * Degrees a tall item (party hat, antenna, sprout, rotor, pompom) swings around its base:
 * it trails the lean and overshoots when the lean stops, and nods on hops.
 */
export function followSwing(leanLag: number, hopLag: number): number {
	return clamp(leanLag * 1.4 + hopLag * 0.5, -16, 16);
}

/** Degrees each mustache half turns with the mouth: ends up on a smile, down on a frown. */
export function mustacheTilt(mouthCurve: number): number {
	return mouthCurve * 2;
}

/** Hat sizes from the crown half width, so they hug narrow crowns and don't overhang. */
export const beanieWidth = (cw: number) => cw + 5;
export const propellerWidth = (cw: number) => cw * 0.9;
export const capWidth = (cw: number) => cw + 3;
export const nightcapWidth = (cw: number) => cw + 4;
/** Horizontal offset of each horn's base from the center line. */
export const hornOffset = (cw: number) => cw * 0.58;

/** Moods that let the nightcap flop down the side of the head. */
export const DROOP_MOODS: readonly string[] = ['sleepy', 'sad'];

/** Degrees the nightcap's tip bends away from upright for a mood. */
export function nightcapBend(mood: string): number {
	return DROOP_MOODS.includes(mood) ? 125 : 70;
}

export const NIGHTCAP_LENGTH = 38;

/** Where the nightcap's floppy part hinges, right of center so a drooping tip clears the rim. */
export function nightcapRoot(w: number, t: number): Point {
	return { x: 100 + w * 0.25, y: t - 8 };
}

/**
 * Floppy nightcap outline from its rim at `t + 18` to a tip `bend` degrees clockwise from
 * upright. Both edges bulge toward the fold so the cap reads as cloth hanging over, not a cone.
 * The bend is clamped: cloth this soft never stands up straight, and the tip must stay inside
 * the viewBox on the tallest heads.
 */
export function nightcapShape(w: number, t: number, bend: number): { d: string; tip: Point } {
	const a = (clamp(bend, 60, 150) * Math.PI) / 180;
	const root = nightcapRoot(w, t);
	const tip = {
		x: root.x + Math.sin(a) * NIGHTCAP_LENGTH,
		y: root.y - Math.cos(a) * NIGHTCAP_LENGTH
	};
	const fold = (k: number, dx: number, dy: number) => ({
		x: 100 + Math.sin(a / 2) * NIGHTCAP_LENGTH * k + dx,
		y: t - 8 - Math.cos(a / 2) * NIGHTCAP_LENGTH * k + dy
	});
	const outer = fold(0.8, -6, -12);
	const inner = fold(0.45, 5, 4);
	const f = (n: number) => n.toFixed(2);
	const d =
		`M${f(100 - w)} ${f(t + 18)}C${f(100 - w)} ${f(t - 10)} ${f(outer.x)} ${f(outer.y)} ${f(tip.x)} ${f(tip.y)}` +
		`C${f(inner.x)} ${f(inner.y)} ${f(100 + w)} ${f(t - 2)} ${f(100 + w)} ${f(t + 18)}Z`;
	return { d, tip };
}

/** Moods that make the shades slide down the nose. */
export const SLIDE_MOODS: readonly string[] = ['surprised'];
/** How far the shades slide down when they do. */
export const SHADES_SLIDE = 9;

/**
 * Where the hair flower's stem meets the head, relative to the blossom center. Sway and wilt
 * pivot here so the blossom swings on its stem instead of spinning in place.
 */
export const FLOWER_STEM = { x: 5, y: 11 } as const;

/** Moods that make the sprout's flower bloom. */
export const BLOOM_MOODS: readonly string[] = ['happy', 'love'];

/** Moods in which the headphone cups show a live equalizer. */
export const AUDIO_MOODS: readonly string[] = ['listening', 'talking'];

/** Moods that make the horns glow hot. */
export const HOT_MOODS: readonly string[] = ['grumpy'];

/** Moods that knock the monocle out of the eye. */
export const DROP_MOODS: readonly string[] = ['surprised'];

/** Moods that wilt the hair flower. */
export const WILT_MOODS: readonly string[] = ['sad', 'sleepy'];

/**
 * Seconds per propeller turn for a mood, or 0 when it idles. Excited moods whirl,
 * low-energy ones let it come to rest.
 */
export function propellerSpin(mood: string): number {
	if (['happy', 'surprised', 'love', 'waving'].includes(mood)) return 0.35;
	if (['sleepy', 'sad'].includes(mood)) return 0;
	return 1.4;
}

/** Five-pointed star centered on the origin with the given outer radius and softly rounded tips. */
export function starPath(r: number, inner = 0.48): string {
	const pts: string[] = [];
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const d = i % 2 === 0 ? r : r * inner;
		pts.push(`${(Math.cos(a) * d).toFixed(2)} ${(Math.sin(a) * d).toFixed(2)}`);
	}
	return `M${pts.join('L')}Z`;
}

/** Y where the headphone band ends, beside the cups. */
export const BAND_END_Y = 104;

/**
 * Control y for a symmetric cubic from (x0, endY) to (x1, endY) whose apex lands on `apexY`.
 * With both controls at the same height the midpoint is `0.25 * endY + 0.75 * ctrlY`.
 */
export function bandControlY(endY: number, apexY: number): number {
	return (4 * apexY - endY) / 3;
}

/** Outer edge of the glasses' left rim; the rims sit at x 80 and 120 with radius 16.5. */
const RIM_OUTER = 63.5;

/**
 * Left temple from the rim's outer edge to just inside the head edge, rising slightly toward
 * the ear. The right one mirrors around x = 100. Always at least 2 units long so narrow heads
 * still show a stub.
 */
export function templeLine(hw: number): { x0: number; y0: number; x1: number; y1: number } {
	return { x0: RIM_OUTER, y0: 94, x1: Math.min(RIM_OUTER - 2, 100 - hw + 3), y1: 91 };
}

export interface Point {
	x: number;
	y: number;
}

/** Monocle center and the point on its rim where the chain hooks in (lower right, 45°). */
export const MONOCLE = { cx: 120, cy: 96, r: 15 } as const;
/** How far the monocle falls when it is knocked out: translate x, y and rotation in degrees. */
export const MONOCLE_DROP = { x: 4, y: 18, angle: 24 } as const;

/** Where the chain leaves the monocle rim, `drop` going from 0 (worn) to 1 (fallen). */
export function monocleHook(drop: number): Point {
	const k = Math.SQRT1_2 * MONOCLE.r;
	const a = (MONOCLE_DROP.angle * drop * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	return {
		x: MONOCLE.cx + k * cos - k * sin + MONOCLE_DROP.x * drop,
		y: MONOCLE.cy + k * sin + k * cos + MONOCLE_DROP.y * drop
	};
}

/**
 * Where the chain is pinned: low on the head's right side. 0.82 of the half width at y 138
 * stays inside every silhouette, including the tapering egg and cat.
 */
export function monocleAnchor(hw: number): Point {
	return { x: 100 + hw * 0.82, y: 138 };
}

/**
 * Chain from the monocle hook to the anchor as a quadratic that hangs below both ends. The
 * closer the ends, the more slack there is, so it sags deeper when the monocle drops.
 */
export function chainPath(from: Point, to: Point, length = 60): string {
	const span = Math.hypot(to.x - from.x, to.y - from.y);
	const sag = Math.max(4, Math.sqrt(Math.max(0, length * length - span * span)) * 0.5);
	const cx = (from.x + to.x) / 2;
	const cy = Math.max(from.y, to.y) + sag;
	const f = (n: number) => n.toFixed(2);
	return `M${f(from.x)} ${f(from.y)}Q${f(cx)} ${f(cy)} ${f(to.x)} ${f(to.y)}`;
}

export interface ContactShadow {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	/** Degrees, around the ellipse's own center. */
	angle: number;
}

/** Light comes from the top left, so shadows fall down and to the right. */
const SHADOW_OFFSET = { x: 2.5, y: 3 };

function rotated(x: number, y: number, deg: number): Point {
	const a = (deg * Math.PI) / 180;
	return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

/**
 * Soft contact shadows on the shell under head-worn accessories, in head coordinates. Each
 * ellipse sits where the accessory meets the head, nudged away from the light; the caller
 * clips them to the head so none spill into the background.
 */
export function contactShadows(
	accessories: readonly Accessory[],
	t: number,
	hw: number,
	cw: number
): ContactShadow[] {
	const out: ContactShadow[] = [];
	const add = (x: number, y: number, rx: number, ry: number, angle = 0) =>
		out.push({ cx: x + SHADOW_OFFSET.x, cy: y + SHADOW_OFFSET.y, rx, ry, angle });
	// Places the shadow under a point given in an accessory's own rotated frame.
	const under = (ox: number, oy: number, deg: number, lx: number, ly: number) => {
		const p = rotated(lx, ly, deg);
		return { x: ox + p.x, y: oy + p.y };
	};

	for (const a of accessories) {
		switch (a) {
			case 'beanie':
				add(100, t + 22, beanieWidth(cw) - 1, 5.5);
				break;
			case 'nightcap':
				add(100, t + 22, nightcapWidth(cw) - 1, 5.5);
				break;
			case 'cap':
				add(100, t + 21, capWidth(cw), 4.5);
				break;
			case 'propeller':
				add(100, t + 13, propellerWidth(cw) - 1, 4);
				break;
			case 'party-hat': {
				const p = under(100 - cw * 0.3, t + 8, -14, 0, 3);
				add(p.x, p.y, 16, 4, -14);
				break;
			}
			case 'crown': {
				const p = under(100 + cw * 0.16, t + 4, -9, 0, 0.5);
				add(p.x, p.y, 17, 3.5, -9);
				break;
			}
			case 'bow':
				add(100 + hw * 0.52, t + 12, 13, 6, 20);
				break;
			case 'star-clip':
				add(100 - hw * 0.56 + 2, t + 16, 9, 4.5, -16);
				break;
			case 'flower':
				add(100 - hw * 0.86 + FLOWER_STEM.x - 3, t + 38 + FLOWER_STEM.y - 8, 10, 8);
				break;
			case 'horns':
				for (const s of [-1, 1]) {
					const p = under(100 - hornOffset(cw), t + 12, -14, 0, 6);
					add(100 - s * (p.x - 100), p.y, 9, 3.5, 14 * s);
				}
				break;
			case 'ears':
				for (const s of [-1, 1]) add(100 + s * 24, t + 14, 12, 4.5, -32 * s);
				break;
		}
	}
	return out;
}

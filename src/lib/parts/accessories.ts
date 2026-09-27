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
	'mustache'
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

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
	hw: number
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
				add(100, t + 22, hw * 0.8 + 5, 5.5);
				break;
			case 'propeller':
				add(100, t + 13, hw * 0.5 + 7, 4);
				break;
			case 'party-hat': {
				const p = under(100 - hw * 0.22, t + 8, -14, 0, 3);
				add(p.x, p.y, 16, 4, -14);
				break;
			}
			case 'crown': {
				const p = under(100 + hw * 0.12, t + 4, -9, 0, 0.5);
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
				add(100 - hw * 0.86 + 1, t + 40, 10, 8);
				break;
			case 'horns':
				for (const s of [-1, 1]) {
					const p = under(100 - hw * 0.42, t + 12, -14, 0, 6);
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

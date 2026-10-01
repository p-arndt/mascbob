import { clamp } from './geometry.js';
import type { ArmAngles } from './parts/body.js';

/** Parts of the figure that can be grabbed and pulled around; they spring back on release. */
export const GRAB_PARTS = ['head', 'arm-left', 'arm-right', 'leg-left', 'leg-right'] as const;
export type GrabPart = (typeof GRAB_PARTS)[number];

export interface Point {
	x: number;
	y: number;
}

export const GRAB_LIMITS = {
	/** ViewBox units the grabbed spot of the head follows the pointer: sideways, up and down. */
	head: { side: 90, up: 120, down: 14 },
	/** How many times its own length an arm stretches at most. */
	arm: 2.6,
	/** Degrees a leg swings outward, and inward across the other one. */
	legOut: 80,
	legIn: 30,
	/** ViewBox units a leg grows (or shrinks) at most when pulled along its length. */
	legGrow: 70,
	legShrink: 8
} as const;

/** Below this much elbow bend (degrees) the arm is nearly straight and may flip its elbow freely. */
const STRAIGHT = 25;

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Wraps degrees into -180..180. */
function wrap(a: number): number {
	return ((((a + 180) % 360) + 360) % 360) - 180;
}

/**
 * Rubber band: follows `x` one to one at first, then gives less and less the further it
 * is pulled, approaching `max` without ever reaching it. Soft limits feel like material
 * resisting; hard clamps feel like the part got stuck.
 */
export function rubber(x: number, max: number): number {
	return max * Math.tanh(x / max);
}

/** `rubber` with a separate limit on each side of zero. */
function rubber2(x: number, below: number, above: number): number {
	return x < 0 ? rubber(x, below) : rubber(x, above);
}

/**
 * Signed degrees `to` has turned around `pivot` since `from`, in SVG's `rotate()`
 * convention (positive is clockwise on screen, where y points down).
 */
export function swing(pivot: Point, from: Point, to: Point): number {
	const a = Math.atan2(from.y - pivot.y, from.x - pivot.x);
	const b = Math.atan2(to.y - pivot.y, to.x - pivot.x);
	return wrap(deg(b - a));
}

/** Arm angles plus how much both segments are stretched (1 = their own length). */
export interface ArmReach extends ArmAngles {
	stretch: number;
}

/**
 * Two-bone IK for the left arm (mirror x around 100 for the right one), in the angle
 * convention of `limbEnd`: 0 is hanging down, positive swings toward -x. Out-of-reach
 * targets straighten the arm toward them and stretch it like rubber: the hand stays under
 * the pointer at first and lags further behind the harder it is pulled. The elbow keeps
 * bending the way it did in `prev` and only flips while the arm is nearly straight, so it
 * never snaps; when free, it prefers pointing outward, away from the torso.
 */
export function reachArm(
	target: Point,
	shoulder: Point,
	upper: number,
	fore: number,
	prev: ArmAngles
): ArmReach {
	const dx = target.x - shoulder.x;
	const dy = target.y - shoulder.y;
	const base = deg(Math.atan2(-dx, dy));
	const reach = upper + fore;
	const dist = Math.hypot(dx, dy);
	// Follow ordinary pulls directly; resistance only starts on a long stretch.
	const ratio = dist / reach;
	const stretch =
		ratio <= 1.8 ? Math.max(1, ratio) : 1.8 + rubber(ratio - 1.8, GRAB_LIMITS.arm - 1.8);
	const d = clamp(dist, Math.abs(upper - fore) + 0.01, reach - 0.001);
	const alpha = deg(Math.acos(clamp((upper ** 2 + d ** 2 - fore ** 2) / (2 * upper * d), -1, 1)));
	const inner = deg(
		Math.acos(clamp((upper ** 2 + fore ** 2 - d ** 2) / (2 * upper * fore), -1, 1))
	);
	const bend = 180 - inner;
	const a: ArmAngles = { a1: base + alpha, a2: -bend };
	const b: ArmAngles = { a1: base - alpha, a2: bend };
	const outward = Math.sin((a.a1 * Math.PI) / 180) >= Math.sin((b.a1 * Math.PI) / 180) ? a : b;
	const pick = bend < STRAIGHT || prev.a2 === 0 ? outward : prev.a2 < 0 ? a : b;
	// Stay on the same turn as `prev`, so a spring toward the result never spins the arm around.
	return { a1: prev.a1 + wrap(pick.a1 - prev.a1), a2: pick.a2, stretch };
}

/** How a grabbed figure responds to being pulled; see the `grab` prop. */
export interface GrabOptions {
	/** 0..1, how far a grabbed head follows the pointer. 1 keeps the grabbed spot under it. */
	follow?: number;
	/** How far the figure leans into a pull: 0 keeps it upright, 2 leans twice as far. */
	lean?: number;
}

export const DEFAULT_GRAB: Required<GrabOptions> = { follow: 1, lean: 1 };

/** Fills in defaults and clamps `follow` to 0..1 and `lean` to 0..3. */
export function resolveGrab(input: GrabOptions | undefined): Required<GrabOptions> {
	const num = (v: number | undefined, fallback: number) =>
		typeof v === 'number' && Number.isFinite(v) ? v : fallback;
	return {
		follow: clamp(num(input?.follow, DEFAULT_GRAB.follow), 0, 1),
		lean: clamp(num(input?.lean, DEFAULT_GRAB.lean), 0, 3)
	};
}

/**
 * Where the grabbed spot of the head goes when pulled from `from` to `to`, as an offset
 * from `from`: one to one at first, then with rubbery resistance. Up and to the sides it
 * goes far on a stretching neck; down it barely gives, since the body is in the way.
 * `follow` below 1 makes the head stiffer: it only goes that fraction of the way.
 */
export function pullHead(from: Point, to: Point, follow = 1): Point {
	const { head } = GRAB_LIMITS;
	return {
		x: rubber(to.x - from.x, head.side) * follow,
		y: rubber2(to.y - from.y, head.up, head.down) * follow
	};
}

/**
 * A pulled head: moved by (`x`, `y`) on its neck, tilted `tilt` degrees around its base and
 * scaled by `sx`/`sy` from it. Apply as
 * `translate(x y) rotate(tilt bx by) translate(bx by) scale(sx sy) translate(-bx -by)`.
 */
export interface HeadPose {
	x: number;
	y: number;
	tilt: number;
	sx: number;
	sy: number;
}

/**
 * How a head with its base at `base`, grabbed at `grab`, carries the pull `pull`. It stays
 * a head: it tilts into the pull, stretches a little when pulled up and squashes when pushed
 * down, and otherwise moves as a whole on its neck, so the face never skews. The move is
 * solved so the grabbed spot lands exactly at `grab + pull`.
 */
export function headPose(grab: Point, base: Point, pull: Point): HeadPose {
	const tilt = rubber(pull.x * 0.35, 28);
	const sy = pull.y < 0 ? 1 + rubber(-pull.y / 250, 0.25) : 1 - rubber(pull.y / 60, 0.15);
	// Squash and stretch keep the head's volume.
	const sx = 1 / Math.sqrt(sy);
	const gx = (grab.x - base.x) * sx;
	const gy = (grab.y - base.y) * sy;
	const r = (tilt * Math.PI) / 180;
	const cos = Math.cos(r);
	const sin = Math.sin(r);
	return {
		x: grab.x - base.x + pull.x - (gx * cos - gy * sin),
		y: grab.y - base.y + pull.y - (gx * sin + gy * cos),
		tilt,
		sx,
		sy
	};
}

/**
 * Leg swing around its hip `pivot` (degrees, `rotate()` convention) for the leg on
 * `side` (-1 left, 1 right): far out to the side, only a little across the other leg.
 */
export function legSwing(pivot: Point, from: Point, to: Point, side: -1 | 1): number {
	// Rotating clockwise swings the foot toward -x, which is outward for the left leg.
	const outward = rubber2(swing(pivot, from, to) * -side, GRAB_LIMITS.legIn, GRAB_LIMITS.legOut);
	return outward * -side;
}

/** ViewBox units a leg grows while its grabbed point is pulled away from the hip (negative: pushed in). */
export function legStretch(pivot: Point, from: Point, to: Point): number {
	const r0 = Math.hypot(from.x - pivot.x, from.y - pivot.y);
	const r1 = Math.hypot(to.x - pivot.x, to.y - pivot.y);
	return rubber2(r1 - r0, GRAB_LIMITS.legShrink, GRAB_LIMITS.legGrow);
}

/**
 * Spring settings for a held part: stiff and well damped, so it tracks the pointer
 * closely but smooths over coarse or jumpy pointer events instead of teleporting.
 */
export const HOLD_SPRING = { stiffness: 0.5, damping: 0.9 } as const;
/** Spring settings once let go: loose and underdamped, so the part snaps back and jiggles. */
export const RELEASE_SPRING = { stiffness: 0.12, damping: 0.22 } as const;

/** Switches a spring between `HOLD_SPRING` and `RELEASE_SPRING`. */
export function tune(spring: { stiffness: number; damping: number }, held: boolean): void {
	const c = held ? HOLD_SPRING : RELEASE_SPRING;
	spring.stiffness = c.stiffness;
	spring.damping = c.damping;
}

/** Client coordinates to the local coordinates of `frame`, through every SVG and CSS transform. */
export function toFrame(frame: SVGGraphicsElement, x: number, y: number): Point | null {
	const m = frame.getScreenCTM();
	if (!m) return null;
	const p = new DOMPoint(x, y).matrixTransform(m.inverse());
	return { x: p.x, y: p.y };
}

export interface DragHandlers {
	/** The coordinate system to report points in; read again on every move since it may animate. */
	frame: () => SVGGraphicsElement | null | undefined;
	/** CSS pixels the pointer has to travel before it counts as a drag rather than a click. */
	threshold?: number;
	/** The drag began at `from`; return false to refuse it. */
	start(from: Point): boolean | void;
	move(to: Point, from: Point): void;
	end(): void;
}

/**
 * Follows one pointer from a `pointerdown` on a grabbable part until it lets go. Nothing
 * happens until it moved past the threshold, so a plain click still goes through as a boop.
 */
export function drag(e: PointerEvent, h: DragHandlers): void {
	if (e.pointerType === 'mouse' && e.button !== 0) return;
	// Typed as HTMLElement for its pointer event map; SVG elements dispatch the same events.
	const el = e.currentTarget as HTMLElement | null;
	const frame = h.frame();
	if (!el || !frame) return;
	const from = toFrame(frame, e.clientX, e.clientY);
	if (!from) return;
	const threshold = h.threshold ?? 5;
	let active = false;
	let x = e.clientX;
	let y = e.clientY;
	let raf = 0;
	try {
		el.setPointerCapture(e.pointerId);
	} catch {
		// Synthetic events have no active pointer to capture; moves still bubble to `el`.
	}
	// Re-aims every frame, not only on pointer events: the figure keeps breathing, swaying and
	// leaning under a still pointer, and the held part has to stay put under it regardless.
	const follow = () => {
		if (!el.isConnected) return done();
		const f = h.frame();
		const to = f && toFrame(f, x, y);
		if (to) h.move(to, from);
		raf = requestAnimationFrame(follow);
	};
	const move = (ev: PointerEvent) => {
		if (ev.pointerId !== e.pointerId) return;
		x = ev.clientX;
		y = ev.clientY;
		if (active) return;
		if (Math.hypot(x - e.clientX, y - e.clientY) < threshold) return;
		if (h.start(from) === false) return done();
		active = true;
		follow();
	};
	const done = (ev?: PointerEvent) => {
		if (ev && ev.pointerId !== e.pointerId) return;
		cancelAnimationFrame(raf);
		el.removeEventListener('pointermove', move);
		el.removeEventListener('pointerup', done);
		el.removeEventListener('pointercancel', done);
		el.removeEventListener('lostpointercapture', done);
		if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
		if (active) h.end();
		active = false;
	};
	el.addEventListener('pointermove', move);
	el.addEventListener('pointerup', done);
	el.addEventListener('pointercancel', done);
	el.addEventListener('lostpointercapture', done);
}

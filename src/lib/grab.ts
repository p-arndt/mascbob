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
	/** Degrees the head bends on its neck either way. */
	head: 40,
	/** Head stretch when pulled away from (or pushed toward) the neck. */
	stretch: [0.86, 1.22],
	/** Degrees a leg swings outward, and inward across the other one. */
	legOut: 75,
	legIn: 15
} as const;

/** Below this much elbow bend (degrees) the arm is nearly straight and may flip its elbow freely. */
const STRAIGHT = 25;

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Wraps degrees into -180..180. */
function wrap(a: number): number {
	return ((((a + 180) % 360) + 360) % 360) - 180;
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

/**
 * Two-bone IK for the left arm (mirror x around 100 for the right one), in the angle
 * convention of `limbEnd`: 0 is hanging down, positive swings toward -x. Out-of-reach
 * targets get the arm pointing at them at full length. The elbow keeps bending the way
 * it did in `prev` and only flips while the arm is nearly straight, so it never snaps;
 * when free, it prefers pointing outward, away from the torso.
 */
export function reachArm(
	target: Point,
	shoulder: Point,
	upper: number,
	fore: number,
	prev: ArmAngles
): ArmAngles {
	const dx = target.x - shoulder.x;
	const dy = target.y - shoulder.y;
	const base = deg(Math.atan2(-dx, dy));
	const d = clamp(Math.hypot(dx, dy), Math.abs(upper - fore) + 0.01, upper + fore - 0.001);
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
	return { a1: prev.a1 + wrap(pick.a1 - prev.a1), a2: pick.a2 };
}

/**
 * Head bend (degrees, `rotate()` convention) and stretch along the neck while pulled
 * from `from` to `to`, both relative to the neck `pivot`.
 */
export function pullHead(pivot: Point, from: Point, to: Point): { angle: number; stretch: number } {
	const angle = clamp(swing(pivot, from, to), -GRAB_LIMITS.head, GRAB_LIMITS.head);
	const r0 = Math.max(Math.hypot(from.x - pivot.x, from.y - pivot.y), 12);
	const r1 = Math.hypot(to.x - pivot.x, to.y - pivot.y);
	// Half the pull goes into the stretch; the rest reads as slack in the neck.
	const [lo, hi] = GRAB_LIMITS.stretch;
	return { angle, stretch: clamp(1 + (r1 / r0 - 1) * 0.5, lo, hi) };
}

/**
 * Leg swing around its hip `pivot` (degrees, `rotate()` convention) for the leg on
 * `side` (-1 left, 1 right): far out to the side, only a little across the other leg.
 */
export function legSwing(pivot: Point, from: Point, to: Point, side: -1 | 1): number {
	// Rotating clockwise swings the foot toward -x, which is outward for the left leg.
	const outward = clamp(swing(pivot, from, to) * -side, -GRAB_LIMITS.legIn, GRAB_LIMITS.legOut);
	return outward * -side;
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
	try {
		el.setPointerCapture(e.pointerId);
	} catch {
		// Synthetic events have no active pointer to capture; moves still bubble to `el`.
	}
	const move = (ev: PointerEvent) => {
		if (ev.pointerId !== e.pointerId) return;
		if (!active) {
			if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < threshold) return;
			if (h.start(from) === false) return done();
			active = true;
		}
		const f = h.frame();
		const to = f && toFrame(f, ev.clientX, ev.clientY);
		if (to) h.move(to, from);
	};
	const done = (ev?: PointerEvent) => {
		if (ev && ev.pointerId !== e.pointerId) return;
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

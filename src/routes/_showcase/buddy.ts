/** A point in the buddy's coordinates (its offset parent, which spans the whole page). */
export interface Point {
	x: number;
	y: number;
}

/** An element's box in the buddy's coordinates. */
export interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

/** The visible slice of the page. */
export interface View {
	top: number;
	height: number;
	/** Covered by the sticky nav, so the buddy never stands behind it. */
	inset: number;
}

/** A surface counts when its top edge, where the buddy stands, is comfortably on screen. */
export function onScreen(box: Box, view: View, headroom = 90): boolean {
	return box.top > view.top + view.inset + headroom && box.top < view.top + view.height - 40;
}

/** Keeps a standing buddy's feet on the surface, or centered on one narrower than its feet. */
export function standX(box: Box, x: number, edge = 10): number {
	if (box.width <= 2 * edge) return box.left + box.width / 2;
	return Math.min(box.left + box.width - edge, Math.max(box.left + edge, x));
}

/** What a probe in the space above a surface ran into, see `blocksHeadroom`. */
export interface HeadroomHit {
	/** The surface itself, or something inside it. */
	own: boolean;
	/** Something the surface sits in: its card, its list, the page. */
	ancestor: boolean;
	/** The buddy itself, or the sticky nav every scrolled page slides under anyway. */
	ignored: boolean;
	/** Text the reader reads: its own words, or inside a heading, paragraph or link of its own. */
	text: boolean;
	/** A picture or one of the other mascots. */
	media: boolean;
	/** Has a background, border or shadow of its own. */
	painted: boolean;
}

/**
 * Whether a probe hit above a surface means standing there would cover something. The card a
 * surface sits on and bare layout boxes are just backdrop; text, pictures and anything else
 * painted are content the buddy would hide.
 */
export function blocksHeadroom(hit: HeadroomHit): boolean {
	if (hit.ignored || hit.own) return false;
	if (hit.text || hit.media) return true;
	if (hit.ancestor) return false;
	return hit.painted;
}

/** Heights above a surface, as parts of the buddy's height, where its headroom is probed. */
export const HEADROOM_PROBES = [0.3, 0.6, 0.9];

/**
 * Picks a surface within jumping reach of `from`: higher, lower or across a gap, but not the
 * ground it already stands on. Close surfaces win more often, so the buddy climbs through the
 * page step by step instead of teleporting.
 */
export function pickHop(
	from: Point,
	boxes: readonly Box[],
	random: () => number = Math.random,
	reach = { x: 420, up: 260, down: 420 }
): number {
	const options: number[] = [];
	const weights: number[] = [];
	boxes.forEach((box, i) => {
		const dy = box.top - from.y;
		const gap = Math.max(box.left - from.x, 0, from.x - (box.left + box.width));
		// Same height and right under its feet means it is the surface it is on.
		if (Math.abs(dy) < 6 && gap === 0) return;
		if (gap > reach.x || dy < -reach.up || dy > reach.down) return;
		options.push(i);
		weights.push(1 / (1 + Math.hypot(gap, dy) / 160));
	});
	if (!options.length) return -1;
	let roll = random() * weights.reduce((a, b) => a + b, 0);
	for (let k = 0; k < options.length; k++) {
		roll -= weights[k];
		if (roll <= 0) return options[k];
	}
	return options[options.length - 1];
}

/** How long a hop takes: long jumps take longer, but never so long that it feels floaty. */
export function hopDuration(from: Point, to: Point): number {
	const distance = Math.hypot(to.x - from.x, to.y - from.y);
	return Math.round(Math.min(1000, Math.max(380, 320 + distance * 0.45)));
}

/** The point at `t` (0–1) along a parabolic hop whose apex clears the higher end. */
export function arc(from: Point, to: Point, t: number): Point {
	const distance = Math.hypot(to.x - from.x, to.y - from.y);
	const height = Math.min(220, Math.max(40, distance * 0.3)) + Math.max(0, from.y - to.y) * 0.4;
	const k = Math.min(1, Math.max(0, t));
	return {
		x: from.x + (to.x - from.x) * k,
		y: from.y + (to.y - from.y) * k - height * 4 * k * (1 - k)
	};
}

/** The visible slice of the page across: its left and right edge in the buddy's coordinates. */
export interface Span {
	left: number;
	right: number;
}

/** Which way the buddy left the screen. */
export type Exit = 'top' | 'bottom';
/** Where it comes back from: hopping in over a side edge, dropping from the top, or up from below. */
export type Entrance = 'left' | 'right' | 'above' | 'below';
export type AwayCause = 'fell' | 'scrolled';

/**
 * Which way the buddy is out of sight with its feet at `p`, or null while any of it shows. The
 * screen sides and top are walls, so it only ever leaves above (the reader scrolled down past it)
 * or below (it fell past every surface, or the reader scrolled up). Behind the nav counts as gone.
 * `height` is the figure's, from its feet to the top of its head.
 */
export function offScreen(p: Point, view: View, height: number): Exit | null {
	if (p.y < view.top + view.inset) return 'top';
	if (p.y - height > view.top + view.height) return 'bottom';
	return null;
}

/**
 * How long it stays away. Fallen off the page, it is gone for a few seconds so the throw lands
 * before it climbs back; following a reader who scrolled on, it only takes a breath, so it reads
 * as running after them rather than reappearing at once.
 */
export function absence(cause: AwayCause, random: () => number = Math.random): number {
	const [min, spread] = cause === 'fell' ? [2200, 2600] : [250, 450];
	return Math.round(min + random() * spread);
}

/**
 * Picks the way back in. After a scroll it follows from where the reader came, so it never seems
 * to skip the stretch in between; after a fall any way in works, mostly climbing back up from
 * where it fell. `null` is its very first appearance.
 */
export function pickEntrance(
	exit: Exit | null,
	random: () => number = Math.random,
	scrolled = false
): Entrance {
	if (exit === 'top') return 'above';
	if (scrolled && exit === 'bottom') return 'below';
	const roll = random();
	const side = (r: number): Entrance => (r < 0.5 ? 'left' : 'right');
	if (exit === 'bottom') {
		return roll < 0.5 ? 'below' : roll < 0.7 ? 'above' : side((roll - 0.7) / 0.3);
	}
	return roll < 0.5 ? 'above' : side((roll - 0.5) * 2);
}

/**
 * Picks the surface to come back onto, among those on screen: near the edge it enters from, and
 * not too far up or down the screen so the reader sees it arrive. -1 when there is none.
 */
export function pickEntryTarget(
	entrance: Entrance,
	boxes: readonly Box[],
	view: View,
	span: Span,
	random: () => number = Math.random
): number {
	const height = {
		left: 0.55,
		right: 0.55,
		above: 0.4,
		below: 0.7
	}[entrance];
	const level = view.top + view.height * height;
	const score = (b: Box) => {
		const edge =
			entrance === 'left'
				? b.left - span.left
				: entrance === 'right'
					? span.right - (b.left + b.width)
					: 0;
		return Math.max(0, edge) + Math.abs(b.top - level) * 0.6;
	};
	const ranked = boxes.map((b, i) => ({ i, s: score(b) })).sort((a, b) => a.s - b.s);
	if (!ranked.length) return -1;
	return ranked[Math.floor(random() * Math.min(3, ranked.length))].i;
}

/**
 * Where the buddy waits, just out of sight, before it enters onto `box`. From a side it hops in
 * from beside the target's height; from above it drops in over the target from past the top of
 * the window; from below it starts under the bottom edge and peeks up before the leap. `height`
 * is the figure's, so not even the top of its head shows yet.
 */
export function entryStart(
	entrance: Entrance,
	box: Box,
	view: View,
	span: Span,
	height: number,
	random: () => number = Math.random
): Point {
	const bottom = view.top + view.height;
	if (entrance === 'left') return { x: span.left - height, y: Math.min(box.top - 30, bottom) };
	if (entrance === 'right') return { x: span.right + height, y: Math.min(box.top - 30, bottom) };
	const x = standX(box, box.left + random() * box.width, 16);
	if (entrance === 'above') return { x, y: view.top - 10 };
	const off = (random() < 0.5 ? -1 : 1) * (30 + random() * 40);
	return {
		x: Math.min(span.right - height, Math.max(span.left + height, x + off)),
		y: bottom + height + 10
	};
}

/** A falling or thrown buddy: feet position and velocity in px/s, tilt in degrees and deg/s. */
export interface Flight {
	x: number;
	y: number;
	vx: number;
	vy: number;
	angle: number;
	spin: number;
}

/** The box a flight bounces around in: the screen's sides and the top edge under the nav. */
export interface Bounds {
	left: number;
	right: number;
	/** The highest the feet may go, so the head stays below the top of the screen. */
	top: number;
}

export const GRAVITY = 2600;
/** Faster than this and a landing bounces instead of sticking. */
const BOUNCE_SPEED = 950;
const MAX_THROW = 4200;
const MAX_SPIN = 720;
/** Per-second decay rates: enough air to tame a wild throw, too little to feel floaty. */
const DRAG = 0.25;
const SPIN_DRAG = 1.2;
const WALL_BOUNCE = 0.55;
const CEILING_BOUNCE = 0.5;
/**
 * Small fixed steps keep the arc the same at any frame rate, and keep a fast buddy from skipping
 * across a narrow surface between two frames.
 */
const SUBSTEP = 1 / 240;

const clampSpin = (spin: number) => Math.max(-MAX_SPIN, Math.min(MAX_SPIN, spin));

/**
 * Advances a falling buddy by one short step of `dt` seconds: gravity, air drag, bounces off the
 * screen's sides and top, and a landing when its feet cross the top edge of a surface from above.
 * `landed` is the surface index, or -1; `bounced` marks a hard landing that sent it back up.
 */
export function fall(
	f: Flight,
	dt: number,
	boxes: readonly Box[],
	bounds: Bounds
): { flight: Flight; landed: number; bounced: boolean } {
	const drag = Math.exp(-DRAG * dt);
	let vx = f.vx * drag;
	let vy = f.vy * drag + GRAVITY * dt;
	let spin = f.spin * Math.exp(-SPIN_DRAG * dt);
	let x = f.x + vx * dt;
	let y = f.y + vy * dt;
	const angle = f.angle + spin * dt;
	// The new direction comes from the side it hit, not from flipping the old one, so a step that
	// still ends outside can't send it back out.
	if (x < bounds.left || x > bounds.right) {
		const side = x < bounds.left ? 1 : -1;
		x = side > 0 ? bounds.left : bounds.right;
		vx = side * Math.abs(vx) * WALL_BOUNCE;
		spin *= 0.6;
	}
	if (y < bounds.top) {
		y = bounds.top;
		vy = Math.abs(vy) * CEILING_BOUNCE;
		spin *= 0.6;
	}
	if (vy > 0) {
		// The first surface crossed is the highest one, the one it actually hits.
		let hit = -1;
		boxes.forEach((b, i) => {
			if (f.y > b.top || y < b.top || x < b.left || x > b.left + b.width) return;
			if (hit < 0 || b.top < boxes[hit].top) hit = i;
		});
		if (hit >= 0) {
			const top = boxes[hit].top;
			if (vy > BOUNCE_SPEED) {
				// Scraping the ground while sliding sets it tumbling the way it slides.
				const kick = clampSpin(spin * 0.4 + vx * 0.3);
				const flight = { x, y: top, vx: vx * 0.6, vy: -vy * 0.32, angle, spin: kick };
				return { flight, landed: -1, bounced: true };
			}
			return { flight: { x, y: top, vx: 0, vy: 0, angle, spin: 0 }, landed: hit, bounced: false };
		}
	}
	return { flight: { x, y, vx, vy, angle, spin }, landed: -1, bounced: false };
}

/** Advances a flight by a whole frame of `dt` seconds in fixed small steps, see `fall`. */
export function fly(
	f: Flight,
	dt: number,
	boxes: readonly Box[],
	bounds: Bounds
): { flight: Flight; landed: number; bounced: boolean } {
	const steps = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-9));
	let flight = f;
	let bounced = false;
	for (let i = 0; i < steps; i++) {
		const next = fall(flight, dt / steps, boxes, bounds);
		flight = next.flight;
		bounced ||= next.bounced;
		if (next.landed >= 0) return { flight, landed: next.landed, bounced };
	}
	return { flight, landed: -1, bounced };
}

/** Samples older than this say nothing about the release any more. */
const THROW_WINDOW = 100;
/** No pointer event for this long means the pointer stopped, not that a frame went by. */
const THROW_REST = 40;
/** How fast a sample's weight fades with its age, in ms. */
const THROW_FADE = 45;

/**
 * The pointer's velocity at `now` (default: the last sample), in px/s: a least-squares fit over
 * the samples of the last 100 ms that weighs recent ones most. A fit shrugs off one jittery
 * sample, where the difference of two samples swings with it; a pointer that rested a while
 * counts as still, so a pause before letting go drops instead of throwing.
 */
export function throwVelocity(samples: readonly (Point & { t: number })[], now?: number): Point {
	// Letting go repeats the last spot without saying the pointer stopped there; only how long
	// it has been there tells.
	let end = samples.length;
	while (
		end > 1 &&
		samples[end - 1].x === samples[end - 2].x &&
		samples[end - 1].y === samples[end - 2].y
	)
		end--;
	const last = samples[end - 1];
	if (!last) return { x: 0, y: 0 };
	const at = now ?? samples[samples.length - 1].t;
	const points = samples.slice(0, end).filter((s) => at - s.t <= THROW_WINDOW);
	// Pointer events only fire on movement, so a long silence means it sat where it last was.
	if (at - last.t > THROW_REST) points.push({ x: last.x, y: last.y, t: at });
	if (points.length < 2) return { x: 0, y: 0 };
	const weights = points.map((p) => Math.exp(-(at - p.t) / THROW_FADE));
	const total = weights.reduce((a, b) => a + b, 0);
	const mean = (key: 'x' | 'y' | 't') =>
		points.reduce((sum, p, i) => sum + weights[i] * p[key], 0) / total;
	const tm = mean('t');
	const xm = mean('x');
	const ym = mean('y');
	let tt = 0;
	let tx = 0;
	let ty = 0;
	points.forEach((p, i) => {
		const dt = p.t - tm;
		tt += weights[i] * dt * dt;
		tx += weights[i] * dt * (p.x - xm);
		ty += weights[i] * dt * (p.y - ym);
	});
	if (tt < 1e-6) return { x: 0, y: 0 };
	const vx = (tx / tt) * 1000;
	const vy = (ty / tt) * 1000;
	const speed = Math.hypot(vx, vy);
	const scale = speed > MAX_THROW ? MAX_THROW / speed : 1;
	return { x: vx * scale, y: vy * scale };
}

/** `p` turned by `deg` degrees, clockwise on screen like CSS `rotate`. */
export function rotate(p: Point, deg: number): Point {
	const a = (deg * Math.PI) / 180;
	const c = Math.cos(a);
	const s = Math.sin(a);
	return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** A held buddy's tilt in degrees and how fast it turns, in deg/s. */
export interface Swing {
	angle: number;
	spin: number;
}

/** Per second: a few swings back and forth, then it hangs still. */
const SWING_DAMPING = 2.6;

/**
 * Swings a held buddy for `dt` seconds like a physical pendulum hanging from the grab point.
 * `grip` is the grab point seen from the center of mass in the upright figure, `accel` the grab
 * point's acceleration in px/s², and `gyration` the figure's radius of gyration. Moving the hand
 * tilts it through inertia instead of mapping speed to an angle, so it lags, overshoots and
 * settles rather than twitching with every pointer event. Grabbed by the feet, it tips over and
 * hangs upside down, as it would.
 */
export function dangle(s: Swing, grip: Point, accel: Point, dt: number, gyration: number): Swing {
	const steps = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-9));
	const h = dt / steps;
	const inertia = grip.x * grip.x + grip.y * grip.y + gyration * gyration;
	const limit = (MAX_SPIN * Math.PI) / 180;
	let angle = (s.angle * Math.PI) / 180;
	let spin = (s.spin * Math.PI) / 180;
	// In the hand's frame, its acceleration pulls on the body like a gravity of its own.
	const fx = -accel.x;
	const fy = GRAVITY - accel.y;
	for (let i = 0; i < steps; i++) {
		// From the grab point to the center of mass: the grip turned with the body, reversed.
		const r = rotate(grip, (angle * 180) / Math.PI);
		const torque = -r.x * fy + r.y * fx;
		spin += (torque / inertia - SWING_DAMPING * spin) * h;
		spin = Math.max(-limit, Math.min(limit, spin));
		angle += spin * h;
	}
	return { angle: (angle * 180) / Math.PI, spin: (spin * 180) / Math.PI };
}

/**
 * How a buddy dangling from `grip` (see `dangle`) leaves a hand moving at `hand` px/s: its center
 * of mass carries the hand's velocity plus its own swing around the grab point, and the swing
 * goes on as its spin.
 */
export function letGo(
	s: Swing,
	grip: Point,
	hand: Point
): { vx: number; vy: number; spin: number } {
	const r = rotate(grip, s.angle);
	const w = (s.spin * Math.PI) / 180;
	// The center of mass sits at -r from the hand; turning at w, it moves at w × (-r).
	let vx = hand.x + w * r.y;
	let vy = hand.y - w * r.x;
	const speed = Math.hypot(vx, vy);
	if (speed > MAX_THROW) {
		vx *= MAX_THROW / speed;
		vy *= MAX_THROW / speed;
	}
	return { vx, vy, spin: clampSpin(s.spin) };
}

/** The stretch along the flight at full speed, and the speed (px/s) that gets half of it. */
const STRETCH = 0.3;
const STRETCH_HALF = 1600;

/**
 * A CSS `matrix()` that stretches the figure along its velocity and thins it across, keeping its
 * area. It pivots on `center`, the center of mass seen from the element's transform origin, so the
 * figure stretches both ways around the point that follows the flight arc instead of growing off
 * its feet, which stop being its bottom once it spins.
 */
export function stretch(vx: number, vy: number, center: Point): string {
	const speed = Math.hypot(vx, vy);
	if (speed < 1) return 'none';
	const s = 1 + (STRETCH * speed) / (speed + STRETCH_HALF);
	const ux = vx / speed;
	const uy = vy / speed;
	const along = s - 1;
	const across = 1 / s - 1;
	const a = 1 + along * ux * ux + across * uy * uy;
	const b = (along - across) * ux * uy;
	const d = 1 + along * uy * uy + across * ux * ux;
	const e = center.x - (a * center.x + b * center.y);
	const f = center.y - (b * center.x + d * center.y);
	const n = (v: number) => +v.toFixed(4);
	return `matrix(${n(a)}, ${n(b)}, ${n(b)}, ${n(d)}, ${n(e)}, ${n(f)})`;
}

/**
 * Eases `value` toward `target` at `rate` per second, the same whatever the frame rate, so a
 * correction (feet pulled back onto a ledge) glides instead of snapping.
 */
export function approach(value: number, target: number, dt: number, rate = 10): number {
	return target + (value - target) * Math.exp(-rate * dt);
}

/** A tumbling angle without its whole spins (−180–180°), so getting up turns the short way round. */
export function unwind(degrees: number): number {
	return (((degrees % 360) + 540) % 360) - 180;
}

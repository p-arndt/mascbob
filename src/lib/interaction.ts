import type { Mood } from './types.js';

/**
 * Pointer reactions, each individually switchable through the `reactions` prop:
 *
 * - `follow`: the head tilts toward the pointer, wherever it is on the page.
 * - `pet`: stroking back and forth over the head makes it content; enough strokes earn hearts.
 * - `startle`: a very fast flick of the pointer close by makes it jump in surprise.
 * - `dizzy`: circling the pointer around it twice makes its eyes roll and it wobble.
 * - `shy`: when the pointer gets very close it gets coy and leans away (until petted).
 * - `tickle`: rapid boops make it giggle; too many make it grumpy.
 * - `bored`: with the pointer resting for a long while it dozes off (only while `mood` is `idle`)
 *   and wakes up when the pointer moves again.
 */
/** Degrees the head tilts toward a far-away pointer with `follow`. */
export const FOLLOW_TILT = 7;

export const REACTIONS = ['follow', 'pet', 'startle', 'dizzy', 'shy', 'tickle', 'bored'] as const;
export type Reaction = (typeof REACTIONS)[number];

/** Startle and shy change the figure on their own accord, so they are opt-in. */
export const DEFAULT_REACTIONS: readonly Reaction[] = ['follow', 'pet', 'dizzy', 'tickle', 'bored'];

/**
 * `true` enables the defaults, `false` disables all, a list enables exactly those,
 * and an object toggles individual reactions on top of the defaults.
 */
export type ReactionsInput = boolean | readonly Reaction[] | Partial<Record<Reaction, boolean>>;

export type ReactionEvent =
	| { type: 'pet'; strokes: number }
	| { type: 'startle'; speed: number }
	| { type: 'dizzy'; direction: 1 | -1 }
	| { type: 'shy' }
	| { type: 'tickle'; level: 'giggle' | 'grumpy'; boops: number }
	| { type: 'bored' }
	| { type: 'wake' };

export type ReactionFlags = Readonly<Record<Reaction, boolean>>;

export function resolveReactions(input: ReactionsInput | undefined): ReactionFlags {
	const on = (list: readonly Reaction[]) =>
		Object.fromEntries(REACTIONS.map((r) => [r, list.includes(r)])) as Record<Reaction, boolean>;
	if (input === undefined || input === true) return on(DEFAULT_REACTIONS);
	if (input === false) return on([]);
	if (Array.isArray(input)) return on(input as readonly Reaction[]);
	const flags = on(DEFAULT_REACTIONS);
	for (const r of REACTIONS) {
		const value = (input as Partial<Record<Reaction, boolean>>)[r];
		if (value !== undefined) flags[r] = value;
	}
	return flags;
}

export interface PetOptions {
	/** Minimum length of one stroke. */
	minTravel: number;
	/** Movement back against the stroke that is ignored as jitter. */
	slack: number;
	/** Faster than this (units per ms) is a swipe, not a pet. */
	maxSpeed: number;
	/** Milliseconds without a completed stroke after which petting has stopped. */
	gap: number;
}

/** Counts horizontal back-and-forth strokes; positions and speed in any consistent unit. */
export class PetDetector {
	strokes = 0;
	private dir = 0;
	private anchor = NaN;
	private extreme = 0;
	private lastX = 0;
	private lastT = 0;
	private lastStroke = 0;

	constructor(
		readonly options: PetOptions = { minTravel: 14, slack: 4, maxSpeed: 1.2, gap: 900 }
	) {}

	/** Feeds a sample; returns true when it completed a stroke. */
	move(x: number, t: number): boolean {
		const o = this.options;
		if (Number.isNaN(this.anchor)) {
			this.start(x, t);
			return false;
		}
		const dt = Math.max(t - this.lastT, 1);
		const speed = Math.abs(x - this.lastX) / dt;
		this.lastX = x;
		this.lastT = t;
		if (speed > o.maxSpeed || (this.strokes > 0 && t - this.lastStroke > o.gap)) {
			this.start(x, t);
			return false;
		}
		if (this.dir === 0) {
			if (Math.abs(x - this.anchor) >= o.slack) {
				this.dir = Math.sign(x - this.anchor);
				this.extreme = x;
			}
			return false;
		}
		if ((x - this.extreme) * this.dir >= 0) {
			this.extreme = x;
			return false;
		}
		if ((this.extreme - x) * this.dir <= o.slack) return false;
		const long = Math.abs(this.extreme - this.anchor) >= o.minTravel;
		this.anchor = this.extreme;
		this.extreme = x;
		this.dir = -this.dir;
		if (!long) return false;
		this.strokes++;
		this.lastStroke = t;
		return true;
	}

	reset(): void {
		this.anchor = NaN;
		this.strokes = 0;
		this.dir = 0;
	}

	private start(x: number, t: number) {
		this.reset();
		this.anchor = x;
		this.lastX = x;
		this.lastT = t;
	}
}

export interface CircleOptions {
	/** Closer to the center than this is too small to count as circling. */
	minRadius: number;
	maxRadius: number;
	/** Full turns needed. */
	turns: number;
	/** A pause longer than this (ms) starts over. */
	timeout: number;
}

/** Accumulates the signed angle a pointer sweeps around a center. */
export class CircleDetector {
	/** Radians swept so far; positive is clockwise on screen (y down). */
	swept = 0;
	private lastAngle = NaN;
	private lastT = 0;

	constructor(
		readonly options: CircleOptions = { minRadius: 40, maxRadius: 420, turns: 2, timeout: 450 }
	) {}

	/**
	 * Feeds a pointer offset from the center; returns the direction (1 clockwise,
	 * -1 counter-clockwise) when the required turns are complete, else 0.
	 */
	move(dx: number, dy: number, t: number): 1 | -1 | 0 {
		const o = this.options;
		const r = Math.hypot(dx, dy);
		if (r < o.minRadius || r > o.maxRadius) {
			this.reset();
			return 0;
		}
		const angle = Math.atan2(dy, dx);
		if (!Number.isNaN(this.lastAngle) && t - this.lastT <= o.timeout) {
			let d = angle - this.lastAngle;
			if (d > Math.PI) d -= Math.PI * 2;
			else if (d < -Math.PI) d += Math.PI * 2;
			// A jump across the center is a teleport, not a circle.
			if (Math.abs(d) > Math.PI / 2) this.swept = 0;
			else this.swept += d;
		} else {
			this.swept = 0;
		}
		this.lastAngle = angle;
		this.lastT = t;
		if (Math.abs(this.swept) >= o.turns * Math.PI * 2) {
			const direction = this.swept > 0 ? 1 : -1;
			this.swept = 0;
			return direction;
		}
		return 0;
	}

	reset(): void {
		this.swept = 0;
		this.lastAngle = NaN;
	}
}

export interface FlickOptions {
	/** Smoothed speed (units per ms) that counts as a flick. */
	threshold: number;
	/** Milliseconds before another flick can fire. */
	cooldown: number;
}

/** Detects a burst of pointer speed, smoothed over a few samples so a single jumpy event doesn't fire it. */
export class FlickDetector {
	speed = 0;
	private lastX = NaN;
	private lastY = 0;
	private lastT = 0;
	private lastFire = -Infinity;

	constructor(readonly options: FlickOptions = { threshold: 4, cooldown: 2000 }) {}

	/** Feeds a sample; returns the smoothed speed when it is a flick, else 0. */
	move(x: number, y: number, t: number): number {
		if (Number.isNaN(this.lastX) || t - this.lastT > 100) {
			this.speed = 0;
		} else {
			const v = Math.hypot(x - this.lastX, y - this.lastY) / Math.max(t - this.lastT, 4);
			this.speed = this.speed * 0.5 + v * 0.5;
		}
		this.lastX = x;
		this.lastY = y;
		this.lastT = t;
		if (this.speed < this.options.threshold || t - this.lastFire < this.options.cooldown) return 0;
		this.lastFire = t;
		return this.speed;
	}

	reset(): void {
		this.lastX = NaN;
		this.speed = 0;
	}
}

export interface TickleOptions {
	/** Milliseconds a boop counts toward the tickle. */
	window: number;
	giggleAt: number;
	grumpyAt: number;
}

/** Counts rapid boops: a few in a row giggle, a barrage turns grumpy. */
export class TickleCounter {
	private times: number[] = [];

	constructor(readonly options: TickleOptions = { window: 2200, giggleAt: 4, grumpyAt: 9 }) {}

	/** Registers a boop; returns the level it reached, if it just crossed one. */
	boop(t: number): { level: 'giggle' | 'grumpy'; boops: number } | null {
		const o = this.options;
		while (this.times.length && t - this.times[0] > o.window) this.times.shift();
		this.times.push(t);
		const boops = this.times.length;
		if (boops >= o.grumpyAt) {
			this.times.length = 0;
			return { level: 'grumpy', boops };
		}
		return boops === o.giggleAt ? { level: 'giggle', boops } : null;
	}

	reset(): void {
		this.times.length = 0;
	}
}

/** What the mascot currently shows because of a reaction. */
export interface ReactionState {
	name: Reaction;
	mood: Mood;
}

/** Hooks into the component; all motion helpers are expected to no-op under reduced motion. */
export interface ReactionHost {
	show(state: ReactionState | null): void;
	/** Extra head tilt in degrees, positive to the right. */
	lean(deg: number): void;
	/** Gaze target, -1..1 on both axes. */
	look(x: number, y: number): void;
	jump(height: number, up?: number): void;
	wobble(deg: number): void;
	emit(event: ReactionEvent): void;
	/** Milliseconds on the same clock as `PointerSample.t`. */
	now?(): number;
}

/** Figure geometry in viewBox units. */
export interface ReactionFrame {
	viewHeight: number;
	head: { top: number; bottom: number; halfWidth: number };
}

/** One pointer sample; reuse a single object to avoid allocating per event. */
export interface PointerSample {
	/** Position in viewBox units. */
	x: number;
	y: number;
	/** CSS pixels per viewBox unit. */
	scale: number;
	t: number;
	/** Mouse and pen hover; touch only moves while pressed. */
	hovering: boolean;
	pressed: boolean;
}

export const REACTION_TIMING = {
	/** Pointer rest before dozing off. */
	boredAfter: 20000,
	strokesToPet: 2,
	strokesPerHearts: 6,
	hearts: 2200,
	startle: 800,
	dizzy: 1800,
	giggle: 1100,
	grumpy: 2600,
	wake: 650
} as const;

/**
 * Turns pointer samples and boops into reactions. Transient reactions (hearts,
 * startle, dizzy, tickle, wake) run on a timer and win over lasting ones
 * (petting, shy, bored), which hold only while their condition does.
 */
export class ReactionController {
	/** While true, the component should not steer the gaze toward the pointer itself. */
	holdsGaze = false;

	private flags = resolveReactions(false);
	private reduced = false;
	private baseMood: Mood = 'idle';
	private frame: ReactionFrame = {
		viewHeight: 200,
		head: { top: 36, bottom: 172, halfWidth: 48 }
	};

	private pet = new PetDetector();
	private circle = new CircleDetector();
	private flick = new FlickDetector();
	private tickle = new TickleCounter();

	private transient: ReactionState | null = null;
	private transientTimer: ReturnType<typeof setTimeout> | undefined;
	private petting = false;
	private petTimer: ReturnType<typeof setTimeout> | undefined;
	private shy = false;
	private shySide = 0;
	private bored = false;
	private boredTimer: ReturnType<typeof setTimeout> | undefined;
	private lastMove = 0;
	private seenHover = false;
	private rollTimer: ReturnType<typeof setInterval> | undefined;
	private shimmyTimer: ReturnType<typeof setInterval> | undefined;
	private shown: ReactionState | null = null;
	private leaned = 0;

	constructor(private host: ReactionHost) {}

	private now() {
		return this.host.now?.() ?? performance.now();
	}

	configure(flags: ReactionFlags, reduced: boolean, baseMood: Mood, frame: ReactionFrame): void {
		const changed = REACTIONS.some((r) => flags[r] !== this.flags[r]) || reduced !== this.reduced;
		this.frame = frame;
		this.baseMood = baseMood;
		if (changed) {
			this.flags = flags;
			this.reduced = reduced;
			this.reset();
			return;
		}
		if (this.bored && baseMood !== 'idle') this.bored = false;
		this.refresh();
	}

	pointer(s: PointerSample): void {
		const f = this.flags;
		const { head, viewHeight } = this.frame;
		this.lastMove = s.t;
		if (s.hovering) this.seenHover = true;
		if (this.bored) {
			this.bored = false;
			this.show({ name: 'bored', mood: 'surprised' }, REACTION_TIMING.wake);
			this.host.jump(8, 130);
			this.host.emit({ type: 'wake' });
		}
		if (f.bored) this.armBored();

		const cx = 100;
		const cy = viewHeight / 2;
		const dx = s.x - cx;
		const dy = s.y - cy;

		if (f.pet) {
			const overHead =
				!s.pressed &&
				Math.abs(dx) <= head.halfWidth * 1.05 &&
				s.y >= head.top - 24 &&
				s.y <= head.bottom;
			if (!overHead) this.pet.reset();
			else if (this.pet.move(s.x, s.t)) this.stroked();
		}

		if (f.dizzy && !this.petting) {
			const direction = this.circle.move(dx, dy, s.t);
			if (direction) this.dizzy(direction);
		}

		if (f.startle && !s.pressed && !this.petting) {
			const near = Math.hypot(dx, dy) < viewHeight * 0.9;
			// Speed in CSS pixels, so the threshold doesn't depend on the mascot's size.
			const speed = this.flick.move(s.x * s.scale, s.y * s.scale, s.t);
			if (speed && near) this.startle(speed);
		}

		if (f.shy) {
			const hcy = (head.top + head.bottom) / 2;
			const d = Math.hypot(dx / head.halfWidth, (s.y - hcy) / ((head.bottom - head.top) / 2));
			const close = !this.petting && d < (this.shy ? 1.9 : 1.5);
			if (close && !this.shy) this.host.emit({ type: 'shy' });
			this.shy = close;
			if (close) {
				this.shySide = dx < 0 ? -1 : 1;
				this.setLean(-this.shySide * 7);
				this.host.look(-this.shySide * 0.8, 0.5);
				this.holdsGaze = true;
			} else if (this.holdsGaze && !this.rollTimer) {
				this.holdsGaze = false;
			}
		}

		if (f.follow && !this.shy) {
			const reach = Math.max(viewHeight, 200) * 1.5;
			this.setLean(Math.max(-1, Math.min(1, dx / reach)) * FOLLOW_TILT);
		}
		this.refresh();
	}

	/** Pointer left the page. */
	leave(): void {
		this.pet.reset();
		this.circle.reset();
		this.flick.reset();
		this.shy = false;
		if (!this.rollTimer) this.holdsGaze = false;
		this.setLean(0);
		this.refresh();
	}

	boop(t = this.now()): void {
		if (!this.flags.tickle) return;
		const hit = this.tickle.boop(t);
		if (!hit) {
			// Boops don't cheer a grumpy mascot up, they prolong the sulk.
			if (this.transient?.mood === 'grumpy') this.show(this.transient, REACTION_TIMING.grumpy);
			return;
		}
		if (hit.level === 'grumpy') {
			this.show({ name: 'tickle', mood: 'grumpy' }, REACTION_TIMING.grumpy);
			this.host.wobble(-4);
		} else {
			this.show({ name: 'tickle', mood: 'happy' }, REACTION_TIMING.giggle);
			this.shimmy();
		}
		this.host.emit({ type: 'tickle', ...hit });
	}

	/** Drops every running reaction and timer, e.g. when going offscreen. */
	reset(): void {
		clearTimeout(this.transientTimer);
		clearTimeout(this.petTimer);
		clearTimeout(this.boredTimer);
		clearInterval(this.rollTimer);
		clearInterval(this.shimmyTimer);
		this.transientTimer = this.petTimer = this.boredTimer = this.rollTimer = undefined;
		this.transient = null;
		this.petting = this.shy = this.bored = this.holdsGaze = false;
		this.pet.reset();
		this.circle.reset();
		this.flick.reset();
		this.tickle.reset();
		this.setLean(0);
		this.refresh();
	}

	destroy(): void {
		this.reset();
	}

	private stroked() {
		const strokes = this.pet.strokes;
		if (strokes >= REACTION_TIMING.strokesToPet) this.petting = true;
		if (strokes % REACTION_TIMING.strokesPerHearts === 0) {
			this.show({ name: 'pet', mood: 'love' }, REACTION_TIMING.hearts);
			this.host.emit({ type: 'pet', strokes });
		}
		clearTimeout(this.petTimer);
		this.petTimer = setTimeout(() => {
			this.petting = false;
			this.pet.reset();
			this.refresh();
		}, this.pet.options.gap + 50);
	}

	private startle(speed: number) {
		this.show({ name: 'startle', mood: 'surprised' }, REACTION_TIMING.startle);
		this.host.jump(14, 120);
		this.host.wobble(Math.random() < 0.5 ? -6 : 6);
		this.host.emit({ type: 'startle', speed: Math.round(speed * 100) / 100 });
	}

	private dizzy(direction: 1 | -1) {
		this.show({ name: 'dizzy', mood: 'surprised' }, REACTION_TIMING.dizzy);
		this.host.emit({ type: 'dizzy', direction });
		if (this.reduced) return;
		clearInterval(this.rollTimer);
		this.holdsGaze = true;
		let step = 0;
		const steps = Math.round(REACTION_TIMING.dizzy / 80);
		this.rollTimer = setInterval(() => {
			step++;
			if (step >= steps) {
				clearInterval(this.rollTimer);
				this.rollTimer = undefined;
				this.holdsGaze = this.shy;
				this.host.look(0, 0);
				return;
			}
			const a = (step / 9) * Math.PI * 2 * direction;
			const fade = 1 - step / steps;
			this.host.look(Math.cos(a) * 0.9 * fade, Math.sin(a) * 0.7 * fade);
			if (step % 4 === 0) this.host.wobble((step % 8 === 0 ? 6 : -6) * fade);
		}, 80);
	}

	private shimmy() {
		clearInterval(this.shimmyTimer);
		let kick = 0;
		this.host.wobble(4);
		this.shimmyTimer = setInterval(() => {
			kick++;
			this.host.wobble(kick % 2 ? -4 : 3);
			if (kick >= 2) clearInterval(this.shimmyTimer);
		}, 150);
	}

	private armBored() {
		if (this.boredTimer || !this.seenHover) return;
		const check = () => {
			const idle = this.now() - this.lastMove;
			const left = REACTION_TIMING.boredAfter - idle;
			if (left > 0) {
				this.boredTimer = setTimeout(check, left);
				return;
			}
			this.boredTimer = undefined;
			if (this.baseMood !== 'idle' || this.petting || this.shy) return;
			this.bored = true;
			this.host.emit({ type: 'bored' });
			this.refresh();
		};
		this.boredTimer = setTimeout(check, REACTION_TIMING.boredAfter);
	}

	private show(state: ReactionState, ms: number) {
		clearTimeout(this.transientTimer);
		this.transient = state;
		this.transientTimer = setTimeout(() => {
			this.transient = null;
			this.transientTimer = undefined;
			this.refresh();
		}, ms);
		this.refresh();
	}

	private setLean(deg: number) {
		const rounded = Math.round(deg * 10) / 10;
		if (rounded === this.leaned) return;
		this.leaned = rounded;
		this.host.lean(this.reduced ? 0 : rounded);
	}

	private refresh() {
		const next: ReactionState | null =
			this.transient ??
			(this.petting
				? PETTING
				: this.shy
					? SHY
					: this.bored && this.baseMood === 'idle'
						? BORED
						: null);
		if (next === this.shown) return;
		this.shown = next;
		this.host.show(next);
	}
}

const PETTING: ReactionState = { name: 'pet', mood: 'happy' };
const SHY: ReactionState = { name: 'shy', mood: 'shy' };
const BORED: ReactionState = { name: 'bored', mood: 'sleepy' };

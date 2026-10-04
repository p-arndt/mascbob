/**
 * What the `walking` prop accepts: `true` marches on the spot, `-1` / `1` sidestep left / right
 * (the figure faces the viewer), `false` / `0` stands.
 */
export type Walking = boolean | -1 | 0 | 1;

/** Seconds per step; a stride is two of them. */
export const STEP_TIME = 0.2;
/**
 * ViewBox units the figure travels per step while sidestepping. The planted foot holds still on
 * the ground while the body moves over it, so moving the mascot at `walkSpeed` keeps it from skating.
 */
export const STEP_TRAVEL = 22;
/** How high a stepping foot rises, in viewBox units. */
const LIFT = 13;
/** How far the torso sinks as a foot comes down, and shifts and rolls over the planted foot. */
const BOB = 3;
const SHIFT = 3;
const ROLL = 1.5;
/** A legless figure waddles instead: it rocks from side to side and hops a little on each step. */
const WADDLE_ROLL = 5;
const WADDLE_HOP = 6;
/** Seconds for the walk to ease in and out. */
const EASE = 0.14;

/** Pixels per second the mascot has to move at `size` pixels wide for its feet not to skate. */
export function walkSpeed(size: number): number {
	return ((STEP_TRAVEL / STEP_TIME) * size) / 200;
}

type Side = -1 | 1;

export interface FootPose {
	/** Offset from its resting spot along x, in viewBox units. */
	dx: number;
	/** Height above the ground, in viewBox units. */
	lift: number;
}

export interface WalkPose {
	feet: Record<Side, FootPose>;
	/** Torso offset: down as a foot lands, and over toward the planted foot. */
	bob: number;
	shift: number;
	/** Degrees; the torso rolls over the planted foot. */
	roll: number;
	/** How far each arm swings forward, -1..1 (negative is back). */
	arms: Record<Side, number>;
	/** For figures without legs: degrees of rock around the base and a hop (negative is up). */
	waddle: number;
	hop: number;
}

export const REST_POSE: WalkPose = {
	feet: { [-1]: { dx: 0, lift: 0 }, [1]: { dx: 0, lift: 0 } },
	bob: 0,
	shift: 0,
	roll: 0,
	arms: { [-1]: 0, [1]: 0 },
	waddle: 0,
	hop: 0
};

interface Step {
	side: Side;
	from: number;
	to: number;
	/** 0..1 through the step. */
	t: number;
	/** Closing steps on the way to standing lift the foot less. */
	lift: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The walk cycle, advanced frame by frame. Steps are discrete: one foot swings while the other
 * stays planted, so stopping can finish with a closing step instead of sliding the feet home.
 */
export class Gait {
	private dx: Record<Side, number> = { [-1]: 0, [1]: 0 };
	private step: Step | null = null;
	private last: Side = 1;
	/** 0..1, eases the bob, sway and arm swing in and out. */
	private amount = 0;

	/** True while anything is still moving, so the caller can stop its frame loop afterwards. */
	get busy(): boolean {
		return this.step !== null || this.amount > 0.001 || this.dx[-1] !== 0 || this.dx[1] !== 0;
	}

	advance(dt: number, walking: Walking): WalkPose {
		const active = walking !== false && walking !== 0;
		const dir = walking === -1 || walking === 1 ? walking : 0;
		this.amount += ((active ? 1 : 0) - this.amount) * (1 - Math.exp(-dt / EASE));
		if (!active && this.amount < 0.001) this.amount = 0;

		// Setting off lifts a foot in the same frame the body starts to move, or the feet would skate.
		if (!this.step) this.step = this.next(active, dir);
		// The planted foot stays where it is on the ground while the body moves on over it.
		const planted = (side: Side) => !this.step || this.step.side !== side;
		for (const side of [-1, 1] as const) {
			if (planted(side)) this.dx[side] -= (dir * STEP_TRAVEL * dt) / STEP_TIME;
		}

		if (this.step) {
			// Rounding must not leave a step a hair short of landing, or the planted foot drifts a frame.
			this.step.t = Math.min(1, this.step.t + dt / STEP_TIME + 1e-9);
			const s = this.step;
			// Its target moves with the body, so the foot lands where the stride says.
			s.to -= (dir * STEP_TRAVEL * dt) / STEP_TIME;
			s.from -= (dir * STEP_TRAVEL * dt) / STEP_TIME;
			this.dx[s.side] = s.from + (s.to - s.from) * smooth(s.t);
			if (s.t >= 1) {
				this.dx[s.side] = s.to;
				this.last = s.side;
				this.step = null;
			}
		}
		if (!this.step) this.step = this.next(active, dir);
		return this.pose();
	}

	private next(active: boolean, dir: number): Step | null {
		if (active) {
			// From standing, the foot on the leading side goes first.
			const resting = this.dx[-1] === 0 && this.dx[1] === 0;
			const side: Side = resting && dir !== 0 ? (dir as Side) : this.last === 1 ? -1 : 1;
			// The leading foot lands a step out, the trailing one back on its resting spot. The target
			// is aimed one step further, since the body travels that far while the foot is in the air.
			const to = (side === dir ? dir * STEP_TRAVEL : 0) + dir * STEP_TRAVEL;
			return { side, from: this.dx[side], to, t: 0, lift: 1 };
		}
		// Coming to a stop: bring any foot that is still out back under the body.
		const out = ([-1, 1] as const)
			.filter((side) => Math.abs(this.dx[side]) > 0.5)
			.sort((a, b) => Math.abs(this.dx[b]) - Math.abs(this.dx[a]))[0];
		if (out === undefined) {
			this.dx = { [-1]: 0, [1]: 0 };
			return null;
		}
		return { side: out, from: this.dx[out], to: 0, t: 0, lift: 0.5 };
	}

	private pose(): WalkPose {
		const s = this.step;
		const arc = s ? Math.sin(Math.PI * s.t) : 0;
		// Positive while the right foot is planted, so the weight leans that way.
		const lean = s ? -s.side * arc : 0;
		const a = this.amount;
		const feet: Record<Side, FootPose> = {
			[-1]: { dx: this.dx[-1], lift: s?.side === -1 ? LIFT * s.lift * arc : 0 },
			[1]: { dx: this.dx[1], lift: s?.side === 1 ? LIFT * s.lift * arc : 0 }
		};
		return {
			feet,
			bob: a * BOB * (1 - arc),
			shift: a * SHIFT * lean,
			roll: a * ROLL * lean,
			// The arm opposite the stepping leg swings forward.
			arms: { [-1]: a * lean * -1, [1]: a * lean },
			waddle: a * WADDLE_ROLL * lean,
			hop: -a * WADDLE_HOP * arc
		};
	}
}

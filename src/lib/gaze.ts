/**
 * Where the eyes aim for a pointer at (dx, dy) pixels from the face, on a mascot
 * `size` pixels wide. The magnitude saturates (tanh) so nearby moves read strongly
 * while far-away pointers still get a clear sideways look instead of pinning the
 * eyes to the edge. `focus` rises as the pointer comes close: the eyes converge on it.
 */
export function aimAt(dx: number, dy: number, size: number) {
	const dist = Math.hypot(dx, dy);
	const reach = Math.max(size * 1.2, 140);
	const k = dist > 0 ? Math.tanh(dist / reach) / dist : 0;
	return {
		x: dx * k,
		// Eyes have less vertical travel; full strength would look like rolling.
		y: dy * k * 0.85,
		focus: Math.min(1, Math.max(0, 1 - dist / (size * 0.9)))
	};
}

/** Minimum gaze change that makes the eyes jump; smaller moves are held, like a fixation. */
export const SACCADE_MIN = 0.07;
/** Jumps this large come with a blink, the way people blink on big eye movements. */
export const SACCADE_BLINK = 0.6;

export function saccade(from: { x: number; y: number }, to: { x: number; y: number }) {
	const d = Math.hypot(to.x - from.x, to.y - from.y);
	return { jump: d >= SACCADE_MIN, blink: d >= SACCADE_BLINK };
}

/**
 * Fake speech for `mood="talking"` without an audio `level`: words of a few
 * syllables with pauses between them. Each syllable snaps open and closes again,
 * so the mouth really shuts between beats instead of hovering half open.
 */
export interface Babble {
	/** Mouth opening 0..1 at time `t` (ms, monotonic). */
	level(t: number): number;
}

interface Syllable {
	start: number;
	peak: number;
	length: number;
}

const ATTACK = 0.3;

export function createBabble(random: () => number = Math.random): Babble {
	let queue: Syllable[] = [];
	let cursor = -1;

	function word(from: number) {
		const count = 1 + Math.floor(random() * 4);
		let t = from;
		for (let i = 0; i < count; i++) {
			const length = 110 + random() * 120;
			queue.push({ start: t, peak: 0.45 + random() * 0.55, length });
			t += length + random() * 30;
		}
		// Pause between words; now and then a longer breath.
		return t + (random() < 0.2 ? 380 + random() * 320 : 90 + random() * 160);
	}

	return {
		level(t) {
			if (cursor < 0) cursor = t;
			while (cursor <= t + 400) cursor = word(cursor);
			queue = queue.filter((s) => s.start + s.length >= t);
			const s = queue.find((q) => q.start <= t);
			if (!s) return 0;
			const p = (t - s.start) / s.length;
			// Fast attack, slower release: jaws snap open and fall shut.
			const env = p < ATTACK ? p / ATTACK : 1 - (p - ATTACK) / (1 - ATTACK);
			return s.peak * Math.sin((Math.max(0, env) * Math.PI) / 2);
		}
	};
}

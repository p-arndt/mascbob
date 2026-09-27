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

/** A mouth shape per syllable: widening, rounding, and `press` (1 = lips shut, as on M/B/P). */
export interface Viseme {
	wide: number;
	round: number;
	press: number;
}

export const VOWELS: readonly Viseme[] = [
	{ wide: 0.35, round: 0, press: 0 },
	{ wide: 0, round: 0.15, press: 0 },
	{ wide: -0.25, round: 0.85, press: 0 },
	{ wide: 0.15, round: 0.4, press: 0 }
];

/** Lips pressed together and slightly stretched before they pop open. */
export const CLOSED_LIPS: Viseme = { wide: 0.08, round: 0, press: 1 };

/** Share of syllables that start on a closed-lip consonant. */
export const CLOSED_ONSET = 0.25;

export interface Onset {
	/** Closed-lip consonant to show first, or null to open straight into the vowel. */
	lead: Viseme | null;
	vowel: Viseme;
}

/**
 * Picks the mouth shapes per syllable. Never the same vowel twice in a row: repeats read
 * as a mouth that just flaps.
 */
export function createVisemes(random: () => number = Math.random) {
	let last = -1;
	return {
		onset(): Onset {
			const lead = random() < CLOSED_ONSET ? CLOSED_LIPS : null;
			let i = Math.floor(random() * (last < 0 ? VOWELS.length : VOWELS.length - 1));
			if (last >= 0 && i >= last) i++;
			last = i;
			return { lead, vowel: VOWELS[i] };
		}
	};
}

/**
 * "Ha-ha-ha": bursts of 4 to 6 quick pulses (~170 ms each) with a breath between bursts.
 * The mouth never shuts completely inside a burst; laughing keeps the jaw loose.
 */
export function createLaugh(random: () => number = Math.random): Babble {
	let queue: Syllable[] = [];
	let cursor = -1;

	function burst(from: number) {
		const count = 4 + Math.floor(random() * 3);
		let t = from;
		for (let i = 0; i < count; i++) {
			const length = 150 + random() * 40;
			// Each "ha" a little weaker than the one before, like running out of air.
			queue.push({
				start: t,
				peak: (0.95 - (i / count) * 0.35) * (0.85 + random() * 0.15),
				length
			});
			t += length;
		}
		return t + 380 + random() * 420;
	}

	return {
		level(t) {
			if (cursor < 0) cursor = t;
			while (cursor <= t + 400) cursor = burst(cursor);
			queue = queue.filter((s) => s.start + s.length >= t);
			const s = queue.find((q) => q.start <= t);
			if (!s) return 0;
			const p = (t - s.start) / s.length;
			return s.peak * (0.25 + 0.75 * Math.sin(p * Math.PI));
		}
	};
}

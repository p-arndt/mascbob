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

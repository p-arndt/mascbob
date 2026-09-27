export const ACCESSORIES = [
	'ring',
	'halo',
	'antenna',
	'ears',
	'sprout',
	'headphones',
	'crown',
	'bow',
	'glasses',
	'star-clip',
	'beanie'
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

/** Moods that make the sprout's flower bloom. */
export const BLOOM_MOODS: readonly string[] = ['happy', 'love'];

/** Moods in which the headphone cups show a live equalizer. */
export const AUDIO_MOODS: readonly string[] = ['listening', 'talking'];

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

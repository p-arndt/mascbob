export type ParticleKind = 'star' | 'heart' | 'confetti' | 'dot';
export type ParticleTone = 'accent' | 'cheek' | 'eye' | 'light';

/**
 * One particle of a one-shot burst. It starts at (`x`, `y`), drifts `dx`
 * sideways while decelerating, climbs to `rise` and then drops to `fall`
 * (both relative to the start, negative is up), which reads as a throw
 * against gravity.
 */
export interface Particle {
	kind: ParticleKind;
	tone: ParticleTone;
	x: number;
	y: number;
	dx: number;
	rise: number;
	fall: number;
	/** Degrees turned over the particle's life. */
	spin: number;
	size: number;
	/** Milliseconds. */
	delay: number;
	duration: number;
}

export interface BurstOptions {
	cx: number;
	cy: number;
	/** Radii of the ellipse the particles start on. */
	rx: number;
	ry: number;
	count: number;
	kinds: readonly ParticleKind[];
	tones: readonly ParticleTone[];
	/** Launch directions in radians, SVG convention (y down, -π/2 is straight up). */
	arc: [number, number];
	/** Travel distance range. */
	reach: [number, number];
	/** Extra drop after the apex. */
	gravity: [number, number];
	size: [number, number];
	duration: [number, number];
	/** Upper bound for the random start delay. */
	stagger: number;
	rng?: () => number;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const round = (v: number) => Math.round(v * 100) / 100;

export function burst(o: BurstOptions): Particle[] {
	const rng = o.rng ?? Math.random;
	const range = (r: [number, number]) => lerp(r[0], r[1], rng());
	const out: Particle[] = [];
	for (let i = 0; i < o.count; i++) {
		// Evenly spread with jitter so a burst never clumps on one side.
		const k = o.count === 1 ? 0.5 : (i + 0.2 + rng() * 0.6) / o.count;
		const a = lerp(o.arc[0], o.arc[1], k);
		const cos = Math.cos(a);
		const sin = Math.sin(a);
		const reach = range(o.reach);
		const rise = sin * reach * 0.8 - reach * 0.25;
		out.push({
			kind: o.kinds[i % o.kinds.length],
			tone: o.tones[Math.floor(rng() * o.tones.length) % o.tones.length],
			x: round(o.cx + cos * o.rx),
			y: round(o.cy + sin * o.ry),
			dx: round(cos * reach),
			rise: round(rise),
			fall: round(rise + range(o.gravity)),
			spin: Math.round((rng() < 0.5 ? -1 : 1) * range([90, 300])),
			size: round(range(o.size)),
			delay: Math.round(rng() * o.stagger),
			duration: Math.round(range(o.duration))
		});
	}
	return out;
}

/** Longest a particle from `boopBurst` or `confettiPop` can live, for cleanup. */
export const BURST_LIFETIME = 1100;

interface HeadBox {
	top: number;
	halfWidth: number;
}

/** The pop on a boop: stars and hearts flung up and out of the head. */
export function boopBurst(head: HeadBox, rng?: () => number): Particle[] {
	return burst({
		cx: 100,
		cy: 100,
		rx: head.halfWidth * 0.85,
		ry: (100 - head.top) * 0.85,
		count: 11,
		kinds: ['star', 'heart', 'dot', 'star', 'confetti', 'dot'],
		tones: ['accent', 'cheek', 'eye', 'light'],
		arc: [-Math.PI * 1.22, Math.PI * 0.22],
		reach: [18, 34],
		gravity: [16, 28],
		size: [5, 9],
		duration: [600, 820],
		stagger: 50,
		rng
	});
}

/** A lighter confetti shower when the mood turns happy or loving. */
export function confettiPop(head: HeadBox, rng?: () => number): Particle[] {
	return burst({
		cx: 100,
		cy: head.top + 6,
		rx: head.halfWidth * 0.5,
		ry: 6,
		count: 9,
		kinds: ['confetti', 'confetti', 'dot'],
		tones: ['accent', 'cheek', 'eye'],
		arc: [-Math.PI * 0.95, -Math.PI * 0.05],
		reach: [16, 30],
		gravity: [30, 44],
		size: [3.5, 5.5],
		duration: [800, 1000],
		stagger: 90,
		rng
	});
}

/** Deterministic PRNG for tests and reproducible bursts. */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

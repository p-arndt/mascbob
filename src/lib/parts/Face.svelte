<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { clamp, HEART_PATH } from '../geometry.js';
	import type { EyeParams } from '../types.js';
	import {
		EYE_SIZES,
		MISPRINT,
		catMouthPath,
		eyeOutline,
		halftone,
		mouthPath,
		smoothPath,
		type EyeShape,
		type Side
	} from './face.js';

	/**
	 * The face is screen-printed onto the shell like a sticker: an ink plate with the
	 * features and an accent plate under it that never quite lines up. The misprint
	 * is the signature: it re-registers with a wobble on every mood change and
	 * shivers with the voice while talking. Cheeks are halftone dots.
	 */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);

	// Pressing squeezes the eyes into "> <"; the underdamped spring overshoots below 0 on release, which reads as a pop.
	const squeeze = new Spring(0, { stiffness: 0.2, damping: 0.36 });
	const curious = new Spring(0, { stiffness: 0.12, damping: 0.5 });
	const saccade = new Spring({ x: 0, y: 0 }, { stiffness: 0.4, damping: 0.9 });
	// Starts far off so the face "prints" into place on mount.
	const plate = new Spring({ x: -4, y: 4 }, { stiffness: 0.07, damping: 0.32 });

	$effect(() => {
		squeeze.set(m.pressed ? 1 : 0, { instant: m.reduced });
	});
	$effect(() => {
		curious.set(m.hovered ? 1 : 0, { instant: m.reduced });
	});

	let printedMood = m.mood;
	$effect(() => {
		if (m.reduced) {
			plate.set(MISPRINT, { instant: true });
			return;
		}
		if (m.mood !== printedMood) {
			printedMood = m.mood;
			plate.set({ x: MISPRINT.x - 4.5, y: MISPRINT.y + 3 }, { instant: true });
		}
		plate.target = MISPRINT;
	});

	// Tiny involuntary eye jumps keep a resting face from looking frozen.
	$effect(() => {
		if (m.reduced || m.mood === 'sleepy' || !m.onscreen) {
			saccade.set({ x: 0, y: 0 }, { instant: true });
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const jump = () => {
			saccade.target =
				Math.random() < 0.35
					? { x: 0, y: 0 }
					: { x: (Math.random() * 2 - 1) * 2, y: (Math.random() * 2 - 1) * 1.2 };
			timer = setTimeout(jump, 900 + Math.random() * 2600);
		};
		timer = setTimeout(jump, 1500);
		return () => clearTimeout(timer);
	});

	// Each syllable picks a vowel, so the mouth cycles through shapes instead of just flapping.
	const VOWELS = [
		{ wide: 0.35, round: 0 },
		{ wide: 0, round: 0.15 },
		{ wide: -0.25, round: 0.85 },
		{ wide: 0.15, round: 0.4 }
	];
	const vowel = new Spring(VOWELS[1], { stiffness: 0.35, damping: 0.7 });
	let voiced = false;
	$effect(() => {
		const level = m.talk;
		if (!voiced && level > 0.15) {
			voiced = true;
			vowel.target = VOWELS[Math.floor(Math.random() * VOWELS.length)];
		} else if (voiced && level < 0.08) {
			voiced = false;
		}
	});

	const f = $derived(m.face);
	const talk = $derived(m.talk);
	const sq = $derived(clamp(squeeze.current, 0, 1));
	const pop = $derived(1 + Math.max(0, -squeeze.current) * 0.6);
	const grow = $derived(1 + curious.current * 0.1);
	// More travel upward than downward: looking up is the expressive direction, down has the lids.
	const eyeY = $derived(96 + m.gazeY * (m.gazeY < 0 ? 12 : 8) + saccade.current.y);
	// Syllables knock the accent plate around a little, like a speaker cone.
	const offset = $derived({ x: plate.current.x + talk * 1.6, y: plate.current.y - talk * 1.1 });

	function eye(p: EyeParams, baseX: number, side: Side) {
		const base = EYE_SIZES[m.eyes] ?? EYE_SIZES.round;
		const outward = side === 'left' ? -1 : 1;
		// A close pointer pulls both eyes in a little (vergence); eyes travel furthest of all
		// features, which is what makes the flat face read as a turning head.
		const cx = baseX + m.gazeX * 9 + saccade.current.x - outward * m.focus * 1.4;
		const heart = clamp(p.heart, 0, 1);
		const size = p.scale * grow * pop * (1 - heart) * (1 + m.focus * 0.08);
		const fullH = base.h * size;
		// Lids do the vertical acting: looking up opens the eyes wide, looking down lowers
		// both upper lids. Both eyes always stay the same shape, so neither one bulges.
		const up = Math.max(0, -m.gazeY);
		const down = Math.max(0, m.gazeY);
		const shape: EyeShape = {
			cx,
			cy: eyeY,
			w: base.w * size,
			h: fullH * Math.max(0, p.open) * (1 + up * 0.12) * (1 - m.blink) * (1 - sq),
			round: base.round,
			lift: p.lift,
			lidLeft: (side === 'left' ? p.lidOuter : p.lidInner) + down * 0.28,
			lidRight: (side === 'left' ? p.lidInner : p.lidOuter) + down * 0.28
		};
		const len = clamp(base.w * p.scale * 0.85, 9, 15);
		// Brows bounce with the voice: talking faces are mostly eyebrows.
		const browY =
			eyeY -
			(base.h * p.scale * clamp(p.open, 0.5, 1.25)) / 2 -
			6 -
			p.browLift -
			talk * 2.2 -
			up * 3;
		// Positive tilt raises the inner end (toward the nose).
		const rise = p.browTilt * len * 0.45 * (side === 'left' ? 1 : -1);
		return {
			shape,
			d: smoothPath(eyeOutline(shape)),
			heart: { cx, cy: eyeY, s: heart * base.w * 1.5 * p.scale * grow },
			shine:
				clamp((shape.h / base.h - 0.3) * 2.5, 0, 1) *
				clamp(1.6 - p.lift * 2, 0, 1) *
				(1 - heart) *
				(1 - sq),
			brow: {
				x0: cx - len / 2,
				y0: browY + rise,
				x1: cx + len / 2,
				y1: browY - rise,
				alpha: clamp(p.brow, 0, 1) * (1 - sq)
			}
		};
	}

	const left = $derived(eye(f.left, 80, 'left'));
	const right = $derived(eye(f.right, 120, 'right'));
	const eyes = $derived([left, right]);

	const mouth = $derived.by(() => {
		const open = Math.max(0, f.mouthOpen + talk * 11);
		const v = vowel.current;
		const shape = {
			cx: 100 + f.mouthX + m.gazeX * 6,
			// The jaw drops with the syllable.
			y: 118 + m.gazeY * 5 + talk * 1.5,
			width: f.mouthWidth * (1 + talk * v.wide) * (1 - sq * 0.3),
			curve: f.mouthCurve,
			open,
			round: clamp(f.mouthRound + talk * v.round, 0, 1)
		};
		return {
			...shape,
			d: mouthPath(shape),
			cat: clamp(Math.max(f.mouthCat, sq), 0, 1),
			tongue: clamp((open - 2) / 3, 0, 1) * f.tongue
		};
	});

	const cheekX = $derived(Math.min(m.shape.halfWidth, 62) - 16);
	const blush = $derived(clamp(f.cheeks + curious.current * 0.3 + sq * 0.4, 0, 1));
	const blushLines = $derived(clamp(Math.max(f.blushLines, sq * 0.9), 0, 1));
	const DOTS = halftone(9.5, 6, 2.7);
</script>

<defs>
	<clipPath id="{m.uid}-mouth-clip">
		<path d={mouth.d} />
	</clipPath>
	{#each eyes as e, i (i)}
		<clipPath id="{m.uid}-eye-clip-{i}">
			<path d={e.d} />
		</clipPath>
	{/each}
</defs>

<!-- Halftone cheeks: blush grows the dots rather than fading them, like more ink on the screen. -->
{#each [-1, 1] as side (side)}
	<g class="cheek" transform="translate({100 + side * cheekX + m.gazeX * 4} {112 + m.gazeY * 2.5})">
		{#each DOTS as d, i (i)}
			<circle cx={d.x} cy={d.y} r={d.r * blush} />
		{/each}
		{#if blushLines > 0.01}
			<g class="hatch" opacity={blushLines}>
				{#each [-4, 0, 4] as x (x)}
					<path d="M{x - 1.5} 3L{x + 1.5} -3" />
				{/each}
			</g>
		{/if}
	</g>
{/each}

{#snippet features()}
	{#each eyes as e, i (i)}
		<path d={e.d} />
		{#if e.heart.s > 0.5}
			<path d={HEART_PATH} transform="translate({e.heart.cx} {e.heart.cy}) scale({e.heart.s})" />
		{/if}
		{#if e.brow.alpha > 0.01}
			<path
				class="line"
				d="M{e.brow.x0} {e.brow.y0}L{e.brow.x1} {e.brow.y1}"
				opacity={clamp(e.brow.alpha * 1.8, 0, 1)}
			/>
		{/if}
	{/each}
	{#if sq > 0.01}
		<!-- "> <" -->
		<g class="line thin" opacity={sq}>
			<path
				d="M{left.shape.cx - 6} {eyeY - 6}L{left.shape.cx + 5} {eyeY}L{left.shape.cx - 6} {eyeY +
					6}"
			/>
			<path
				d="M{right.shape.cx + 6} {eyeY - 6}L{right.shape.cx - 5} {eyeY}L{right.shape.cx + 6} {eyeY +
					6}"
			/>
		</g>
	{/if}
	<path class="mouth" d={mouth.d} opacity={1 - mouth.cat} />
	{#if mouth.cat > 0.01}
		<path
			class="line thin"
			d={catMouthPath(mouth.cx, mouth.y, Math.max(mouth.width, 10))}
			opacity={mouth.cat}
		/>
	{/if}
{/snippet}

<g class="plate accent" transform="translate({offset.x} {offset.y})">
	{@render features()}
</g>
<g class="plate ink">
	{@render features()}
	{#if mouth.tongue > 0.01}
		<g clip-path={ref('mouth-clip')} opacity={(1 - mouth.cat) * mouth.tongue}>
			<ellipse
				class="tongue"
				cx={mouth.cx + 1}
				cy={mouth.y + mouth.curve * 0.25 + mouth.open * 0.8}
				rx={mouth.width * 0.32}
				ry={mouth.open * 0.45}
			/>
		</g>
	{/if}
	{#each eyes as e, i (i)}
		{#if e.shine > 0.01}
			<!-- Same glint on both eyes: one light source, like a sticker catching the lamp. -->
			<g clip-path={ref(`eye-clip-${i}`)} opacity={e.shine}>
				<ellipse
					class="shine"
					cx={e.shape.cx + e.shape.w * (0.2 - m.gazeX * 0.14)}
					cy={e.shape.cy - e.shape.h * (0.2 + m.gazeY * 0.1)}
					rx={e.shape.w * 0.17}
					ry={e.shape.h * 0.14}
				/>
				<circle
					class="shine"
					cx={e.shape.cx - e.shape.w * 0.12}
					cy={e.shape.cy + e.shape.h * 0.2}
					r={e.shape.w * 0.07}
				/>
			</g>
		{/if}
	{/each}
</g>

{#if m.config.effect === 'tear'}
	<g transform="translate({left.shape.cx - left.shape.w * 0.35} {eyeY + 9})">
		<path class="tear" d="M0 -4.5C1.8 -1.6 3 0 3 1.6A3 3 0 0 1 -3 1.6C-3 0 -1.8 -1.6 0 -4.5Z" />
	</g>
{/if}

<style>
	.plate {
		fill: currentColor;
		stroke: currentColor;
		stroke-width: 0;
	}
	.ink {
		color: var(--c-eye);
	}
	.accent {
		color: var(--c-accent);
		opacity: 0.9;
	}
	.mouth {
		stroke-width: 3.4;
		stroke-linejoin: round;
	}
	.line {
		fill: none;
		stroke-width: 3.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.thin {
		stroke-width: 2.8;
	}
	.tongue {
		fill: var(--c-cheek);
		stroke: none;
	}
	.shine {
		fill: #fff;
		stroke: none;
	}
	.cheek {
		fill: var(--c-cheek);
	}
	.hatch {
		fill: none;
		stroke: var(--c-cheek);
		stroke-width: 1.3;
		stroke-linecap: round;
		filter: brightness(0.8);
	}
	.tear {
		fill: var(--c-eye);
		transform-box: fill-box;
		transform-origin: center;
		animation: drip 1.8s ease-in infinite;
	}

	@keyframes drip {
		0% {
			transform: translateY(0) scale(0.4);
			opacity: 0;
		}
		20% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(16px) scale(1);
			opacity: 0;
		}
	}
</style>

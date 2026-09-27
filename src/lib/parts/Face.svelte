<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { clamp } from '../geometry.js';
	import type { EyeParams } from '../types.js';
	import {
		EYE_SIZES,
		LED_STEP,
		LED_TOP,
		ledArea,
		ledGrid,
		lightAt,
		type EyeShape,
		type FaceScene,
		type Segment,
		type Side
	} from './face.js';

	/**
	 * The face is a matrix of tiny LEDs under the shell. The expression is still
	 * modelled as smooth shapes (so moods tween), then rasterized: each LED lights
	 * by how much of it the shapes cover.
	 */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);

	// Pressing squeezes the eyes into "> <"; the underdamped spring overshoots below 0 on release, which reads as a pop.
	const squeeze = new Spring(0, { stiffness: 0.2, damping: 0.36 });
	const curious = new Spring(0, { stiffness: 0.12, damping: 0.5 });
	const saccade = new Spring({ x: 0, y: 0 }, { stiffness: 0.4, damping: 0.9 });

	$effect(() => {
		squeeze.set(m.pressed ? 1 : 0, { instant: m.reduced });
	});
	$effect(() => {
		curious.set(m.hovered ? 1 : 0, { instant: m.reduced });
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

	const f = $derived(m.face);
	const sq = $derived(clamp(squeeze.current, 0, 1));
	const pop = $derived(1 + Math.max(0, -squeeze.current) * 0.6);
	const grow = $derived(1 + curious.current * 0.1);
	const gridW = $derived(Math.min(100, m.shape.halfWidth * 2 - 30));
	const dots = $derived(ledGrid(gridW));
	const eyeY = $derived(97 + m.gazeY * 6 + saccade.current.y);

	function eye(p: EyeParams, baseX: number, side: Side): { shape: EyeShape; brow: Segment } {
		const base = EYE_SIZES[m.eyes] ?? EYE_SIZES.round;
		const cx = baseX + m.gazeX * 8 + saccade.current.x;
		const size = p.scale * grow * pop;
		const w = base.w * size;
		const fullH = base.h * size;
		const h = fullH * Math.max(0, p.open) * (1 - m.blink);
		const heart = clamp(p.heart, 0, 1);
		const shine =
			clamp(h / base.h - 0.3, 0, 1) * clamp(1 - p.lift * 1.2, 0, 1) * (1 - heart) * (1 - sq);
		const len = clamp(base.w * p.scale * 0.9, 9, 15);
		const browY = eyeY - (fullH * clamp(p.open, 0.5, 1.25)) / 2 - 6.5 - p.browLift;
		// Positive tilt raises the inner end (toward the nose).
		const rise = p.browTilt * len * 0.45;
		const inner = side === 'left' ? 1 : -1;
		return {
			shape: {
				cx,
				cy: eyeY,
				w,
				h,
				lift: p.lift,
				lidLeft: side === 'left' ? p.lidOuter : p.lidInner,
				lidRight: side === 'left' ? p.lidInner : p.lidOuter,
				heart,
				squeeze: sq,
				side,
				shine
			},
			brow: {
				x0: cx - len / 2,
				y0: browY + (inner === 1 ? rise : -rise),
				x1: cx + len / 2,
				y1: browY + (inner === 1 ? -rise : rise),
				alpha: clamp(p.brow, 0, 1) * (1 - sq)
			}
		};
	}

	const scene: FaceScene = $derived.by(() => {
		const left = eye(f.left, 80, 'left');
		const right = eye(f.right, 120, 'right');
		const open = Math.max(0, f.mouthOpen + m.talk * 7);
		const blushX = gridW / 2 - 6;
		const blush = clamp(f.cheeks + curious.current * 0.3 + sq * 0.4, 0, 1) * 0.8;
		return {
			eyes: [left.shape, right.shape],
			brows: [left.brow, right.brow],
			mouth: {
				cx: 100 + f.mouthX + m.gazeX * 6,
				y: 116 + m.gazeY * 5,
				// Wider than the vector face: a mouth needs a few LEDs to show a curve.
				width: f.mouthWidth * 1.4,
				curve: f.mouthCurve,
				open,
				round: f.mouthRound,
				cat: Math.max(f.mouthCat, sq),
				tongue: f.tongue
			},
			blush: [
				{ x: 100 - blushX, y: 113, alpha: blush },
				{ x: 100 + blushX, y: 113, alpha: blush }
			],
			blushLines: Math.max(f.blushLines, sq * 0.9)
		};
	});

	/** Unlit LEDs stay faintly visible: they are what tells you this face is a display. */
	const OFF = 0.07;
	const area = $derived(ledArea(gridW));
	// Only lit LEDs become elements; the dark ones are a single patterned rect.
	const lit = $derived(
		dots.flatMap((d) => {
			const l = lightAt(d.x, d.y, scene);
			const tone = l.white > 0.5 ? 'white' : l.pink > l.main ? 'pink' : 'main';
			// A gamma below 1 keeps edge LEDs from looking washed out.
			const level = Math.max(l.main, l.pink, l.white) ** 0.75;
			return level > OFF + 0.03 ? [{ ...d, tone, level }] : [];
		})
	);
	const leftEye = $derived(scene.eyes[0]);
</script>

<!-- Re-keyed on mood so the matrix replays its sweep: power-on at mount, a refresh on every change. -->
<defs>
	<pattern
		id="{m.uid}-leds"
		width={LED_STEP}
		height={LED_STEP}
		patternUnits="userSpaceOnUse"
		x={area.firstX - LED_STEP / 2}
		y={LED_TOP - LED_STEP / 2}
	>
		<circle class="main" cx={LED_STEP / 2} cy={LED_STEP / 2} r={LED_STEP * 0.4} opacity={OFF} />
	</pattern>
	<radialGradient id="{m.uid}-spill-main">
		<stop offset="0" class="spill-main" stop-opacity="0.5" />
		<stop offset="1" class="spill-main" stop-opacity="0" />
	</radialGradient>
	<radialGradient id="{m.uid}-spill-pink">
		<stop offset="0" class="spill-pink" stop-opacity="0.5" />
		<stop offset="1" class="spill-pink" stop-opacity="0" />
	</radialGradient>
</defs>

<rect
	class="panel"
	x={area.x}
	y={area.y}
	width={area.width}
	height={area.height}
	rx={area.radius}
	fill={ref('leds')}
/>

<!-- Soft light spill around lit LEDs keeps the face readable at small sizes and on dark shells. -->
{#each lit as d (d.id)}
	{#if d.level > 0.3 && d.tone !== 'white'}
		<circle
			cx={d.x}
			cy={d.y}
			r={LED_STEP * 1.1}
			fill={ref(d.tone === 'pink' ? 'spill-pink' : 'spill-main')}
			opacity={d.level}
		/>
	{/if}
{/each}

<!-- Re-keyed on mood so the lit LEDs replay their sweep: power-on at mount, a refresh on every change. -->
{#key m.mood}
	<g>
		{#each lit as d (d.id)}
			<circle
				class="led {d.tone}"
				cx={d.x}
				cy={d.y}
				r={LED_STEP * 0.4}
				opacity={d.level}
				style:animation-delay="{d.wave * 22}ms"
			/>
		{/each}
	</g>
{/key}

{#if m.config.effect === 'tear'}
	<!-- A single LED dropping row by row reads as a pixel tear. -->
	<g transform="translate({leftEye.cx - leftEye.w * 0.4} {leftEye.cy + LED_STEP * 2})">
		<circle class="tear" r={LED_STEP * 0.36} filter={ref('glow')} />
	</g>
{/if}

<style>
	.led {
		transform-box: fill-box;
		transform-origin: center;
		animation: sweep 520ms ease-out backwards;
	}
	.spill-main {
		stop-color: var(--c-eye);
	}
	.spill-pink {
		stop-color: var(--c-cheek);
	}
	.main {
		fill: var(--c-eye);
	}
	.pink {
		fill: var(--c-cheek);
	}
	.white {
		fill: #fff;
	}
	.tear {
		fill: var(--c-eye);
		animation: drip 1.6s steps(4, end) infinite;
	}

	@keyframes sweep {
		0% {
			opacity: 0;
			transform: scale(0.3);
		}
		45% {
			opacity: 1;
			transform: scale(1.25);
		}
	}
	@keyframes drip {
		0% {
			transform: translateY(0);
			opacity: 1;
		}
		100% {
			transform: translateY(18.4px);
			opacity: 0;
		}
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { HEART_PATH, SPARKLE_PATH, clamp } from '../geometry.js';
	import type { EyeParams } from '../types.js';
	import {
		EYE_SIZES,
		browPath,
		catMouthPath,
		chevronPath,
		eyePath,
		mouthPath,
		type Side
	} from './face.js';

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
		if (m.reduced || m.mood === 'sleepy') {
			saccade.set({ x: 0, y: 0 }, { instant: true });
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const jump = () => {
			saccade.target =
				Math.random() < 0.35
					? { x: 0, y: 0 }
					: { x: (Math.random() * 2 - 1) * 1.4, y: (Math.random() * 2 - 1) * 0.8 };
			timer = setTimeout(jump, 900 + Math.random() * 2600);
		};
		timer = setTimeout(jump, 1500);
		return () => clearTimeout(timer);
	});

	const f = $derived(m.face);
	const sq = $derived(clamp(squeeze.current, 0, 1));
	const pop = $derived(1 + Math.max(0, -squeeze.current) * 0.6);
	const grow = $derived(1 + curious.current * 0.08);
	const visorW = $derived(Math.min(106, m.shape.halfWidth * 2 - 24));
	const visorX = $derived(100 - visorW / 2);
	// The screen shifts less than the eyes, which gives the face a bit of depth.
	const ox = $derived(m.gazeX * 2.5);
	const oy = $derived(m.gazeY * 2);
	const eyeY = $derived(96 + m.gazeY * 5 + saccade.current.y);

	function eye(p: EyeParams, baseX: number, side: Side) {
		const base = EYE_SIZES[m.eyes] ?? EYE_SIZES.round;
		const cx = baseX + m.gazeX * 7 + saccade.current.x;
		const cy = eyeY;
		const size = p.scale * grow * pop;
		const w = base.w * size;
		const fullH = base.h * size;
		const h = fullH * Math.max(0, p.open) * (1 - m.blink) * (1 - sq * 0.7);
		const d = eyePath(cx, cy, w, h, {
			lift: p.lift,
			lidLeft: side === 'left' ? p.lidOuter : p.lidInner,
			lidRight: side === 'left' ? p.lidInner : p.lidOuter
		});
		const heart = clamp(p.heart, 0, 1);
		const shown = (1 - heart) * (1 - sq);
		const shine = clamp(h / base.h, 0, 1) * clamp(1 - p.lift * 1.2, 0, 1) * shown;
		const browLen = clamp(base.w * p.scale * 0.8, 8, 14);
		const browY = cy - (fullH * clamp(p.open, 0.5, 1.25)) / 2 - 4.5 - p.browLift;
		return {
			d,
			cx,
			cy,
			w,
			h,
			heart,
			shown,
			shine,
			halo: clamp(1 - p.lift * 1.1, 0, 1) * (1 - sq),
			size,
			brow: clamp(p.brow, 0, 1),
			browD: browPath(cx, browY, browLen, p.browTilt, side),
			chevron: chevronPath(
				cx,
				cy,
				base.w * 0.7 * (0.6 + 0.4 * sq),
				base.h * 0.55 * (0.6 + 0.4 * sq),
				side
			)
		};
	}

	const eyes = $derived([eye(f.left, 80, 'left'), eye(f.right, 120, 'right')]);
	const leftEye = $derived(eyes[0]);

	const mouthCx = $derived(100 + f.mouthX + m.gazeX * 5);
	const mouthY = $derived(116 + m.gazeY * 4);
	const open = $derived(Math.max(0, f.mouthOpen + m.talk * 7));
	const cat = $derived(clamp(Math.max(f.mouthCat, sq), 0, 1));
	const round = $derived(clamp(f.mouthRound, 0, 1) * (1 - cat));
	const plain = $derived((1 - cat) * (1 - round));
	const mouth = $derived(mouthPath(mouthCx, mouthY, f.mouthWidth, f.mouthCurve, open));
	const catMouth = $derived(
		catMouthPath(
			mouthCx,
			mouthY,
			Math.max(9, f.mouthWidth * 0.8),
			1.4 + Math.max(0, f.mouthCurve) * 0.15
		)
	);
	const tongue = $derived(clamp(f.tongue, 0, 1) * clamp((open - 1) / 3, 0, 1) * plain);

	const cheekY = $derived(113 + oy);
	const cheekXs = $derived([visorX + 14 + ox, visorX + visorW - 14 + ox]);
	const cheekOpacity = $derived(clamp(f.cheeks + curious.current * 0.3 + sq * 0.4, 0, 1) * 0.85);
	const hatch = $derived(clamp(Math.max(f.blushLines, sq * 0.9), 0, 1));
</script>

<defs>
	<linearGradient id="{m.uid}-visor-sheen" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0" stop-color="#fff" stop-opacity="0.16" />
		<stop offset="0.4" stop-color="#fff" stop-opacity="0" />
	</linearGradient>
	<radialGradient id="{m.uid}-vignette" cx="0.5" cy="0.45" r="0.62">
		<stop offset="0.55" stop-color="#000" stop-opacity="0" />
		<stop offset="1" stop-color="#000" stop-opacity="0.5" />
	</radialGradient>
	<radialGradient id="{m.uid}-iris" cx="0.45" cy="0.42" r="0.62">
		<stop offset="0" class="iris-core" />
		<stop offset="0.5" class="iris-mid" />
		<stop offset="1" class="iris-edge" />
	</radialGradient>
	<pattern id="{m.uid}-scan" width="4" height="2.2" patternUnits="userSpaceOnUse">
		<rect width="4" height="0.8" fill="#000" fill-opacity="0.13" />
	</pattern>
	<clipPath id="{m.uid}-screen">
		<rect x={visorX} y="69" width={visorW} height="62" rx="31" />
	</clipPath>
	<clipPath id="{m.uid}-mouth">
		<path d={mouth} />
	</clipPath>
	{#each eyes as e, i (i)}
		<clipPath id="{m.uid}-eye-{i}">
			<path d={e.d} />
		</clipPath>
	{/each}
</defs>

<g transform="translate({ox} {oy})">
	<rect class="visor" x={visorX} y="69" width={visorW} height="62" rx="31" />
	<rect x={visorX} y="69" width={visorW} height="62" rx="31" fill={ref('vignette')} />
	<g clip-path={ref('screen')}>
		<g class="glint">
			<path
				class="glint-band"
				d="M{94 - visorW / 2} 131L{106 - visorW / 2} 69L{120 - visorW / 2} 69L{108 -
					visorW / 2} 131Z"
			/>
			<path
				class="glint-band thin"
				d="M{112 - visorW / 2} 131L{124 - visorW / 2} 69L{127 - visorW / 2} 69L{115 -
					visorW / 2} 131Z"
			/>
		</g>
		{#key m.mood}
			<rect class="pulse" x={visorX} y="69" width={visorW} height="62" />
			<g class="refresh">
				<rect class="refresh-band" x={visorX} y="66" width={visorW} height="5" />
			</g>
		{/key}
	</g>
	<rect x={visorX} y="69" width={visorW} height="62" rx="31" fill={ref('visor-sheen')} />
	<path class="glare" d="M{visorX + 15} 75.5Q{visorX + 22} 71.6 {visorX + visorW * 0.42} 71.6" />
	<rect
		class="rim-glow"
		x={visorX}
		y="69"
		width={visorW}
		height="62"
		rx="31"
		filter={ref('glow')}
	/>
	<rect class="rim" x={visorX} y="69" width={visorW} height="62" rx="31" />
	<rect class="rim-inner" x={visorX + 1.6} y="70.6" width={visorW - 3.2} height="58.8" rx="29.4" />
</g>

<g class="cheeks" opacity={cheekOpacity} filter={ref('soft')}>
	{#each cheekXs as x, i (i)}
		<ellipse cx={x} cy={cheekY} rx="7.5" ry="4.5" />
	{/each}
</g>
{#if hatch > 0.01}
	<g class="hatch" opacity={hatch}>
		{#each cheekXs as x, i (i)}
			{#each [-3.6, 0, 3.6] as dx (dx)}
				<path d="M{x + dx - 1.4} {cheekY + 2.4}L{x + dx + 1.4} {cheekY - 2.4}" />
			{/each}
		{/each}
	</g>
{/if}

<g class="power">
	<g class="halo" filter={ref('soft')}>
		{#each eyes as e, i (i)}
			<ellipse
				cx={e.cx}
				cy={e.cy}
				rx={e.w * 0.55 + 2}
				ry={Math.max(e.h, 4) * 0.5 + 2}
				opacity={0.35 * (1 - e.heart) * e.halo}
			/>
		{/each}
	</g>
	<g filter={ref('glow')}>
		{#each eyes as e, i (i)}
			<path class="eye" d={e.d} opacity={e.shown} fill={ref('iris')} />
			{#if e.heart > 0.01}
				<path
					class="eye-heart"
					d={HEART_PATH}
					opacity={e.heart * (1 - sq)}
					fill={ref('iris')}
					transform="translate({e.cx} {e.cy}) scale({22 * e.size * (0.6 + 0.4 * e.heart)})"
				/>
			{/if}
			{#if sq > 0.01}
				<path class="chevron" d={e.chevron} opacity={sq} />
			{/if}
			{#if e.brow > 0.01}
				<path class="brow" d={e.browD} opacity={e.brow} />
			{/if}
		{/each}
		{#if plain > 0.01}
			<g opacity={plain}>
				<path class="mouth" d={mouth} />
				{#if tongue > 0.01}
					<ellipse
						class="tongue"
						clip-path={ref('mouth')}
						cx={mouthCx}
						cy={mouthY + f.mouthCurve + open}
						rx={f.mouthWidth * 0.24}
						ry={open * 0.55}
						opacity={tongue}
					/>
				{/if}
			</g>
		{/if}
		{#if cat > 0.01}
			<path class="mouth-line" d={catMouth} opacity={cat} />
		{/if}
		{#if round > 0.01}
			<ellipse
				class="mouth"
				cx={mouthCx}
				cy={mouthY + open / 2}
				rx={Math.max(2, f.mouthWidth * 0.45)}
				ry={Math.max(open / 2, 1.6)}
				opacity={round}
			/>
		{/if}
	</g>
	{#each eyes as e, i (i)}
		{#if e.shine > 0.01}
			<g clip-path="url(#{m.uid}-eye-{i})" opacity={e.shine}>
				<ellipse
					class="iris-ring"
					cx={e.cx + m.gazeX * 0.8}
					cy={e.cy + m.gazeY * 0.6}
					rx={e.w * 0.3}
					ry={e.h * 0.3}
				/>
				<ellipse
					class="catch"
					cx={e.cx + e.w * 0.18 - m.gazeX * 1.2}
					cy={e.cy - e.h * 0.2 - m.gazeY}
					rx={2.3 * e.size}
					ry={2.7 * e.size}
				/>
				<circle
					class="catch small"
					cx={e.cx - e.w * 0.2 - m.gazeX * 0.6}
					cy={e.cy + e.h * 0.2 - m.gazeY * 0.5}
					r={1 * e.size}
				/>
			</g>
		{/if}
	{/each}
	{#key m.boops}
		{#if m.boops > 0 && !m.reduced}
			{#each eyes as e, i (i)}
				<g transform="translate({e.cx + e.w * 0.45} {e.cy - 7}) scale({6.5 * e.size})">
					<path class="boop-spark" d={SPARKLE_PATH} style:animation-delay="{i * 70}ms" />
				</g>
			{/each}
		{/if}
	{/key}
</g>

<g transform="translate({ox} {oy})">
	<rect class="scan" x={visorX} y="69" width={visorW} height="62" rx="31" fill={ref('scan')} />
	<g class="crt">
		<rect x={visorX + 12} y="99.4" width={visorW - 24} height="1.2" rx="0.6" />
	</g>
</g>

{#if m.config.effect === 'tear'}
	<g transform="translate({leftEye.cx - 8 + ox} {eyeY + 12})">
		<path class="tear" d="M0 -5C3 0 4 3 0 5C-4 3-3 0 0-5Z" />
	</g>
{/if}

<style>
	.visor {
		fill: var(--c-visor);
	}
	.rim {
		fill: none;
		stroke: var(--c-accent);
		stroke-opacity: 0.5;
		stroke-width: 1.1;
	}
	.rim-glow {
		fill: none;
		stroke: var(--c-accent);
		stroke-opacity: 0.35;
		stroke-width: 1.6;
	}
	.rim-inner {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.07;
		stroke-width: 0.8;
	}
	.glare {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.35;
		stroke-width: 1.3;
		stroke-linecap: round;
	}
	.scan {
		pointer-events: none;
	}

	/* The glint parks off-screen most of the cycle and only sweeps now and then. */
	.glint {
		transform: translateX(-60px);
		animation: glint 9s ease-in-out 2.4s infinite;
	}
	.glint-band {
		fill: #fff;
		opacity: 0.1;
	}
	.glint-band.thin {
		opacity: 0.14;
	}
	@keyframes glint {
		0%,
		78% {
			transform: translateX(-60px);
		}
		92%,
		100% {
			transform: translateX(160px);
		}
	}

	.pulse {
		fill: var(--c-eye);
		opacity: 0;
		animation: pulse 0.55s ease-out;
	}
	@keyframes pulse {
		from {
			opacity: 0.14;
		}
		to {
			opacity: 0;
		}
	}
	.refresh-band {
		fill: var(--c-eye);
		opacity: 0;
	}
	.refresh {
		animation: refresh 0.5s ease-in;
	}
	.refresh .refresh-band {
		animation: refresh-band 0.5s ease-in;
	}
	@keyframes refresh {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(66px);
		}
	}
	@keyframes refresh-band {
		from {
			opacity: 0.22;
		}
		to {
			opacity: 0;
		}
	}

	/* Power-on: a CRT line stretches out, then the face snaps in with a flicker. */
	.power {
		transform-box: fill-box;
		transform-origin: center;
		animation: power 1s ease-out;
	}
	@keyframes power {
		0%,
		38% {
			opacity: 0;
			transform: scaleY(0.1);
		}
		50% {
			opacity: 1;
			transform: scaleY(1.04);
		}
		56% {
			opacity: 0.4;
		}
		64%,
		100% {
			opacity: 1;
			transform: scaleY(1);
		}
	}
	.crt {
		transform-box: fill-box;
		transform-origin: center;
		opacity: 0;
		animation: crt 0.75s ease-out;
	}
	.crt rect {
		fill: #fff;
	}
	@keyframes crt {
		0% {
			opacity: 1;
			transform: scaleX(0);
		}
		45% {
			opacity: 1;
			transform: scaleX(1);
		}
		100% {
			opacity: 0;
			transform: scaleX(1) scaleY(8);
		}
	}

	.cheeks {
		fill: var(--c-cheek);
	}
	.hatch {
		fill: none;
		stroke: color-mix(in oklab, var(--c-cheek), #fff 35%);
		stroke-width: 1.3;
		stroke-linecap: round;
	}
	.halo {
		fill: var(--c-eye);
	}
	.iris-core {
		stop-color: color-mix(in oklab, var(--c-eye), #fff 55%);
	}
	.iris-mid {
		stop-color: var(--c-eye);
	}
	.iris-edge {
		stop-color: color-mix(in oklab, var(--c-eye), var(--c-visor) 22%);
	}
	.eye {
		stroke: var(--c-eye);
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
	.chevron,
	.brow,
	.mouth-line {
		fill: none;
		stroke: var(--c-eye);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.brow {
		stroke-width: 2.6;
	}
	.mouth-line {
		stroke-width: 2.4;
	}
	.iris-ring {
		fill: none;
		stroke: var(--c-visor);
		stroke-opacity: 0.22;
		stroke-width: 1;
	}
	.catch {
		fill: #fff;
	}
	.catch.small {
		opacity: 0.75;
	}
	.mouth {
		fill: color-mix(in oklab, var(--c-eye) 45%, var(--c-visor));
		stroke: var(--c-eye);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.tongue {
		fill: color-mix(in oklab, var(--c-cheek), #fff 20%);
	}
	.boop-spark {
		fill: #fff;
		transform-box: fill-box;
		transform-origin: center;
		transform: scale(0);
		animation: spark 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
	}
	@keyframes spark {
		0% {
			transform: scale(0) rotate(0deg);
		}
		40% {
			transform: scale(1.2) rotate(45deg);
		}
		100% {
			transform: scale(0) rotate(90deg);
		}
	}
	.tear {
		fill: var(--c-eye);
		opacity: 0.85;
		transform-box: fill-box;
		transform-origin: center;
		animation: fall 2.4s ease-in infinite;
	}
	@keyframes fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(14px);
			opacity: 0;
		}
	}
</style>

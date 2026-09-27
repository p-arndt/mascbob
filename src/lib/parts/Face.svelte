<script lang="ts">
	import { getMascot, svgRef } from '../context.js';
	import { HEART_PATH, clamp } from '../geometry.js';
	import type { EyeParams } from '../types.js';
	import { EYE_SIZES, eyePath, mouthPath } from './face.js';

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);

	const f = $derived(m.face);
	const visorW = $derived(Math.min(106, m.shape.halfWidth * 2 - 24));
	// The screen shifts less than the eyes, which gives the face a bit of depth.
	const ox = $derived(m.gazeX * 2.5);
	const oy = $derived(m.gazeY * 2);
	const eyeY = $derived(96 + m.gazeY * 5);

	function eye(p: EyeParams, cx: number, side: 'left' | 'right') {
		const base = EYE_SIZES[m.eyes] ?? EYE_SIZES.round;
		const w = base.w * p.scale;
		const h = base.h * p.scale * Math.max(0, p.open) * (1 - m.blink);
		const d = eyePath(cx, eyeY, w, h, {
			lift: p.lift,
			lidLeft: side === 'left' ? p.lidOuter : p.lidInner,
			lidRight: side === 'left' ? p.lidInner : p.lidOuter
		});
		const heart = clamp(p.heart, 0, 1);
		const shine = clamp(h / base.h, 0, 1) * clamp(1 - p.lift * 1.2, 0, 1) * (1 - heart);
		return { d, cx, w, h, heart, shine, scale: p.scale };
	}

	const leftEye = $derived(eye(f.left, 80 + m.gazeX * 7, 'left'));
	const rightEye = $derived(eye(f.right, 120 + m.gazeX * 7, 'right'));
	const mouth = $derived(
		mouthPath(
			100 + f.mouthX + m.gazeX * 5,
			116 + m.gazeY * 4,
			f.mouthWidth,
			f.mouthCurve,
			f.mouthOpen + m.talk * 7
		)
	);
	const cheekOpacity = $derived(clamp(f.cheeks + (m.hovered ? 0.3 : 0), 0, 1) * 0.85);
</script>

<defs>
	<linearGradient id="{m.uid}-visor-sheen" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0" stop-color="#fff" stop-opacity="0.2" />
		<stop offset="0.45" stop-color="#fff" stop-opacity="0" />
	</linearGradient>
</defs>

<g transform="translate({ox} {oy})">
	<rect class="visor" x={100 - visorW / 2} y="69" width={visorW} height="62" rx="31" />
	<rect x={100 - visorW / 2} y="69" width={visorW} height="62" rx="31" fill={ref('visor-sheen')} />
	<rect class="visor-rim" x={100 - visorW / 2} y="69" width={visorW} height="62" rx="31" />
</g>
<g class="cheeks" opacity={cheekOpacity} filter={ref('soft')}>
	<ellipse cx={100 - visorW / 2 + 14 + ox} cy={113 + oy} rx="7.5" ry="4.5" />
	<ellipse cx={100 + visorW / 2 - 14 + ox} cy={113 + oy} rx="7.5" ry="4.5" />
</g>
<g filter={ref('glow')}>
	{#each [leftEye, rightEye] as e, i (i)}
		<path class="eye" d={e.d} opacity={1 - e.heart} />
		{#if e.heart > 0.01}
			<path
				class="eye-heart"
				d={HEART_PATH}
				opacity={e.heart}
				transform="translate({e.cx} {eyeY}) scale({22 * e.scale * (0.6 + 0.4 * e.heart)})"
			/>
		{/if}
		<circle
			class="shine"
			cx={e.cx + e.w * 0.2}
			cy={eyeY - e.h * 0.22}
			r={2.2 * e.scale}
			opacity={e.shine}
		/>
	{/each}
	<path class="mouth" d={mouth} />
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
	.visor-rim {
		fill: none;
		stroke: var(--c-accent);
		stroke-opacity: 0.45;
		stroke-width: 1.2;
	}
	.cheeks {
		fill: var(--c-cheek);
	}
	.eye {
		fill: var(--c-eye);
		stroke: var(--c-eye);
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
	.eye-heart {
		fill: var(--c-eye);
	}
	.shine {
		fill: #fff;
	}
	.mouth {
		fill: var(--c-eye);
		stroke: var(--c-eye);
		stroke-width: 2.6;
		stroke-linecap: round;
		stroke-linejoin: round;
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

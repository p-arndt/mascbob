<script lang="ts">
	import { getMascot, svgRef } from '../context.js';
	import { HEART_PATH, SPARKLE_PATH } from '../geometry.js';
	import Burst from './Burst.svelte';
	import { LOOPS, WAVE_PERIOD, waveDelay } from './effects.js';

	/** Mood effects around the head (sparkles, hearts, zzz, thought bubble, sound waves, "?") and boop bursts. */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const t = $derived(m.shape.top);
	const hw = $derived(m.shape.halfWidth);

	const sparkles = $derived([
		{ x: 100 + hw + 6, y: t + 12, s: 7, tone: 'accent' },
		{ x: 100 - hw - 3, y: t + 26, s: 5, tone: 'eye' },
		{ x: 100 + hw - 14, y: t - 9, s: 4.2, tone: 'eye' },
		{ x: 100 - hw + 10, y: t - 6, s: 3, tone: 'accent' }
	]);
	const glitter = $derived([
		[100 + hw + 14, t - 2],
		[100 - hw - 8, t + 8],
		[100 + hw - 2, t + 30]
	]);
	const hearts = $derived([
		{ x: 100 + hw - 4, y: t + 6, s: 11 },
		{ x: 100 - hw + 4, y: t + 14, s: 8 },
		{ x: 100 + hw + 10, y: t + 32, s: 7 }
	]);
	const cloud = $derived({ x: 100 + hw - 2, y: t - 26 });
	const question = $derived({ x: 100 + hw - 6, y: t - 12 });
	const QUESTION_PATH = 'M-4.5 -5.5Q-4.5 -11 1 -11Q6.5 -11 6.5 -6Q6.5 -2.5 2 -1Q0 -0.3 0 2.5';
</script>

{#if m.config.effect === 'sparkles'}
	<g filter={ref('glow')}>
		{#each sparkles as p, i (i)}
			<g transform="translate({p.x} {p.y})">
				<g
					class="twinkle"
					style:animation-duration="{LOOPS.sparkles[i].period}s"
					style:animation-delay="{LOOPS.sparkles[i].delay}s"
				>
					<path class="tone-{p.tone}" d={SPARKLE_PATH} transform="scale({p.s})" />
					<path class="glint" d={SPARKLE_PATH} transform="scale({p.s * 0.42}) rotate(45)" />
				</g>
			</g>
		{/each}
	</g>
	{#each glitter as [x, y], i (i)}
		<g transform="translate({x} {y})">
			<circle
				class="glitter"
				r="1.3"
				style:animation-duration="{LOOPS.glitter[i].period}s"
				style:animation-delay="{LOOPS.glitter[i].delay}s"
			/>
		</g>
	{/each}
{:else if m.config.effect === 'hearts'}
	{#each hearts as p, i (i)}
		<g transform="translate({p.x} {p.y})">
			<g
				class="heart-rise"
				style:animation-duration="{LOOPS.hearts[i].period}s"
				style:animation-delay="{LOOPS.hearts[i].delay}s"
			>
				<g
					class="heart-sway"
					style:animation-duration="{LOOPS.heartSway[i].period}s"
					style:animation-delay="{LOOPS.heartSway[i].delay}s"
				>
					<g transform="scale({p.s})">
						<path class="heart" d={HEART_PATH} />
						<ellipse
							class="heart-shine"
							cx="-0.24"
							cy="-0.27"
							rx="0.1"
							ry="0.07"
							transform="rotate(-35 -0.24 -0.27)"
						/>
					</g>
				</g>
			</g>
		</g>
	{/each}
{:else if m.config.effect === 'zzz'}
	<g transform="translate({100 + hw - 10} {t + 4})">
		{#each [0, 1, 2] as i (i)}
			<g
				class="zzz"
				style:animation-duration="{LOOPS.zzz[i].period}s"
				style:animation-delay="{LOOPS.zzz[i].delay}s"
			>
				<circle class="zzz-bubble" r="7.5" />
				<path class="zzz-z" d="M-3.2 -3.2H3.2L-3.2 3.2H3.2" />
			</g>
		{/each}
	</g>
{:else if m.config.effect === 'dots'}
	<g class="cloud-float">
		<g class="pop" style:animation-delay="0s">
			<circle class="bubble" cx={100 + hw - 8} cy={t + 3} r="2.6" />
		</g>
		<g class="pop" style:animation-delay="0.12s">
			<circle class="bubble" cx={100 + hw - 1} cy={t - 7} r="4" />
		</g>
		<g class="pop" style:animation-delay="0.24s">
			<ellipse
				class="cloud-shadow"
				cx={cloud.x + 1}
				cy={cloud.y + 5}
				rx="20"
				ry="11"
				filter={ref('soft')}
			/>
			<g class="bubble">
				<circle cx={cloud.x - 11} cy={cloud.y + 2} r="8.5" />
				<circle cx={cloud.x - 1} cy={cloud.y - 4} r="10.5" />
				<circle cx={cloud.x + 11} cy={cloud.y} r="8.5" />
				<ellipse cx={cloud.x} cy={cloud.y + 4} rx="17" ry="8" />
			</g>
			<path
				class="cloud-shine"
				d="M{cloud.x - 16} {cloud.y - 1}Q{cloud.x - 14} {cloud.y - 7} {cloud.x - 8} {cloud.y - 7}"
			/>
			{#each [-8, 0, 8] as dx, i (i)}
				<g transform="translate({cloud.x + dx} {cloud.y + 1})">
					<circle class="dot" r="2.5" style:animation-delay="{i * 0.16}s" />
				</g>
			{/each}
		</g>
	</g>
{:else if m.config.effect === 'waves'}
	{#each [1, -1] as side (side)}
		<g transform="translate({100 + side * (hw + 6)} 102) scale({side} 1)">
			{#each [0, 1, 2] as i (i)}
				<path
					class="wave"
					d="M0 -9Q6 0 0 9"
					style:animation-duration="{WAVE_PERIOD}s"
					style:animation-delay="{waveDelay(i, side)}s"
				/>
			{/each}
			<circle
				class="wave-dot"
				cx="1"
				r="1.6"
				style:animation-delay="{side < 0 ? -WAVE_PERIOD / 2 : 0}s"
			/>
		</g>
	{/each}
{:else if m.config.effect === 'question'}
	<!-- Screen-printed like the face: an accent plate slightly off the ink plate. -->
	<g transform="translate({question.x} {question.y})">
		<g class="question">
			<g class="glyph accent" transform="translate(1.4 1)">
				<path d={QUESTION_PATH} />
				<circle cy="7" r="1.9" />
			</g>
			<g class="glyph ink">
				<path d={QUESTION_PATH} />
				<circle cy="7" r="1.9" />
			</g>
		</g>
	</g>
{/if}

<Burst />

<style>
	.tone-accent {
		fill: var(--c-accent);
	}
	.tone-eye {
		fill: var(--c-eye);
	}
	.glint {
		fill: #fff;
	}
	.twinkle {
		animation: twinkle 1.5s ease-in-out infinite;
	}
	.glitter {
		fill: #fff;
		animation: glitter 1.8s ease-in-out infinite;
	}

	.heart {
		fill: var(--c-cheek);
	}
	.heart-shine {
		fill: #fff;
		opacity: 0.8;
	}
	.heart-rise {
		animation: heart-rise 2.4s ease-out infinite;
	}
	.heart-sway {
		animation: heart-sway 1.2s ease-in-out infinite alternate;
	}

	.zzz {
		opacity: 0.8;
		animation: drift 3s ease-out infinite;
	}
	.zzz-bubble {
		fill: var(--c-accent);
		fill-opacity: 0.16;
		stroke: #fff;
		stroke-opacity: 0.35;
		stroke-width: 0.8;
	}
	.zzz-z {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.bubble {
		fill: #fff;
	}
	.cloud-shadow {
		fill: var(--c-visor);
		opacity: 0.18;
	}
	.cloud-shine {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 1.2;
		stroke-linecap: round;
		opacity: 0.35;
	}
	.cloud-float {
		animation: cloud-float 2.6s ease-in-out infinite alternate;
	}
	.pop {
		transform-box: fill-box;
		transform-origin: center;
		animation: pop 0.45s cubic-bezier(0.34, 1.6, 0.5, 1) both;
	}
	.dot {
		fill: var(--c-visor);
		animation: hop 1s cubic-bezier(0.3, 0, 0.3, 1) infinite;
	}

	.wave {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2.2;
		stroke-linecap: round;
		opacity: 0.6;
		animation: ripple 1.5s ease-out infinite;
	}
	.wave-dot {
		fill: var(--c-accent);
		animation: beat 0.75s ease-in-out infinite alternate;
	}

	.question {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: question-bob 2.3s ease-in-out infinite alternate;
	}
	.glyph path {
		fill: none;
		stroke: currentColor;
		stroke-width: 3.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.glyph circle {
		fill: currentColor;
	}
	.glyph.ink {
		color: var(--c-eye);
	}
	.glyph.accent {
		color: var(--c-accent);
		opacity: 0.9;
	}

	@keyframes question-bob {
		from {
			transform: translateY(0) rotate(-8deg);
		}
		to {
			transform: translateY(-3px) rotate(6deg);
		}
	}
	@keyframes twinkle {
		0%,
		100% {
			transform: scale(0.35) rotate(0deg);
			opacity: 0.25;
		}
		50% {
			transform: scale(1) rotate(45deg);
			opacity: 1;
		}
	}
	@keyframes glitter {
		0%,
		100% {
			opacity: 0;
			transform: scale(0.4);
		}
		50% {
			opacity: 0.9;
			transform: scale(1);
		}
	}
	@keyframes heart-rise {
		0% {
			transform: translateY(4px) scale(0.4);
			opacity: 0;
		}
		20% {
			transform: translateY(0) scale(1.05);
			opacity: 1;
		}
		30% {
			transform: translateY(-3px) scale(1);
		}
		75% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(-20px) scale(0.85);
			opacity: 0;
		}
	}
	@keyframes heart-sway {
		from {
			transform: translateX(-2.5px) rotate(-12deg);
		}
		to {
			transform: translateX(2.5px) rotate(10deg);
		}
	}
	@keyframes drift {
		0% {
			transform: translate(0, 0) scale(0.45);
			opacity: 0;
		}
		25% {
			opacity: 0.9;
		}
		60% {
			transform: translate(10px, -16px) scale(0.95);
		}
		100% {
			transform: translate(14px, -30px) scale(1.2);
			opacity: 0;
		}
	}
	@keyframes cloud-float {
		to {
			transform: translateY(-2px);
		}
	}
	@keyframes pop {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	@keyframes hop {
		0%,
		55%,
		100% {
			transform: translateY(0) scale(1);
		}
		22% {
			transform: translateY(-3.5px) scale(0.92, 1.1);
		}
		40% {
			transform: translateY(0) scale(1.15, 0.85);
		}
	}
	@keyframes ripple {
		0% {
			transform: translateX(0) scale(0.6);
			opacity: 0;
		}
		25% {
			opacity: 0.85;
		}
		100% {
			transform: translateX(13px) scale(1.35);
			opacity: 0;
		}
	}
	@keyframes beat {
		from {
			transform: scale(0.6);
			opacity: 0.4;
		}
		to {
			transform: scale(1);
			opacity: 0.9;
		}
	}
</style>

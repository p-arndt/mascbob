<script lang="ts">
	import { getMascot } from '../context.js';
	import { HEART_PATH, SPARKLE_PATH } from '../geometry.js';

	/** Mood effects around the head: sparkles, hearts, zzz, thought bubble, sound waves. */
	const m = getMascot();
	const t = $derived(m.shape.top);
	const hw = $derived(m.shape.halfWidth);
</script>

{#if m.config.effect === 'sparkles'}
	{#each [[100 + hw + 6, t + 12, 7], [100 - hw - 2, t + 28, 5], [100 + hw - 16, t - 8, 4]] as [x, y, s], i (i)}
		<g transform="translate({x} {y}) scale({s})">
			<path class="sparkle" d={SPARKLE_PATH} style:animation-delay="{i * 0.35}s" />
		</g>
	{/each}
{:else if m.config.effect === 'hearts'}
	{#each [[100 + hw - 4, t + 6, 11], [100 - hw + 4, t + 14, 8], [100 + hw + 10, t + 34, 7]] as [x, y, s], i (i)}
		<g transform="translate({x} {y}) scale({s})">
			<path class="heart" d={HEART_PATH} style:animation-delay="{i * 0.5}s" />
		</g>
	{/each}
{:else if m.config.effect === 'zzz'}
	{#each [0, 1, 2] as i (i)}
		<text class="zzz" x={100 + hw - 12} y={t + 4} style:animation-delay="{i * 0.9}s">z</text>
	{/each}
{:else if m.config.effect === 'dots'}
	<circle class="bubble" cx={100 + hw - 6} cy={t + 2} r="3" />
	<circle class="bubble" cx={100 + hw + 2} cy={t - 8} r="4.5" />
	<ellipse class="bubble" cx={100 + hw - 2} cy={t - 26} rx="20" ry="12" />
	{#each [-8, 0, 8] as dx, i (i)}
		<circle
			class="dot"
			cx={100 + hw - 2 + dx}
			cy={t - 26}
			r="2.6"
			style:animation-delay="{i * 0.18}s"
		/>
	{/each}
{:else if m.config.effect === 'waves'}
	{#each [0, 1, 2] as i (i)}
		<path
			class="wave"
			d="M{100 + hw + 8 + i * 7} {100 - 8 - i * 4}Q{100 + hw + 14 + i * 7} 104 {100 +
				hw +
				8 +
				i * 7} {108 + i * 4}"
			style:animation-delay="{i * 0.25}s"
		/>
		<path
			class="wave"
			d="M{100 - hw - 8 - i * 7} {100 - 8 - i * 4}Q{100 - hw - 14 - i * 7} 104 {100 -
				hw -
				8 -
				i * 7} {108 + i * 4}"
			style:animation-delay="{i * 0.25}s"
		/>
	{/each}
{/if}

<style>
	.sparkle {
		fill: var(--c-accent);
	}
	.heart {
		fill: var(--c-cheek);
	}
	.zzz {
		fill: var(--c-accent);
		font:
			700 13px system-ui,
			sans-serif;
		opacity: 0;
		animation: drift 2.7s ease-out infinite;
	}
	.bubble {
		fill: #fff;
		opacity: 0.9;
	}
	.dot {
		fill: var(--c-visor);
		animation: hop 0.9s ease-in-out infinite;
	}
	.wave {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2.5;
		stroke-linecap: round;
		opacity: 0;
		animation: ping 1.2s ease-out infinite;
	}
	.sparkle {
		animation: twinkle 1.4s ease-in-out infinite;
	}
	.heart {
		animation: rise 2.2s ease-out infinite;
	}
	.sparkle,
	.heart,
	.zzz,
	.dot,
	.wave {
		transform-box: fill-box;
		transform-origin: center;
	}
	/* The root's reduced-motion rule stops animations; keep these visible then. */
	:global(.still) .zzz,
	:global(.still) .wave {
		opacity: 1;
	}

	@keyframes twinkle {
		0%,
		100% {
			transform: scale(0.4) rotate(0deg);
			opacity: 0.2;
		}
		50% {
			transform: scale(1) rotate(45deg);
			opacity: 1;
		}
	}
	@keyframes rise {
		0% {
			transform: translateY(0.5px) scale(0.6);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translateY(-1.6px) scale(1);
			opacity: 0;
		}
	}
	@keyframes drift {
		0% {
			transform: translate(0, 0) scale(0.6);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translate(14px, -26px) scale(1.2);
			opacity: 0;
		}
	}
	@keyframes hop {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-3px);
		}
	}
	@keyframes ping {
		0% {
			opacity: 0;
			transform: scale(0.9);
		}
		40% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: scale(1.1);
		}
	}
</style>

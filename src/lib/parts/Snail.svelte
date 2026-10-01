<script lang="ts">
	import { getMascot, svgRef } from '../context.js';
	let { layer }: { layer: 'back' | 'markings' | 'front' } = $props();
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const shellSize = $derived(1.15 * (0.72 + m.proportions.body * 0.28));
	const footLength = $derived(0.7 + m.proportions.height * 0.3);
</script>

{#if layer === 'back' && m.body}
	<g class="snail-house" transform="translate(141 {m.shape.bottom - 39}) scale({shellSize})">
		<defs>
			<radialGradient id="{m.uid}-house" cx="0.3" cy="0.2" r="0.85">
				<stop class="house-top" offset="0" />
				<stop class="house-base" offset="0.7" />
				<stop class="house-bottom" offset="1" />
			</radialGradient>
		</defs>
		<path
			class="house"
			fill={ref('house')}
			d="M-35 24C-47 9-43-18-25-32C-8-46 20-38 32-21C47 0 39 24 24 34C9 43-20 42-35 24Z"
		/>
		<path class="house-light" d="M-30-16C-17-34 7-36 23-20C7-26-13-25-30-16Z" />
		<path
			class="spiral-echo"
			d="M-27 24C-40 7-30-22-8-25C15-29 32-10 26 10C22 25 2 30-9 20C-21 9-13-8 0-9C11-10 17 1 10 8Q3 14-2 7"
			transform="translate(1.8 1.2)"
		/>
		<path
			class="spiral"
			d="M-27 24C-40 7-30-22-8-25C15-29 32-10 26 10C22 25 2 30-9 20C-21 9-13-8 0-9C11-10 17 1 10 8Q3 14-2 7"
		/>
		{#each [0, 1, 2] as i (i)}
			<path class="growth-line" d="M{21 + i * 4} {-25 + i * 6}l-4 3" />
		{/each}
	</g>
{:else if layer === 'front' && m.body}
	<g transform="translate(100 {m.shape.bottom}) scale({footLength} 1)">
		<g class="snail-foot">
			<path
				class="foot"
				fill={ref('body')}
				d="M-35-7C-40 1-50 3-60 6Q-73 9-68 16C-57 26 54 24 72 15Q81 8 67 5C60 3 55 0 52-7Z"
			/>
			<path
				class="foot-edge"
				d="M-35-7C-40 1-50 3-60 6Q-73 9-68 16C-57 26 54 24 72 15Q81 8 67 5C60 3 55 0 52-7"
			/>
			<path class="sole" d="M-62 17Q-12 26 66 17" />
			{#each [-38, -16, 8, 32, 52] as x (x)}
				<path class="foot-fold" d="M{x} 11q-3 2-3 5" />
			{/each}
		</g>
	</g>
{/if}

<style>
	.house {
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-opacity: 0.55;
	}
	.house-top {
		stop-color: color-mix(in oklab, var(--c-accent) 65%, var(--c-body-light));
	}
	.house-base {
		stop-color: var(--c-accent);
	}
	.house-bottom {
		stop-color: color-mix(in oklab, var(--c-accent) 80%, var(--c-visor));
	}
	.house-light {
		fill: var(--c-body-light);
		opacity: 0.25;
	}
	.spiral,
	.spiral-echo {
		fill: none;
		stroke-linecap: round;
		stroke-width: 3.2;
	}
	.spiral {
		stroke: var(--c-body-light);
		opacity: 0.8;
	}
	.spiral-echo {
		stroke: var(--c-visor);
		opacity: 0.3;
	}
	.growth-line {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1.5;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.foot-edge {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-opacity: 0.5;
	}
	.sole {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.foot-fold {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.3;
		stroke-linecap: round;
		opacity: 0.22;
	}
	.snail-foot {
		transform-origin: 0 16px;
		animation: creep 4s ease-in-out infinite alternate;
	}
	@keyframes creep {
		from {
			transform: scaleX(0.97);
		}
		to {
			transform: scaleX(1.02);
		}
	}
</style>

<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import type { HandPose } from '../types.js';

	/**
	 * Full-body figure below the head (y ≈ 150..290 in the 200×300 viewBox).
	 * `back` draws the torso behind the head, `front` the arms over it.
	 */
	let { layer }: { layer: 'back' | 'front' } = $props();

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);

	function hands(pose: HandPose) {
		switch (pose) {
			case 'up':
				return { lx: 40, ly: 150, rx: 160, ry: 150 };
			case 'wave':
				return { lx: 52, ly: 222, rx: 162, ry: 158 };
			case 'think':
				return { lx: 52, ly: 222, rx: 118, ry: 176 };
			default:
				return { lx: 52, ly: 222, rx: 148, ry: 222 };
		}
	}

	const pos = Spring.of(() => hands(m.config.hands), { stiffness: 0.07, damping: 0.4 });
</script>

{#if layer === 'back'}
	<path
		d="M100 156C128 156 140 176 140 206C140 238 124 252 100 252C76 252 60 238 60 206C60 176 72 156 100 156Z"
		fill={ref('body')}
	/>
	<ellipse cx="84" cy="266" rx="12" ry="9" fill={ref('hand')} />
	<ellipse cx="116" cy="266" rx="12" ry="9" fill={ref('hand')} />
{:else}
	<g class="arms">
		<path
			d="M68 190Q{(68 + pos.current.lx) / 2 - 6} {(190 + pos.current.ly) / 2} {pos.current.lx} {pos
				.current.ly}"
		/>
		<path
			d="M132 190Q{(132 + pos.current.rx) / 2 + 6} {(190 + pos.current.ry) / 2} {pos.current
				.rx} {pos.current.ry}"
		/>
	</g>
	<circle cx={pos.current.lx} cy={pos.current.ly} r="9" fill={ref('hand')} />
	<circle cx={pos.current.rx} cy={pos.current.ry} r="9" fill={ref('hand')} />
{/if}

<style>
	.arms path {
		fill: none;
		stroke: var(--c-body-mid);
		stroke-width: 8;
		stroke-linecap: round;
	}
</style>

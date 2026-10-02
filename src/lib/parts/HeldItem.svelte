<script lang="ts">
	import type { HeldItem } from '../types.js';
	let { item }: { item: HeldItem } = $props();
</script>

<g class="held-item" data-held-item={item} stroke-linecap="round" stroke-linejoin="round">
	{#if item === 'sword'}
		<path class="metal" d="M-7-14V-78L0-96L7-78V-14Z" />
		<path class="shine" d="M0-86V-19M-4-74V-25" />
		<rect class="grip" x="-3.5" y="-11" width="7" height="23" rx="2" />
		<path class="shine" d="M-2 6H2M-2 10H2" />
		<path class="accent" d="M-18-18L-14-19L-12-15H12L14-19L18-18L16-10H-16Z" />
		<path class="accent" d="M0 10L6 15L0 21L-6 15Z" />
		<circle class="shine" cy="15" r="2" />
	{:else if item === 'microphone'}
		<rect class="grip" x="-4" y="-23" width="8" height="31" rx="3" />
		<rect class="accent" x="-4" y="-20" width="8" height="4" rx="1" />
		<rect class="metal" x="-8" y="-39" width="16" height="19" rx="8" />
		<path class="mesh" d="M-5-33H5M-6-29H6M-5-25H5M-2-36V-23M2-36V-23" />
	{:else if item === 'phone'}
		<!-- The screen faces Bob; we see the small matte case and camera lenses. -->
		<rect class="phone-rim" x="-8.5" y="-35" width="18" height="38" rx="4.5" />
		<rect class="phone-case" x="-8.5" y="-35" width="16.5" height="37" rx="4" />
		<rect class="camera-plate" x="-6" y="-32.5" width="7" height="12" rx="3" />
		<circle class="lens" cx="-2.5" cy="-29" r="1.8" />
		<circle class="lens" cx="-2.5" cy="-24" r="1.8" />
		<circle class="flash" cx="3.5" cy="-28.5" r="1" />
		<path class="case-seam" d="M5.5-18V-5" />
	{/if}
</g>

<style>
	.held-item {
		stroke: var(--c-visor);
		stroke-width: 1.5;
	}
	.metal {
		fill: #dce5eb;
	}
	.grip {
		fill: var(--c-visor);
	}
	.phone-rim {
		fill: var(--c-body-dark);
		stroke: var(--c-visor);
		stroke-opacity: 0.25;
		stroke-width: 1;
	}
	.phone-case {
		fill: var(--c-body-mid);
		stroke: var(--c-body-light);
		stroke-width: 1;
	}
	.camera-plate,
	.accent {
		fill: var(--c-accent);
	}
	.camera-plate {
		stroke: none;
	}
	.lens {
		fill: var(--c-visor);
		stroke: var(--c-body-light);
		stroke-width: 0.7;
	}
	.flash {
		fill: var(--c-body-light);
		stroke: none;
	}
	.case-seam {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1;
		opacity: 0.55;
	}
	.shine {
		fill: none;
		stroke: white;
		stroke-width: 1.2;
		opacity: 0.8;
	}
	.mesh {
		fill: none;
		stroke-width: 0.8;
		opacity: 0.5;
	}
</style>

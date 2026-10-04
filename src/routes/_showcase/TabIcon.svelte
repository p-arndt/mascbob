<script lang="ts">
	import { Mascot } from '$lib/index.js';
	import { snapshotSvg } from './exporter.js';
	import { onMount } from 'svelte';
	import { savedDesign, tabLook } from './design.js';
	import { favicon, showInTab } from './favicon.svelte.js';

	// Crops the 200×200 head the same way as static/favicon.svg.
	const VIEWBOX = '26 30 148 148';
	const SIZE = 64;

	let host = $state<HTMLElement>();

	// A mascot designed in the studio stays in the tab on every page, also after a reload.
	onMount(() => {
		const design = savedDesign();
		if (design) showInTab(tabLook(design), 'studio');
	});

	$effect(() => {
		const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
		if (!link) return;
		const original = link.href;
		return () => (link.href = original);
	});

	$effect(() => {
		// Read deeply so any change to the look re-renders the icon.
		if (!JSON.stringify(favicon.look)) return;
		// Waits for the hidden mascot to redraw; also coalesces rapid clicks into one update.
		const id = setTimeout(() => {
			const svg = host?.querySelector('svg');
			const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
			if (!svg || !link) return;
			const text = snapshotSvg(svg, { width: SIZE, height: SIZE }).replace(
				/viewBox="[^"]*"/,
				`viewBox="${VIEWBOX}"`
			);
			link.href = `data:image/svg+xml,${encodeURIComponent(text)}`;
		}, 150);
		return () => clearTimeout(id);
	});
</script>

{#if favicon.look}
	<!-- Reduced motion: no blinks or talking to catch mid-frame, and mood changes land instantly. -->
	<div class="tab-icon" aria-hidden="true" inert bind:this={host}>
		<Mascot
			{...favicon.look}
			body={false}
			hands={false}
			float={false}
			effects={false}
			lookAt="none"
			motion="reduced"
			interactive={false}
			size={SIZE}
			label=""
		/>
	</div>
{/if}

<style>
	.tab-icon {
		position: fixed;
		top: 0;
		left: -1000px;
		pointer-events: none;
	}
</style>

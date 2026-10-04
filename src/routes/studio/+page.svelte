<script lang="ts">
	import '../_showcase/showcase.css';
	import Playground from '../_showcase/Playground.svelte';
	import SiteNav from '../_showcase/SiteNav.svelte';
	import TabIcon from '../_showcase/TabIcon.svelte';
</script>

<svelte:head>
	<title>Studio · mascbob</title>
	<meta
		name="description"
		content="Design your own animated mascot: species, colors, outfits, moods and reactions, then export it as Svelte code, SVG, PNG or a share link."
	/>
	<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#111110" media="(prefers-color-scheme: dark)" />
</svelte:head>

<TabIcon />

<div class="site">
	<SiteNav pinned={false} />
	<main>
		<h1 class="visually-hidden">Studio</h1>
		<Playground standalone />
	</main>
</div>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.5rem 1.5rem 2rem;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	/* On a phone the studio is the whole screen, edge to edge. */
	@media (max-width: 900px) {
		main {
			padding: 0;
		}
	}
</style>

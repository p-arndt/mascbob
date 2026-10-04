<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Mascot } from '$lib/index.js';
	import { pinScheme, pinnedScheme } from './scheme.js';

	// The studio pins its own stage to the top, so there the nav scrolls away with the page.
	let { pinned = true }: { pinned?: boolean } = $props();

	let scrolled = $state(false);

	// Follows the system until the visitor picks a scheme, then stays pinned.
	let dark = $state(false);
	onMount(() => {
		const system = matchMedia('(prefers-color-scheme: dark)');
		const pinned = pinnedScheme();
		dark = pinned ? pinned === 'dark' : system.matches;
		const follow = (e: MediaQueryListEvent) => {
			if (!pinnedScheme()) dark = e.matches;
		};
		system.addEventListener('change', follow);
		return () => system.removeEventListener('change', follow);
	});
	// resolve() takes no fragment, so section links append one to the resolved home path.
	const home = resolve('/');
	const sections = [
		[home + '#features', 'Features'],
		[home + '#talk', 'Voice'],
		[home + '#moods', 'Moods']
	] as const;
	const onDocs = $derived(page.url.pathname === resolve('/docs'));
	const onStudio = $derived(page.url.pathname === resolve('/studio'));

	let menu = $state<HTMLElement>();
	function toggleScheme() {
		dark = !dark;
		pinScheme(dark ? 'dark' : 'light');
	}
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 8)} />

<nav class:scrolled class:pinned>
	<a class="brand" href={resolve('/')} aria-label="mascbob home">
		<Mascot size={28} hands={false} float={false} interactive={false} label="" />
		<span>mascbob</span>
	</a>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<div class="links">
		{#each sections as [href, title] (href)}
			<a {href}>{title}</a>
		{/each}
		<a href={resolve('/docs')} aria-current={onDocs ? 'page' : undefined}>Docs</a>
	</div>
	<div class="nav-end">
		<button
			class="scheme"
			onclick={toggleScheme}
			aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
			title={dark ? 'Light mode' : 'Dark mode'}
		>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				{#if dark}
					<circle cx="12" cy="12" r="4.2" fill="currentColor" />
					<path
						d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				{:else}
					<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
				{/if}
			</svg>
		</button>
		<a
			class="btn-primary nav-cta"
			href={resolve('/studio')}
			aria-current={onStudio ? 'page' : undefined}>Studio</a
		>
		<button class="menu-toggle" popovertarget="site-menu" aria-label="Menu">
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
				<path d="M4 8h16M4 16h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
		</button>
	</div>
	<!-- Same-page hash links don't dismiss a popover, so every click closes it. -->
	<div id="site-menu" class="menu" popover bind:this={menu}>
		<a
			href={home}
			aria-current={page.url.pathname === home ? 'page' : undefined}
			onclick={() => menu?.hidePopover()}>Home</a
		>
		{#each sections as [href, title] (href)}
			<a {href} onclick={() => menu?.hidePopover()}>{title}</a>
		{/each}
		<a
			href={resolve('/docs')}
			aria-current={onDocs ? 'page' : undefined}
			onclick={() => menu?.hidePopover()}>Docs</a
		>
	</div>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</nav>

<style>
	nav {
		position: relative;
		z-index: 50;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.8rem 1.5rem;
	}
	nav.pinned {
		position: sticky;
		top: 0;
	}
	nav::before {
		content: '';
		position: absolute;
		inset: 0 calc(50% - 50vw);
		z-index: -1;
		border-bottom: 1px solid transparent;
		transition:
			background 0.25s,
			border-color 0.25s;
	}
	nav.scrolled::before {
		background: var(--nav-bg);
		backdrop-filter: blur(14px) saturate(180%);
		-webkit-backdrop-filter: blur(14px) saturate(180%);
		border-bottom-color: var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--text-1);
		text-decoration: none;
		font-weight: 700;
		font-size: 1.15rem;
		letter-spacing: -0.03em;
	}
	.links {
		display: flex;
		gap: 0.15rem;
	}
	.links a {
		padding: 0.45rem 0.85rem;
		border-radius: 999px;
		color: var(--text-1);
		text-decoration: none;
		font-size: 0.93rem;
		font-weight: 500;
		transition: background 0.15s;
	}
	.links a:hover {
		background: var(--surface);
	}
	.nav-end {
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.scheme {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--text-1);
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.3s var(--spring);
	}
	.scheme:hover {
		background: var(--surface);
	}
	.scheme:active {
		transform: rotate(-30deg) scale(0.9);
	}
	.nav-cta {
		padding: 0.55rem 1.1rem;
		font-size: 0.92rem;
	}
	.links a[aria-current='page'] {
		background: var(--surface);
	}
	.menu-toggle {
		display: none;
	}
	.menu {
		position: fixed;
		inset: 4rem 0.75rem auto auto;
		width: min(16rem, calc(100vw - 1.5rem));
		margin: 0;
		padding: 0.4rem;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: var(--bg);
		color: var(--text-1);
		box-shadow: 0 18px 40px rgb(0 0 0 / 0.14);
	}
	.menu:popover-open {
		display: grid;
	}
	.menu a {
		padding: 0.8rem 1rem;
		border-radius: 14px;
		color: var(--text-1);
		text-decoration: none;
		font-weight: 600;
	}
	.menu a:hover,
	.menu a[aria-current='page'] {
		background: var(--surface);
	}

	@media (max-width: 640px) {
		nav {
			grid-template-columns: 1fr auto;
		}
		.links {
			display: none;
		}
		.menu-toggle {
			display: grid;
			place-items: center;
			width: 2.4rem;
			height: 2.4rem;
			padding: 0;
			border: 0;
			border-radius: 50%;
			background: var(--surface);
			color: var(--text-1);
			cursor: pointer;
		}
		.nav-cta {
			padding: 0.5rem 0.95rem;
		}
	}
</style>

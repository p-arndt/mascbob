<script lang="ts">
	import { resolve } from '$app/paths';
	import { Mascot } from '$lib/index.js';
</script>

<footer>
	<div class="footer-mascot">
		<Mascot mood="sleepy" size={72} hands={false} interactive={false} label="sleeping mascot" />
	</div>
	<p>Made with Svelte 5 and a lot of boops. MIT licensed.</p>
	<nav aria-label="Footer">
		<a href={resolve('/')}>Home</a>
		<a href={resolve('/docs')}>Docs</a>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() takes no fragment -->
		<a href={resolve('/') + '#playground'}>Studio</a>
	</nav>
</footer>

<style>
	footer {
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		padding: 3rem 1.5rem 4rem;
		border-top: 1px solid var(--line);
		color: var(--text-2);
		font-size: 0.92rem;
	}
	footer p {
		margin: 0.5rem 0 0;
	}
	footer a {
		color: var(--text-1);
		font-weight: 600;
		text-decoration: none;
	}
	footer a:hover {
		text-decoration: underline;
	}
	footer nav {
		display: flex;
		gap: 1.25rem;
		margin-top: 0.25rem;
	}
</style>

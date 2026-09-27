<script lang="ts">
	import {
		ACCESSORIES,
		DEFAULT_REACTIONS,
		EYE_STYLES,
		MOODS,
		Mascot,
		OUTFITS,
		REACTIONS,
		SHAPES,
		SHOES,
		THEMES,
		type ThemeName
	} from '$lib/index.js';
	import type { ComponentProps } from 'svelte';
	import '../_showcase/showcase.css';
	import CodeBlock from '../_showcase/CodeBlock.svelte';
	import SiteFooter from '../_showcase/SiteFooter.svelte';
	import SiteNav from '../_showcase/SiteNav.svelte';
	import { CSS_VARS, EXAMPLES, PROPS, REACTION_DOCS } from '../_showcase/docs.js';
	import { copyText } from '../_showcase/interactions.js';

	const themeNames = Object.keys(THEMES) as ThemeName[];

	const SECTIONS = [
		['install', 'Install'],
		['moods', 'Moods'],
		['colorways', 'Colorways'],
		['shapes', 'Shapes & eyes'],
		['gear', 'Accessories'],
		['fits', 'Outfits & shoes'],
		['reactions', 'Reactions'],
		['voice', 'Voice'],
		['styling', 'Styling'],
		['custom', 'Custom accessories'],
		['motion', 'Accessibility'],
		['props', 'All props']
	] as const;

	// Highlights the section in view in the sidebar.
	let current = $state<string>('install');
	function track(node: HTMLElement) {
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) if (e.isIntersecting) current = e.target.id;
			},
			{ rootMargin: '-20% 0px -70% 0px' }
		);
		for (const el of node.querySelectorAll('section[id]')) io.observe(el);
		return () => io.disconnect();
	}

	let copied = $state<string | null>(null);
	let copiedTimer: ReturnType<typeof setTimeout>;
	async function copy(text: string) {
		if (!(await copyText(text))) return;
		copied = text;
		clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => (copied = null), 1200);
	}

	const inline = (text: string) => text.split('`');

	type Tile = { key: string; code: string; props: ComponentProps<typeof Mascot>; note?: string };
	const tiles = {
		moods: MOODS.map((m): Tile => ({
			key: m,
			code: `mood="${m}"`,
			props: { mood: m, body: false }
		})),
		colorways: themeNames.map((t): Tile => ({
			key: t,
			code: `theme="${t}"`,
			props: { theme: t, mood: 'happy', body: false }
		})),
		shapes: SHAPES.map((s): Tile => ({
			key: s,
			code: `shape="${s}"`,
			props: { shape: s, body: false }
		})),
		eyes: EYE_STYLES.map((e): Tile => ({
			key: e,
			code: `eyes="${e}"`,
			props: { eyes: e, body: false }
		})),
		gear: ACCESSORIES.map((a): Tile => ({
			key: a,
			code: `accessories={['${a}']}`,
			props: { accessories: [a], body: false }
		})),
		outfits: OUTFITS.filter((o) => o !== 'none').map((o): Tile => ({
			key: o,
			code: `outfit="${o}"`,
			props: { outfit: o, shoes: 'sneakers' }
		})),
		shoes: SHOES.filter((s) => s !== 'none').map((s): Tile => ({
			key: s,
			code: `shoes="${s}"`,
			props: { shoes: s }
		}))
	};
</script>

<svelte:head>
	<title>Docs · mascott</title>
	<meta
		name="description"
		content="Everything <Mascot> can do: moods, colorways, shapes, accessories, outfits, reactions, voice lip-sync and styling."
	/>
</svelte:head>

{#snippet gallery(items: Tile[], tall = false)}
	<div class="gallery" class:tall>
		{#each items as t (t.key)}
			<button class="tile" onclick={() => copy(t.code)} title="Copy {t.code}">
				<span class="art">
					<Mascot
						size={tall ? 64 : 76}
						interactive={false}
						lookAt="wander"
						hands={false}
						label=""
						{...t.props}
					/>
				</span>
				<span class="name">{t.key}</span>
				<code>{copied === t.code ? 'Copied' : t.code}</code>
			</button>
		{/each}
	</div>
{/snippet}

<div class="site">
	<SiteNav />

	<div class="docs" {@attach track}>
		<aside>
			<nav aria-label="On this page">
				{#each SECTIONS as [id, title] (id)}
					<a href="#{id}" class:current={current === id}>{title}</a>
				{/each}
			</nav>
		</aside>

		<article>
			<header class="intro">
				<h1>Docs</h1>
				<p>
					One component, <code>&lt;Mascot&gt;</code>. Everything below is a prop. Click any tile to
					copy it.
				</p>
			</header>

			<section id="install">
				<h2>Install</h2>
				<p>Svelte 5 is the only peer dependency.</p>
				<CodeBlock code="pnpm add mascott" file="terminal" />
				<CodeBlock code={EXAMPLES.QUICK_START} file="App.svelte" />
				<p>
					Every list on this page is exported, so pickers you build stay in sync with the library:
				</p>
				<CodeBlock code={EXAMPLES.LISTS_CODE} />
			</section>

			<section id="moods">
				<h2>Moods <span>{MOODS.length}</span></h2>
				<p>
					<code>mood</code> sets eyes, lids, mouth, blush, effect and hand pose. Switching tweens every
					feature, so it morphs instead of cutting.
				</p>
				{@render gallery(tiles.moods)}
			</section>

			<section id="colorways">
				<h2>Colorways <span>{themeNames.length}</span></h2>
				<p>
					Sneaker-style presets: a matte neutral body and one loud accent. Pass an object to
					override single colors on top of a preset.
				</p>
				{@render gallery(tiles.colorways)}
				<CodeBlock code={EXAMPLES.THEME_OVERRIDE} />
			</section>

			<section id="shapes">
				<h2>Shapes <span>{SHAPES.length}</span></h2>
				{@render gallery(tiles.shapes)}
				<h3>Eyes <span>{EYE_STYLES.length}</span></h3>
				{@render gallery(tiles.eyes)}
			</section>

			<section id="gear">
				<h2>Accessories <span>{ACCESSORIES.length}</span></h2>
				<p>Combine as many as you like: <code>accessories={"{['halo', 'glasses']}"}</code>.</p>
				{@render gallery(tiles.gear)}
			</section>

			<section id="fits">
				<h2>Outfits & shoes</h2>
				<p>
					The full figure (<code>body</code>, on by default) starts bare. Use
					<code>body={'{false}'}</code> for a square, head-only avatar.
				</p>
				{@render gallery(tiles.outfits, true)}
				{@render gallery(tiles.shoes, true)}
			</section>

			<section id="reactions">
				<h2>Reactions <span>{REACTIONS.length}</span></h2>
				<p>
					With <code>interactive</code> on, it reacts to the pointer. Reactions override
					<code>mood</code> only briefly.
				</p>
				<dl class="reactions">
					{#each REACTIONS as r (r)}
						<div>
							<dt>
								<code>{r}</code>
								{#if !DEFAULT_REACTIONS.includes(r)}<small>opt-in</small>{/if}
							</dt>
							<dd>
								{#each inline(REACTION_DOCS[r]) as part, i (i)}{#if i % 2}<code>{part}</code
										>{:else}{part}{/if}{/each}
							</dd>
						</div>
					{/each}
				</dl>
				<CodeBlock code={EXAMPLES.REACTIONS_CODE} />
			</section>

			<section id="voice">
				<h2>Voice</h2>
				<p>
					Set <code>mood="talking"</code> and feed an amplitude in 0..1 into <code>level</code>.
					Without <code>level</code>, it babbles in fake syllables on its own. Stop the tracks and
					close the <code>AudioContext</code> when you're done.
				</p>
				<CodeBlock code={EXAMPLES.VOICE_CODE} file="Talk.svelte" />
			</section>

			<section id="styling">
				<h2>Styling with CSS</h2>
				<p>
					Every color is a CSS variable. Set them on the mascot or any ancestor, and they win over
					<code>theme</code>.
				</p>
				<dl class="vars">
					{#each CSS_VARS as [name, what] (name)}
						<div>
							<dt><code>{name}</code></dt>
							<dd>{what}</dd>
						</div>
					{/each}
				</dl>
				<CodeBlock code={EXAMPLES.CSS_CODE} file="app.css" />
			</section>

			<section id="custom">
				<h2>Custom accessories</h2>
				<p>
					The <code>accessory</code> snippet draws your own SVG on top of the head, in the head's
					200×200 coordinates. <code>top</code> is the crown's y and <code>halfWidth</code> its half width.
				</p>
				<CodeBlock code={EXAMPLES.CUSTOM_CODE} />
			</section>

			<section id="motion">
				<h2>Accessibility & motion</h2>
				<ul>
					<li>
						With <code>interactive</code> it renders a real <code>&lt;button&gt;</code>, reachable
						by keyboard. Name it with <code>label</code>.
					</li>
					<li>
						<code>motion="auto"</code> follows <code>prefers-reduced-motion</code>: loops stop and
						moods switch without tweening. Force either with <code>full</code> or
						<code>reduced</code>.
					</li>
					<li>
						Mascots off screen pause their timers and animations, so a page full of them stays
						smooth.
					</li>
				</ul>
			</section>

			<section id="props">
				<h2>All props</h2>
				<div class="table">
					<table>
						<thead><tr><th>Prop</th><th>Type</th><th>Default</th></tr></thead>
						<tbody>
							{#each PROPS as p (p.name)}
								<tr>
									<td><code>{p.name}</code></td>
									<td class="type">
										<code>{p.type}</code>
										<p>
											{#each inline(p.description) as part, i (i)}{#if i % 2}<code>{part}</code
													>{:else}{part}{/if}{/each}
										</p>
									</td>
									<td><code>{p.default}</code></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</article>
	</div>

	<SiteFooter />
</div>

<style>
	.docs {
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr);
		gap: 4rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem 6rem;
	}
	/* Grid items default to min-width: auto, which would let the mobile link row widen the page. */
	aside {
		min-width: 0;
	}
	aside nav {
		position: sticky;
		top: 5.5rem;
		display: grid;
		gap: 0.1rem;
	}
	aside a {
		padding: 0.4rem 0.75rem;
		border-radius: 10px;
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.92rem;
		font-weight: 500;
		transition:
			background 0.15s,
			color 0.15s;
	}
	aside a:hover {
		color: var(--text-1);
	}
	aside a.current {
		background: var(--surface);
		color: var(--text-1);
	}

	article {
		display: grid;
		gap: 4.5rem;
		max-width: 780px;
		min-width: 0;
	}
	.intro h1 {
		margin: 0;
		font-size: clamp(3rem, 7vw, 5rem);
		line-height: 1;
		letter-spacing: -0.055em;
	}
	.intro p {
		margin: 1rem 0 0;
		font-size: 1.15rem;
		color: var(--text-2);
	}
	section {
		display: grid;
		gap: 1.1rem;
		scroll-margin-top: 5.5rem;
	}
	h2,
	h3 {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin: 0;
		letter-spacing: -0.035em;
	}
	h2 {
		font-size: 2rem;
	}
	h3 {
		margin-top: 0.75rem;
		font-size: 1.3rem;
	}
	h2 span,
	h3 span {
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0;
		color: var(--text-3);
	}
	section > p,
	li {
		margin: 0;
		color: var(--text-2);
		line-height: 1.6;
	}
	ul {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding-left: 1.2rem;
	}

	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.5rem;
	}
	.tile {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		padding: 1rem 0.5rem 0.8rem;
		border: 0;
		border-radius: 20px;
		background: var(--surface);
		color: var(--text-1);
		font: inherit;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.2s var(--spring);
	}
	.tile:hover {
		background: var(--surface-2);
	}
	.tile:active {
		transform: scale(0.96);
	}
	.art {
		display: grid;
		place-items: end center;
		height: 90px;
	}
	.gallery.tall .art {
		height: 110px;
	}
	.name {
		font-weight: 650;
		font-size: 0.92rem;
	}
	.tile code {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background: none;
		padding: 0;
		font-size: 0.72rem;
		color: var(--text-3);
	}

	.reactions,
	.vars {
		display: grid;
		margin: 0;
		border-top: 1px solid var(--line);
	}
	.reactions div,
	.vars div {
		display: grid;
		grid-template-columns: 11rem minmax(0, 1fr);
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--line);
	}
	dt {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	dt small {
		font-size: 0.75rem;
		color: var(--text-3);
	}
	dd {
		margin: 0;
		color: var(--text-2);
	}

	.table {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
	}
	th {
		text-align: left;
		padding: 0 1rem 0.6rem 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-3);
	}
	td {
		padding: 0.85rem 1rem 0.85rem 0;
		border-top: 1px solid var(--line);
		vertical-align: top;
	}
	td.type p {
		margin: 0.35rem 0 0;
		color: var(--text-2);
		line-height: 1.5;
	}

	@media (max-width: 860px) {
		.docs {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.5rem;
		}
		/* The sidebar becomes a swipeable row of section links. */
		aside nav {
			position: static;
			display: flex;
			overflow-x: auto;
			scrollbar-width: none;
		}
		aside a {
			flex: none;
		}
		.reactions div,
		.vars div {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.25rem;
		}
	}
</style>

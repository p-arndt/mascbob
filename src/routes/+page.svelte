<script lang="ts">
	import { ACCESSORIES, MOODS, Mascot, SHAPES, THEMES } from '$lib/index.js';
	import './_showcase/showcase.css';
	import Code, { plain, type Token } from './_showcase/Code.svelte';
	import Galleries from './_showcase/Galleries.svelte';
	import Hero from './_showcase/Hero.svelte';
	import Playground from './_showcase/Playground.svelte';
	import TalkDemo from './_showcase/TalkDemo.svelte';
	import { copyText, reveal, spotlight } from './_showcase/interactions.js';

	let scrolled = $state(false);

	const features = [
		{
			title: `${MOODS.length} expressive moods`,
			text: 'Eyes, lids, mouth, blush and posture are tweened, so every switch is a smooth morph instead of a cut.',
			icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01',
			wide: true
		},
		{
			title: 'Alive by default',
			text: 'Blinks, breathes, floats, follows the cursor and squishes on boop.',
			icon: 'M3 12h4l2-6 4 12 2-6h6'
		},
		{
			title: 'Themeable to the bone',
			text: `${Object.keys(THEMES).length} presets, per-color overrides, or plain CSS variables.`,
			icon: 'M12 3a9 9 0 0 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4-4-7.5-9-7.5ZM7.5 11h.01M10 7.5h.01M15 7.5h.01'
		},
		{
			title: 'Voice ready',
			text: 'Pipe audio amplitude into `level` and the mouth lip-syncs in real time.',
			icon: 'M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4'
		},
		{
			title: 'Head or full body',
			text: `${SHAPES.length} head shapes, ${ACCESSORIES.length} accessories and an optional body with outfits and shoes.`,
			icon: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 21c0-4 3-7 7-7s7 3 7 7'
		},
		{
			title: 'Tiny and accessible',
			text: 'Pure SVG and Svelte 5 motion, zero dependencies. Real button semantics and reduced-motion support built in.',
			icon: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3ZM9 12l2 2 4-4',
			wide: true
		}
	];

	const usage: Token[][] = [
		[
			['t-p', '<'],
			['t-tag', 'script'],
			['t-p', '>']
		],
		[
			['t-attr', '  import'],
			['', ' { Mascot } '],
			['t-attr', 'from'],
			['t-str', " 'mascott'"],
			['', ';']
		],
		[
			['t-attr', '  let'],
			['', ' mood = '],
			['t-expr', '$state'],
			['', '('],
			['t-str', "'idle'"],
			['', ');']
		],
		[
			['t-p', '</'],
			['t-tag', 'script'],
			['t-p', '>']
		],
		[],
		[
			['t-p', '<'],
			['t-tag', 'Mascot'],
			['', ' {mood} '],
			['t-attr', 'body'],
			['', ' '],
			['t-attr', 'theme'],
			['t-p', '='],
			['t-str', '"og"'],
			['', ' '],
			['t-attr', 'onboop'],
			['t-p', '={'],
			['t-expr', "() => (mood = 'love')"],
			['t-p', '}'],
			['t-p', ' />']
		],
		[],
		[['t-c', '<!-- or restyle with plain CSS -->']],
		[
			['t-tag', '.brand'],
			['', ' { '],
			['t-attr', '--mascott-eye'],
			['', ': '],
			['t-str', '#00ffc6'],
			['', '; '],
			['t-attr', '--mascott-accent'],
			['', ': '],
			['t-str', '#ff4fd8'],
			['', '; }']
		]
	];
	const usageText = plain(usage);

	let copied = $state(false);
	async function copyUsage() {
		copied = await copyText(usageText);
		setTimeout(() => (copied = false), 1400);
	}
</script>

<svelte:head>
	<title>mascott · an animated companion for Svelte</title>
	<meta
		name="description"
		content="An animated, endlessly customizable SVG mascot for Svelte 5: moods, themes, full body, outfits, shoes and voice lip-sync."
	/>
	<meta name="theme-color" content="#07071a" />
</svelte:head>

<svelte:window onscroll={() => (scrolled = scrollY > 8)} />

<div class="site">
	<div class="backdrop" aria-hidden="true">
		<div class="blob b1"></div>
		<div class="blob b2"></div>
		<div class="blob b3"></div>
		<div class="grain"></div>
	</div>

	<nav class:scrolled>
		<a class="brand" href="#top" aria-label="mascott home">
			<Mascot size={30} hands={false} float={false} interactive={false} label="" />
			<span>mascott</span>
		</a>
		<div class="links">
			<a href="#playground">Playground</a>
			<a href="#talk">Voice</a>
			<a href="#moods">Moods</a>
			<a class="hide-sm" href="#usage">Docs</a>
		</div>
	</nav>

	<div id="top">
		<Hero />
	</div>

	<main>
		<section class="bento" aria-label="Features">
			{#each features as f, i (f.title)}
				<article
					class="feature glass"
					class:wide={f.wide}
					{@attach reveal((i % 3) * 80)}
					{@attach spotlight}
				>
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path
							d={f.icon}
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<h3>{f.title}</h3>
					<p>
						{#each f.text.split('`') as part, j (j)}{#if j % 2}<code>{part}</code
								>{:else}{part}{/if}{/each}
					</p>
				</article>
			{/each}
		</section>

		<section id="playground" class="section">
			<div class="section-head" {@attach reveal()}>
				<span class="kicker">Playground</span>
				<h2>Build your own in seconds.</h2>
				<p>Tweak anything, roll the dice, then copy the snippet straight into your app.</p>
			</div>
			<div {@attach reveal(100)}>
				<Playground />
			</div>
		</section>

		<section id="talk" {@attach reveal()}>
			<TalkDemo />
		</section>

		<Galleries />

		<section id="usage" class="section">
			<div class="section-head" {@attach reveal()}>
				<span class="kicker">Get started</span>
				<h2>Three lines to a new friend.</h2>
				<p>Install the package, drop in the component and let it react to your app.</p>
			</div>
			<div class="usage glass" {@attach reveal(100)}>
				<div class="window-bar">
					<span></span><span></span><span></span>
					<em>App.svelte</em>
					<button class="copy" class:done={copied} onclick={copyUsage}
						>{copied ? 'Copied' : 'Copy'}</button
					>
				</div>
				<Code lines={usage} />
			</div>
		</section>
	</main>

	<footer>
		<div class="footer-mascot">
			<Mascot mood="sleepy" size={64} hands={false} interactive={false} label="sleeping mascot" />
		</div>
		<p>Made with Svelte 5 and a lot of boops. MIT licensed.</p>
	</footer>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background:
			radial-gradient(120% 80% at 50% -10%, #1a1545 0%, transparent 60%),
			linear-gradient(#07071a, #0a0a22 60%, #07071a);
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		/* Baked-in falloff instead of filter: blur(), which re-rasterizes huge layers every frame. */
		background: radial-gradient(closest-side, var(--blob), transparent);
		opacity: 0.55;
		will-change: transform;
	}
	.b1 {
		width: 55vmax;
		height: 40vmax;
		top: -15vmax;
		left: -10vmax;
		--blob: #5b4dfc;
		animation: drift1 22s ease-in-out infinite alternate;
	}
	.b2 {
		width: 45vmax;
		height: 35vmax;
		top: -5vmax;
		right: -15vmax;
		--blob: #d946ef;
		opacity: 0.35;
		animation: drift2 26s ease-in-out infinite alternate;
	}
	.b3 {
		width: 50vmax;
		height: 30vmax;
		bottom: -20vmax;
		left: 20vmax;
		--blob: #06b6d4;
		opacity: 0.22;
		animation: drift1 30s ease-in-out infinite alternate-reverse;
	}
	@keyframes drift1 {
		to {
			transform: translate(8vmax, 5vmax) scale(1.1);
		}
	}
	@keyframes drift2 {
		to {
			transform: translate(-6vmax, 8vmax) scale(0.9);
		}
	}
	/* Fine noise breaks up gradient banding on the large blurred blobs. */
	.grain {
		position: absolute;
		inset: 0;
		opacity: 0.06;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	nav {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.9rem 1.5rem;
		transition:
			background 0.3s,
			border-color 0.3s,
			backdrop-filter 0.3s;
		border-bottom: 1px solid transparent;
	}
	nav::before {
		content: '';
		position: absolute;
		inset: 0 calc(50% - 50vw);
		z-index: -1;
		background: rgb(7 7 26 / 0);
		border-bottom: 1px solid transparent;
		transition:
			background 0.3s,
			border-color 0.3s;
	}
	nav.scrolled::before {
		background: rgb(7 7 26 / 0.6);
		backdrop-filter: blur(16px) saturate(160%);
		-webkit-backdrop-filter: blur(16px) saturate(160%);
		border-bottom-color: rgb(255 255 255 / 0.06);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-1);
		text-decoration: none;
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: -0.02em;
	}
	.links {
		display: flex;
		gap: 0.25rem;
	}
	.links a {
		padding: 0.45rem 0.8rem;
		border-radius: 10px;
		color: var(--text-2);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			color 0.2s,
			background 0.2s;
	}
	.links a:hover {
		color: var(--text-1);
		background: rgb(255 255 255 / 0.06);
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem 5rem;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: clamp(5rem, 10vw, 8rem);
	}

	.bento {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}
	.feature {
		position: relative;
		grid-column: span 1;
		padding: 1.5rem;
		overflow: hidden;
		transition:
			border-color 0.3s,
			transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.feature.wide {
		grid-column: span 2;
	}
	.feature::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			320px circle at var(--mx, 50%) var(--my, 0%),
			rgb(165 243 252 / 0.1),
			transparent 60%
		);
		opacity: 0;
		transition: opacity 0.3s;
		pointer-events: none;
	}
	.feature:hover {
		border-color: rgb(255 255 255 / 0.16);
		transform: translateY(-2px);
	}
	.feature:hover::before {
		opacity: 1;
	}
	.feature svg {
		color: #a5f3fc;
		padding: 0.55rem;
		border-radius: 12px;
		background: rgb(165 243 252 / 0.08);
		border: 1px solid rgb(165 243 252 / 0.14);
	}
	.feature h3 {
		margin: 1rem 0 0.35rem;
		font-size: 1.05rem;
		letter-spacing: -0.01em;
	}
	.feature p {
		margin: 0;
		color: var(--text-2);
		font-size: 0.93rem;
		line-height: 1.55;
	}

	.usage {
		max-width: 760px;
		width: 100%;
		margin: 0 auto;
		padding: 0.5rem;
		box-sizing: border-box;
	}
	.window-bar {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.6rem 0.8rem;
	}
	.window-bar span {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.12);
	}
	.window-bar em {
		flex: 1;
		text-align: center;
		font-style: normal;
		font-size: 0.8rem;
		color: var(--text-3);
		font-family: var(--mono);
	}
	.copy {
		padding: 0.3rem 0.7rem;
		border-radius: 8px;
		border: 1px solid rgb(255 255 255 / 0.1);
		background: rgb(255 255 255 / 0.06);
		color: var(--text-2);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.15s;
	}
	.copy:hover {
		background: rgb(255 255 255 / 0.12);
	}
	.copy:active {
		transform: scale(0.94);
	}
	.copy.done {
		background: #7cf3ff;
		color: #0b1030;
	}

	footer {
		display: grid;
		justify-items: center;
		gap: 0.25rem;
		padding: 3rem 1.5rem 4rem;
		border-top: 1px solid rgb(255 255 255 / 0.06);
		color: var(--text-3);
		font-size: 0.88rem;
	}
	footer p {
		margin: 0;
	}

	@media (max-width: 900px) {
		.bento {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 560px) {
		.bento {
			grid-template-columns: 1fr;
		}
		.feature.wide {
			grid-column: span 1;
		}
		.hide-sm {
			display: none;
		}
		.links a {
			padding: 0.4rem 0.55rem;
			font-size: 0.85rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.blob {
			animation: none;
		}
	}
</style>

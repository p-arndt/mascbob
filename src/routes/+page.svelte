<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		ACCESSORIES,
		MOODS,
		Mascot,
		OUTFITS,
		SHAPES,
		THEMES,
		type Mood,
		type ThemeName
	} from '$lib/index.js';
	import './_showcase/showcase.css';
	import Code, { plain, type Token } from './_showcase/Code.svelte';
	import Galleries from './_showcase/Galleries.svelte';
	import Hero from './_showcase/Hero.svelte';
	import TalkDemo from './_showcase/TalkDemo.svelte';
	import { copyText, reveal } from './_showcase/interactions.js';
	import SiteFooter from './_showcase/SiteFooter.svelte';
	import SiteNav from './_showcase/SiteNav.svelte';
	import { CREATURE_PRESETS, STUDIO_START, themeProp } from './_showcase/studio.js';
	import TabIcon from './_showcase/TabIcon.svelte';

	const themeNames = Object.keys(THEMES) as ThemeName[];
	const tint = (theme: ThemeName, amount = 14) =>
		`color-mix(in srgb, ${THEMES[theme].accent} ${amount}%, var(--bg))`;

	// The first card flips through every mood on its own, so the morphing is visible without clicking.
	let moodIndex = $state(0);
	const cycled: Mood = $derived(MOODS[moodIndex]);
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const id = setInterval(() => (moodIndex = (moodIndex + 1) % MOODS.length), 1700);
		return () => clearInterval(id);
	});

	let swatch = $state<ThemeName>('lilac');

	// The studio teaser lines up every species in its starting look, bob front and center.
	const ENSEMBLE_MOODS: Mood[] = ['waving', 'happy', 'love', 'curious', 'laughing', 'wink'];
	const ensemble = CREATURE_PRESETS.map((preset, i) => ({
		...preset,
		mood: ENSEMBLE_MOODS[i],
		theme: themeProp({ ...STUDIO_START, ...preset })
	}));
	const lineup = [ensemble[3], ensemble[1], ensemble[0], ensemble[2], ensemble[5], ensemble[4]];
	const studioSteps = [
		['Pick a species', 'Bob, Critterbob, Mossbob, Wispbob, Octobob or Snailbob.'],
		['Dress it up', `${themeNames.length} colorways, outfits, shoes and accessories.`],
		['Give it a mood', `${MOODS.length} moods and pointer reactions, tried live.`],
		['Take it home', 'Svelte code, SVG, PNG, GIF or a share link.']
	] as const;

	// Share links used to open the studio embedded here; it has its own page now.
	onMount(() => {
		if (location.search) location.replace(resolve('/studio') + location.search);
	});

	const more = [
		{
			title: 'Voice ready',
			text: 'Pipe audio amplitude into `level` and the mouth lip-syncs in real time.'
		},
		{
			title: 'Head or full body',
			text: `${SHAPES.length} head shapes, ${ACCESSORIES.length} accessories, ${OUTFITS.length - 1} outfits and shoes.`
		},
		{
			title: 'Tiny and accessible',
			text: 'Pure SVG, zero dependencies. Real button semantics and reduced-motion support.'
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
			['t-str', " 'mascbob'"],
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
			['t-attr', '--mascbob-eye'],
			['', ': '],
			['t-str', '#00ffc6'],
			['', '; '],
			['t-attr', '--mascbob-accent'],
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
	<title>mascbob · an animated companion for Svelte</title>
	<meta
		name="description"
		content="An animated, endlessly customizable SVG mascot for Svelte 5: moods, themes, full body, outfits, shoes and voice lip-sync."
	/>
	<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#111110" media="(prefers-color-scheme: dark)" />
</svelte:head>

<TabIcon />

<div class="site">
	<SiteNav />

	<div id="top">
		<Hero />
	</div>

	<main>
		<section id="playground" class="section">
			<div class="section-head" {@attach reveal()}>
				<h2>Build your own in seconds.</h2>
				<p>
					Tweak looks and reactions, then take it home as Svelte code, SVG, PNG or a share link.
				</p>
			</div>
			<a
				class="studio-teaser"
				href={resolve('/studio')}
				style:--tint={tint('og')}
				{@attach reveal(100)}
			>
				<div class="ensemble" aria-hidden="true">
					{#each lineup as c (c.species)}
						<div class="member" class:lead={c.species === 'bob'}>
							<Mascot
								species={c.species}
								mood={c.mood}
								theme={c.theme}
								eyes={c.eyes}
								accessories={[...c.accessories]}
								proportions={c.proportions}
								outfit={c.outfit}
								shoes={c.shoes}
								size="100%"
								lookAt="none"
								interactive={false}
								label=""
							/>
						</div>
					{/each}
				</div>
				<div class="teaser-copy">
					<ol>
						{#each studioSteps as [title, text] (title)}
							<li><strong>{title}</strong> {text}</li>
						{/each}
					</ol>
					<span class="btn-primary">Open the studio →</span>
				</div>
			</a>
		</section>

		<section id="features" class="section">
			<div class="section-head" {@attach reveal()}>
				<h2>Small component. Big personality.</h2>
				<p>One Svelte component, drawn in pure SVG. Everything on this page is a prop away.</p>
			</div>

			<div class="showcase">
				<article class="feature" style:--tint={tint('og')} {@attach reveal()}>
					<div class="art">
						<Mascot mood={cycled} size="min(170px, 40vw)" interactive={false} label="" />
					</div>
					<div class="text">
						<h3>Moods that morph</h3>
						<p>
							{MOODS.length} moods. Eyes, lids, mouth and posture tween into each other, so a switch is
							a smooth morph instead of a cut.
						</p>
						<span class="tag" aria-live="polite">mood="{cycled}"</span>
					</div>
				</article>

				<article class="feature" style:--tint={tint('ice')} {@attach reveal(80)}>
					<div class="art">
						<Mascot
							theme="ice"
							shape="orb"
							eyes="pill"
							size="min(170px, 40vw)"
							lookAt="pointer"
							label="mascot following your cursor"
						/>
					</div>
					<div class="text">
						<h3>Alive by default</h3>
						<p>
							It blinks, breathes and floats, tracks the cursor with little saccades and squishes
							when you boop it.
						</p>
						<span class="tag">Move your mouse</span>
					</div>
				</article>

				<article class="feature" style:--tint={tint(swatch)} {@attach reveal(160)}>
					<div class="art">
						<Mascot
							theme={swatch}
							shape="ghost"
							accessories={['halo']}
							mood="happy"
							size="min(170px, 40vw)"
							interactive={false}
							label="{swatch} mascot"
						/>
					</div>
					<div class="text">
						<h3>Colorways for every brand</h3>
						<p>
							{themeNames.length} presets, per-color overrides, or plain <code>--mascbob-*</code> CSS
							variables.
						</p>
						<div class="swatches" role="group" aria-label="Try a colorway">
							{#each themeNames as name (name)}
								<button
									class:active={swatch === name}
									style:--c={THEMES[name].accent}
									style:--b={THEMES[name].bodyMid}
									aria-label="{name} colorway"
									aria-pressed={swatch === name}
									title={name}
									onpointerenter={() => (swatch = name)}
									onclick={() => (swatch = name)}
								></button>
							{/each}
						</div>
					</div>
				</article>
			</div>

			<div class="more" {@attach reveal()}>
				{#each more as f (f.title)}
					<div>
						<h3>{f.title}</h3>
						<p>
							{#each f.text.split('`') as part, j (j)}{#if j % 2}<code>{part}</code
									>{:else}{part}{/if}{/each}
						</p>
					</div>
				{/each}
			</div>
		</section>

		<section id="talk" {@attach reveal()}>
			<TalkDemo />
		</section>

		<Galleries />

		<section id="usage" class="usage" {@attach reveal()}>
			<div class="usage-copy">
				<h2>Three lines to a new friend.</h2>
				<p>
					Install the package, drop in the component and let it react to your app. Types included,
					nothing to configure.
				</p>
				<div class="usage-actions">
					<a class="btn-primary" href={resolve('/docs')}>Read the docs</a>
					<a class="btn-ghost" href={resolve('/studio')}>Design one in the studio</a>
				</div>
			</div>
			<div class="window">
				<div class="window-bar">
					<em>App.svelte</em>
					<button class="copy" class:done={copied} onclick={copyUsage}
						>{copied ? 'Copied' : 'Copy'}</button
					>
				</div>
				<Code lines={usage} />
			</div>
		</section>
	</main>

	<SiteFooter />
</div>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem 6rem;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: clamp(6rem, 12vw, 10rem);
	}

	.studio-teaser {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
		align-items: center;
		gap: 2rem;
		padding: 2.5rem 3rem;
		border-radius: 32px;
		background: var(--tint);
		color: var(--text-1);
		text-decoration: none;
		transition: transform 0.35s var(--spring);
	}
	.studio-teaser:hover {
		transform: translateY(-3px);
	}
	.studio-teaser:hover .btn-primary {
		background: var(--ink-hover);
	}
	/* Every species stands on one floor line, bob a size up in the middle. */
	.ensemble {
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.member {
		flex: 0 1 15%;
		margin-inline: -1.2%;
	}
	.member.lead {
		flex-basis: 24%;
		z-index: 1;
	}
	.teaser-copy {
		display: grid;
		justify-items: start;
		gap: 1.75rem;
	}
	.teaser-copy ol {
		display: grid;
		gap: 0.9rem;
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}
	.teaser-copy li {
		display: grid;
		grid-template-columns: 1.9rem minmax(0, 1fr);
		column-gap: 0.75rem;
		color: var(--text-2);
		line-height: 1.45;
		counter-increment: step;
	}
	.teaser-copy li::before {
		content: counter(step);
		grid-row: span 2;
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--raised) 80%, transparent);
		color: var(--text-1);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.teaser-copy li strong {
		color: var(--text-1);
	}

	.showcase {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.feature {
		display: grid;
		grid-template-rows: 1fr auto;
		min-height: 480px;
		border-radius: 32px;
		background: var(--tint);
		overflow: hidden;
		transition: background 0.5s;
	}
	.art {
		display: grid;
		place-items: center;
		padding: 2rem 1rem 0;
	}
	.text {
		padding: 0 1.75rem 1.75rem;
	}
	.feature h3 {
		margin: 0;
		font-size: 1.45rem;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}
	.feature p {
		margin: 0.45rem 0 0;
		color: var(--text-2);
		line-height: 1.5;
	}
	.feature :not(pre) > code {
		background: color-mix(in srgb, var(--raised) 70%, transparent);
		white-space: nowrap;
	}
	.tag {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--raised) 75%, transparent);
		font-family: var(--mono);
		font-size: 0.78rem;
		color: var(--text-2);
	}
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 1rem;
	}
	.swatches button {
		width: 1.9rem;
		height: 1.9rem;
		padding: 0;
		border: 3px solid var(--raised);
		border-radius: 50%;
		background: linear-gradient(135deg, var(--b) 50%, var(--c) 50%);
		cursor: pointer;
		transition: transform 0.2s var(--spring);
	}
	.swatches button:hover {
		transform: scale(1.12);
	}
	.swatches button.active {
		box-shadow: 0 0 0 2px var(--text-1);
	}

	.more {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
		padding-top: 1rem;
	}
	.more h3 {
		margin: 0;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
	}
	.more p {
		margin: 0.35rem 0 0;
		color: var(--text-2);
	}

	.usage {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		gap: 3rem;
		align-items: center;
	}
	.usage h2 {
		margin: 0;
		font-size: clamp(2.2rem, 4.6vw, 3.6rem);
		line-height: 1.02;
		letter-spacing: -0.045em;
	}
	.usage-copy p {
		margin: 1rem 0 1.75rem;
		color: var(--text-2);
		font-size: 1.08rem;
		max-width: 26rem;
	}
	.usage-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.window {
		border-radius: 24px;
		background: var(--slab);
		box-shadow: inset 0 0 0 1px var(--slab-line);
		padding: 0.35rem;
	}
	/* The window already draws the outline; a second one on the inner block reads as a double border. */
	.window :global(pre) {
		box-shadow: none;
	}
	.window-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.55rem 0.6rem 0.4rem 0.9rem;
	}
	.window-bar em {
		font-style: normal;
		font-size: 0.8rem;
		color: #a3a3a3;
		font-family: var(--mono);
	}
	.copy {
		padding: 0.32rem 0.8rem;
		border-radius: 999px;
		border: 0;
		background: rgb(255 255 255 / 0.1);
		color: #eaeaea;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.15s;
	}
	.copy:hover {
		background: rgb(255 255 255 / 0.18);
	}
	.copy:active {
		transform: scale(0.94);
	}
	.copy.done {
		background: #fff;
		color: #161616;
	}

	@media (max-width: 960px) {
		.showcase {
			grid-template-columns: minmax(0, 1fr);
		}
		.feature {
			min-height: 0;
			grid-template-columns: 1fr 1fr;
			grid-template-rows: none;
			align-items: center;
		}
		.art {
			padding: 1.5rem;
		}
		.text {
			padding: 1.5rem 1.5rem 1.5rem 0;
		}
		/* minmax(0, …) so a long code line scrolls inside its block instead of widening the page. */
		.more,
		.usage {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 900px) {
		.studio-teaser {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.75rem;
			padding: 1.75rem 1.25rem 1.5rem;
		}
		.teaser-copy .btn-primary {
			justify-self: stretch;
			text-align: center;
		}
	}
	@media (max-width: 640px) {
		.feature {
			grid-template-columns: minmax(0, 1fr);
		}
		.text {
			padding: 0 1.5rem 1.5rem;
		}
	}
</style>

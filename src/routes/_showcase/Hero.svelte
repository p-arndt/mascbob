<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		MOODS,
		Mascot,
		OUTFITS,
		SHAPES,
		THEMES,
		type Mood,
		type Outfit,
		type Shape,
		type ThemeName
	} from '$lib/index.js';
	import { showInTab } from './favicon.svelte.js';
	import { copyText, pick } from './interactions.js';

	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');
	const themeNames = Object.keys(THEMES) as ThemeName[];

	/**
	 * The headline is the mascot's current mood, said the way a person would say it. Partial, so a
	 * mood added to the library shows up under its own name instead of breaking the build.
	 */
	const WORDS: Partial<Record<Mood, string>> = {
		idle: 'chill',
		happy: 'happy',
		listening: 'curious',
		thinking: 'hmm',
		talking: 'chatty',
		surprised: 'whoa',
		sleepy: 'sleepy',
		sad: 'blue',
		love: 'smitten',
		wink: 'cheeky',
		grumpy: 'grumpy',
		shy: 'shy',
		waving: 'hiya'
	};

	// Autoplay walks through hand-picked pairs so every step changes both the face and the colorway.
	const TOUR: [Mood, ThemeName][] = (
		[
			['happy', 'og'],
			['love', 'lilac'],
			['surprised', 'ice'],
			['thinking', 'noir'],
			['wink', 'volt'],
			['sleepy', 'mocha'],
			['grumpy', 'bred'],
			['waving', 'og']
		] satisfies [Mood, ThemeName][]
	).filter(([m, t]) => MOODS.includes(m) && themeNames.includes(t));

	let mood = $state<Mood>('happy');
	let theme = $state<ThemeName>('og');
	let shape = $state<Shape>('capsule');
	let outfit = $state<Outfit>('none');
	let copied = $state(false);
	let bubble = $state<string | null>(null);

	const accent = $derived(THEMES[theme].accent);

	$effect(() => showInTab({ mood, theme, shape }, 'hero'));
	const word = $derived(WORDS[mood] ?? mood);

	type Prop = 'mood' | 'theme' | 'shape' | 'outfit';
	const OPTIONS: Record<Prop, readonly string[]> = {
		mood: MOODS,
		theme: themeNames,
		shape: SHAPES,
		outfit: OUTFITS
	};
	const PROPS = Object.keys(OPTIONS) as Prop[];
	const values = $derived<Record<Prop, string>>({ mood, theme, shape, outfit });
	const code = $derived(
		`<Mascot mood="${mood}" theme="${theme}" shape="${shape}" outfit="${outfit}" />`
	);

	let touchedAt = 0;
	function touch() {
		touchedAt = Date.now();
	}

	function cycle(prop: Prop) {
		touch();
		const list = OPTIONS[prop];
		const next = list[(list.indexOf(values[prop]) + 1) % list.length];
		if (prop === 'mood') mood = next as Mood;
		else if (prop === 'theme') theme = next as ThemeName;
		else if (prop === 'shape') shape = next as Shape;
		else outfit = next as Outfit;
	}

	const BOOP_LINES = ['Hehe!', 'Boop!', 'Again!', 'That tickles.', '*beep*'];
	let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
	const BOOP_SKIPS: Mood[] = ['talking', 'grumpy', 'sad'];
	function boop() {
		touch();
		// Sulking is the tickle reaction's answer to too many boops; a random pick would muddle it.
		mood = pick(MOODS.filter((m) => m !== mood && !BOOP_SKIPS.includes(m)));
		bubble = pick(BOOP_LINES);
		clearTimeout(bubbleTimer);
		bubbleTimer = setTimeout(() => (bubble = null), 1400);
	}

	onMount(() => {
		if (reduced.current) return;
		let step = 0;
		const id = setInterval(() => {
			// Whoever is playing with it keeps control; autoplay resumes only after a quiet spell.
			if (Date.now() - touchedAt < 9000) return;
			step = (step + 1) % TOUR.length;
			[mood, theme] = TOUR[step];
		}, 2600);
		return () => {
			clearInterval(id);
			clearTimeout(bubbleTimer);
		};
	});

	async function copyCode() {
		touch();
		copied = await copyText(code);
		setTimeout(() => (copied = false), 1400);
	}

	let installCopied = $state(false);
	async function copyInstall() {
		installCopied = await copyText('pnpm add mascbob');
		setTimeout(() => (installCopied = false), 1400);
	}

	const d = (ms: number) => (reduced.current ? 0 : ms);
</script>

<header class="hero" style:--accent={accent}>
	<div class="copy">
		<p class="word" aria-hidden="true">
			{#key word}
				<span class="letters">
					{#each word as letter, i (i)}
						<span in:fly={{ y: 40, duration: d(420), delay: d(i * 28), easing: cubicOut }}
							>{letter}</span
						>
					{/each}<span class="dot">.</span>
				</span>
			{/key}
		</p>
		<h1>Give your app a little friend.</h1>
		<p class="lead">
			An animated SVG character for Svelte 5. It blinks, follows your cursor, reacts to boops and
			lip-syncs to your voice.
		</p>
		<div class="actions">
			<a class="btn-primary" href={resolve('/studio')}>Open the studio</a>
			<button class="install" onclick={copyInstall} aria-label="Copy install command">
				<code>pnpm add mascbob</code>
				<span>{installCopied ? 'Copied' : 'Copy'}</span>
			</button>
		</div>
	</div>

	<div class="stage">
		<div class="disc" aria-hidden="true"></div>
		<div class="figure">
			{#if bubble}
				<div
					class="bubble"
					role="status"
					in:scale={{ duration: d(300), start: 0.6, easing: backOut }}
					out:fly={{ duration: d(160), y: -6 }}
				>
					{bubble}
				</div>
			{/if}
			<Mascot
				{mood}
				{theme}
				{shape}
				{outfit}
				body
				shoes="sneakers"
				size="clamp(170px, 22vw, 320px)"
				label="mascbob, boop me"
				onboop={boop}
			/>
		</div>

		<!-- The hang tag doubles as the API: every value is a button that cycles that prop. -->
		<div class="tag" role="group" aria-label="Try the props">
			<code>
				<span><span class="t-p">&lt;</span><span class="t-tag">Mascot</span></span>
				{#each PROPS as prop (prop)}
					<span
						><span class="t-attr">{prop}</span><span class="t-p">=</span><button
							class="val"
							onclick={() => cycle(prop)}
							aria-label="{prop}: {values[prop]}, next">"{values[prop]}"</button
						></span
					>
				{/each}
				<span class="t-p">/&gt;</span>
			</code>
			<div class="tag-foot">
				<span>Click a value to change it</span>
				<button class="copy-code" class:done={copied} onclick={copyCode}
					>{copied ? 'Copied' : 'Copy'}</button
				>
			</div>
		</div>
	</div>
</header>

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: 2rem;
		max-width: 1200px;
		min-height: min(calc(100svh - 4rem), 860px);
		margin: 0 auto;
		padding: 1rem 1.5rem 3rem;
	}

	.copy {
		/* Lets the mood word size itself to the column, whatever word it currently is. */
		container-type: inline-size;
		animation: rise 0.8s var(--out) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	.word {
		display: grid;
		margin: 0 0 0 -0.04em;
		font-size: min(28cqi, 12.5rem);
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.065em;
		white-space: nowrap;
	}
	/* Every word shares one grid cell, so a new word replaces the old one without the page jumping. */
	.letters {
		grid-area: 1 / 1;
	}
	.letters > span {
		display: inline-block;
	}
	.dot {
		color: var(--accent);
		transition: color 0.6s;
	}
	h1 {
		margin: 1.5rem 0 0;
		font-size: clamp(1.5rem, 2.4vw, 2rem);
		line-height: 1.15;
		letter-spacing: -0.035em;
	}
	.lead {
		margin: 0.6rem 0 0;
		max-width: 28rem;
		font-size: 1.05rem;
		line-height: 1.5;
		color: var(--text-2);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1.75rem;
	}
	.install {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.4rem 0.4rem 0.4rem 1.1rem;
		border: 0;
		border-radius: 999px;
		background: var(--surface);
		color: var(--text-1);
		font: inherit;
		cursor: pointer;
		transition: transform 0.2s var(--spring);
	}
	.install:active {
		transform: scale(0.96);
	}
	.install code {
		padding: 0;
		background: none;
		font-size: 0.9rem;
	}
	.install span {
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		background: var(--raised);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.stage {
		position: relative;
		display: grid;
		justify-items: center;
		align-items: end;
		min-height: 640px;
		animation: rise 0.9s 0.1s var(--out) both;
	}
	/* A flat disc in the colorway: the mascot's own spotlight, recolored with every theme. */
	.disc {
		position: absolute;
		top: 2%;
		left: 50%;
		width: min(540px, 100%);
		aspect-ratio: 1;
		translate: -50% 0;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent) 16%, var(--bg));
		transition: background 0.6s;
	}
	.figure {
		position: relative;
		z-index: 1;
		margin-bottom: 7rem;
	}
	.bubble {
		position: absolute;
		z-index: 2;
		top: 2%;
		left: 70%;
		width: max-content;
		padding: 0.5rem 0.85rem;
		border-radius: 16px 16px 16px 4px;
		background: var(--text-1);
		color: var(--on-ink);
		font-weight: 600;
		font-size: 0.92rem;
		transform-origin: 0 100%;
	}

	/* Code sits on a dark slab in both schemes, so its colors are fixed rather than tokens. */
	.tag {
		position: absolute;
		z-index: 2;
		left: 50%;
		bottom: 0;
		translate: -50% 0;
		width: min(100%, 28rem);
		padding: 0.9rem 1rem 0.6rem;
		border-radius: 20px;
		background: var(--slab);
		box-shadow:
			inset 0 0 0 1px var(--slab-line),
			0 20px 40px -24px rgb(0 0 0 / 0.5);
		color: #eaeaea;
	}
	/* Flex rather than inline text, so attributes wrap as whole units and never split at the "=". */
	.tag code {
		display: flex;
		flex-wrap: wrap;
		column-gap: 0.6em;
		padding: 0;
		background: none;
		color: inherit;
		font-family: var(--mono);
		font-size: 0.86rem;
		line-height: 1.8;
	}
	.val {
		padding: 0.05rem 0.3rem;
		margin: 0 -0.1rem;
		border: 0;
		border-radius: 6px;
		background: rgb(255 255 255 / 0.08);
		color: #b9e58c;
		font: inherit;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.15s var(--spring);
	}
	.val:hover {
		background: rgb(255 255 255 / 0.18);
	}
	.val:active {
		transform: scale(0.94);
	}
	.tag-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgb(255 255 255 / 0.08);
		font-size: 0.8rem;
		color: #a3a19c;
	}
	.copy-code {
		padding: 0.3rem 0.8rem;
		border: 0;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.1);
		color: #eaeaea;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.copy-code:hover {
		background: rgb(255 255 255 / 0.18);
	}
	.copy-code.done {
		background: #fff;
		color: #161616;
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
			min-height: 0;
			padding-top: 0.5rem;
		}
		/*
		 * The headline is the mascot's mood, so the mascot has to come first or the word reads as
		 * noise. The stage dissolves so the figure can lead and the hang tag can trail the copy.
		 */
		.stage {
			display: contents;
		}
		.disc {
			display: none;
		}
		.figure {
			order: -1;
			justify-self: center;
			margin: 0 0 1.5rem;
			padding-top: 1rem;
		}
		.figure::before {
			content: '';
			position: absolute;
			z-index: -1;
			top: 0;
			left: 50%;
			width: min(300px, 80vw);
			aspect-ratio: 1;
			translate: -50% 0;
			border-radius: 50%;
			background: color-mix(in srgb, var(--accent) 16%, var(--bg));
			transition: background 0.6s;
		}
		.tag {
			order: 1;
			position: static;
			translate: none;
			justify-self: center;
			box-sizing: border-box;
			margin-top: 2.5rem;
		}
		/* Under the figure, a column-wide word would dwarf the mascot it describes. */
		.word {
			font-size: min(28cqi, 7rem);
		}
	}
	@media (max-width: 640px) {
		h1 {
			margin-top: 1rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.copy,
		.stage {
			animation: none;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		MOODS,
		Mascot,
		type Accessory,
		type EyeStyle,
		type Mood,
		type Outfit,
		type Shape,
		type Shoes,
		type ThemeName
	} from '$lib/index.js';
	import { copyText, pick } from './interactions.js';

	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');

	type Member = {
		theme: ThemeName;
		shape: Shape;
		mood: Mood;
		eyes?: EyeStyle;
		accessories?: Accessory[];
		outfit?: Outfit;
		shoes?: Shoes;
		/** Hidden on narrow screens, where only the middle of the line-up fits. */
		edge?: boolean;
	};

	// A group photo: everyone full body on one floor line, the default mascot in the middle.
	const CAST: Member[] = [
		{
			theme: 'volt',
			shape: 'pebble',
			mood: 'wink',
			eyes: 'dot',
			accessories: ['antenna'],
			edge: true
		},
		{ theme: 'lilac', shape: 'ghost', mood: 'love', accessories: ['halo'], outfit: 'bowtie' },
		{ theme: 'og', shape: 'capsule', mood: 'happy', outfit: 'puffer', shoes: 'sneakers' },
		{
			theme: 'ice',
			shape: 'bean',
			mood: 'idle',
			eyes: 'pill',
			outfit: 'hoodie',
			shoes: 'hightops'
		},
		{
			theme: 'noir',
			shape: 'squircle',
			mood: 'thinking',
			eyes: 'wide',
			accessories: ['headphones'],
			shoes: 'boots',
			edge: true
		}
	];

	type Reaction = { mood: Mood; label: string; ms: number; say?: string };
	const REACTIONS = (
		[
			{ mood: 'waving', label: 'Say hi', ms: 2200, say: 'Hey there!' },
			{ mood: 'love', label: 'Love', ms: 2200, say: 'Aww.' },
			{ mood: 'surprised', label: 'Surprise', ms: 1600, say: 'Whoa!' },
			{ mood: 'thinking', label: 'Think', ms: 2600, say: 'Hmm…' },
			{ mood: 'talking', label: 'Talk', ms: 5400, say: 'Blah blah blah…' },
			{ mood: 'sleepy', label: 'Nap', ms: 3600 },
			{ mood: 'grumpy', label: 'Grumpy', ms: 1800, say: 'Hmph.' }
		] satisfies Reaction[]
	).filter((r) => (MOODS as readonly string[]).includes(r.mood));
	const BOOP_LINES = ['Hehe!', 'Boop received.', 'Again!', 'That tickles.', '*happy beeps*'];

	let moods = $state<Mood[]>(CAST.map((m) => m.mood));
	let active = $state<Mood | null>(null);
	let bubble = $state<{ at: number; text: string } | null>(null);
	let copied = $state(false);

	let timers: ReturnType<typeof setTimeout>[] = [];
	function clearTimers() {
		timers.forEach(clearTimeout);
		timers = [];
	}
	function later(ms: number, fn: () => void) {
		timers.push(setTimeout(fn, ms));
	}

	function react(r: Reaction) {
		clearTimers();
		active = r.mood;
		bubble = r.say ? { at: 2, text: r.say } : null;
		// A short ripple across the cast reads as a crowd reacting, not a single switch flipping.
		CAST.forEach((_, i) => later(d(i * 70), () => (moods[i] = r.mood)));
		later(r.ms, () => {
			active = null;
			bubble = null;
			CAST.forEach((m, i) => (moods[i] = m.mood));
		});
	}

	function boop(i: number) {
		if (active) return;
		clearTimers();
		bubble = { at: i, text: pick(BOOP_LINES) };
		later(1600, () => (bubble = null));
	}

	// Number keys fire the reactions in button order.
	function onkeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable]')) return;
		const r = REACTIONS[Number(e.key) - 1];
		if (r && scrollY < innerHeight) react(r);
	}

	onMount(() => {
		later(600, () => (bubble = { at: 2, text: 'Oh, hi!' }));
		later(2600, () => (bubble = null));
		return clearTimers;
	});

	async function copyInstall() {
		copied = await copyText('pnpm add mascott');
		setTimeout(() => (copied = false), 1400);
	}

	const d = (ms: number) => (reduced.current ? 0 : ms);
</script>

<svelte:window {onkeydown} />

<header class="hero">
	<div class="copy">
		<h1>Give your app<br />a little friend.</h1>
		<p class="lead">
			mascott is an animated SVG character for Svelte 5. It blinks, follows your cursor, reacts to
			boops and lip-syncs to your voice.
		</p>
		<div class="actions">
			<a class="btn-primary" href="#playground">Open the studio</a>
			<button class="install" onclick={copyInstall} aria-label="Copy install command">
				<code>pnpm add mascott</code>
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
					{#if copied}
						<path
							d="M5 12.5l4.5 4.5L19 7.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					{:else}
						<rect
							x="8"
							y="8"
							width="12"
							height="12"
							rx="3"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						/>
						<path
							d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
						/>
					{/if}
				</svg>
			</button>
		</div>
	</div>

	<div class="cast">
		{#each CAST as m, i (i)}
			<div class="member" class:edge={m.edge} style:--i={i}>
				{#if bubble?.at === i}
					<div
						class="bubble"
						role="status"
						in:scale={{ duration: d(320), start: 0.6, easing: backOut }}
						out:fly={{ duration: d(160), y: -6 }}
					>
						{bubble.text}
					</div>
				{/if}
				<Mascot
					mood={moods[i]}
					theme={m.theme}
					shape={m.shape}
					eyes={m.eyes}
					accessories={m.accessories}
					body
					outfit={m.outfit}
					shoes={m.shoes}
					size="clamp(72px, 8vw, 104px)"
					label="{m.theme} mascot, boop me"
					onboop={() => boop(i)}
				/>
			</div>
		{/each}
	</div>

	<div class="reactions" role="group" aria-label="Make them react">
		{#each REACTIONS as r, i (r.label)}
			<button
				class="chip"
				class:active={active === r.mood}
				aria-keyshortcuts={String(i + 1)}
				title="Press {i + 1}"
				onclick={() => react(r)}
			>
				{r.label}
			</button>
		{/each}
	</div>
</header>

<style>
	.hero {
		display: grid;
		justify-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 6rem) 1.5rem 2rem;
		text-align: center;
	}
	.copy {
		display: grid;
		justify-items: center;
		max-width: 40rem;
		animation: rise 0.8s var(--out) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	h1 {
		margin: 0;
		font-size: clamp(2.6rem, 6vw, 4.8rem);
		line-height: 1;
		letter-spacing: -0.05em;
	}
	.lead {
		margin: 1.25rem 0 0;
		max-width: 29rem;
		font-size: clamp(1.02rem, 1.4vw, 1.15rem);
		line-height: 1.5;
		color: var(--text-2);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.6rem;
		margin-top: 1.75rem;
	}
	.install {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.85rem 1.2rem;
		border: 0;
		border-radius: 999px;
		background: var(--surface);
		color: var(--text-1);
		font: inherit;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.2s var(--spring);
	}
	.install:hover {
		background: var(--surface-2);
	}
	.install:active {
		transform: scale(0.96);
	}
	.install code {
		padding: 0;
		background: none;
		font-size: 0.9rem;
	}
	.install svg {
		color: var(--text-2);
	}

	/* One shared floor line, so the cast reads as a group photo rather than scattered stickers. */
	.cast {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: clamp(0.5rem, 2.5vw, 2rem);
		margin-top: clamp(3rem, 6vw, 4.5rem);
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--line);
		width: min(100%, 44rem);
	}
	.member {
		position: relative;
		animation: pop-in 0.8s calc(0.2s + var(--i) * 70ms) var(--spring) both;
	}
	@keyframes pop-in {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.9);
		}
	}
	.bubble {
		position: absolute;
		z-index: 2;
		bottom: 96%;
		left: 60%;
		width: max-content;
		max-width: 11rem;
		padding: 0.5rem 0.85rem;
		border-radius: 16px 16px 16px 4px;
		background: var(--text-1);
		color: var(--on-ink);
		font-weight: 600;
		font-size: 0.88rem;
		line-height: 1.3;
		transform-origin: 0 100%;
	}
	.reactions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35rem;
		margin-top: 1.25rem;
	}

	@media (max-width: 560px) {
		.member.edge {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.copy,
		.member {
			animation: none;
		}
	}
</style>

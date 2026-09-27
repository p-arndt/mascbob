<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { MediaQuery } from 'svelte/reactivity';
	import { MOODS, Mascot, type Mood } from '$lib/index.js';
	import { copyText, pick } from './interactions.js';

	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');

	let mood = $state<Mood>('idle');
	let bubble = $state<string | null>(null);
	let copied = $state(false);

	const TALK_LINES = [
		'Hi, I’m mascott!',
		'I blink, float and follow your cursor.',
		'Feed me audio and I lip-sync.',
		'Six themes. Infinite vibes.',
		'Boop me, I dare you.'
	];
	const BOOP_LINES = ['Hehe!', 'Boop received.', 'Again!', 'That tickles.', '*happy beeps*'];

	type Reaction = { mood: Mood; label: string; ms: number; say?: string };
	const REACTIONS = (
		[
			{ mood: 'happy', label: 'Say hi', ms: 2000, say: 'Hey there!' },
			{ mood: 'love', label: 'Love', ms: 2200, say: 'Aww.' },
			{ mood: 'surprised', label: 'Surprise', ms: 1600, say: 'Whoa!' },
			{ mood: 'thinking', label: 'Think', ms: 2600, say: 'Hmm…' },
			{ mood: 'talking', label: 'Talk', ms: 9000 },
			{ mood: 'sleepy', label: 'Nap', ms: 3600 },
			{ mood: 'grumpy', label: 'Grumpy', ms: 1800, say: 'Hmph.' }
		] satisfies Reaction[]
	).filter((r) => (MOODS as readonly string[]).includes(r.mood));

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
		clearTimeout(boopTimer);
		mood = r.mood;
		bubble = r.say ?? null;
		later(r.ms, () => {
			mood = 'idle';
			bubble = null;
		});
	}

	// Rotate through short lines while it talks so the lip movement has something to "say".
	$effect(() => {
		if (mood !== 'talking') return;
		let line = 0;
		bubble = TALK_LINES[line];
		const id = setInterval(() => {
			line = (line + 1) % TALK_LINES.length;
			bubble = TALK_LINES[line];
		}, 1800);
		return () => clearInterval(id);
	});

	let boopTimer: ReturnType<typeof setTimeout> | undefined;
	function boop() {
		// Reactions own the bubble while they run; a boop only chimes in when it is idle.
		if (mood !== 'idle') return;
		clearTimeout(boopTimer);
		bubble = pick(BOOP_LINES);
		boopTimer = setTimeout(() => (bubble = null), 1600);
	}

	onMount(() => {
		// A short greeting makes the first impression feel alive rather than static.
		later(500, () => {
			mood = 'wink';
			bubble = 'Oh, hi!';
		});
		later(1700, () => (mood = 'happy'));
		later(3200, () => {
			mood = 'idle';
			bubble = null;
		});
		return () => {
			clearTimers();
			clearTimeout(boopTimer);
		};
	});

	async function copyInstall() {
		copied = await copyText('pnpm add mascott');
		setTimeout(() => (copied = false), 1400);
	}

	const d = (ms: number) => (reduced.current ? 0 : ms);
</script>

<header class="hero">
	<div class="copy">
		<a class="eyebrow" href="#talk">
			<span class="dot"></span>
			New: full-body mode and voice lip-sync
			<span class="arrow" aria-hidden="true">→</span>
		</a>
		<h1>
			A companion<br />with <span class="grad">personality</span>.
		</h1>
		<p class="lead">
			<strong>mascott</strong> is an animated, endlessly customizable SVG mascot for Svelte 5. It blinks,
			breathes, follows your cursor, reacts to boops and talks along with your voice.
		</p>
		<div class="actions">
			<button class="install" onclick={copyInstall} aria-label="Copy install command">
				<span class="prompt" aria-hidden="true">$</span>
				<code>pnpm add mascott</code>
				<span class="copy-state" class:done={copied}>{copied ? 'Copied' : 'Copy'}</span>
			</button>
			<a class="btn-primary" href="#playground">Open playground</a>
		</div>
		<div class="reactions" role="group" aria-label="Make it react">
			<span class="reactions-label">Make it react</span>
			{#each REACTIONS as r (r.label)}
				<button class="chip" class:active={mood === r.mood} onclick={() => react(r)}>
					{r.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="stage">
		<div class="orbit o1" aria-hidden="true"></div>
		<div class="orbit o2" aria-hidden="true"></div>
		<div class="halo" aria-hidden="true"></div>
		<div class="figure">
			{#if bubble}
				<div
					class="bubble"
					role="status"
					in:scale={{ duration: d(320), start: 0.6, easing: backOut }}
					out:fly={{ duration: d(180), y: -6 }}
				>
					{#key bubble}
						<span in:fly={{ duration: d(240), y: 6 }}>{bubble}</span>
					{/key}
				</div>
			{/if}
			<Mascot
				{mood}
				body
				accessories={['ring']}
				size="min(330px, 58vw)"
				label="mascott, boop me"
				onboop={boop}
			/>
		</div>
		<div class="floor" aria-hidden="true"></div>
	</div>
</header>

<style>
	.hero {
		position: relative;
		max-width: 1200px;
		margin: 0 auto;
		padding: clamp(2rem, 6vw, 5rem) 1.5rem 2rem;
		display: grid;
		grid-template-columns: 1.05fr 1fr;
		align-items: center;
		gap: 2rem;
	}
	.copy > * {
		animation: rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.copy > :nth-child(2) {
		animation-delay: 80ms;
	}
	.copy > :nth-child(3) {
		animation-delay: 160ms;
	}
	.copy > :nth-child(4) {
		animation-delay: 240ms;
	}
	.copy > :nth-child(5) {
		animation-delay: 320ms;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(18px);
			filter: blur(6px);
		}
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.4rem 0.85rem 0.4rem 0.6rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.05);
		border: 1px solid rgb(255 255 255 / 0.1);
		color: var(--text-2);
		font-size: 0.82rem;
		text-decoration: none;
		transition:
			background 0.2s,
			border-color 0.2s;
	}
	.eyebrow:hover {
		background: rgb(255 255 255 / 0.09);
		border-color: rgb(255 255 255 / 0.18);
	}
	.eyebrow .dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: #7cf3ff;
		box-shadow: 0 0 0 3px rgb(124 243 255 / 0.18);
		animation: pulse 2.4s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			box-shadow: 0 0 0 6px rgb(124 243 255 / 0.05);
		}
	}
	.eyebrow .arrow {
		transition: transform 0.2s;
	}
	.eyebrow:hover .arrow {
		transform: translateX(3px);
	}

	h1 {
		font-size: clamp(2.7rem, 6.4vw, 5.2rem);
		line-height: 0.98;
		letter-spacing: -0.045em;
		font-weight: 700;
		margin: 1.4rem 0 1.2rem;
		color: #fff;
	}
	.grad {
		background: linear-gradient(100deg, #a5f3fc 0%, #c4b5fd 40%, #f9a8d4 80%);
		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		animation: shimmer 8s ease-in-out infinite alternate;
	}
	@keyframes shimmer {
		to {
			background-position: 100% 0;
		}
	}
	.lead {
		font-size: clamp(1.05rem, 1.4vw, 1.2rem);
		line-height: 1.6;
		color: var(--text-2);
		max-width: 33rem;
		margin: 0;
	}
	.lead strong {
		color: var(--text-1);
		font-weight: 600;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin: 2rem 0 1.75rem;
	}
	.install {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.45rem 0.45rem 0.45rem 1rem;
		border-radius: 14px;
		border: 1px solid rgb(255 255 255 / 0.12);
		background: rgb(10 10 30 / 0.55);
		color: var(--text-1);
		font: inherit;
		cursor: pointer;
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);
		transition:
			border-color 0.2s,
			transform 0.15s;
	}
	.install:hover {
		border-color: rgb(255 255 255 / 0.24);
	}
	.install:active {
		transform: scale(0.98);
	}
	.install code {
		font-family: var(--mono);
		font-size: 0.92rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--text-1);
	}
	.prompt {
		color: var(--text-3);
		font-family: var(--mono);
	}
	.copy-state {
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.4rem 0.7rem;
		border-radius: 9px;
		background: rgb(255 255 255 / 0.08);
		color: var(--text-2);
		min-width: 3.6rem;
		transition:
			background 0.2s,
			color 0.2s;
	}
	.copy-state.done {
		background: #7cf3ff;
		color: #0b1030;
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.reactions-label {
		width: 100%;
		margin-bottom: 0.2rem;
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-3);
	}

	.stage {
		position: relative;
		display: grid;
		place-items: center;
		min-height: clamp(420px, 44vw, 600px);
		animation: rise 1.1s 0.15s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.figure {
		position: relative;
		z-index: 1;
	}
	.halo {
		position: absolute;
		width: min(520px, 90vw);
		aspect-ratio: 1;
		border-radius: 50%;
		background:
			radial-gradient(circle at 50% 45%, rgb(182 156 255 / 0.45), transparent 58%),
			radial-gradient(circle at 60% 60%, rgb(124 243 255 / 0.25), transparent 60%);
	}
	.orbit {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgb(255 255 255 / 0.07);
		aspect-ratio: 1;
	}
	.orbit::after {
		content: '';
		position: absolute;
		top: 50%;
		left: -3px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #c4b5fd;
		box-shadow: 0 0 12px #c4b5fd;
	}
	.o1 {
		width: min(440px, 80vw);
		animation: spin 28s linear infinite;
	}
	.o2 {
		width: min(580px, 100vw);
		border-style: dashed;
		border-color: rgb(255 255 255 / 0.05);
		animation: spin 46s linear infinite reverse;
	}
	.o2::after {
		background: #7cf3ff;
		box-shadow: 0 0 12px #7cf3ff;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.floor {
		position: absolute;
		bottom: 6%;
		width: min(300px, 60vw);
		height: 40px;
		border-radius: 50%;
		background: radial-gradient(closest-side, rgb(182 156 255 / 0.25), transparent);
	}

	.bubble {
		position: absolute;
		z-index: 2;
		top: 2%;
		left: 64%;
		width: max-content;
		max-width: 15rem;
		padding: 0.65rem 0.95rem;
		border-radius: 18px 18px 18px 6px;
		background: rgb(255 255 255 / 0.92);
		color: #17173a;
		font-weight: 600;
		font-size: 0.95rem;
		line-height: 1.35;
		box-shadow:
			0 10px 30px -8px rgb(0 0 0 / 0.5),
			0 0 0 1px rgb(255 255 255 / 0.4);
		transform-origin: 0 100%;
	}
	.bubble span {
		display: block;
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
			text-align: center;
			gap: 0;
		}
		.lead {
			margin-inline: auto;
		}
		.actions,
		.reactions {
			justify-content: center;
		}
		.stage {
			order: -1;
			min-height: 0;
			padding: 1rem 0 1.5rem;
		}
		.bubble {
			left: 58%;
			max-width: 11rem;
			font-size: 0.85rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.copy > *,
		.stage,
		.grad,
		.orbit,
		.eyebrow .dot {
			animation: none;
		}
	}
</style>

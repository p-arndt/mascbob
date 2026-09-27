<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import {
		ACCESSORIES,
		EYE_STYLES,
		MOODS,
		Mascot,
		OUTFITS,
		SHAPES,
		THEMES,
		type Accessory,
		type EyeStyle,
		type Mood,
		type Outfit,
		type Shape,
		type ThemeName
	} from '$lib/index.js';
	import Code, { plain, type Token } from './Code.svelte';
	import { copyText, pick } from './interactions.js';

	const themeNames = Object.keys(THEMES) as ThemeName[];
	const GAZES = ['pointer', 'wander', 'none'] as const;
	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');

	let mood = $state<Mood>('happy');
	let theme = $state<ThemeName>('aurora');
	let shape = $state<Shape>('pebble');
	let eyes = $state<EyeStyle>('round');
	let accessories = $state<Accessory[]>(['ring']);
	let body = $state(true);
	let outfit = $state<Outfit>(OUTFITS[0]);
	let hands = $state(true);
	let float = $state(true);
	let lookAt = $state<(typeof GAZES)[number]>('pointer');
	let size = $state(240);
	let boops = $state(0);

	const colors = $derived(THEMES[theme]);

	function toggle(a: Accessory) {
		accessories = accessories.includes(a)
			? accessories.filter((x) => x !== a)
			: [...accessories, a];
	}

	let dice = $state<SVGSVGElement>();
	let face = $state(5);
	// Pip positions on a 3x3 grid for each die face.
	const PIPS: Record<number, [number, number][]> = {
		1: [[1, 1]],
		2: [
			[0, 0],
			[2, 2]
		],
		3: [
			[0, 0],
			[1, 1],
			[2, 2]
		],
		4: [
			[0, 0],
			[2, 0],
			[0, 2],
			[2, 2]
		],
		5: [
			[0, 0],
			[2, 0],
			[1, 1],
			[0, 2],
			[2, 2]
		],
		6: [
			[0, 0],
			[2, 0],
			[0, 1],
			[2, 1],
			[0, 2],
			[2, 2]
		]
	};

	function randomize() {
		mood = pick(MOODS);
		theme = pick(themeNames);
		shape = pick(SHAPES);
		eyes = pick(EYE_STYLES);
		outfit = pick(OUTFITS);
		// Zero to two accessories keeps the result charming instead of cluttered.
		const pool = [...ACCESSORIES].sort(() => Math.random() - 0.5);
		accessories = pool.slice(0, Math.floor(Math.random() * 3));
		let next = face;
		while (next === face) next = 1 + Math.floor(Math.random() * 6);
		face = next;
		if (!reduced.current) {
			dice?.animate(
				[
					{ transform: 'rotate(0) scale(1)' },
					{ transform: 'rotate(200deg) scale(0.8)', offset: 0.45 },
					{ transform: 'rotate(380deg) scale(1.12)', offset: 0.8 },
					{ transform: 'rotate(360deg) scale(1)' }
				],
				{ duration: 560, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' }
			);
		}
	}

	type Attr = { name: string; value: string; expr?: boolean };
	const attrs = $derived(
		(
			[
				{ name: 'mood', value: mood },
				{ name: 'theme', value: theme },
				shape !== 'pebble' && { name: 'shape', value: shape },
				eyes !== 'round' && { name: 'eyes', value: eyes },
				accessories.length > 0 && {
					name: 'accessories',
					value: `[${accessories.map((a) => `'${a}'`).join(', ')}]`,
					expr: true
				},
				body && { name: 'body', value: '' },
				body && outfit !== 'none' && { name: 'outfit', value: outfit },
				!hands && { name: 'hands', value: 'false', expr: true },
				!float && { name: 'float', value: 'false', expr: true },
				lookAt !== 'pointer' && { name: 'lookAt', value: lookAt },
				size !== 160 && { name: 'size', value: String(size), expr: true }
			] as (Attr | false)[]
		).filter((a): a is Attr => !!a)
	);
	const tokens = $derived<Token[][]>([
		[
			['t-p', '<'],
			['t-tag', 'Mascot']
		],
		...attrs.map((a): Token[] => {
			const name: Token = ['t-attr', `  ${a.name}`];
			if (a.value === '') return [name];
			if (a.expr) return [name, ['t-p', '={'], ['t-expr', a.value], ['t-p', '}']];
			return [name, ['t-p', '='], ['t-str', `"${a.value}"`]];
		}),
		[['t-p', '/>']]
	]);
	const code = $derived(plain(tokens));

	let copied = $state(false);
	async function copy() {
		copied = await copyText(code);
		setTimeout(() => (copied = false), 1400);
	}
</script>

<div class="playground glass">
	<div
		class="stage"
		style:--accent={colors.accent}
		style:--eye={colors.eye}
		style:--mid={colors.bodyMid}
	>
		<div class="stage-bar">
			<div class="segmented" role="group" aria-label="Mode">
				<button class:active={!body} aria-pressed={!body} onclick={() => (body = false)}
					>Head</button
				>
				<button class:active={body} aria-pressed={body} onclick={() => (body = true)}>
					Full body
				</button>
				<span class="thumb" class:right={body} aria-hidden="true"></span>
			</div>
			<button class="dice" onclick={randomize} aria-label="Randomize" title="Randomize">
				<svg bind:this={dice} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
					<rect
						x="2.5"
						y="2.5"
						width="19"
						height="19"
						rx="5.5"
						fill="currentColor"
						opacity="0.16"
						stroke="currentColor"
						stroke-width="1.5"
					/>
					{#each PIPS[face] as [cx, cy], i (i)}
						<circle cx={7 + cx * 5} cy={7 + cy * 5} r="1.6" fill="currentColor" />
					{/each}
				</svg>
				<span>Randomize</span>
			</button>
		</div>

		<div class="figure">
			<Mascot
				{mood}
				{theme}
				{shape}
				{eyes}
				{accessories}
				{body}
				{outfit}
				{hands}
				{float}
				{lookAt}
				{size}
				onboop={() => boops++}
			/>
		</div>

		<div class="boops" aria-live="polite">
			{#key boops}
				<strong class:pop={boops > 0}>{boops}</strong>
			{/key}
			{boops === 1 ? 'boop' : 'boops'}
			<span class="hint">· tap it</span>
		</div>
	</div>

	<div class="controls">
		<div class="controls-head">
			<h2>Make it yours</h2>
			<p>Every option below comes straight from the library's exported arrays.</p>
		</div>

		<fieldset>
			<legend>Mood</legend>
			<div class="chips">
				{#each MOODS as m (m)}
					<button
						class="chip"
						class:active={mood === m}
						aria-pressed={mood === m}
						onclick={() => (mood = m)}>{m}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend>Theme <span class="value">{theme}</span></legend>
			<div class="swatches">
				{#each themeNames as name (name)}
					<button
						class="swatch"
						class:active={theme === name}
						aria-pressed={theme === name}
						title={name}
						aria-label="{name} theme"
						style:--a={THEMES[name].bodyLight}
						style:--b={THEMES[name].bodyMid}
						style:--c={THEMES[name].bodyDark}
						style:--v={THEMES[name].visor}
						style:--e={THEMES[name].eye}
						onclick={() => (theme = name)}
					></button>
				{/each}
			</div>
		</fieldset>

		<div class="row">
			<fieldset>
				<legend>Shape</legend>
				<div class="chips">
					{#each SHAPES as s (s)}
						<button
							class="chip"
							class:active={shape === s}
							aria-pressed={shape === s}
							onclick={() => (shape = s)}>{s}</button
						>
					{/each}
				</div>
			</fieldset>
			<fieldset>
				<legend>Eyes</legend>
				<div class="chips">
					{#each EYE_STYLES as e (e)}
						<button
							class="chip"
							class:active={eyes === e}
							aria-pressed={eyes === e}
							onclick={() => (eyes = e)}>{e}</button
						>
					{/each}
				</div>
			</fieldset>
		</div>

		<fieldset>
			<legend>Accessories <span class="value">{accessories.length || 'none'}</span></legend>
			<div class="chips">
				{#each ACCESSORIES as a (a)}
					<button
						class="chip"
						class:active={accessories.includes(a)}
						aria-pressed={accessories.includes(a)}
						onclick={() => toggle(a)}>{a}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset disabled={!body} class:off={!body}>
			<legend>
				Outfit
				{#if !body}<span class="value">needs full body</span>{/if}
			</legend>
			<div class="chips">
				{#each OUTFITS as o (o)}
					<button
						class="chip"
						class:active={outfit === o}
						aria-pressed={outfit === o}
						onclick={() => (outfit = o)}>{o}</button
					>
				{/each}
			</div>
		</fieldset>

		<div class="row">
			<fieldset>
				<legend>Gaze</legend>
				<div class="chips">
					{#each GAZES as l (l)}
						<button
							class="chip"
							class:active={lookAt === l}
							aria-pressed={lookAt === l}
							onclick={() => (lookAt = l)}>{l}</button
						>
					{/each}
				</div>
			</fieldset>
			<fieldset>
				<legend>Extras</legend>
				<div class="chips">
					<button
						class="chip"
						class:active={hands}
						aria-pressed={hands}
						onclick={() => (hands = !hands)}>hands</button
					>
					<button
						class="chip"
						class:active={float}
						aria-pressed={float}
						onclick={() => (float = !float)}>float</button
					>
				</div>
			</fieldset>
		</div>

		<fieldset>
			<legend>Size <span class="value">{size}px</span></legend>
			<input
				class="range"
				type="range"
				min="80"
				max="320"
				bind:value={size}
				style:--p="{((size - 80) / 240) * 100}%"
				aria-label="Size"
			/>
		</fieldset>

		<div class="code">
			<Code lines={tokens} />
			<button class="copy" class:done={copied} onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
		</div>
	</div>
</div>

<style>
	.playground {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		overflow: hidden;
	}
	.stage {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 560px;
		padding: 1rem;
		background:
			radial-gradient(
				circle at 50% 48%,
				color-mix(in srgb, var(--accent) 30%, transparent),
				transparent 55%
			),
			radial-gradient(circle, rgb(255 255 255 / 0.08) 1px, transparent 1.5px) 0 0 / 22px 22px;
		transition: background 0.6s;
	}
	.stage-bar {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		position: relative;
		z-index: 2;
	}
	.figure {
		display: grid;
		place-items: center;
		padding: 1rem 0;
	}

	.dice {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.85rem 0.4rem 0.55rem;
		border-radius: 12px;
		border: 1px solid rgb(255 255 255 / 0.12);
		background: rgb(255 255 255 / 0.06);
		color: var(--text-1);
		font: inherit;
		font-size: 0.84rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.15s,
			border-color 0.2s;
	}
	.dice:hover {
		background: rgb(255 255 255 / 0.1);
		border-color: rgb(255 255 255 / 0.2);
	}
	.dice:active {
		transform: scale(0.94);
	}
	.dice svg {
		color: var(--eye);
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--eye) 50%, transparent));
	}

	.boops {
		justify-self: start;
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		padding: 0.4rem 0.8rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.3);
		border: 1px solid rgb(255 255 255 / 0.08);
		font-size: 0.85rem;
		color: var(--text-2);
	}
	.boops strong {
		display: inline-block;
		color: var(--text-1);
		font-variant-numeric: tabular-nums;
	}
	.boops .pop {
		animation: pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	@keyframes pop {
		from {
			transform: scale(1.7);
			color: var(--eye);
		}
	}
	.hint {
		color: var(--text-3);
	}

	.controls {
		padding: 1.75rem 2rem 2rem;
		display: grid;
		gap: 1.25rem;
		align-content: start;
		border-left: 1px solid rgb(255 255 255 / 0.07);
		background: rgb(8 8 24 / 0.35);
	}
	.controls-head h2 {
		margin: 0;
		font-size: 1.35rem;
		letter-spacing: -0.02em;
	}
	.controls-head p {
		margin: 0.3rem 0 0;
		color: var(--text-3);
		font-size: 0.88rem;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
		transition: opacity 0.25s;
	}
	fieldset.off {
		opacity: 0.45;
	}
	legend {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-3);
		margin-bottom: 0.55rem;
		padding: 0;
	}
	.value {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
		color: var(--text-2);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}
	.swatch {
		position: relative;
		width: 2.3rem;
		height: 2.3rem;
		border-radius: 50%;
		border: 0;
		padding: 0;
		background:
			radial-gradient(circle at 42% 52%, var(--e) 0 7%, transparent 9%),
			radial-gradient(circle at 60% 52%, var(--e) 0 7%, transparent 9%),
			radial-gradient(ellipse 36% 26% at 50% 54%, var(--v) 0 96%, transparent 100%),
			radial-gradient(circle at 32% 28%, var(--a), var(--b) 45%, var(--c));
		box-shadow:
			inset 0 -2px 4px rgb(0 0 0 / 0.15),
			0 0 0 1px rgb(255 255 255 / 0.1);
		cursor: pointer;
		transition:
			transform 0.2s cubic-bezier(0.3, 1.5, 0.5, 1),
			box-shadow 0.2s;
	}
	.swatch:hover {
		transform: translateY(-2px) scale(1.08);
	}
	.swatch:active {
		transform: scale(0.94);
	}
	.swatch.active {
		box-shadow:
			0 0 0 2px #0b0b1e,
			0 0 0 4px var(--b),
			0 6px 18px -4px var(--c);
	}

	.range {
		width: 100%;
		appearance: none;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(90deg, #7cf3ff, #c4b5fd var(--p), rgb(255 255 255 / 0.1) var(--p));
		outline-offset: 6px;
		cursor: pointer;
	}
	.range::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		box-shadow:
			0 0 0 4px rgb(196 181 253 / 0.25),
			0 2px 6px rgb(0 0 0 / 0.4);
		transition: transform 0.15s;
	}
	.range:active::-webkit-slider-thumb {
		transform: scale(1.2);
	}
	.range::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border: 0;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 0 4px rgb(196 181 253 / 0.25);
	}

	.code {
		position: relative;
	}
	.code :global(pre) {
		min-height: 9.5em;
	}
	.copy {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		padding: 0.35rem 0.7rem;
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
			color 0.2s,
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

	@media (max-width: 900px) {
		.playground {
			grid-template-columns: 1fr;
		}
		.stage {
			min-height: 460px;
		}
		.controls {
			border-left: 0;
			border-top: 1px solid rgb(255 255 255 / 0.07);
			padding: 1.5rem 1.25rem;
		}
		.row {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.boops .pop {
			animation: none;
		}
	}
</style>

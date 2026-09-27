<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import {
		ACCESSORIES,
		EYE_STYLES,
		MOODS,
		REACTIONS,
		Mascot,
		OUTFITS,
		SHAPES,
		SHOES,
		THEMES,
		resolveTheme,
		type Accessory,
		type EyeStyle,
		type Mood,
		type Outfit,
		type Reaction,
		type ReactionEvent,
		type Shape,
		type Shoes,
		type ThemeName
	} from '$lib/index.js';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Code, { type Token } from './Code.svelte';
	import { download, snapshotSvg, svgToPng } from './exporter.js';
	import { copyText, pick } from './interactions.js';
	import {
		COLOR_KEYS,
		GAZES,
		STUDIO_START,
		fromQuery,
		mascotAttrs,
		svelteFile,
		themeProp,
		toQuery,
		type ColorKey,
		type Gaze,
		type StudioConfig
	} from './studio.js';

	const themeNames = Object.keys(THEMES) as ThemeName[];
	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');
	const start = STUDIO_START;

	let mood = $state<Mood>(start.mood);
	let theme = $state<ThemeName>(start.theme);
	let custom = $state<StudioConfig['colors']>({});
	let shape = $state<Shape>(start.shape);
	let eyes = $state<EyeStyle>(start.eyes);
	let accessories = $state<Accessory[]>(start.accessories);
	let body = $state(start.body);
	let outfit = $state<Outfit>(start.outfit);
	let shoes = $state<Shoes>(start.shoes);
	let hands = $state(start.hands);
	let float = $state(start.float);
	let lookAt = $state<Gaze>(start.lookAt);
	let reactions = $state<Reaction[]>(start.reactions);
	let size = $state(start.size);
	let boops = $state(0);

	const config: StudioConfig = $derived({
		mood,
		theme,
		colors: custom,
		shape,
		eyes,
		accessories,
		body,
		outfit,
		shoes,
		hands,
		float,
		lookAt,
		reactions,
		size
	});
	const themeValue = $derived(themeProp(config));
	const colors = $derived(resolveTheme(themeValue));

	// A share link restores its configuration into the studio.
	onMount(() => {
		const q = new URLSearchParams(location.search);
		if (![...q.keys()].length) return;
		const c = fromQuery(q);
		({ mood, theme, shape, eyes, accessories, body, outfit, shoes, hands, float, lookAt, size } =
			c);
		custom = c.colors;
	});

	const COLOR_LABELS: Record<ColorKey, string> = {
		bodyMid: 'Body',
		eye: 'Face',
		cheek: 'Cheeks',
		accent: 'Accent'
	};

	function setColor(key: ColorKey, value: string) {
		custom = { ...custom, [key]: value };
	}

	function pickTheme(name: ThemeName) {
		theme = name;
		// A preset is a fresh start; stale overrides would hide what the preset looks like.
		custom = {};
	}

	const REACTION_HINTS: Record<Reaction, string> = {
		follow: 'leans toward your cursor',
		pet: 'stroke back and forth over its head',
		startle: 'flick the cursor past it, fast',
		dizzy: 'circle around it twice',
		shy: 'get really close',
		tickle: 'boop it again and again',
		bored: 'leave the mouse alone for 20 s'
	};

	function toggleReaction(r: Reaction) {
		reactions = reactions.includes(r) ? reactions.filter((x) => x !== r) : [...reactions, r];
	}

	// The last reaction, shown on the stage so people learn what the gestures do.
	let lastReaction = $state<{ id: number; text: string } | null>(null);
	let reactionTimer: ReturnType<typeof setTimeout>;
	function describe(e: ReactionEvent): string {
		switch (e.type) {
			case 'pet':
				return `petted ×${e.strokes}`;
			case 'startle':
				return 'startled!';
			case 'dizzy':
				return 'dizzy…';
			case 'shy':
				return 'feeling shy';
			case 'tickle':
				return e.level === 'giggle' ? 'giggles' : 'had enough';
			case 'bored':
				return 'bored';
			case 'wake':
				return 'awake again';
		}
	}
	function onreaction(e: ReactionEvent) {
		lastReaction = { id: (lastReaction?.id ?? 0) + 1, text: describe(e) };
		clearTimeout(reactionTimer);
		reactionTimer = setTimeout(() => (lastReaction = null), 2400);
	}

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
		shoes = pick(SHOES);
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

	type Tab = 'svelte' | 'link';
	let tab = $state<Tab>('svelte');
	const INSTALL = 'pnpm add mascott';

	const tokens = $derived<Token[][]>(svelteTokens(config));
	const shareUrl = $derived.by(() => {
		const q = toQuery(config);
		return `${page.url.origin}${page.url.pathname}${q ? `?${q}` : ''}#playground`;
	});

	function svelteTokens(c: StudioConfig): Token[][] {
		const attrs = mascotAttrs(c);
		return [
			[
				['t-p', '<'],
				['t-tag', 'script'],
				['t-p', '>']
			],
			[
				['t-kw', '  import'],
				['t-p', ' { Mascot } '],
				['t-kw', 'from'],
				['t-str', " 'mascott'"],
				['t-p', ';']
			],
			[
				['t-p', '</'],
				['t-tag', 'script'],
				['t-p', '>']
			],
			[],
			[['t-p', '<'], ['t-tag', 'Mascot'], ...(attrs.length ? [] : ([['t-p', ' />']] as Token[]))],
			...attrs.map((a): Token[] => {
				const name: Token = ['t-attr', `  ${a.name}`];
				if (a.expr) return [name, ['t-p', '={'], ['t-expr', a.value], ['t-p', '}']];
				return [name, ['t-p', '='], ['t-str', `"${a.value}"`]];
			}),
			...(attrs.length ? [[['t-p', '/>']] as Token[]] : [])
		];
	}

	let done = $state<string | null>(null);
	let doneTimer: ReturnType<typeof setTimeout>;
	function flash(what: string) {
		done = what;
		clearTimeout(doneTimer);
		doneTimer = setTimeout(() => (done = null), 1400);
	}

	async function copy(what: string, text: string) {
		if (await copyText(text)) flash(what);
	}

	let figure = $state<HTMLElement>();
	function snapshot() {
		const svg = figure?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		return { text: snapshotSvg(svg, rect), width: rect.width, height: rect.height };
	}
	const fileName = $derived(`mascott-${mood}-${theme}`);

	function exportSvg() {
		const s = snapshot();
		if (!s) return;
		download(s.text, `${fileName}.svg`, 'image/svg+xml');
		flash('svg');
	}

	async function exportPng() {
		const s = snapshot();
		if (!s) return;
		// Exports at 1024px wide whatever the preview size, so icons and slides stay sharp.
		download(await svgToPng(s.text, s.width, s.height, 1024 / s.width), `${fileName}.png`);
		flash('png');
	}

	function exportSvelte() {
		download(svelteFile(config), 'MyMascot.svelte');
		flash('file');
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

		<div class="figure" bind:this={figure}>
			<Mascot
				{mood}
				theme={themeValue}
				{shape}
				{eyes}
				{accessories}
				{body}
				{outfit}
				{shoes}
				{hands}
				{float}
				{lookAt}
				{reactions}
				{onreaction}
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
			{#if lastReaction}
				{#key lastReaction.id}
					<span class="reaction">{lastReaction.text}</span>
				{/key}
			{/if}
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
						class:active={theme === name && !Object.keys(custom).length}
						aria-pressed={theme === name}
						title={name}
						aria-label="{name} theme"
						style:--a={THEMES[name].bodyLight}
						style:--b={THEMES[name].bodyMid}
						style:--c={THEMES[name].bodyDark}
						style:--k={THEMES[name].accent}
						style:--e={THEMES[name].eye}
						onclick={() => pickTheme(name)}
					></button>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend>
				Colors
				{#if Object.keys(custom).length}
					<button class="reset" onclick={() => (custom = {})}>reset to {theme}</button>
				{:else}
					<span class="value">from {theme}</span>
				{/if}
			</legend>
			<div class="colors">
				{#each COLOR_KEYS as key (key)}
					<label class="color" class:changed={custom[key]}>
						<input
							type="color"
							value={colors[key]}
							defaultValue={colors[key]}
							oninput={(e) => setColor(key, e.currentTarget.value)}
						/>
						<span>{COLOR_LABELS[key]}</span>
					</label>
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

		<div class="row">
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
			<fieldset disabled={!body} class:off={!body}>
				<legend>
					Shoes
					{#if !body}<span class="value">needs full body</span>{/if}
				</legend>
				<div class="chips">
					{#each SHOES as f (f)}
						<button
							class="chip"
							class:active={shoes === f}
							aria-pressed={shoes === f}
							onclick={() => (shoes = f)}>{f}</button
						>
					{/each}
				</div>
			</fieldset>
		</div>

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
			<legend>
				Reactions <span class="value">{reactions.length ? `${reactions.length} on` : 'off'}</span>
			</legend>
			<div class="chips">
				{#each REACTIONS as r (r)}
					<button
						class="chip"
						class:active={reactions.includes(r)}
						aria-pressed={reactions.includes(r)}
						title={REACTION_HINTS[r]}
						onclick={() => toggleReaction(r)}>{r}</button
					>
				{/each}
			</div>
			<p class="note">Hover a chip to see how to trigger it, then try it on the stage.</p>
		</fieldset>

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

		<section class="export" aria-label="Export">
			<div class="export-head">
				<h3>Take it home</h3>
				<button
					class="install"
					onclick={() => copy('install', INSTALL)}
					title="Copy install command"
				>
					<code>{INSTALL}</code>
					<span>{done === 'install' ? 'Copied' : 'Copy'}</span>
				</button>
			</div>
			<div class="tabs" role="tablist" aria-label="Export format">
				<button
					role="tab"
					aria-selected={tab === 'svelte'}
					class:active={tab === 'svelte'}
					onclick={() => (tab = 'svelte')}
				>
					Svelte
				</button>
				<button
					role="tab"
					aria-selected={tab === 'link'}
					class:active={tab === 'link'}
					onclick={() => (tab = 'link')}
				>
					Share link
				</button>
			</div>
			{#if tab === 'svelte'}
				<div class="code">
					<Code lines={tokens} />
					<button
						class="copy"
						class:done={done === 'code'}
						onclick={() => copy('code', svelteFile(config))}
					>
						{done === 'code' ? 'Copied' : 'Copy'}
					</button>
				</div>
			{:else}
				<div class="link">
					<input
						readonly
						value={shareUrl}
						aria-label="Share link"
						onfocus={(e) => e.currentTarget.select()}
					/>
					<button
						class="copy static"
						class:done={done === 'link'}
						onclick={() => copy('link', shareUrl)}
					>
						{done === 'link' ? 'Copied' : 'Copy'}
					</button>
				</div>
				<p class="note">Opens this page with your mascot already set up in the studio.</p>
			{/if}
			<div class="downloads">
				<span class="label">Download</span>
				<button class="file" class:done={done === 'file'} onclick={exportSvelte}>.svelte</button>
				<button class="file" class:done={done === 'svg'} onclick={exportSvg}>SVG</button>
				<button class="file" class:done={done === 'png'} onclick={exportPng}>PNG</button>
				<button
					class="file"
					class:done={done === 'svgcode'}
					onclick={() => {
						const s = snapshot();
						if (s) copy('svgcode', s.text);
					}}
				>
					{done === 'svgcode' ? 'Copied' : 'Copy SVG'}
				</button>
			</div>
		</section>
	</div>
</div>

<style>
	.playground {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		/* clip, not hidden: hidden would become the scroll container and break the sticky stage. */
		overflow: clip;
	}
	.stage {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 560px;
		/* The controls run long; keeping the stage in view shows every change as it happens. */
		position: sticky;
		top: 0;
		align-self: start;
		height: min(100vh, 820px);
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
		color: var(--accent);
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 50%, transparent));
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
	.reaction {
		margin-left: 0.3rem;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 35%, transparent);
		color: var(--text-1);
		font-weight: 600;
		animation: pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
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
			radial-gradient(circle at 40% 48%, var(--e) 0 8%, transparent 10%),
			radial-gradient(circle at 60% 48%, var(--e) 0 8%, transparent 10%),
			radial-gradient(circle at 42% 51%, var(--k) 0 8%, transparent 10%),
			radial-gradient(circle at 62% 51%, var(--k) 0 8%, transparent 10%),
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

	.colors {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.color {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.3rem 0.7rem 0.3rem 0.3rem;
		border-radius: 999px;
		border: 1px solid rgb(255 255 255 / 0.1);
		background: rgb(255 255 255 / 0.04);
		font-size: 0.8rem;
		color: var(--text-2);
		cursor: pointer;
		transition: border-color 0.2s;
	}
	.color.changed {
		border-color: rgb(255 255 255 / 0.35);
		color: var(--text-1);
	}
	.color input {
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		cursor: pointer;
	}
	.color input::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.color input::-webkit-color-swatch {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 50%;
	}
	.color input::-moz-color-swatch {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 50%;
	}
	.reset {
		border: 0;
		padding: 0;
		background: none;
		color: var(--text-2);
		font: inherit;
		text-transform: none;
		letter-spacing: 0;
		text-decoration: underline;
		cursor: pointer;
	}

	.export {
		display: grid;
		gap: 0.75rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgb(255 255 255 / 0.07);
	}
	.export-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.export-head h3 {
		margin: 0;
		font-size: 1.05rem;
		letter-spacing: -0.01em;
	}
	.install {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.3rem 0.35rem 0.3rem 0.75rem;
		border-radius: 10px;
		border: 1px solid rgb(255 255 255 / 0.1);
		background: rgb(0 0 0 / 0.3);
		color: var(--text-1);
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.install code {
		font-family: var(--mono);
	}
	.install span {
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		background: rgb(255 255 255 / 0.08);
		color: var(--text-2);
		font-weight: 600;
		font-size: 0.72rem;
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
	}
	.tabs button {
		padding: 0.35rem 0.8rem;
		border-radius: 8px;
		border: 0;
		background: none;
		color: var(--text-3);
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
	}
	.tabs button:hover {
		color: var(--text-1);
	}
	.tabs button.active {
		background: rgb(255 255 255 / 0.08);
		color: var(--text-1);
	}
	.link {
		display: flex;
		gap: 0.5rem;
	}
	.link input {
		flex: 1;
		min-width: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 10px;
		border: 1px solid rgb(255 255 255 / 0.1);
		background: rgb(0 0 0 / 0.3);
		color: var(--text-1);
		font-family: var(--mono);
		font-size: 0.8rem;
	}
	.copy.static {
		position: static;
	}
	fieldset .note {
		margin-top: 0.55rem;
	}
	.note {
		margin: 0;
		color: var(--text-3);
		font-size: 0.8rem;
	}
	.downloads {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.downloads .label {
		margin-right: 0.3rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-3);
	}
	.file {
		padding: 0.4rem 0.8rem;
		border-radius: 999px;
		border: 1px solid rgb(255 255 255 / 0.12);
		background: rgb(255 255 255 / 0.05);
		color: var(--text-1);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.15s;
	}
	.file:hover {
		background: rgb(255 255 255 / 0.1);
	}
	.file:active {
		transform: scale(0.94);
	}
	.file.done {
		background: #7cf3ff;
		color: #0b1030;
	}

	@media (max-width: 900px) {
		.playground {
			grid-template-columns: 1fr;
		}
		.stage {
			position: relative;
			height: auto;
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
		.boops .pop,
		.reaction {
			animation: none;
		}
	}
</style>

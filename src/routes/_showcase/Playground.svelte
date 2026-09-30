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
		type Motion,
		type Outfit,
		type Reaction,
		type ReactionEvent,
		type Shape,
		type Shoes,
		type ThemeName
	} from '$lib/index.js';
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import Code, { type Token } from './Code.svelte';
	import { download, snapshotSvg, svgToPng } from './exporter.js';
	import { copyText, pick } from './interactions.js';
	import {
		COLOR_KEYS,
		GAZES,
		MOTIONS,
		STAGES,
		STUDIO_START,
		fromQuery,
		stageStyle,
		mascotAttrs,
		svelteFile,
		themeProp,
		toQuery,
		type ColorKey,
		type Gaze,
		type Stage,
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
	let effects = $state(start.effects);
	let lookAt = $state<Gaze>(start.lookAt);
	let reactions = $state<Reaction[]>(start.reactions);
	let motion = $state<Motion>(start.motion);
	let interactive = $state(start.interactive);
	let levelAuto = $state(start.level === null);
	// Kept apart from levelAuto so switching back to manual restores the last slider position.
	let levelValue = $state(start.level ?? 0.5);
	let compare = $state(false);
	let size = $state(start.size);
	let stage = $state<Stage>(start.stage);
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
		effects,
		lookAt,
		reactions,
		motion,
		interactive,
		level: levelAuto ? null : levelValue,
		size,
		stage
	});
	const themeValue = $derived(themeProp(config));
	const colors = $derived(resolveTheme(themeValue));
	const backdrop = $derived(stageStyle(stage, colors.accent));
	const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
		tint: 'Colorway tint',
		neutral: 'Neutral',
		light: 'Light',
		dark: 'Dark',
		paper: 'Paper'
	};
	const customStage = $derived(stage.startsWith('#') ? stage : null);

	// A share link restores its configuration into the studio.
	onMount(() => {
		const q = new URLSearchParams(location.search);
		if (![...q.keys()].length) return;
		const c = fromQuery(q);
		({
			mood,
			theme,
			shape,
			eyes,
			accessories,
			body,
			outfit,
			shoes,
			hands,
			float,
			effects,
			lookAt,
			reactions,
			motion,
			interactive,
			size,
			stage
		} = c);
		custom = c.colors;
		levelAuto = c.level === null;
		levelValue = c.level ?? levelValue;
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
		explode: 'keep booping once it is grumpy',
		grab: 'pull its head, arms or legs',
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
			case 'explode':
				return 'boom!';
			case 'grab':
				return `grabbed its ${e.part.split('-').reverse().join(' ')}`;
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

	type Panel = 'look' | 'gear' | 'motion' | 'export';
	const PANELS: { id: Panel; label: string }[] = [
		{ id: 'look', label: 'Look' },
		{ id: 'gear', label: 'Gear' },
		{ id: 'motion', label: 'Motion' },
		{ id: 'export', label: 'Export' }
	];
	let panel = $state<Panel>('look');

	type Tab = 'svelte' | 'link';
	let tab = $state<Tab>('svelte');
	const INSTALL = 'pnpm add mascbob';

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
				['t-str', " 'mascbob'"],
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
	async function snapshot() {
		// The compare grid replaces the single figure, and an export is always of that one mascot.
		if (compare) {
			compare = false;
			await tick();
		}
		const svg = figure?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		return { text: snapshotSvg(svg, rect), width: rect.width, height: rect.height };
	}
	const fileName = $derived(`mascbob-${mood}-${theme}`);

	async function exportSvg() {
		const s = await snapshot();
		if (!s) return;
		download(s.text, `${fileName}.svg`, 'image/svg+xml');
		flash('svg');
	}

	async function exportPng() {
		const s = await snapshot();
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

{#snippet chipGroup<T extends string>(
	items: readonly T[],
	isOn: (item: T) => boolean,
	set: (item: T) => void,
	hint?: (item: T) => string
)}
	<div class="chips">
		{#each items as item (item)}
			<button
				class="chip"
				class:active={isOn(item)}
				aria-pressed={isOn(item)}
				title={hint?.(item)}
				onclick={() => set(item)}>{item}</button
			>
		{/each}
	</div>
{/snippet}

<div class="playground card">
	<div
		class="stage"
		style:background={backdrop.background}
		style:color-scheme={backdrop.scheme}
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
			<div class="stage-actions">
				<button class="pill" onclick={randomize} aria-label="Randomize" title="Randomize">
					<svg bind:this={dice} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<rect
							x="2.5"
							y="2.5"
							width="19"
							height="19"
							rx="5.5"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
						/>
						{#each PIPS[face] as [cx, cy], i (i)}
							<circle cx={7 + cx * 5} cy={7 + cy * 5} r="1.6" fill="currentColor" />
						{/each}
					</svg>
					<span>Randomize</span>
				</button>
				<button
					class="pill"
					class:on={compare}
					aria-pressed={compare}
					title="Compare colorways"
					onclick={() => (compare = !compare)}
				>
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						{#each [4, 12, 20] as cx (cx)}
							{#each [7, 17] as cy (cy)}
								<circle {cx} {cy} r="3" fill="currentColor" />
							{/each}
						{/each}
					</svg>
					<span>Compare</span>
				</button>
				<button class="pill dark" onclick={() => (panel = 'export')}>Get code</button>
			</div>
		</div>

		{#if compare}
			<ul class="compare" aria-label="Colorways">
				{#each themeNames as name (name)}
					<li>
						<button
							class:active={theme === name}
							aria-pressed={theme === name}
							title="Use {name}"
							onclick={() => {
								pickTheme(name);
								compare = false;
							}}
						>
							<Mascot
								{mood}
								theme={name}
								{shape}
								{eyes}
								{accessories}
								{body}
								{outfit}
								{shoes}
								{hands}
								{float}
								{effects}
								{motion}
								level={config.level ?? undefined}
								lookAt="none"
								size="100%"
								interactive={false}
								label="{name} colorway"
							/>
							<span>{name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
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
					{effects}
					{lookAt}
					{reactions}
					{onreaction}
					{motion}
					{interactive}
					level={config.level ?? undefined}
					{size}
					onboop={() => boops++}
				/>
			</div>
		{/if}

		<div class="boops" aria-live="polite">
			{#key boops}
				<strong class:pop={boops > 0}>{boops}</strong>
			{/key}
			{boops === 1 ? 'boop' : 'boops'}
			{#if lastReaction}
				{#key lastReaction.id}
					<span class="reaction">{lastReaction.text}</span>
				{/key}
			{:else}
				<span class="hint">· tap it</span>
			{/if}
		</div>

		<div class="dock" role="group" aria-label="Mood">
			{#each MOODS as m (m)}
				<button class:active={mood === m} aria-pressed={mood === m} onclick={() => (mood = m)}
					>{m}</button
				>
			{/each}
		</div>
	</div>

	<div class="panel">
		<div class="tabs" role="tablist" aria-label="Studio sections">
			{#each PANELS as t (t.id)}
				<button
					role="tab"
					aria-selected={panel === t.id}
					class:active={panel === t.id}
					onclick={() => (panel = t.id)}>{t.label}</button
				>
			{/each}
		</div>

		<div class="panel-body" role="tabpanel">
			{#if panel === 'look'}
				<fieldset>
					<legend>Colorway <span class="value">{theme}</span></legend>
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
							<button class="reset" onclick={() => (custom = {})}>Reset to {theme}</button>
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

				<fieldset>
					<legend>Background <span class="value">studio only</span></legend>
					<div class="chips">
						{#each STAGES as preset (preset)}
							<button
								class="chip stage-chip"
								class:active={stage === preset}
								aria-pressed={stage === preset}
								onclick={() => (stage = preset)}
							>
								<i style:background={stageStyle(preset, colors.accent).background}></i>
								{STAGE_LABELS[preset]}
							</button>
						{/each}
						<label class="color" class:changed={customStage}>
							<input
								type="color"
								value={customStage ?? '#ffe9a8'}
								oninput={(e) => (stage = e.currentTarget.value as Stage)}
							/>
							<span>Custom</span>
						</label>
					</div>
				</fieldset>

				<fieldset>
					<legend>Shape</legend>
					{@render chipGroup(
						SHAPES,
						(s) => shape === s,
						(s) => (shape = s)
					)}
				</fieldset>
				<fieldset>
					<legend>Eyes</legend>
					{@render chipGroup(
						EYE_STYLES,
						(e) => eyes === e,
						(e) => (eyes = e)
					)}
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
			{:else if panel === 'gear'}
				<fieldset>
					<legend>Accessories <span class="value">{accessories.length || 'none'}</span></legend>
					{@render chipGroup(ACCESSORIES, (a) => accessories.includes(a), toggle)}
				</fieldset>
				<fieldset disabled={!body} class:off={!body}>
					<legend>
						Outfit
						{#if !body}<span class="value">needs full body</span>{/if}
					</legend>
					{@render chipGroup(
						OUTFITS,
						(o) => outfit === o,
						(o) => (outfit = o)
					)}
				</fieldset>
				<fieldset disabled={!body} class:off={!body}>
					<legend>
						Shoes
						{#if !body}<span class="value">needs full body</span>{/if}
					</legend>
					{@render chipGroup(
						SHOES,
						(f) => shoes === f,
						(f) => (shoes = f)
					)}
				</fieldset>
				{#if !body}
					<button class="link-btn" onclick={() => (body = true)}>Switch to full body →</button>
				{/if}
			{:else if panel === 'motion'}
				<fieldset>
					<legend>Gaze</legend>
					{@render chipGroup(
						GAZES,
						(l) => lookAt === l,
						(l) => (lookAt = l)
					)}
				</fieldset>
				<fieldset>
					<legend>Extras</legend>
					<div class="toggles">
						<label class="toggle">
							<input type="checkbox" bind:checked={hands} />
							<span>Hands</span>
						</label>
						<label class="toggle">
							<input type="checkbox" bind:checked={float} />
							<span>Float</span>
						</label>
						<label class="toggle">
							<input type="checkbox" bind:checked={effects} />
							<span>Effects</span>
						</label>
						<label class="toggle">
							<input type="checkbox" bind:checked={interactive} />
							<span>Interactive</span>
						</label>
					</div>
				</fieldset>
				<fieldset>
					<legend
						>Motion <span class="value">{motion === 'auto' ? 'follows your OS' : ''}</span></legend
					>
					{@render chipGroup(
						MOTIONS,
						(m) => motion === m,
						(m) => (motion = m)
					)}
				</fieldset>
				{#if mood === 'talking'}
					<fieldset>
						<legend>
							Mouth level
							<span class="value">{levelAuto ? 'babbling' : levelValue.toFixed(2)}</span>
						</legend>
						<div class="level">
							<label class="toggle">
								<input type="checkbox" bind:checked={levelAuto} />
								<span>Auto</span>
							</label>
							<input
								class="range"
								type="range"
								min="0"
								max="1"
								step="0.05"
								disabled={levelAuto}
								bind:value={levelValue}
								style:--p="{levelValue * 100}%"
								aria-label="Mouth level"
							/>
						</div>
					</fieldset>
				{/if}
				<fieldset disabled={!interactive} class:off={!interactive}>
					<legend>
						Pointer reactions <span class="value"
							>{!interactive
								? 'needs interactive'
								: reactions.length
									? `${reactions.length} on`
									: 'off'}</span
						>
					</legend>
					<ul class="reactions">
						{#each REACTIONS as r (r)}
							<li>
								<label class="toggle">
									<input
										type="checkbox"
										checked={reactions.includes(r)}
										onchange={() => toggleReaction(r)}
									/>
									<span>{r}</span>
								</label>
								<em>{REACTION_HINTS[r]}</em>
							</li>
						{/each}
					</ul>
				</fieldset>
			{:else}
				<div class="export">
					<button
						class="install"
						onclick={() => copy('install', INSTALL)}
						title="Copy install command"
					>
						<code>{INSTALL}</code>
						<span>{done === 'install' ? 'Copied' : 'Copy'}</span>
					</button>
					<div class="segmented" role="tablist" aria-label="Export format">
						<button
							role="tab"
							aria-selected={tab === 'svelte'}
							class:active={tab === 'svelte'}
							onclick={() => (tab = 'svelte')}>Svelte</button
						>
						<button
							role="tab"
							aria-selected={tab === 'link'}
							class:active={tab === 'link'}
							onclick={() => (tab = 'link')}>Share link</button
						>
						<span class="thumb" class:right={tab === 'link'} aria-hidden="true"></span>
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
						<button class="file" class:done={done === 'file'} onclick={exportSvelte}>
							<span>.svelte</span><small>Component</small>
						</button>
						<button class="file" class:done={done === 'svg'} onclick={exportSvg}>
							<span>SVG</span><small>Vector</small>
						</button>
						<button class="file" class:done={done === 'png'} onclick={exportPng}>
							<span>PNG</span><small>1024 px</small>
						</button>
						<button
							class="file"
							class:done={done === 'svgcode'}
							onclick={async () => {
								const s = await snapshot();
								if (s) copy('svgcode', s.text);
							}}
						>
							<span>{done === 'svgcode' ? 'Copied' : 'Copy'}</span><small>SVG markup</small>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.playground {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		height: 700px;
		overflow: clip;
	}

	.stage {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto auto;
		gap: 0.75rem;
		min-height: 0;
		padding: 1rem;
		color: var(--text-1);
		transition: background 0.6s;
	}
	.stage-bar {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		position: relative;
		z-index: 2;
	}
	.stage .segmented {
		background: color-mix(in srgb, var(--raised) 60%, transparent);
	}
	.stage-actions {
		display: flex;
		gap: 0.4rem;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.95rem;
		border: 0;
		border-radius: 999px;
		background: color-mix(in srgb, var(--raised) 80%, transparent);
		color: var(--text-1);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.2s var(--spring);
	}
	.pill:hover {
		background: var(--raised);
	}
	.pill.dark {
		background: var(--text-1);
		color: var(--on-ink);
	}
	.pill.dark:hover {
		background: var(--ink-hover);
	}
	.pill:active {
		transform: scale(0.95);
	}
	.figure {
		display: grid;
		place-items: center;
		min-height: 0;
	}
	.pill.on {
		background: var(--text-1);
		color: var(--on-ink);
	}

	.compare {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		align-content: start;
		gap: 0.5rem;
		min-height: 0;
		margin: 0;
		padding: 0.25rem;
		list-style: none;
		overflow-y: auto;
	}
	.compare button {
		display: grid;
		justify-items: center;
		gap: 0.2rem;
		width: 100%;
		padding: 0.35rem;
		border: 0;
		border-radius: 14px;
		background: none;
		color: var(--text-2);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.compare button:hover {
		background: color-mix(in srgb, var(--raised) 50%, transparent);
	}
	.compare button.active {
		box-shadow: inset 0 0 0 1.5px var(--text-1);
		color: var(--text-1);
	}
	.level {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.range:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.boops {
		justify-self: center;
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
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
		}
	}
	.hint {
		color: var(--text-3);
	}
	.reaction {
		padding: 0.05rem 0.55rem;
		border-radius: 999px;
		background: var(--text-1);
		color: var(--on-ink);
		font-weight: 600;
		animation: pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
	}

	/* The mood dock sits on the stage: it's the most fun control, so it lives next to the mascot. */
	.dock {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.2rem;
		padding: 0.3rem;
		border-radius: 22px;
		background: var(--raised);
		box-shadow: 0 6px 24px -10px rgb(0 0 0 / 0.25);
	}
	.dock button {
		flex: none;
		padding: 0.45rem 0.8rem;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--text-2);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 550;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.dock button:hover {
		color: var(--text-1);
		background: var(--surface);
	}
	.dock button.active {
		background: var(--text-1);
		color: var(--on-ink);
	}

	.panel {
		display: grid;
		grid-template-rows: auto 1fr;
		min-height: 0;
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		padding: 1rem 1.25rem 0;
		border-bottom: 1px solid var(--line);
	}
	.tabs button {
		position: relative;
		padding: 0.6rem 0.8rem 0.85rem;
		border: 0;
		background: none;
		color: var(--text-3);
		font: inherit;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 0.15s;
	}
	.tabs button:hover,
	.tabs button.active {
		color: var(--text-1);
	}
	.tabs button.active::after {
		content: '';
		position: absolute;
		left: 0.8rem;
		right: 0.8rem;
		bottom: -1px;
		height: 2px;
		border-radius: 2px;
		background: var(--text-1);
	}
	.panel-body {
		display: grid;
		align-content: start;
		gap: 1.6rem;
		min-height: 0;
		padding: 1.5rem 1.75rem 2rem;
		overflow-y: auto;
		overscroll-behavior: contain;
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
		margin-bottom: 0.65rem;
		padding: 0;
		font-size: 0.92rem;
		font-weight: 650;
		color: var(--text-1);
	}
	.value {
		font-weight: 500;
		color: var(--text-3);
	}
	.link-btn,
	.reset {
		justify-self: start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--text-1);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.reset {
		font-size: 0.85rem;
		color: var(--text-2);
	}

	.stage-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding-left: 0.4rem;
	}
	.stage-chip i {
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px var(--ring);
	}
	.stage-chip.active i {
		box-shadow: 0 0 0 1.5px var(--on-ink);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}
	.swatch {
		position: relative;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		border: 0;
		padding: 0;
		background:
			radial-gradient(circle at 40% 48%, var(--e) 0 8%, transparent 10%),
			radial-gradient(circle at 60% 48%, var(--e) 0 8%, transparent 10%),
			radial-gradient(circle at 32% 28%, var(--a), var(--b) 45%, var(--c));
		box-shadow:
			inset 0 -3px 0 var(--k),
			0 0 0 1px rgb(0 0 0 / 0.08);
		cursor: pointer;
		transition:
			transform 0.2s var(--spring),
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
			inset 0 -3px 0 var(--k),
			0 0 0 2px var(--bg),
			0 0 0 4px var(--text-1);
	}

	.colors {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.color {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.3rem 0.8rem 0.3rem 0.3rem;
		border-radius: 999px;
		background: var(--raised);
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: 0.85rem;
		color: var(--text-2);
		cursor: pointer;
		transition: box-shadow 0.15s;
	}
	.color:hover {
		box-shadow: inset 0 0 0 1px var(--text-3);
	}
	.color.changed {
		box-shadow: inset 0 0 0 1.5px var(--text-1);
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
		border: 1px solid var(--ring);
		border-radius: 50%;
	}
	.color input::-moz-color-swatch {
		border: 1px solid var(--ring);
		border-radius: 50%;
	}

	.range {
		width: 100%;
		appearance: none;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--text-1) var(--p), var(--surface-2) var(--p));
		outline-offset: 6px;
		cursor: pointer;
	}
	.range::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		box-shadow:
			0 0 0 1px rgb(0 0 0 / 0.1),
			0 2px 6px rgb(0 0 0 / 0.2);
		transition: transform 0.15s;
	}
	.range:active::-webkit-slider-thumb {
		transform: scale(1.15);
	}
	.range::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.1);
	}

	/* Switch-style checkboxes: native inputs keep keyboard and screen reader behavior for free. */
	.toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.92rem;
		font-weight: 550;
		cursor: pointer;
	}
	.toggle input {
		appearance: none;
		position: relative;
		flex: none;
		width: 2.3rem;
		height: 1.35rem;
		margin: 0;
		border-radius: 999px;
		background: var(--surface-2);
		cursor: pointer;
		transition: background 0.2s;
	}
	.toggle input::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: calc(1.35rem - 4px);
		aspect-ratio: 1;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
		transition: translate 0.25s var(--spring);
	}
	.toggle input:checked {
		background: var(--text-1);
	}
	.toggle input:checked::after {
		translate: 0.95rem 0;
	}
	.reactions {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
	}
	.reactions li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
	}
	.reactions li:last-child {
		border-bottom: 0;
	}
	.reactions em {
		font-style: normal;
		font-size: 0.82rem;
		color: var(--text-3);
		text-align: right;
	}

	.export {
		display: grid;
		gap: 1rem;
	}
	.export .segmented {
		justify-self: start;
	}
	.install {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.4rem 0.4rem 0.4rem 1rem;
		border: 0;
		border-radius: 999px;
		background: var(--raised);
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--text-1);
		font: inherit;
		font-size: 0.88rem;
		cursor: pointer;
	}
	.install code {
		padding: 0;
		background: none;
	}
	.install span {
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		background: var(--surface);
		font-weight: 600;
		font-size: 0.8rem;
	}
	.code {
		position: relative;
		min-width: 0;
	}
	.code :global(pre) {
		min-height: 9.5em;
	}
	.copy {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		border: 0;
		background: rgb(255 255 255 / 0.12);
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
		background: rgb(255 255 255 / 0.2);
	}
	.copy:active {
		transform: scale(0.94);
	}
	.copy.done {
		background: #fff;
		color: #161616;
	}
	.link {
		display: flex;
		gap: 0.5rem;
	}
	.link input {
		flex: 1;
		min-width: 0;
		padding: 0.6rem 0.9rem;
		border-radius: 999px;
		border: 0;
		background: var(--raised);
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--text-1);
		font-family: var(--mono);
		font-size: 0.8rem;
	}
	.copy.static {
		position: static;
		background: var(--text-1);
		color: var(--on-ink);
	}
	.note {
		margin: 0;
		color: var(--text-3);
		font-size: 0.82rem;
	}
	.downloads {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.file {
		display: grid;
		gap: 0.1rem;
		padding: 0.75rem 0.85rem;
		border: 0;
		border-radius: 16px;
		background: var(--raised);
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--text-1);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			box-shadow 0.15s,
			transform 0.2s var(--spring);
	}
	.file span {
		font-weight: 650;
		font-size: 0.95rem;
	}
	.file small {
		font-size: 0.76rem;
		color: var(--text-3);
	}
	.file:hover {
		box-shadow: inset 0 0 0 1px var(--text-3);
	}
	.file:active {
		transform: scale(0.96);
	}
	.file.done {
		background: var(--text-1);
		color: var(--on-ink);
		box-shadow: none;
	}
	.file.done small {
		color: color-mix(in srgb, var(--on-ink) 60%, transparent);
	}

	@media (max-width: 900px) {
		.playground {
			grid-template-columns: minmax(0, 1fr);
			height: auto;
		}
		.stage {
			min-height: 480px;
		}
		.panel-body {
			overflow: visible;
		}
		.downloads {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 520px) {
		/* Icon-only dice, so the stage bar fits a phone next to the mode switch. */
		.pill span {
			display: none;
		}
		.stage-bar .segmented button {
			padding-inline: 0.75rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.boops .pop,
		.reaction {
			animation: none;
		}
	}
</style>

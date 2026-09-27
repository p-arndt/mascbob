<script lang="ts">
	import {
		ACCESSORIES,
		EYE_STYLES,
		MOODS,
		Mascot,
		SHAPES,
		THEMES,
		type Accessory,
		type EyeStyle,
		type Mood,
		type Shape,
		type ThemeName
	} from '$lib/index.js';

	const themeNames = Object.keys(THEMES) as ThemeName[];

	let mood = $state<Mood>('happy');
	let theme = $state<ThemeName>('aurora');
	let shape = $state<Shape>('pebble');
	let eyes = $state<EyeStyle>('round');
	let accessories = $state<Accessory[]>(['ring']);
	let hands = $state(true);
	let float = $state(true);
	let lookAt = $state<'pointer' | 'wander' | 'none'>('pointer');
	let size = $state(260);
	let boops = $state(0);

	let heroMood = $state<Mood>('idle');
	let heroTimer: ReturnType<typeof setTimeout> | undefined;
	function react(next: Mood, ms = 1600) {
		heroMood = next;
		clearTimeout(heroTimer);
		heroTimer = setTimeout(() => (heroMood = 'idle'), ms);
	}

	function toggle(a: Accessory) {
		accessories = accessories.includes(a)
			? accessories.filter((x) => x !== a)
			: [...accessories, a];
	}

	const code = $derived(
		[
			'<Mascot',
			`  mood="${mood}"`,
			`  theme="${theme}"`,
			shape !== 'pebble' && `  shape="${shape}"`,
			eyes !== 'round' && `  eyes="${eyes}"`,
			accessories.length && `  accessories={[${accessories.map((a) => `'${a}'`).join(', ')}]}`,
			!hands && '  hands={false}',
			!float && '  float={false}',
			lookAt !== 'pointer' && `  lookAt="${lookAt}"`,
			size !== 160 && `  size={${size}}`,
			'/>'
		]
			.filter(Boolean)
			.join('\n')
	);

	let copied = $state(false);
	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}

	const usage = [
		'<' + 'script>',
		"  import { Mascot } from 'mascott';",
		"  let mood = $state('idle');",
		'</' + 'script>',
		'',
		'<Mascot {mood} theme="aurora" accessories={[\'ring\']} />',
		'',
		'<!-- restyle with plain CSS -->',
		'<' + 'style>',
		'  :global(.brand) { --mascott-eye: #00ffc6; --mascott-accent: #ff4fd8; }',
		'</' + 'style>'
	].join('\n');

	const features = [
		[
			'11 moods',
			'Idle, happy, listening, thinking, talking, surprised, sleepy, sad, love, wink, grumpy, with smooth morphing in between.'
		],
		['Alive by default', 'Blinks, breathes, floats, follows the cursor and reacts to boops.'],
		['Fully themeable', 'Six presets, per-color overrides, or plain CSS variables.'],
		['Voice ready', 'Feed audio amplitude into `level` and the mouth lip-syncs.'],
		['Tiny & dependency-free', 'Pure SVG + Svelte 5 motion. No canvas, no runtime.'],
		['Accessible', 'Real button semantics, labels, and prefers-reduced-motion support.']
	];
</script>

<svelte:head>
	<title>mascott: a friendly, animated mascot for Svelte</title>
	<meta
		name="description"
		content="Animated, highly customizable SVG mascot component for Svelte 5."
	/>
</svelte:head>

<div class="aurora" aria-hidden="true"></div>

<header class="hero">
	<div class="hero-copy">
		<span class="badge">Svelte 5 · SVG · zero deps</span>
		<h1>Meet <span class="grad">mascott</span>.</h1>
		<p class="lead">
			A friendly little companion for your app. It blinks, floats, listens, thinks and talks, and
			you can restyle every part of it.
		</p>
		<div class="hero-actions">
			<button class="install" onclick={() => copy('pnpm add mascott')}>
				<code>pnpm add mascott</code>
				<span>{copied ? 'Copied!' : 'Copy'}</span>
			</button>
			<a class="ghost" href="#playground">Open playground →</a>
		</div>
		<div class="chips small">
			{#each ['love', 'thinking', 'surprised', 'sleepy', 'wink'] as const as m (m)}
				<button onclick={() => react(m, m === 'sleepy' ? 3200 : 1800)}>{m}</button>
			{/each}
		</div>
	</div>
	<div class="hero-stage">
		<div class="glow"></div>
		<Mascot
			mood={heroMood}
			accessories={['ring']}
			size="min(420px, 80vw)"
			label="mascott, boop me"
		/>
		<p class="hint">psst, boop it</p>
	</div>
</header>

<main>
	<section class="features">
		{#each features as [title, text] (title)}
			<article class="card feature">
				<h3>{title}</h3>
				<p>{text}</p>
			</article>
		{/each}
	</section>

	<section id="playground" class="playground card">
		<div class="stage">
			<Mascot
				{mood}
				{theme}
				{shape}
				{eyes}
				{accessories}
				{hands}
				{float}
				{lookAt}
				{size}
				onboop={() => boops++}
			/>
			<span class="boops">{boops} {boops === 1 ? 'boop' : 'boops'}</span>
		</div>

		<div class="controls">
			<h2>Playground</h2>

			<fieldset>
				<legend>Mood</legend>
				<div class="chips">
					{#each MOODS as m (m)}
						<button class:active={mood === m} onclick={() => (mood = m)}>{m}</button>
					{/each}
				</div>
			</fieldset>

			<fieldset>
				<legend>Theme</legend>
				<div class="swatches">
					{#each themeNames as name (name)}
						<button
							class="swatch"
							class:active={theme === name}
							title={name}
							aria-label="{name} theme"
							style="--a: {THEMES[name].bodyMid}; --b: {THEMES[name].bodyDark}; --c: {THEMES[name]
								.eye}"
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
							<button class:active={shape === s} onclick={() => (shape = s)}>{s}</button>
						{/each}
					</div>
				</fieldset>
				<fieldset>
					<legend>Eyes</legend>
					<div class="chips">
						{#each EYE_STYLES as e (e)}
							<button class:active={eyes === e} onclick={() => (eyes = e)}>{e}</button>
						{/each}
					</div>
				</fieldset>
			</div>

			<fieldset>
				<legend>Accessories</legend>
				<div class="chips">
					{#each ACCESSORIES as a (a)}
						<button class:active={accessories.includes(a)} onclick={() => toggle(a)}>{a}</button>
					{/each}
				</div>
			</fieldset>

			<div class="row">
				<fieldset>
					<legend>Gaze</legend>
					<div class="chips">
						{#each ['pointer', 'wander', 'none'] as const as l (l)}
							<button class:active={lookAt === l} onclick={() => (lookAt = l)}>{l}</button>
						{/each}
					</div>
				</fieldset>
				<fieldset>
					<legend>Extras</legend>
					<div class="chips">
						<button class:active={hands} onclick={() => (hands = !hands)}>hands</button>
						<button class:active={float} onclick={() => (float = !float)}>float</button>
					</div>
				</fieldset>
			</div>

			<fieldset>
				<legend>Size · {size}px</legend>
				<input type="range" min="80" max="360" bind:value={size} />
			</fieldset>

			<div class="code">
				<pre><code>{code}</code></pre>
				<button onclick={() => copy(code)}>{copied ? 'Copied!' : 'Copy'}</button>
			</div>
		</div>
	</section>

	<section>
		<h2 class="section-title">Every mood</h2>
		<p class="section-sub">Switch `mood` and the face morphs smoothly into the new expression.</p>
		<div class="grid">
			{#each MOODS as m (m)}
				<figure class="card tile">
					<Mascot mood={m} size={130} interactive={false} lookAt="wander" label="{m} mascot" />
					<figcaption>{m}</figcaption>
				</figure>
			{/each}
		</div>
	</section>

	<section>
		<h2 class="section-title">A whole family</h2>
		<p class="section-sub">Shapes, eyes, accessories and themes all combine freely.</p>
		<div class="family">
			<Mascot
				theme="peach"
				shape="orb"
				accessories={['ears']}
				mood="happy"
				size={150}
				lookAt="wander"
			/>
			<Mascot
				theme="mint"
				shape="bean"
				eyes="pill"
				accessories={['sprout']}
				size={150}
				lookAt="wander"
			/>
			<Mascot
				theme="midnight"
				shape="squircle"
				eyes="wide"
				accessories={['headphones']}
				mood="listening"
				size={150}
			/>
			<Mascot theme="bubblegum" shape="ghost" accessories={['halo']} mood="love" size={150} />
			<Mascot
				theme="sunny"
				shape="pebble"
				eyes="dot"
				accessories={['antenna']}
				mood="wink"
				size={150}
			/>
		</div>
	</section>

	<section class="card usage">
		<h2>Use it</h2>
		<pre><code>{usage}</code></pre>
	</section>
</main>

<footer>
	<Mascot mood="sleepy" size={56} interactive={false} hands={false} label="sleeping mascot" />
	<span>mascott · MIT</span>
</footer>

<style>
	:global(html) {
		color-scheme: dark;
		background: #0b0b1e;
	}
	:global(body) {
		margin: 0;
		font-family:
			ui-rounded,
			'SF Pro Rounded',
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		color: #e9e8ff;
		overflow-x: hidden;
	}

	.aurora {
		position: fixed;
		inset: -20vmax;
		z-index: -1;
		background:
			radial-gradient(40vmax 30vmax at 20% 15%, #6d5dfc55, transparent 60%),
			radial-gradient(35vmax 30vmax at 85% 20%, #ff7ac855, transparent 60%),
			radial-gradient(40vmax 35vmax at 60% 90%, #22d3ee33, transparent 60%), #0b0b1e;
		filter: blur(20px);
		animation: drift 18s ease-in-out infinite alternate;
	}
	@keyframes drift {
		to {
			transform: translate(3vmax, -2vmax) rotate(4deg);
		}
	}

	.hero {
		max-width: 1160px;
		margin: 0 auto;
		padding: 6rem 1.5rem 3rem;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		align-items: center;
		gap: 2rem;
	}
	.badge {
		display: inline-block;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		background: #ffffff12;
		border: 1px solid #ffffff22;
		font-size: 0.85rem;
		color: #c9c6ff;
	}
	h1 {
		font-size: clamp(3rem, 7vw, 5.5rem);
		line-height: 1;
		margin: 1.2rem 0 1rem;
		letter-spacing: -0.03em;
	}
	.grad {
		background: linear-gradient(100deg, #a5f3fc, #c4b5fd 45%, #f9a8d4);
		background-clip: text;
		color: transparent;
	}
	.lead {
		font-size: 1.2rem;
		line-height: 1.6;
		color: #bdbbe0;
		max-width: 34rem;
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin: 2rem 0 1.4rem;
	}
	.install {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.8rem 1rem 0.8rem 1.2rem;
		border-radius: 14px;
		border: 1px solid #ffffff26;
		background: #ffffff10;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.install span {
		font-size: 0.8rem;
		padding: 0.25rem 0.6rem;
		border-radius: 8px;
		background: #c4b5fd;
		color: #1a1740;
		font-weight: 700;
	}
	.ghost {
		display: flex;
		align-items: center;
		padding: 0.8rem 1.2rem;
		border-radius: 14px;
		color: #e9e8ff;
		text-decoration: none;
		font-weight: 600;
	}
	.ghost:hover {
		background: #ffffff10;
	}

	.hero-stage {
		position: relative;
		display: grid;
		place-items: center;
	}
	.glow {
		position: absolute;
		width: 70%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, #a78bfa66, transparent 65%);
		filter: blur(30px);
	}
	.hint {
		margin: 0.5rem 0 0;
		color: #8f8cc0;
		font-size: 0.9rem;
	}

	main {
		max-width: 1160px;
		margin: 0 auto;
		padding: 0 1.5rem 4rem;
		display: grid;
		gap: 4rem;
	}
	.card {
		background: linear-gradient(160deg, #ffffff12, #ffffff06);
		border: 1px solid #ffffff1c;
		border-radius: 28px;
		backdrop-filter: blur(16px);
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}
	.feature {
		padding: 1.4rem 1.5rem;
	}
	.feature h3 {
		margin: 0 0 0.4rem;
		font-size: 1.05rem;
	}
	.feature p {
		margin: 0;
		color: #aeabd6;
		line-height: 1.5;
		font-size: 0.95rem;
	}

	.playground {
		display: grid;
		grid-template-columns: 1fr 1.1fr;
		overflow: hidden;
	}
	.stage {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 460px;
		background:
			radial-gradient(circle at 50% 45%, #ffffff14, transparent 60%),
			repeating-linear-gradient(0deg, #ffffff06 0 1px, transparent 1px 28px),
			repeating-linear-gradient(90deg, #ffffff06 0 1px, transparent 1px 28px);
	}
	.boops {
		position: absolute;
		bottom: 1rem;
		left: 1.2rem;
		font-size: 0.85rem;
		color: #8f8cc0;
	}
	.controls {
		padding: 2rem;
		display: grid;
		gap: 1.1rem;
		align-content: start;
		border-left: 1px solid #ffffff14;
	}
	.controls h2 {
		margin: 0;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #8f8cc0;
		margin-bottom: 0.5rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chips button {
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		border: 1px solid #ffffff1f;
		background: #ffffff0a;
		color: #d6d4f5;
		font: inherit;
		font-size: 0.88rem;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.15s;
	}
	.chips button:hover {
		background: #ffffff18;
	}
	.chips button:active {
		transform: scale(0.95);
	}
	.chips button.active {
		background: linear-gradient(120deg, #a5f3fc, #c4b5fd);
		color: #17173a;
		border-color: transparent;
		font-weight: 700;
	}
	.chips.small button {
		font-size: 0.8rem;
	}
	.swatches {
		display: flex;
		gap: 0.6rem;
	}
	.swatch {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: 2px solid transparent;
		background:
			radial-gradient(circle at 50% 50%, var(--c) 0 18%, transparent 20%),
			radial-gradient(circle at 35% 30%, var(--a), var(--b));
		cursor: pointer;
		transition: transform 0.15s;
	}
	.swatch:hover {
		transform: scale(1.1);
	}
	.swatch.active {
		border-color: #fff;
		box-shadow: 0 0 0 3px #c4b5fd55;
	}
	input[type='range'] {
		width: 100%;
		accent-color: #c4b5fd;
	}
	.code {
		position: relative;
	}
	pre {
		margin: 0;
		padding: 1rem 1.2rem;
		border-radius: 16px;
		background: #07071acc;
		border: 1px solid #ffffff14;
		overflow-x: auto;
		font-size: 0.85rem;
		line-height: 1.6;
		color: #c9f7ff;
	}
	.code button {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		padding: 0.3rem 0.7rem;
		border-radius: 8px;
		border: 0;
		background: #ffffff18;
		color: inherit;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.section-title {
		font-size: 2rem;
		margin: 0;
		text-align: center;
	}
	.section-sub {
		text-align: center;
		color: #aeabd6;
		margin: 0.5rem 0 2rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 1rem;
	}
	.tile {
		margin: 0;
		padding: 1.2rem 0.5rem 1rem;
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		transition: transform 0.2s;
	}
	.tile:hover {
		transform: translateY(-4px);
	}
	figcaption {
		font-weight: 600;
		color: #d6d4f5;
	}
	.family {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.5rem;
	}
	.usage {
		padding: 2rem;
	}
	.usage h2 {
		margin-top: 0;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 2rem;
		color: #8f8cc0;
	}

	@media (max-width: 860px) {
		.hero,
		.playground {
			grid-template-columns: 1fr;
		}
		.hero {
			padding-top: 3rem;
			text-align: center;
		}
		.lead {
			margin-inline: auto;
		}
		.hero-actions,
		.chips.small {
			justify-content: center;
		}
		.controls {
			border-left: 0;
			border-top: 1px solid #ffffff14;
		}
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>

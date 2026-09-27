<script lang="ts">
	import {
		ACCESSORIES,
		MOODS,
		Mascot,
		THEMES,
		type Accessory,
		type EyeStyle,
		type Mood,
		type Outfit,
		type Shape,
		type Shoes,
		type ThemeName
	} from '$lib/index.js';
	import { reveal, spotlight } from './interactions.js';

	let body = $state(false);

	const themeNames = Object.keys(THEMES) as ThemeName[];
	const has = (a: Accessory) => ACCESSORIES.includes(a);

	type Member = {
		name: string;
		theme: ThemeName;
		shape: Shape;
		eyes?: EyeStyle;
		accessories: Accessory[];
		mood: Mood;
		body?: boolean;
		outfit?: Outfit;
		shoes?: Shoes;
	};
	const family: Member[] = (
		[
			{ name: 'Pip', theme: 'mocha', shape: 'orb', accessories: ['ears'], mood: 'happy' },
			{
				name: 'Fern',
				theme: 'ice',
				shape: 'bean',
				eyes: 'pill',
				accessories: ['sprout'],
				mood: 'idle',
				body: true,
				outfit: 'hoodie',
				shoes: 'hightops'
			},
			{
				name: 'Nova',
				theme: 'noir',
				shape: 'squircle',
				eyes: 'wide',
				accessories: ['headphones'],
				mood: 'listening'
			},
			{
				name: 'Mochi',
				theme: 'lilac',
				shape: 'ghost',
				accessories: ['halo'],
				mood: 'love',
				body: true,
				outfit: 'bowtie'
			},
			{
				name: 'Sol',
				theme: 'volt',
				shape: 'pebble',
				eyes: 'dot',
				accessories: ['antenna'],
				mood: 'wink',
				body: true,
				shoes: 'boots'
			}
		] satisfies Member[]
	).map((m) => ({
		...m,
		theme: themeNames.includes(m.theme) ? m.theme : themeNames[0],
		accessories: m.accessories.filter(has)
	}));

	// Deliberately includes bare looks so it is obvious that gear is opt-in.
	const fits: { theme: ThemeName; outfit: Outfit; shoes: Shoes; mood: Mood }[] = (
		[
			{ theme: 'og', outfit: 'none', shoes: 'none', mood: 'idle' },
			{ theme: 'volt', outfit: 'puffer', shoes: 'sneakers', mood: 'happy' },
			{ theme: 'noir', outfit: 'hoodie', shoes: 'hightops', mood: 'grumpy' },
			{ theme: 'mocha', outfit: 'scarf', shoes: 'boots', mood: 'sleepy' },
			{ theme: 'lilac', outfit: 'bowtie', shoes: 'none', mood: 'love' },
			{ theme: 'ice', outfit: 'none', shoes: 'sneakers', mood: 'wink' }
		] satisfies { theme: ThemeName; outfit: Outfit; shoes: Shoes; mood: Mood }[]
	).map((f) => ({
		...f,
		theme: themeNames.includes(f.theme) ? f.theme : themeNames[0]
	}));
</script>

<section id="moods" class="section">
	<div class="section-head" {@attach reveal()}>
		<span class="kicker">Moods</span>
		<h2>{MOODS.length} moods, one smooth face.</h2>
		<p>
			Switch <code>mood</code> and every feature morphs into the new expression. Effects, hands and floating
			speed follow along.
		</p>
		<div class="segmented" role="group" aria-label="Gallery mode">
			<button class:active={!body} aria-pressed={!body} onclick={() => (body = false)}>Head</button>
			<button class:active={body} aria-pressed={body} onclick={() => (body = true)}
				>Full body</button
			>
			<span class="thumb" class:right={body} aria-hidden="true"></span>
		</div>
	</div>
	<div class="grid" class:tall={body}>
		{#each MOODS as m, i (m)}
			<figure class="tile glass" {@attach reveal((i % 6) * 60)} {@attach spotlight}>
				<Mascot
					mood={m}
					{body}
					size={body ? 'min(104px, 24vw)' : 'min(124px, 25vw)'}
					interactive={false}
					lookAt="wander"
					label="{m} mascot"
				/>
				<figcaption>{m}</figcaption>
			</figure>
		{/each}
	</div>
</section>

<section id="family" class="section">
	<div class="section-head" {@attach reveal()}>
		<span class="kicker">Family</span>
		<h2>Mix and match.</h2>
		<p>Shapes, eyes, accessories, outfits and themes combine freely into a whole cast.</p>
	</div>
	<div class="family">
		{#each family as m, i (m.name)}
			<figure class="member" {@attach reveal(i * 90)}>
				<div class="pedestal" style:--glow={THEMES[m.theme].accent}>
					<Mascot
						theme={m.theme}
						shape={m.shape}
						eyes={m.eyes}
						accessories={m.accessories}
						mood={m.mood}
						body={m.body}
						outfit={m.outfit}
						shoes={m.shoes}
						size={m.body ? 118 : 150}
						lookAt="pointer"
						label="{m.name}, a {m.theme} mascot"
					/>
				</div>
				<figcaption>
					<strong>{m.name}</strong>
					<span>{m.theme} · {m.shape}</span>
				</figcaption>
			</figure>
		{/each}
	</div>
</section>

<section id="fits" class="section">
	<div class="section-head" {@attach reveal()}>
		<span class="kicker">Fits</span>
		<h2>Dressed up or dressed down.</h2>
		<p>
			The full body starts plain. Add an <code>outfit</code> and <code>shoes</code> when you want the
			extra swagger.
		</p>
	</div>
	<div class="grid tall">
		{#each fits as f, i (i)}
			<figure class="tile glass" {@attach reveal((i % 6) * 60)} {@attach spotlight}>
				<Mascot
					theme={f.theme}
					mood={f.mood}
					body
					outfit={f.outfit}
					shoes={f.shoes}
					size="min(104px, 24vw)"
					interactive={false}
					lookAt="wander"
					label="mascot in {f.outfit} outfit with {f.shoes} shoes"
				/>
				<figcaption>{f.outfit} · {f.shoes}</figcaption>
			</figure>
		{/each}
	</div>
</section>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
		gap: 0.9rem;
	}
	.tile {
		position: relative;
		margin: 0;
		padding: 1.2rem 0.5rem 0.9rem;
		display: grid;
		justify-items: center;
		align-content: end;
		gap: 0.4rem;
		min-height: 200px;
		overflow: hidden;
		transition:
			transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
			border-color 0.3s;
	}
	.grid.tall .tile {
		min-height: 230px;
	}
	.tile::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			220px circle at var(--mx, 50%) var(--my, 0%),
			rgb(196 181 253 / 0.14),
			transparent 60%
		);
		opacity: 0;
		transition: opacity 0.3s;
		pointer-events: none;
	}
	.tile:hover {
		transform: translateY(-4px);
		border-color: rgb(255 255 255 / 0.16);
	}
	.tile:hover::before {
		opacity: 1;
	}
	.tile figcaption {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-2);
	}

	.family {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-end;
		gap: clamp(1rem, 3vw, 2.5rem);
	}
	.member {
		margin: 0;
		display: grid;
		justify-items: center;
		gap: 0.8rem;
	}
	.pedestal {
		position: relative;
		display: grid;
		place-items: end center;
	}
	.pedestal::after {
		content: '';
		position: absolute;
		z-index: -1;
		bottom: -6px;
		width: 80%;
		height: 26px;
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			color-mix(in srgb, var(--glow) 45%, transparent),
			transparent
		);
	}
	.member figcaption {
		display: grid;
		justify-items: center;
		gap: 0.1rem;
	}
	.member strong {
		font-size: 0.95rem;
	}
	.member span {
		font-size: 0.78rem;
		color: var(--text-3);
	}
	@media (max-width: 520px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.6rem;
		}
		.tile,
		.grid.tall .tile {
			min-height: 0;
			padding: 0.8rem 0.25rem 0.7rem;
			border-radius: 18px;
		}
		.tile figcaption {
			font-size: 0.78rem;
		}
	}
</style>

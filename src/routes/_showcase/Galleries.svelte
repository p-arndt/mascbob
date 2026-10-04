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
	import { reveal } from './interactions.js';

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

	const tint = (theme: ThemeName) => `color-mix(in srgb, ${THEMES[theme].accent} 16%, var(--bg))`;
</script>

<section id="moods" class="section">
	<div class="section-head" {@attach reveal()}>
		<h2>{MOODS.length} moods, one smooth face.</h2>
		<div>
			<p>
				Switch <code>mood</code> and every feature morphs into the new expression. Effects, hands and
				floating speed follow along.
			</p>
			<div class="segmented" role="group" aria-label="Gallery mode">
				<button class:active={!body} aria-pressed={!body} onclick={() => (body = false)}
					>Head</button
				>
				<button class:active={body} aria-pressed={body} onclick={() => (body = true)}
					>Full body</button
				>
				<span class="thumb" class:right={body} aria-hidden="true"></span>
			</div>
		</div>
	</div>
	<div class="grid" class:tall={body}>
		{#each MOODS as m, i (m)}
			<figure class="tile" {@attach reveal((i % 6) * 50)}>
				<Mascot
					mood={m}
					{body}
					size={body ? 'min(96px, 22vw)' : 'min(116px, 24vw)'}
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
		<h2>Mix and match a whole cast.</h2>
		<p>
			Shapes, eyes, accessories, outfits and colorways combine freely. Hover one, it looks back.
		</p>
	</div>
	<div class="cast">
		{#each family as m, i (m.name)}
			<figure class="member" data-perch style:--tint={tint(m.theme)} {@attach reveal(i * 70)}>
				<div class="stage">
					<Mascot
						theme={m.theme}
						shape={m.shape}
						eyes={m.eyes}
						accessories={m.accessories}
						mood={m.mood}
						body={m.body}
						outfit={m.outfit}
						shoes={m.shoes}
						size={m.body ? 112 : 140}
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
		<h2>Dressed up or dressed down.</h2>
		<p>
			The full body starts plain. Add an <code>outfit</code> and <code>shoes</code> when you want the
			extra swagger.
		</p>
	</div>
	<div class="grid tall">
		{#each fits as f, i (i)}
			<figure class="tile" {@attach reveal((i % 6) * 50)}>
				<Mascot
					theme={f.theme}
					mood={f.mood}
					body
					outfit={f.outfit}
					shoes={f.shoes}
					size="min(96px, 22vw)"
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
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 0.75rem;
	}
	.tile {
		margin: 0;
		display: grid;
		justify-items: center;
		align-content: end;
		gap: 0.6rem;
		min-height: 200px;
		padding: 1.25rem 0.5rem 1rem;
		border-radius: 28px;
		background: var(--surface);
		transition:
			background 0.2s,
			transform 0.3s var(--spring);
	}
	.grid.tall .tile {
		min-height: 240px;
	}
	/* Seven columns split the thirteen moods into two even-looking rows instead of leaving an orphan. */
	@media (min-width: 1100px) {
		#moods .grid {
			grid-template-columns: repeat(7, 1fr);
		}
	}
	.tile:hover {
		background: var(--surface-2);
		transform: translateY(-3px);
	}
	.tile figcaption {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-2);
	}

	.cast {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.member {
		margin: 0;
		display: grid;
		grid-template-rows: 1fr auto;
		min-height: 320px;
		padding: 1rem 1.25rem 1.25rem;
		border-radius: 28px;
		background: var(--tint);
		transition: transform 0.35s var(--spring);
	}
	.member:hover {
		transform: translateY(-4px) rotate(-1deg);
	}
	.stage {
		display: grid;
		place-items: end center;
		padding-bottom: 1rem;
	}
	.member figcaption {
		display: grid;
		gap: 0.1rem;
	}
	.member strong {
		font-size: 1.3rem;
		letter-spacing: -0.03em;
	}
	.member span {
		font-size: 0.86rem;
		color: var(--text-2);
	}

	@media (max-width: 1100px) {
		/* A swipeable rail instead of five squeezed cards. */
		.cast {
			grid-template-columns: none;
			grid-auto-flow: column;
			grid-auto-columns: minmax(220px, 1fr);
			overflow-x: auto;
			scroll-snap-type: x mandatory;
			scrollbar-width: none;
		}
		.member {
			scroll-snap-align: start;
		}
	}
	@media (max-width: 520px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.tile,
		.grid.tall .tile {
			min-height: 0;
			border-radius: 22px;
		}
	}
</style>

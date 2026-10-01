<script lang="ts">
	import { page } from '$app/state';
	import {
		ACCESSORIES,
		EYE_STYLES,
		BUILDS,
		MOODS,
		Mascot,
		OUTFITS,
		SHAPES,
		SHOES,
		SPECIES,
		PROPORTION_KEYS,
		type Proportions,
		type Species,
		type EyeStyle,
		type Build,
		type Outfit,
		type Shoes,
		type ThemeName
	} from '$lib/index.js';

	// Visual test bench: /lab?body=1&theme=mint&size=180&acc=ring,ears&outfit=scarf&shoes=boots&build=chubby
	// &eyes=cat&bg=ffe9a8 (hex without #, or a CSS color name), &pair=1 for every figure on white and black.
	const body = $derived(page.url.searchParams.get('body') !== '0');
	const species = $derived((page.url.searchParams.get('species') ?? 'bob') as Species);
	const proportions: Proportions = $derived(
		Object.fromEntries(
			PROPORTION_KEYS.flatMap((key) => {
				const value = page.url.searchParams.get(`p-${key}`);
				return value === null ? [] : [[key, Number(value)]];
			})
		)
	);
	const theme = $derived((page.url.searchParams.get('theme') ?? 'og') as ThemeName);
	const size = $derived(Number(page.url.searchParams.get('size') ?? 150));
	const outfitParam = $derived(page.url.searchParams.get('outfit') ?? '');
	const outfit = $derived<Outfit | undefined>(
		(OUTFITS as readonly string[]).includes(outfitParam) ? (outfitParam as Outfit) : undefined
	);
	const shoesParam = $derived(page.url.searchParams.get('shoes') ?? '');
	const shoes = $derived<Shoes | undefined>(
		(SHOES as readonly string[]).includes(shoesParam) ? (shoesParam as Shoes) : undefined
	);
	const eyesParam = $derived(page.url.searchParams.get('eyes') ?? '');
	const eyes = $derived<EyeStyle | undefined>(
		(EYE_STYLES as readonly string[]).includes(eyesParam) ? (eyesParam as EyeStyle) : undefined
	);
	const bg = $derived.by(() => {
		const v = page.url.searchParams.get('bg') ?? '';
		if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) return `#${v}`;
		return /^[a-z]+$/i.test(v) ? v : '#0b0b1e';
	});
	const grounds = $derived(page.url.searchParams.get('pair') === '1' ? ['#fff', '#111'] : [null]);
	const buildParam = $derived(page.url.searchParams.get('build') ?? '');
	const build = $derived<Build | undefined>(
		(BUILDS as readonly string[]).includes(buildParam) ? (buildParam as Build) : undefined
	);
	const acc = $derived(
		(page.url.searchParams.get('acc') ?? '')
			.split(',')
			.filter((a): a is (typeof ACCESSORIES)[number] =>
				(ACCESSORIES as readonly string[]).includes(a)
			)
	);

	const cases = [
		...SPECIES.map((species) => ({
			key: `species-${species}`,
			name: species,
			species,
			mood: undefined,
			shape: undefined
		})),
		...MOODS.map((mood) => ({
			key: `mood-${mood}`,
			name: mood,
			species: undefined,
			mood,
			shape: undefined
		})),
		...SHAPES.map((shape) => ({
			key: `shape-${shape}`,
			name: shape,
			species: undefined,
			mood: undefined,
			shape
		}))
	];
</script>

<div class="bench" style:background={bg}>
	{#each cases as c (c.key)}
		<figure>
			<div class="grounds">
				{#each grounds as ground, i (i)}
					<div class="ground" style:background={ground}>
						<Mascot
							species={c.species ?? species}
							mood={c.mood}
							shape={c.shape}
							{eyes}
							{proportions}
							motion={page.url.searchParams.get('motion') === 'reduced' ? 'reduced' : 'auto'}
							{body}
							{outfit}
							{shoes}
							{build}
							{theme}
							{size}
							accessories={acc}
							lookAt="none"
							interactive={false}
						/>
					</div>
				{/each}
			</div>
			<figcaption>{c.name}</figcaption>
		</figure>
	{/each}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui;
	}
	.bench {
		min-height: 100vh;
		box-sizing: border-box;
		display: flex;
		align-content: flex-start;
		flex-wrap: wrap;
		gap: 12px;
		padding: 16px;
	}
	figure {
		margin: 0;
		display: grid;
		justify-items: center;
		gap: 4px;
	}
	.grounds {
		display: flex;
	}
	.ground {
		display: grid;
		place-items: center;
		padding: 6px;
	}
	/* Readable on any bg= without having to compute its luminance. */
	figcaption {
		color: #fff;
		mix-blend-mode: difference;
	}
</style>

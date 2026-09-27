<script lang="ts">
	import { page } from '$app/state';
	import {
		ACCESSORIES,
		MOODS,
		Mascot,
		OUTFITS,
		SHAPES,
		type Outfit,
		type ThemeName
	} from '$lib/index.js';

	// Visual test bench: /lab?body=1&theme=mint&size=180&acc=ring,ears&outfit=scarf
	const body = $derived(page.url.searchParams.get('body') === '1');
	const theme = $derived((page.url.searchParams.get('theme') ?? 'aurora') as ThemeName);
	const size = $derived(Number(page.url.searchParams.get('size') ?? 150));
	const outfitParam = $derived(page.url.searchParams.get('outfit') ?? 'none');
	const outfit = $derived<Outfit>(
		(OUTFITS as readonly string[]).includes(outfitParam) ? (outfitParam as Outfit) : 'none'
	);
	const acc = $derived(
		(page.url.searchParams.get('acc') ?? '')
			.split(',')
			.filter((a): a is (typeof ACCESSORIES)[number] =>
				(ACCESSORIES as readonly string[]).includes(a)
			)
	);
</script>

<div class="bench">
	{#each MOODS as mood (mood)}
		<figure>
			<Mascot
				{mood}
				{body}
				{outfit}
				{theme}
				{size}
				accessories={acc}
				lookAt="none"
				interactive={false}
			/>
			<figcaption>{mood}</figcaption>
		</figure>
	{/each}
	{#each SHAPES as shape (shape)}
		<figure>
			<Mascot
				{shape}
				{body}
				{outfit}
				{theme}
				{size}
				accessories={acc}
				lookAt="none"
				interactive={false}
			/>
			<figcaption>{shape}</figcaption>
		</figure>
	{/each}
</div>

<style>
	:global(body) {
		margin: 0;
		background: #0b0b1e;
		color: #ccc;
		font-family: system-ui;
	}
	.bench {
		display: flex;
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
</style>

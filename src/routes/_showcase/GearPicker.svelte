<script lang="ts" generics="T extends string">
	import type { ComponentProps } from 'svelte';
	import { Mascot } from '$lib/index.js';
	import { gearLabel, type GearCrop } from './gear.js';

	type Look = Omit<ComponentProps<typeof Mascot>, 'body' | 'size'>;

	let {
		items,
		crop,
		isOn,
		pick,
		look,
		disabled = false,
		label = gearLabel
	}: {
		items: readonly T[];
		/** One window for every tile, or one per item when the items change the silhouette. */
		crop: GearCrop | ((item: T) => GearCrop);
		isOn: (item: T) => boolean;
		pick: (item: T) => void;
		/** The mascot as it would look after picking `item`. */
		look: (item: T) => Look;
		disabled?: boolean;
		label?: (item: T) => string;
	} = $props();
</script>

<div class="tiles" class:dense={items.length > 12} class:roomy={items.length <= 8}>
	{#each items as item (item)}
		{@const c = typeof crop === 'function' ? crop(item) : crop}
		<button
			class="tile"
			class:active={isOn(item)}
			aria-pressed={isOn(item)}
			{disabled}
			onclick={() => pick(item)}
		>
			<span class="frame" style:aspect-ratio={c.aspect} aria-hidden="true">
				<span
					class="crop"
					style:width="{c.width * 100}%"
					style:left="{c.left * 100}%"
					style:margin-top="{(c.top - 0.5) * 100}%"
				>
					<Mascot
						{...look(item)}
						body={c.body}
						size="100%"
						float={false}
						effects={false}
						interactive={false}
						lookAt="none"
						motion="reduced"
						label=""
					/>
				</span>
			</span>
			<span class="name">{label(item)}</span>
		</button>
	{/each}
</div>

<style>
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 8px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px 6px 8px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		color: inherit;
		font: inherit;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.tile:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--text-1) 35%, var(--line));
	}
	.tile.active {
		border-color: var(--text-1);
		box-shadow: inset 0 0 0 1px var(--text-1);
		background: color-mix(in srgb, var(--text-1) 5%, var(--surface));
	}
	.tile:disabled {
		cursor: not-allowed;
	}
	.frame {
		position: relative;
		display: block;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 8px;
		background: color-mix(in srgb, var(--text-1) 4%, transparent);
	}
	/* Crops are fractions of a square as wide as the frame; a width-relative margin from the middle
	   keeps them centered when a wide frame trims the top and bottom. */
	.crop {
		position: absolute;
		top: 50%;
		display: block;
		pointer-events: none;
	}
	.crop :global(.mascbob) {
		display: block;
	}
	.name {
		font-size: 12px;
		line-height: 1.2;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (max-width: 520px) {
		.tiles {
			grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
			gap: 6px;
		}
		.tiles.roomy {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		}
		/* Long lists stay small so the whole set fits the phone panel without scrolling. */
		.tiles.dense {
			grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
			gap: 5px;
		}
		.tile {
			padding: 4px 4px 6px;
		}
		.dense .tile {
			padding: 4px 2px 6px;
		}
		.dense .frame {
			aspect-ratio: 1.15;
		}
		.dense .name {
			font-size: 10px;
			letter-spacing: -0.01em;
		}
	}
	/* The standalone studio scrolls with the page instead of fitting a fixed panel, so tiles can be big. */
	@media (max-width: 900px) {
		:global(.standalone) .tiles {
			grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
			gap: 8px;
		}
		:global(.standalone) .tile {
			padding: 6px 6px 8px;
		}
		:global(.standalone) .dense .frame {
			aspect-ratio: 1;
		}
		:global(.standalone) .name {
			font-size: 12px;
			letter-spacing: normal;
		}
	}
</style>

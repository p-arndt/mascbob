<script lang="ts">
	import { getMascot, svgRef } from '../context.js';
	import type { Accessory } from './accessories.js';

	/** `back` draws behind the head shell, `front` on top of the face. */
	let { layer }: { layer: 'back' | 'front' } = $props();

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const has = (a: Accessory) => m.accessories.includes(a);
	const t = $derived(m.shape.top);
	const hw = $derived(m.shape.halfWidth);
</script>

{#if layer === 'back'}
	<defs>
		<clipPath id="{m.uid}-ring-back" clipPathUnits="userSpaceOnUse">
			<rect x="-20" y="-20" width="240" height="154" />
		</clipPath>
		<clipPath id="{m.uid}-ring-front" clipPathUnits="userSpaceOnUse">
			<rect x="-20" y="134" width="240" height="86" />
		</clipPath>
	</defs>
	{#if has('ring')}
		<g transform="rotate(-8 100 134)" clip-path={ref('ring-back')}>
			<ellipse class="ring" cx="100" cy="134" rx="96" ry="16" />
		</g>
	{/if}
	{#if has('ears')}
		<path
			class="ear"
			d="M62 {t + 34}C58 {t + 4} 60 {t - 14} 70 {t - 12}C80 {t - 10} 92 {t + 6} 94 {t + 14}Z"
		/>
		<path
			class="ear-inner"
			d="M68 {t + 20}C66 {t + 6} 68 {t - 4} 72 {t - 3}C77 {t - 2} 84 {t + 6} 86 {t + 12}Z"
		/>
		<path
			class="ear"
			d="M138 {t + 34}C142 {t + 4} 140 {t - 14} 130 {t - 12}C120 {t - 10} 108 {t + 6} 106 {t + 14}Z"
		/>
		<path
			class="ear-inner"
			d="M132 {t + 20}C134 {t + 6} 132 {t - 4} 128 {t - 3}C123 {t - 2} 116 {t + 6} 114 {t + 12}Z"
		/>
	{/if}
	{#if has('headphones')}
		<path
			class="band"
			d="M{100 - hw - 2} 104C{100 - hw - 2} {t - 46} {100 + hw + 2} {t - 46} {100 + hw + 2} 104"
		/>
	{/if}
	{#if has('antenna')}
		<line class="stalk" x1="100" y1={t + 4} x2="100" y2={t - 14} />
		<circle class="antenna-tip" cx="100" cy={t - 18} r="6" filter={ref('glow')} />
	{/if}
	{#if has('sprout')}
		<g class="sprout" style:transform-origin="100px {t}px">
			<path class="stem" d="M100 {t + 4}Q98 {t - 6} 100 {t - 14}" />
			<path
				class="leaf"
				d="M100 {t - 12}C92 {t - 26} 78 {t - 22} 76 {t - 16}C84 {t - 8} 94 {t - 8} 100 {t - 12}Z"
			/>
			<path
				class="leaf"
				d="M100 {t - 14}C106 {t - 30} 122 {t - 28} 124 {t - 22}C116 {t - 12} 106 {t - 10} 100 {t -
					14}Z"
			/>
		</g>
	{/if}
{:else}
	{#if has('ring')}
		<g transform="rotate(-8 100 134)" clip-path={ref('ring-front')}>
			<ellipse class="ring" cx="100" cy="134" rx="96" ry="16" />
			<ellipse class="ring-dash" cx="100" cy="134" rx="96" ry="16" />
		</g>
	{/if}
	{#if has('headphones')}
		<rect class="cup" x={100 - hw - 9} y="88" width="16" height="32" rx="8" />
		<rect class="cup" x={100 + hw - 7} y="88" width="16" height="32" rx="8" />
		<rect
			class="cup-light"
			x={100 - hw - 4}
			y="98"
			width="4"
			height="12"
			rx="2"
			filter={ref('glow')}
		/>
		<rect class="cup-light" x={100 + hw} y="98" width="4" height="12" rx="2" filter={ref('glow')} />
	{/if}
	{#if has('halo')}
		<ellipse class="halo" cx="100" cy={t - 12} rx="30" ry="7" filter={ref('glow')} />
	{/if}
{/if}

<style>
	.ring {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 3;
		stroke-opacity: 0.85;
	}
	.ring-dash {
		fill: none;
		stroke: #fff;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 1 26;
		opacity: 0.9;
		animation: orbit 6s linear infinite;
	}
	.halo {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 4;
		transform-box: fill-box;
		transform-origin: center;
		animation: bob 2.4s ease-in-out infinite alternate;
	}
	.ear {
		fill: var(--c-body-mid);
	}
	.ear-inner {
		fill: var(--c-cheek);
		opacity: 0.55;
	}
	.band {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 6;
		stroke-linecap: round;
	}
	.cup {
		fill: var(--c-visor);
	}
	.cup-light {
		fill: var(--c-accent);
	}
	.stalk {
		stroke: var(--c-body-dark);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.antenna-tip {
		fill: var(--c-accent);
		transform-box: fill-box;
		transform-origin: center;
		animation: pulse 1.6s ease-in-out infinite alternate;
	}
	.stem {
		fill: none;
		stroke: var(--c-sprout);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.leaf {
		fill: var(--c-sprout);
	}
	.sprout {
		transform-box: view-box;
		animation: sway 3s ease-in-out infinite alternate;
	}

	@keyframes orbit {
		to {
			stroke-dashoffset: -108;
		}
	}
	@keyframes bob {
		to {
			transform: translateY(-4px);
		}
	}
	@keyframes pulse {
		to {
			transform: scale(1.25);
			opacity: 0.8;
		}
	}
	@keyframes sway {
		from {
			transform: rotate(-6deg);
		}
		to {
			transform: rotate(6deg);
		}
	}
</style>

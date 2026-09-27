<script lang="ts">
	import { getMascot, svgRef } from '../context.js';

	/**
	 * Matte soft-touch shell, like a vinyl toy: one broad diffuse light from the
	 * top left, a soft occlusion at the bottom, a rim light on the opposite edge and
	 * a printed key line. No gloss or iridescence, which read as generic.
	 */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const t = $derived(m.shape.top);
	const cy = $derived((m.shape.top + m.shape.bottom) / 2);
	// The light stays put while the head rocks, so the sheen turns back against the lean.
	// Only half way: a matte shell's highlight is broad and partly rides with the surface.
	const sheenTurn = $derived(-m.lean * 0.5);
	// Rim width along the bottom-right diagonal.
	const RIM = 1.8;
</script>

<defs>
	<clipPath id="{m.uid}-shell-clip">
		<path d={m.shape.d} />
	</clipPath>
	<!-- The shell minus itself shifted toward the key light leaves a crescent on the far edge. -->
	<mask id="{m.uid}-rim-mask">
		<path d={m.shape.d} fill="#fff" />
		<path d={m.shape.d} fill="#000" transform="translate({-RIM} {-RIM})" />
	</mask>
	<linearGradient id="{m.uid}-ao" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0.55" class="stop-ink" stop-opacity="0" />
		<stop offset="1" class="stop-ink" stop-opacity="0.12" />
	</linearGradient>
	<radialGradient id="{m.uid}-sheen" cx="0.5" cy="0.5" r="0.5">
		<stop offset="0" class="stop-sheen" stop-opacity="0.55" />
		<stop offset="1" class="stop-sheen" stop-opacity="0" />
	</radialGradient>
</defs>

<path d={m.shape.d} fill={ref('body')} />
<g class="shell-light" clip-path={ref('shell-clip')}>
	<path d={m.shape.d} fill={ref('ao')} />
	<g transform="rotate({sheenTurn} 100 {cy})">
		<ellipse
			cx="80"
			cy={t + 26}
			rx="34"
			ry="20"
			fill={ref('sheen')}
			transform="rotate(-24 80 {t + 26})"
		/>
	</g>
	<path class="rim" d={m.shape.d} mask={ref('rim-mask')} />
</g>
<path class="key-line" d={m.shape.d} />

<style>
	.stop-ink {
		stop-color: var(--c-visor);
	}
	/* Tinted by the body so dark colorways get a dim highlight instead of a milky smear. */
	.stop-sheen {
		stop-color: color-mix(in oklab, var(--c-body-light) 70%, #fff);
	}
	/* Pulled toward the accent so the edge still separates a dark shell from a dark page. */
	.rim {
		fill: color-mix(in oklab, var(--c-body-light) 50%, var(--c-accent));
		opacity: 0.9;
	}
	.key-line {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-linejoin: round;
		opacity: 0.5;
	}
</style>

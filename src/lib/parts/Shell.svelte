<script lang="ts">
	import { getMascot, svgRef } from '../context.js';

	/**
	 * Matte soft-touch shell, like a vinyl toy: one broad diffuse light from the
	 * top left, a soft occlusion at the bottom and a faint edge. No gloss or
	 * iridescence, which read as generic.
	 */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const t = $derived(m.shape.top);
	// The light stays put while the face turns, so the sheen drifts against the gaze.
	const sx = $derived(-m.gazeX * 4);
	const sy = $derived(-m.gazeY * 3);
</script>

<defs>
	<clipPath id="{m.uid}-shell-clip">
		<path d={m.shape.d} />
	</clipPath>
	<linearGradient id="{m.uid}-ao" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0.55" class="stop-ink" stop-opacity="0" />
		<stop offset="1" class="stop-ink" stop-opacity="0.12" />
	</linearGradient>
	<radialGradient id="{m.uid}-sheen" cx="0.5" cy="0.5" r="0.5">
		<stop offset="0" stop-color="#fff" stop-opacity="0.55" />
		<stop offset="1" stop-color="#fff" stop-opacity="0" />
	</radialGradient>
</defs>

<path d={m.shape.d} fill={ref('body')} />
<g clip-path={ref('shell-clip')}>
	<path d={m.shape.d} fill={ref('ao')} />
	<ellipse
		cx={80 + sx}
		cy={t + 26 + sy}
		rx="34"
		ry="20"
		fill={ref('sheen')}
		transform="rotate(-24 {80 + sx} {t + 26 + sy})"
	/>
</g>
<path class="edge" d={m.shape.d} />

<style>
	.stop-ink {
		stop-color: var(--c-visor);
	}
	.edge {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.2;
		opacity: 0.14;
	}
</style>

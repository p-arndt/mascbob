<script lang="ts">
	import { getMascot, svgRef } from '../context.js';

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const t = $derived(m.shape.top);
</script>

<defs>
	<linearGradient id="{m.uid}-sheen" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0.15" class="stop-eye" stop-opacity="0" />
		<stop offset="0.45" class="stop-cheek" stop-opacity="0.28" />
		<stop offset="0.7" class="stop-accent" stop-opacity="0.32" />
		<stop offset="1" class="stop-eye" stop-opacity="0" />
	</linearGradient>
</defs>

<path d={m.shape.d} fill={ref('body')} />
<path d={m.shape.d} fill={ref('sheen')} />
<path class="rim" d={m.shape.d} />
<ellipse
	class="highlight"
	cx="76"
	cy={t + 20}
	rx="20"
	ry="8"
	transform="rotate(-26 76 {t + 20})"
	filter={ref('soft')}
/>
<circle class="highlight" cx="58" cy={t + 40} r="3.2" />

<style>
	.stop-eye {
		stop-color: var(--c-eye);
	}
	.stop-cheek {
		stop-color: var(--c-cheek);
	}
	.stop-accent {
		stop-color: var(--c-accent);
	}
	.rim {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.55;
		stroke-width: 1.5;
	}
	.highlight {
		fill: #fff;
		opacity: 0.75;
	}
</style>

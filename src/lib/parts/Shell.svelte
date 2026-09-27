<script lang="ts">
	import { getMascot, svgRef } from '../context.js';

	/**
	 * Pearly head shell. Layers, bottom to top: base gradient, subsurface edge glow,
	 * a slowly drifting iridescent film, ambient occlusion, a fresnel rim and a
	 * specular highlight that slides against the gaze so the head reads as a 3D bulb.
	 */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const t = $derived(m.shape.top);
	const hw = $derived(m.shape.halfWidth);
	const mid = $derived((m.shape.top + m.shape.bottom) / 2);
	// The light source stays put while the face turns, so reflections move the other way.
	const sx = $derived(-m.gazeX * 5);
	const sy = $derived(-m.gazeY * 3.5);
</script>

<defs>
	<clipPath id="{m.uid}-shell-clip">
		<path d={m.shape.d} />
	</clipPath>
	<radialGradient id="{m.uid}-sss" cx="0.5" cy="0.42" r="0.62">
		<stop offset="0.62" class="stop-cheek" stop-opacity="0" />
		<stop offset="0.9" class="stop-cheek" stop-opacity="0.16" />
		<stop offset="1" class="stop-accent" stop-opacity="0.34" />
	</radialGradient>
	<linearGradient id="{m.uid}-film" x1="0" y1="0" x2="1" y2="0.35">
		<stop offset="0.12" class="stop-cheek" stop-opacity="0" />
		<stop offset="0.28" class="stop-cheek" stop-opacity="0.3" />
		<stop offset="0.42" class="stop-light" stop-opacity="0" />
		<stop offset="0.58" class="stop-eye" stop-opacity="0.26" />
		<stop offset="0.74" class="stop-accent" stop-opacity="0.34" />
		<stop offset="0.9" class="stop-accent" stop-opacity="0" />
	</linearGradient>
	<linearGradient id="{m.uid}-ao" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0.6" class="stop-visor" stop-opacity="0" />
		<stop offset="1" class="stop-visor" stop-opacity="0.22" />
	</linearGradient>
	<linearGradient id="{m.uid}-fresnel" x1="0.1" y1="0" x2="0.9" y2="1">
		<stop offset="0" stop-color="#fff" stop-opacity="1" />
		<stop offset="0.35" stop-color="#fff" stop-opacity="0.35" />
		<stop offset="0.58" stop-color="#fff" stop-opacity="0" />
		<stop offset="0.8" class="stop-accent" stop-opacity="0.55" />
		<stop offset="1" class="stop-accent" stop-opacity="0.9" />
	</linearGradient>
</defs>

<path d={m.shape.d} fill={ref('body')} />
<path d={m.shape.d} fill={ref('sss')} />
<g clip-path={ref('shell-clip')}>
	<g class="film">
		<circle cx="100" cy={mid} r={Math.max(hw, 70) * 1.25} fill={ref('film')} />
	</g>
	<path d={m.shape.d} fill={ref('ao')} />
	<path class="fresnel-soft" d={m.shape.d} stroke={ref('fresnel')} filter={ref('soft')} />
	<g transform="translate({sx} {sy})">
		<ellipse
			class="spec"
			cx="78"
			cy={t + 22}
			rx="21"
			ry="8.5"
			transform="rotate(-28 78 {t + 22})"
			filter={ref('soft')}
		/>
		<ellipse class="spec-core" cx="100" cy={t + 6.5} rx="13" ry="2.2" />
		<circle class="spec-core" cx="59" cy={t + 41} r="3" />
	</g>
</g>
<!-- A faint dark edge keeps the silhouette readable on white pages, where the light rim vanishes. -->
<path class="edge" d={m.shape.d} />
<path class="fresnel" d={m.shape.d} stroke={ref('fresnel')} />

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
	.stop-light {
		stop-color: var(--c-body-light);
	}
	.stop-visor {
		stop-color: var(--c-visor);
	}
	.film {
		transform-box: fill-box;
		transform-origin: center;
		animation: film-drift 16s linear infinite;
	}
	.fresnel-soft {
		fill: none;
		stroke-width: 7;
		opacity: 0.8;
	}
	.edge {
		fill: none;
		stroke: var(--c-body-dark);
		stroke-width: 1.4;
		opacity: 0.45;
	}
	.fresnel {
		fill: none;
		stroke-width: 1.3;
		opacity: 0.85;
	}
	.spec {
		fill: #fff;
		opacity: 0.78;
	}
	.spec-core {
		fill: #fff;
		opacity: 0.9;
	}

	@keyframes film-drift {
		to {
			transform: rotate(360deg);
		}
	}
</style>

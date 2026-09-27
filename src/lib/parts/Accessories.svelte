<script lang="ts">
	import { getMascot, svgRef } from '../context.js';
	import { SPARKLE_PATH } from '../geometry.js';
	import { AUDIO_MOODS, BLOOM_MOODS, starPath, type Accessory } from './accessories.js';

	/** `back` draws behind the head shell, `front` on top of the face. */
	let { layer }: { layer: 'back' | 'front' } = $props();

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const has = (a: Accessory) => m.accessories.includes(a);
	const t = $derived(m.shape.top);
	const hw = $derived(m.shape.halfWidth);

	// Re-keying on boops and mood replays one-shot wobbles on the antenna and bow.
	const nudge = $derived(`${m.boops}:${m.mood}`);
	const bloom = $derived(BLOOM_MOODS.includes(m.mood));
	const audio = $derived(AUDIO_MOODS.includes(m.mood));
	const talkBars = $derived([0.65, 1, 0.8].map((k) => 3 + m.talk * 10 * k));

	// Points on the front half of the ring (angle in radians, 0 = right tip).
	const RING_GLINTS = [0.35, 1.15, 1.95, 2.75];
	const ringPoint = (a: number) => [100 + 96 * Math.cos(a), 134 + 16 * Math.sin(a)];

	// Glasses follow the gaze a bit less than the eyes so the eyes can roam inside the rims.
	const gx = $derived(m.gazeX * 4.5);
	const gy = $derived(m.gazeY * 3.5);
	const visorHalf = $derived(Math.min(53, hw - 12));

	const beanieW = $derived(hw * 0.8 + 6);
	const STAR = starPath(8);
</script>

{#snippet moon()}
	<g class="moon-x">
		<g class="moon-y">
			<circle class="moon-glow" r="7" filter={ref('soft')} />
			<circle r="4.6" fill={ref('moon')} />
			<circle class="crater" cx="-1.4" cy="0.8" r="1.1" />
			<circle class="crater" cx="1.6" cy="-1" r="0.7" />
		</g>
	</g>
{/snippet}

{#if layer === 'back'}
	<defs>
		<clipPath id="{m.uid}-ring-back" clipPathUnits="userSpaceOnUse">
			<rect x="-20" y="-20" width="240" height="154" />
		</clipPath>
		<clipPath id="{m.uid}-ring-front" clipPathUnits="userSpaceOnUse">
			<rect x="-20" y="134" width="240" height="86" />
		</clipPath>
		<radialGradient id="{m.uid}-moon" cx="0.35" cy="0.3" r="0.8">
			<stop offset="0" stop-color="#fff" />
			<stop offset="1" class="stop-mid" />
		</radialGradient>
		<radialGradient id="{m.uid}-ear-inner" cx="0.5" cy="0.75" r="0.8">
			<stop offset="0" class="stop-cheek" stop-opacity="0.95" />
			<stop offset="0.7" class="stop-cheek" stop-opacity="0.45" />
			<stop offset="1" class="stop-cheek" stop-opacity="0.1" />
		</radialGradient>
		<linearGradient id="{m.uid}-gold" x1="0" y1="0" x2="0.3" y2="1">
			<stop offset="0" stop-color="#fff4b8" />
			<stop offset="0.45" stop-color="#ffd257" />
			<stop offset="1" stop-color="#f2a93a" />
		</linearGradient>
		<radialGradient id="{m.uid}-tip" cx="0.35" cy="0.3" r="0.8">
			<stop offset="0" stop-color="#fff" />
			<stop offset="0.45" class="stop-accent" />
			<stop offset="1" class="stop-accent" />
		</radialGradient>
	</defs>
	{#if has('ring')}
		<g transform="rotate(-8 100 134)" clip-path={ref('ring-back')}>
			<ellipse class="ring-band" cx="100" cy="134" rx="96" ry="16" />
			<ellipse class="ring" cx="100" cy="134" rx="96" ry="16" />
			<g transform="translate(100 134)">{@render moon()}</g>
		</g>
	{/if}
	{#if has('ears')}
		{#each [-1, 1] as s (s)}
			<g
				class="ear-twitch"
				class:right={s > 0}
				style:transform-origin="{100 + s * 20}px {t + 22}px"
			>
				<g transform="translate(100 0) scale({s} 1) translate(-100 0)">
					<path
						class="ear"
						d="M62 {t + 34}C58 {t + 4} 60 {t - 14} 70 {t - 12}C80 {t - 10} 92 {t + 6} 94 {t + 14}Z"
					/>
					<path
						d="M68 {t + 20}C66 {t + 6} 68 {t - 4} 72 {t - 3}C77 {t - 2} 84 {t + 6} 86 {t + 12}Z"
						fill={ref('ear-inner')}
					/>
					<path
						class="tuft"
						d="M71 {t + 16}q1 -6 4 -9M75 {t + 17}q1 -5 4 -7M68 {t + 12}q0 -5 2 -8"
					/>
					<path class="ear-shine" d="M65 {t + 10}C65 {t} 66 {t - 7} 69 {t - 9}" />
				</g>
			</g>
		{/each}
	{/if}
	{#if has('headphones')}
		<path
			class="band"
			d="M{100 - hw - 2} 104C{100 - hw - 2} {t - 46} {100 + hw + 2} {t - 46} {100 + hw + 2} 104"
		/>
		<path
			class="band-pad"
			pathLength="100"
			d="M{100 - hw - 2} 104C{100 - hw - 2} {t - 46} {100 + hw + 2} {t - 46} {100 + hw + 2} 104"
		/>
		<path
			class="band-shine"
			pathLength="100"
			d="M{100 - hw - 2} 102C{100 - hw - 2} {t - 48} {100 + hw + 2} {t - 48} {100 + hw + 2} 102"
		/>
	{/if}
	{#if has('antenna')}
		{#key nudge}
			<g class="antenna" style:transform-origin="100px {t + 4}px">
				<path class="stalk" d="M100 {t + 4}Q101.5 {t - 5} 100 {t - 13}" />
				<circle class="tip-glow" cx="100" cy={t - 18} r="9" filter={ref('soft')} />
				<circle class="antenna-tip" cx="100" cy={t - 18} r="5.6" fill={ref('tip')} />
				<circle class="tip-flash" cx="100" cy={t - 18} r="3.2" />
				<circle class="tip-shine" cx="98.2" cy={t - 20} r="1.4" />
			</g>
		{/key}
		<ellipse class="collar" cx="100" cy={t + 3} rx="5" ry="2.2" />
	{/if}
	{#if has('sprout')}
		<g class="sprout" style:transform-origin="100px {t}px">
			<path class="stem" d="M100 {t + 4}Q98 {t - 6} 100 {t - 14}" />
			<g class="leaf-l" style:transform-origin="100px {t - 12}px">
				<path
					class="leaf"
					d="M100 {t - 12}C92 {t - 26} 78 {t - 22} 76 {t - 16}C84 {t - 8} 94 {t - 8} 100 {t - 12}Z"
				/>
				<path class="vein" d="M99 {t - 12.5}Q88 {t - 17} 79 {t - 16.5}" />
			</g>
			<g class="leaf-r" style:transform-origin="100px {t - 14}px">
				<path
					class="leaf"
					d="M100 {t - 14}C106 {t - 30} 122 {t - 28} 124 {t - 22}C116 {t - 12} 106 {t - 10} 100 {t -
						14}Z"
				/>
				<path class="vein" d="M101 {t - 14.5}Q111 {t - 22} 121 {t - 22.5}" />
			</g>
			<g transform="translate(100 {t - 16})">
				<g class="flower" class:open={bloom && !m.reduced} class:shown={bloom}>
					{#each [0, 72, 144, 216, 288] as a (a)}
						<ellipse class="petal" cx="0" cy="-3.6" rx="2.6" ry="3.4" transform="rotate({a})" />
					{/each}
					<circle class="pistil" r="2.2" />
				</g>
			</g>
		</g>
	{/if}
{:else}
	{#if has('ring')}
		<g transform="rotate(-8 100 134)" clip-path={ref('ring-front')}>
			<ellipse class="ring-band" cx="100" cy="134" rx="96" ry="16" />
			<ellipse class="ring" cx="100" cy="134" rx="96" ry="16" />
			<ellipse class="ring-dash" cx="100" cy="134" rx="96" ry="16" />
			{#each RING_GLINTS as a, i (i)}
				{@const [x, y] = ringPoint(a)}
				<g transform="translate({x} {y}) scale(3.4)">
					<path
						class="ring-glint"
						d={SPARKLE_PATH}
						style:animation-delay="{i * 0.55 - (i % 2) * 0.3}s"
					/>
				</g>
			{/each}
			<g transform="translate(100 134)">{@render moon()}</g>
		</g>
	{/if}
	{#if has('headphones')}
		{#each [-1, 1] as s (s)}
			<g transform="translate(100 0) scale({s} 1) translate(-100 0)">
				<rect class="cushion" x={100 - hw - 1} y="89" width="9" height="30" rx="4.5" />
				<rect class="cup" x={100 - hw - 11} y="86" width="16" height="36" rx="8" />
				<rect class="cup-rim" x={100 - hw - 11} y="86" width="16" height="36" rx="8" />
				<path class="cup-shine" d="M{100 - hw - 7} 92Q{100 - hw - 7} 89 {100 - hw - 4} 88.5" />
				<g filter={ref('glow')} class="bars" class:live={audio}>
					{#each talkBars as h, i (i)}
						{@const x = 100 - hw - 7.5 + i * 3.5}
						{#if m.mood === 'talking' && !m.reduced}
							<rect class="bar" {x} y={104 - h / 2} width="2" height={h} rx="1" />
						{:else}
							<g transform="translate({x + 1} 104)">
								<rect
									class="bar eq"
									x="-1"
									y={audio ? -6 : -2}
									width="2"
									height={audio ? 12 : 4}
									rx="1"
									style:animation-delay="{i * -0.23}s"
								/>
							</g>
						{/if}
					{/each}
				</g>
			</g>
		{/each}
	{/if}
	{#if has('halo')}
		<g class="halo-bob">
			<ellipse class="halo-glow" cx="100" cy={t - 12} rx="30" ry="7" filter={ref('soft')} />
			<ellipse class="halo" cx="100" cy={t - 12} rx="30" ry="7" filter={ref('glow')} />
			<ellipse class="halo-core" cx="100" cy={t - 12} rx="30" ry="7" />
			<ellipse class="halo-glint" cx="100" cy={t - 12} rx="30" ry="7" pathLength="100" />
		</g>
	{/if}
	{#if has('beanie')}
		{@const w = beanieW}
		<g class="beanie">
			<path
				class="knit"
				d="M{100 - w + 3} {t + 18}C{100 - w + 1} {t - 24} {100 + w - 1} {t - 24} {100 + w - 3} {t +
					18}Z"
			/>
			{#each [-0.6, -0.2, 0.2, 0.6] as k (k)}
				<path
					class="rib"
					d="M{100 + k * w * 1.05} {t + 17}C{100 + k * w * 1.02} {t + 2} {100 + k * w * 0.7} {t -
						10} {100 + k * w * 0.12} {t - 14}"
				/>
			{/each}
			<path
				class="knit-shine"
				d="M{100 - w * 0.62} {t + 6}C{100 - w * 0.6} {t - 4} {100 - w * 0.42} {t - 11} {100 -
					w * 0.18} {t - 13}"
			/>
			<path
				class="cuff"
				d="M{100 - w} {t + 14}Q100 {t + 20} {100 + w} {t + 14}L{100 + w} {t + 22}Q100 {t +
					29} {100 - w} {t + 22}Z"
			/>
			{#each Array.from({ length: 11 }, (_, i) => (i - 5) / 5.5) as k (k)}
				<path
					class="cuff-rib"
					d="M{100 + k * w} {t + 16.5 + (1 - k * k) * 5}v{5.5 - Math.abs(k) * 0.5}"
				/>
			{/each}
			<g transform="translate(100 {t - 18})">
				<g class="pompom">
					<circle class="pom" r="8" />
					<circle class="pom" cx="-4.5" cy="2" r="4.5" />
					<circle class="pom" cx="4.5" cy="2" r="4.5" />
					<circle class="pom-shine" cx="-2" cy="-2.5" r="2.2" />
				</g>
			</g>
		</g>
	{/if}
	{#if has('crown')}
		<g transform="translate({100 + hw * 0.12} {t + 4}) rotate(-9) scale(1.15)">
			<g class="crown-bounce">
				<path class="crown" d="M-15 0L-16 -12L-8 -5L0 -17L8 -5L16 -12L15 0Z" fill={ref('gold')} />
				<rect class="crown-band" x="-15.5" y="-4.5" width="31" height="5" rx="2.2" />
				<circle class="gem gem-cheek" cx="0" cy="-2" r="2" />
				<circle class="gem gem-eye" cx="-9" cy="-2" r="1.3" />
				<circle class="gem gem-eye" cx="9" cy="-2" r="1.3" />
				<circle class="bead" cx="-16" cy="-12.5" r="1.8" />
				<circle class="bead" cx="0" cy="-17.5" r="2" />
				<circle class="bead" cx="16" cy="-12.5" r="1.8" />
				<g transform="translate(-6 -9) scale(3)">
					<path class="crown-glint" d={SPARKLE_PATH} />
				</g>
			</g>
		</g>
	{/if}
	{#if has('bow')}
		<g transform="translate({100 + hw * 0.52} {t + 12}) rotate(20) scale(1.1)">
			{#key nudge}
				<g class="bow-wiggle">
					<path class="bow-tail" d="M-1.5 2L-7 13L-3.5 12L-1.5 15L1 3Z" />
					<path class="bow-tail" d="M1.5 2L6 12.5L8.5 10L10 12L3 1.5Z" />
					<path class="bow-loop" d="M0 0C-5 -10 -18 -11 -17 -1C-16 8 -5 5 0 0Z" />
					<path class="bow-loop" d="M0 0C5 -10 18 -11 17 -1C16 8 5 5 0 0Z" />
					<path class="bow-fold" d="M-2 -0.5C-6 -4 -11 -4 -12 -1M2 -0.5C6 -4 11 -4 12 -1" />
					<path class="bow-shine" d="M-13 -5Q-12 -7.5 -9 -7.5M9.5 -7.5Q12.5 -7.5 13.5 -4.5" />
					<rect class="bow-knot" x="-3.6" y="-4.2" width="7.2" height="8" rx="3" />
				</g>
			{/key}
		</g>
	{/if}
	{#if has('star-clip')}
		<g transform="translate({100 - hw * 0.56} {t + 14}) rotate(-16)">
			<rect class="clip-bar" x="-2" y="2" width="12" height="3.4" rx="1.7" />
			<path class="star" d={STAR} />
			<path class="star-shine" d="M-3.5 -2.5Q-2.5 -5 0 -5.5" />
			<g transform="translate(9 -8) scale(3.2)">
				<path class="star-twinkle" d={SPARKLE_PATH} />
			</g>
		</g>
	{/if}
	{#if has('glasses')}
		<g transform="translate({gx} {gy})">
			{#each [80, 120] as cx (cx)}
				<circle class="lens" {cx} cy="96" r="16.5" />
				<path class="lens-glint" d="M{cx - 9} {90}L{cx - 3} {84}M{cx - 10} {96}L{cx - 1} {87}" />
				<circle class="rim" {cx} cy="96" r="16.5" />
			{/each}
			<path class="rim" d="M96 93Q100 89.5 104 93" />
			<path class="rim temple" d="M63.5 94L{100 - visorHalf - 1} 91" />
			<path class="rim temple" d="M136.5 94L{100 + visorHalf + 1} 91" />
		</g>
	{/if}
{/if}

<style>
	.stop-mid {
		stop-color: var(--c-body-mid);
	}
	.stop-cheek {
		stop-color: var(--c-cheek);
	}
	.stop-accent {
		stop-color: var(--c-accent);
	}

	/* ring */
	.ring {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2.6;
		stroke-opacity: 0.9;
	}
	.ring-band {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 8;
		stroke-opacity: 0.18;
	}
	.ring-dash {
		fill: none;
		stroke: #fff;
		stroke-width: 2.6;
		stroke-linecap: round;
		stroke-dasharray: 0.5 26;
		opacity: 0.9;
		animation: orbit 6s linear infinite;
	}
	.ring-glint {
		fill: #fff;
		transform-box: fill-box;
		transform-origin: center;
		animation: glint 2.2s ease-in-out infinite;
	}
	.moon-x {
		animation: moon-x 3.2s cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
	}
	.moon-y {
		animation: moon-y 3.2s cubic-bezier(0.37, 0, 0.63, 1) -1.6s infinite alternate;
	}
	.moon-glow {
		fill: var(--c-accent);
		opacity: 0.55;
	}
	.crater {
		fill: var(--c-body-dark);
		opacity: 0.45;
	}
	/* Parked in front of the face when motion is reduced. */
	:global(.still) .moon-x {
		transform: translateX(-62px);
	}
	:global(.still) .moon-y {
		transform: translateY(12px);
	}

	/* halo */
	.halo-bob {
		animation: bob 2.4s ease-in-out infinite alternate;
	}
	.halo,
	.halo-core,
	.halo-glow,
	.halo-glint {
		fill: none;
	}
	.halo {
		stroke: var(--c-accent);
		stroke-width: 4;
	}
	.halo-glow {
		stroke: var(--c-accent);
		stroke-width: 9;
		opacity: 0.45;
	}
	.halo-core {
		stroke: #fff;
		stroke-width: 1.2;
		opacity: 0.7;
	}
	.halo-glint {
		stroke: #fff;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 9 91;
		animation: halo-glint 2.8s linear infinite;
	}

	/* ears */
	.ear {
		fill: var(--c-body-mid);
	}
	.tuft {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1.1;
		stroke-linecap: round;
		opacity: 0.85;
	}
	.ear-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.6;
		stroke-linecap: round;
		opacity: 0.55;
	}
	.ear-twitch {
		transform-box: view-box;
		animation: twitch 7s ease-in-out 1.5s infinite;
	}
	.ear-twitch.right {
		animation: twitch-r 9.4s ease-in-out 4.2s infinite;
	}

	/* headphones */
	.band {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 6;
		stroke-linecap: round;
	}
	.band-pad {
		fill: none;
		stroke: var(--c-body-mid);
		stroke-width: 8;
		stroke-linecap: round;
		stroke-dasharray: 0 38 24 100;
	}
	.band-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-dasharray: 0 40 18 100;
		opacity: 0.7;
	}
	.cushion {
		fill: var(--c-body-mid);
		stroke: var(--c-body-dark);
		stroke-width: 0.8;
		stroke-opacity: 0.6;
	}
	.cup {
		fill: var(--c-visor);
	}
	.cup-rim {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 1.4;
		stroke-opacity: 0.7;
	}
	.cup-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.4;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.bar {
		fill: var(--c-eye);
		transition:
			y 0.08s,
			height 0.08s;
	}
	.bars {
		opacity: 0.55;
		transition: opacity 0.3s;
	}
	.bars.live {
		opacity: 1;
	}
	.live .eq {
		transform-box: fill-box;
		transform-origin: center;
		animation: eq 0.7s ease-in-out infinite alternate;
	}

	/* antenna */
	.antenna {
		transform-box: view-box;
		animation: wobble 0.9s cubic-bezier(0.3, 0.6, 0.4, 1);
	}
	.stalk {
		fill: none;
		stroke: var(--c-body-dark);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.collar {
		fill: var(--c-body-dark);
	}
	.tip-glow {
		fill: var(--c-accent);
		opacity: 0.6;
		animation: breathe-glow 1.6s ease-in-out infinite alternate;
	}
	.antenna-tip {
		stroke: var(--c-accent);
		stroke-width: 0.6;
	}
	.tip-flash {
		fill: #fff;
		opacity: 0;
		animation: flash 3.4s ease-out 0.8s infinite;
	}
	.tip-shine {
		fill: #fff;
		opacity: 0.9;
	}

	/* sprout */
	.stem {
		fill: none;
		stroke: var(--c-sprout);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.leaf {
		fill: var(--c-sprout);
	}
	.vein {
		fill: none;
		stroke: #fff;
		stroke-width: 0.9;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.sprout {
		transform-box: view-box;
		animation: sway 3s ease-in-out infinite alternate;
	}
	.leaf-l,
	.leaf-r {
		transform-box: view-box;
	}
	.leaf-l {
		animation: flutter-l 2.3s ease-in-out infinite alternate;
	}
	.leaf-r {
		animation: flutter-r 2.9s ease-in-out -1s infinite alternate;
	}
	.flower {
		transform: scale(0) rotate(-90deg);
		transition: transform 0.25s ease-in;
	}
	.flower.shown {
		transform: scale(1) rotate(0deg);
	}
	.flower.open {
		transition: transform 0.6s cubic-bezier(0.34, 1.7, 0.5, 1);
	}
	.petal {
		fill: var(--c-cheek);
		stroke: #fff;
		stroke-width: 0.5;
		stroke-opacity: 0.6;
	}
	.pistil {
		fill: #ffe38a;
	}

	/* beanie */
	.knit {
		fill: var(--c-accent);
	}
	.rib {
		fill: none;
		stroke: color-mix(in oklab, var(--c-accent), #000 18%);
		stroke-width: 1.2;
		stroke-linecap: round;
		opacity: 0.5;
	}
	.knit-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 2;
		stroke-linecap: round;
		opacity: 0.4;
	}
	.cuff {
		fill: color-mix(in oklab, var(--c-accent), #fff 30%);
	}
	.cuff-rib {
		stroke: color-mix(in oklab, var(--c-accent), #000 12%);
		stroke-width: 1.3;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.pompom {
		animation: pom 1.6s ease-in-out infinite alternate;
	}
	.pom {
		fill: var(--c-body-light);
		stroke: var(--c-body-mid);
		stroke-width: 0.8;
	}
	.pom-shine {
		fill: #fff;
	}

	/* crown */
	.crown {
		stroke: #e9a92f;
		stroke-width: 1.6;
		stroke-linejoin: round;
	}
	.crown-band {
		fill: #f4b43e;
	}
	.gem {
		stroke: #fff;
		stroke-width: 0.5;
	}
	.gem-cheek {
		fill: var(--c-cheek);
	}
	.gem-eye {
		fill: var(--c-eye);
	}
	.bead {
		fill: #fff6cf;
	}
	.crown-glint {
		fill: #fff;
		transform-box: fill-box;
		transform-origin: center;
		animation: glint 3.1s ease-in-out 0.4s infinite;
	}
	.crown-bounce {
		animation: bob 2.4s ease-in-out infinite alternate;
	}

	/* bow */
	.bow-loop,
	.bow-tail {
		fill: var(--c-cheek);
		stroke: color-mix(in oklab, var(--c-cheek), #000 12%);
		stroke-width: 0.7;
		stroke-linejoin: round;
	}
	.bow-tail {
		fill: color-mix(in oklab, var(--c-cheek), #000 10%);
	}
	.bow-fold {
		fill: none;
		stroke: color-mix(in oklab, var(--c-cheek), #000 22%);
		stroke-width: 1;
		stroke-linecap: round;
		opacity: 0.6;
	}
	.bow-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.4;
		stroke-linecap: round;
		opacity: 0.7;
	}
	.bow-knot {
		fill: color-mix(in oklab, var(--c-cheek), #fff 18%);
		stroke: color-mix(in oklab, var(--c-cheek), #000 12%);
		stroke-width: 0.7;
	}
	.bow-wiggle {
		animation: bow-wiggle 0.7s cubic-bezier(0.3, 0.6, 0.4, 1);
	}

	/* star clip */
	.clip-bar {
		fill: var(--c-body-dark);
		opacity: 0.9;
	}
	.star {
		fill: #ffd66b;
		stroke: #ffd66b;
		stroke-width: 2.4;
		stroke-linejoin: round;
	}
	.star-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.3;
		stroke-linecap: round;
		opacity: 0.85;
	}
	.star-twinkle {
		fill: #fff;
		transform-box: fill-box;
		transform-origin: center;
		animation: glint 2.6s ease-in-out 1.2s infinite;
	}

	/* glasses */
	.lens {
		fill: var(--c-eye);
		fill-opacity: 0.07;
	}
	.lens-glint {
		fill: none;
		stroke: #fff;
		stroke-width: 1.3;
		stroke-linecap: round;
		opacity: 0.35;
	}
	.rim {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	.temple {
		stroke-width: 2;
		opacity: 0.8;
	}

	@keyframes orbit {
		to {
			stroke-dashoffset: -106;
		}
	}
	@keyframes glint {
		0%,
		55%,
		100% {
			transform: scale(0) rotate(0deg);
			opacity: 0;
		}
		75% {
			transform: scale(1) rotate(45deg);
			opacity: 1;
		}
	}
	@keyframes moon-x {
		from {
			transform: translateX(-96px);
		}
		to {
			transform: translateX(96px);
		}
	}
	@keyframes moon-y {
		from {
			transform: translateY(-16px);
		}
		to {
			transform: translateY(16px);
		}
	}
	@keyframes bob {
		to {
			transform: translateY(-3px);
		}
	}
	@keyframes halo-glint {
		to {
			stroke-dashoffset: -100;
		}
	}
	@keyframes twitch {
		0%,
		90%,
		100% {
			transform: rotate(0deg);
		}
		92% {
			transform: rotate(-12deg);
		}
		94% {
			transform: rotate(4deg);
		}
		96% {
			transform: rotate(-5deg);
		}
	}
	@keyframes twitch-r {
		0%,
		90%,
		100% {
			transform: rotate(0deg);
		}
		92% {
			transform: rotate(12deg);
		}
		94% {
			transform: rotate(-4deg);
		}
		96% {
			transform: rotate(5deg);
		}
	}
	@keyframes eq {
		from {
			transform: scaleY(0.3);
		}
		to {
			transform: scaleY(1);
		}
	}
	@keyframes wobble {
		0% {
			transform: rotate(0deg);
		}
		15% {
			transform: rotate(16deg);
		}
		35% {
			transform: rotate(-11deg);
		}
		55% {
			transform: rotate(6deg);
		}
		75% {
			transform: rotate(-3deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}
	@keyframes breathe-glow {
		from {
			opacity: 0.35;
		}
		to {
			opacity: 0.75;
		}
	}
	@keyframes flash {
		0%,
		84%,
		100% {
			opacity: 0;
		}
		88% {
			opacity: 0.95;
		}
	}
	@keyframes sway {
		from {
			transform: rotate(-5deg);
		}
		to {
			transform: rotate(5deg);
		}
	}
	@keyframes flutter-l {
		from {
			transform: rotate(-7deg);
		}
		to {
			transform: rotate(5deg);
		}
	}
	@keyframes flutter-r {
		from {
			transform: rotate(6deg);
		}
		to {
			transform: rotate(-6deg);
		}
	}
	@keyframes pom {
		to {
			transform: translateY(-1.5px) scale(1.04, 0.96);
		}
	}
	@keyframes bow-wiggle {
		0% {
			transform: rotate(0deg) scale(1);
		}
		20% {
			transform: rotate(-14deg) scale(1.12);
		}
		45% {
			transform: rotate(9deg) scale(0.96);
		}
		70% {
			transform: rotate(-4deg);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}
</style>

<script lang="ts">
	import { Spring, Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { getMascot, svgRef } from '../context.js';
	import { SPARKLE_PATH } from '../geometry.js';
	import {
		AUDIO_MOODS,
		BAND_END_Y,
		BLOOM_MOODS,
		CAP_RISE,
		DROP_MOODS,
		FLOWER_STEM,
		HOT_MOODS,
		MONOCLE,
		MONOCLE_DROP,
		SHADES_SLIDE,
		SLIDE_MOODS,
		WILT_MOODS,
		bandControlY,
		beanieWidth,
		capWidth,
		chainPath,
		contactShadows,
		counterSquash,
		followSwing,
		hatLift,
		headwear,
		hornOffset,
		monocleAnchor,
		monocleHook,
		mustacheTilt,
		nightcapBend,
		nightcapShape,
		nightcapWidth,
		propellerSpin,
		propellerWidth,
		starPath,
		templeLine,
		type Accessory
	} from './accessories.js';
	import { MISPRINT, halftone } from './face.js';

	/** `back` draws behind the head shell, `front` on top of the face. */
	let { layer }: { layer: 'back' | 'front' } = $props();

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const worn = $derived(headwear(m.accessories));
	const has = (a: Accessory) => worn.worn.includes(a);
	const t = $derived(m.shape.top);
	const hw = $derived(m.shape.halfWidth);
	const cw = $derived(m.shape.crownHalfWidth);

	// Re-keying on boops and mood replays one-shot wobbles on the antenna and bow.
	const nudge = $derived(`${m.boops}:${m.mood}`);
	const bloom = $derived(BLOOM_MOODS.includes(m.mood));
	const audio = $derived(AUDIO_MOODS.includes(m.mood));
	const talkBars = $derived([0.65, 1, 0.8].map((k) => 3 + m.talk * 10 * k));

	// Glasses follow the gaze a bit less than the eyes so the eyes can roam inside the rims.
	const gx = $derived(m.gazeX * 4.5);
	const gy = $derived(m.gazeY * 3.5);
	const temple = $derived(templeLine(hw));

	// The band rests just above the crown instead of arching high over it.
	const bandCtrl = $derived(bandControlY(BAND_END_Y, t - 6));
	const shineCtrl = $derived(bandControlY(BAND_END_Y - 2, t - 8));
	const shadows = $derived(contactShadows(worn.worn, t, hw, cw));

	// Worn items trail the figure: springs chase the hop and lean, and the gap between the
	// spring and the real value is how far an item lags behind (and overshoots on the way back).
	const hopFollow = Spring.of(() => m.hop, { stiffness: 0.1, damping: 0.3 });
	const leanFollow = Spring.of(() => m.lean, { stiffness: 0.07, damping: 0.25 });
	const lift = $derived(m.reduced ? 0 : hatLift(hopFollow.current - m.hop));
	const swing = $derived(
		m.reduced ? 0 : followSwing(leanFollow.current - m.lean, hopFollow.current - m.hop)
	);
	// A topper standing on a hat rides along with it.
	const topperY = $derived(worn.seat ? lift - worn.seat : 0);

	/** Undoes the head squash around `(x, y)`, where a rigid item touches the head. */
	const counter = (x: number, y: number) =>
		`translate(${x} ${y}) scale(${1 / m.squashX} ${1 / m.squashY}) translate(${-x} ${-y})`;

	const beanieW = $derived(beanieWidth(cw));
	const hornX = $derived(100 - hornOffset(cw));
	const STAR = starPath(8);
	const HAT_DOTS = [
		[-7, -6, 2.2],
		[6, -12, 2.2],
		[-2, -20, 2],
		[8.5, -2.5, 1.8],
		[0.5, -29, 1.6]
	];

	const hot = $derived(HOT_MOODS.includes(m.mood));
	const dropped = $derived(DROP_MOODS.includes(m.mood));
	// Tweens may call `duration` after unmount, where reading the context would warn.
	let instant = false;
	$effect.pre(() => {
		instant = m.reduced;
	});
	// Driven in JS rather than CSS so the chain, drawn outside the monocle, can follow its hook.
	const drop = Tween.of(() => (dropped ? 1 : 0), {
		duration: () => (instant ? 0 : 550),
		easing: backOut
	});
	const chain = $derived.by(() => {
		const hook = monocleHook(drop.current);
		const center = { x: MONOCLE.cx, y: MONOCLE.cy };
		const from = counterSquash({ x: hook.x + gx, y: hook.y + gy }, center, m.squashX, m.squashY);
		return chainPath(from, monocleAnchor(hw));
	});
	const wilt = $derived(WILT_MOODS.includes(m.mood));
	const spin = $derived(propellerSpin(m.mood));
	const capW = $derived(propellerWidth(cw));
	// Handlebar mustache, left half around the origin; the right half mirrors it. The end
	// curls up past the lip line.
	const STACHE_HALF =
		'M0 -1.5C-4 -5 -10 -5 -14 -1C-17 2 -20 2 -22 -1C-21 4 -16 6 -11 4C-6 2 -2 1 0 2Z';
	const stacheTilt = $derived(mustacheTilt(m.face.mouthCurve));

	// Baseball cap: a dome from the rim up to the button, with the bill curving down in front.
	const ballcap = $derived.by(() => {
		const w = capWidth(cw);
		const rim = t + 16;
		const c = bandControlY(rim, t - CAP_RISE);
		return {
			w,
			dome: `M${100 - w} ${rim}C${100 - w} ${c} ${100 + w} ${c} ${100 + w} ${rim}Z`,
			bill: `M${96 - w} ${rim - 1}Q100 ${rim + 22} ${104 + w} ${rim - 1}Q100 ${rim + 7} ${96 - w} ${rim - 1}Z`,
			dots: halftone(w * 0.75, 13, 2.8).map((d) => ({
				...d,
				x: d.x + 100 + w * 0.55,
				y: d.y + t + 9
			}))
		};
	});

	// The droop springs toward the mood's bend and the tip trails the lean on top of that.
	const bend = Spring.of(() => nightcapBend(m.mood), { stiffness: 0.05, damping: 0.35 });
	const nightcap = $derived.by(() => {
		const w = nightcapWidth(cw);
		const deg = m.reduced ? nightcapBend(m.mood) : bend.current + swing * 1.6;
		return { w, ...nightcapShape(w, t, deg) };
	});
	const NIGHTCAP_DOTS = halftone(12, 9, 2.6);

	const slide = Tween.of(() => (SLIDE_MOODS.includes(m.mood) ? 1 : 0), {
		duration: () => (instant ? 0 : 450),
		easing: backOut
	});
	// A wayfarer lens around its own center.
	const SHADE_LENS = 'M-15 -8H15Q16.5 -8 16 -5C15 5 9 10 0 10C-9 10 -15 5 -16 -5Q-16.5 -8 -15 -8Z';
</script>

{#if layer === 'back'}
	<defs>
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
			d="M{100 - hw - 2} {BAND_END_Y}C{100 - hw - 2} {bandCtrl} {100 + hw + 2} {bandCtrl} {100 +
				hw +
				2} {BAND_END_Y}"
		/>
		<path
			class="band-pad"
			pathLength="100"
			d="M{100 - hw - 2} {BAND_END_Y}C{100 - hw - 2} {bandCtrl} {100 + hw + 2} {bandCtrl} {100 +
				hw +
				2} {BAND_END_Y}"
		/>
		<path
			class="band-shine"
			pathLength="100"
			d="M{100 - hw - 2} {BAND_END_Y - 2}C{100 - hw - 2} {shineCtrl} {100 +
				hw +
				2} {shineCtrl} {100 + hw + 2} {BAND_END_Y - 2}"
		/>
	{/if}
	{#if has('antenna')}
		<g transform="translate(0 {topperY}) rotate({swing} 100 {t + 4})">
			{#key nudge}
				<g class="antenna" style:transform-origin="100px {t + 4}px">
					<path class="stalk" d="M100 {t + 4}Q101.5 {t - 5} 100 {t - 13}" />
					<circle class="tip-glow" cx="100" cy={t - 18} r="9" filter={ref('soft')} />
					<circle class="antenna-tip" cx="100" cy={t - 18} r="5.6" fill={ref('tip')} />
					<circle class="tip-flash" cx="100" cy={t - 18} r="3.2" />
					<circle class="tip-shine" cx="98.2" cy={t - 20} r="1.4" />
				</g>
			{/key}
		</g>
		<ellipse class="collar" cx="100" cy={t + 3 + topperY} rx="5" ry="2.2" />
	{/if}
	{#if has('sprout')}
		<g transform="translate(0 {topperY}) rotate({swing} 100 {t + 4})">
			<g class="sprout" style:transform-origin="100px {t}px">
				<path class="stem" d="M100 {t + 4}Q98 {t - 6} 100 {t - 14}" />
				<g class="leaf-l" style:transform-origin="100px {t - 12}px">
					<path
						class="leaf"
						d="M100 {t - 12}C92 {t - 26} 78 {t - 22} 76 {t - 16}C84 {t - 8} 94 {t - 8} 100 {t -
							12}Z"
					/>
					<path class="vein" d="M99 {t - 12.5}Q88 {t - 17} 79 {t - 16.5}" />
				</g>
				<g class="leaf-r" style:transform-origin="100px {t - 14}px">
					<path
						class="leaf"
						d="M100 {t - 14}C106 {t - 30} 122 {t - 28} 124 {t - 22}C116 {t - 12} 106 {t -
							10} 100 {t - 14}Z"
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
		</g>
	{/if}
	{#if has('horns')}
		{#each [-1, 1] as s (s)}
			<g transform="translate(100 0) scale({s} 1) translate(-100 0)">
				<g transform="{counter(hornX, t + 12)} translate({hornX} {t + 12}) rotate(-14)" class:hot>
					<path
						class="horn-glow"
						d="M-8 6C-10 -6 -12 -14 -10 -22C-4 -16 6 -8 8 6Z"
						filter={ref('soft')}
					/>
					<path class="horn" d="M-8 6C-10 -6 -12 -14 -10 -22C-4 -16 6 -8 8 6Z" />
					<path class="horn-ring" d="M-9 -3Q-1 -1 5 -4M-10 -10Q-5 -9 -1 -12" />
					<path class="horn-shine" d="M-6 0C-7.5 -7 -8.5 -12 -8.8 -17" />
				</g>
			</g>
		{/each}
	{/if}
{:else}
	{#if shadows.length}
		<g clip-path={ref('shell-clip')}>
			<g class="contact" filter={ref('soft')}>
				{#each shadows as sh, i (i)}
					<ellipse
						cx={sh.cx}
						cy={sh.cy}
						rx={sh.rx}
						ry={sh.ry}
						transform="rotate({sh.angle} {sh.cx} {sh.cy})"
					/>
				{/each}
			</g>
		</g>
	{/if}
	{#if has('mustache')}
		<g
			transform="translate({100 + m.face.mouthX + m.gazeX * 6} {(m.species === 'critter'
				? 115.5
				: 107.5) +
				m.gazeY * 5 -
				m.talk * 2}) scale(0.82)"
		>
			{#each [-1, 1] as s (s)}
				<g transform="scale({s} 1) rotate({stacheTilt})">
					<path
						class="stache stache-accent"
						d={STACHE_HALF}
						transform="translate({MISPRINT.x * s} {MISPRINT.y})"
					/>
				</g>
			{/each}
			{#each [-1, 1] as s (s)}
				<g transform="scale({s} 1) rotate({stacheTilt})">
					<path class="stache" d={STACHE_HALF} />
				</g>
			{/each}
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
	{#if has('headband')}
		{@const band = `M0 ${t + 6}Q100 ${t + 30} 200 ${t + 6}V${t + 15}Q100 ${t + 39} 0 ${t + 15}Z`}
		<g clip-path={ref('shell-clip')}>
			<path class="headband-plate" d={band} transform="translate({MISPRINT.x} {MISPRINT.y})" />
			<path class="headband" d={band} />
			<path class="headband-stripe" d="M0 {t + 10.5}Q100 {t + 34.5} 200 {t + 10.5}" />
		</g>
	{/if}
	{#if has('beanie')}
		{@const w = beanieW}
		<g class="beanie" transform="translate(0 {lift})">
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
			<g transform="translate(100 {t - 18}) rotate({swing * 1.3} 0 6)">
				<circle class="pom" r="8" />
				<circle class="pom" cx="-4.5" cy="2" r="4.5" />
				<circle class="pom" cx="4.5" cy="2" r="4.5" />
				<circle class="pom-shine" cx="-2" cy="-2.5" r="2.2" />
			</g>
		</g>
	{/if}
	{#if has('propeller')}
		{@const w = capW}
		<g class="propeller" transform="translate(0 {lift})">
			<path
				class="cap"
				d="M{100 - w} {t + 16}C{100 - w} {t - 10} {100 + w} {t - 10} {100 + w} {t + 16}Q100 {t +
					11} {100 - w} {t + 16}Z"
			/>
			<path
				class="cap-gore"
				d="M{100 - w * 0.34} {t + 12.4}Q{100 - w * 0.3} {t - 1} 100 {t - 3.5}Q{100 + w * 0.3} {t -
					1} {100 + w * 0.34} {t + 12.4}Q100 {t + 11.2} {100 - w * 0.34} {t + 12.4}Z"
			/>
			<path
				class="cap-band"
				d="M{100 - w + 0.5} {t + 14.5}Q100 {t + 9.5} {100 + w - 0.5} {t + 14.5}"
			/>
			<path
				class="knit-shine"
				d="M{100 - w * 0.72} {t + 8}C{100 - w * 0.7} {t + 1} {100 - w * 0.55} {t - 2.5} {100 -
					w * 0.4} {t - 3}"
			/>
			<g transform="rotate({swing} 100 {t - 3})">
				<path class="prop-stem" d="M100 {t - 3}V{t - 12}" />
				<g transform="translate(100 {t - 13})">
					<g class="prop" class:spinning={spin > 0} style:animation-duration="{spin || 1}s">
						<ellipse class="blade blade-a" cx="-9" cy="0" rx="9" ry="2.6" />
						<ellipse class="blade blade-b" cx="9" cy="0" rx="9" ry="2.6" />
					</g>
					<circle class="prop-hub" r="2.6" />
				</g>
			</g>
		</g>
	{/if}
	{#if has('party-hat')}
		{@const x = 100 - cw * 0.3}
		<g transform="translate(0 {lift}) {counter(x, t + 8)} translate({x} {t + 8}) rotate(-14)">
			<g transform="rotate({swing})">
				<path class="hat" d="M-17 0L-1.2 -37.5Q0 -39.5 1.2 -37.5L17 0Q0 6 -17 0Z" />
				{#each HAT_DOTS as [x, y, r] (`${x},${y}`)}
					<circle class="hat-dot" cx={x} cy={y} {r} />
				{/each}
				<path class="hat-shine" d="M-11 -6L-3 -28" />
				<path class="hat-trim" d="M-18 -0.5Q0 5.5 18 -0.5" />
				<g transform="translate(0 -39) rotate({swing * 0.7} 0 2)">
					<circle class="hat-pom" r="3.6" />
					<circle class="hat-pom" cx="-3" cy="-1.5" r="2.4" />
					<circle class="hat-pom" cx="3" cy="-1.5" r="2.4" />
					<circle class="pom-shine" cx="-1" cy="-1.8" r="1.1" />
				</g>
			</g>
		</g>
	{/if}
	{#if has('crown')}
		{@const x = 100 + cw * 0.16}
		<g
			transform="translate(0 {lift}) {counter(x, t + 4)} translate({x} {t +
				4}) rotate(-9) scale(1.15)"
		>
			<g>
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
	{#if has('cap')}
		{@const { w, dome, bill, dots } = ballcap}
		<g transform="translate(0 {lift}) {counter(100, t + 16)}">
			<g class="plate" transform="translate({MISPRINT.x} {MISPRINT.y})">
				<path d={dome} />
				<path d={bill} />
			</g>
			<path class="ballcap" d={dome} />
			<g clip-path={ref('ballcap-clip')}>
				<clipPath id="{m.uid}-ballcap-clip"><path d={dome} /></clipPath>
				{#each dots as d, i (i)}
					<circle class="ballcap-dot" cx={d.x} cy={d.y} r={d.r} />
				{/each}
			</g>
			<path
				class="ballcap-seam"
				d="M100 {t - CAP_RISE}Q{100 - w * 0.45} {t} {100 - w * 0.55} {t + 15}M100 {t -
					CAP_RISE}Q{100 + w * 0.45} {t} {100 + w * 0.55} {t + 15}"
			/>
			<path class="ballcap-bill" d={bill} />
			<circle class="ballcap-button" cx="100" cy={t - CAP_RISE + 0.6} r="2.4" />
		</g>
	{/if}
	{#if has('nightcap')}
		{@const { w, d, tip } = nightcap}
		<g transform="translate(0 {lift})">
			<path class="plate" {d} transform="translate({MISPRINT.x} {MISPRINT.y})" />
			<path class="nightcap" {d} />
			<g clip-path={ref('nightcap-clip')}>
				<clipPath id="{m.uid}-nightcap-clip"><path {d} /></clipPath>
				{#each NIGHTCAP_DOTS as dot, i (i)}
					<circle class="nightcap-dot" cx={dot.x + 100 + w * 0.45} cy={dot.y + t + 4} r={dot.r} />
				{/each}
			</g>
			<path
				class="cuff nightcap-cuff"
				d="M{100 - w} {t + 13}Q100 {t + 19} {100 + w} {t + 13}L{100 + w} {t + 21}Q100 {t +
					28} {100 - w} {t + 21}Z"
			/>
			<!-- The tassel always hangs straight down from the tip, whichever way the cap flops. -->
			<g transform="translate({tip.x} {tip.y})">
				<path class="tassel" d="M-2.5 2L-4 12M0 2V13M2.5 2L4 12" />
				<circle class="tassel-knot" r="4.4" />
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
	{#if has('flower')}
		<g transform="translate({100 - hw * 0.86} {t + 38})">
			<g class="blossom-sway" style:transform-origin="{FLOWER_STEM.x}px {FLOWER_STEM.y}px">
				<g
					class="blossom"
					class:bloom
					class:wilt
					style:transform-origin="{FLOWER_STEM.x}px {FLOWER_STEM.y}px"
				>
					<path class="blossom-stem" d="M0 0Q1 7 {FLOWER_STEM.x} {FLOWER_STEM.y}" />
					<path class="blossom-leaf" d="M2 4C8 6 14 12 15 17C9 17 3 12 2 4Z" />
					{#each [0, 60, 120, 180, 240, 300] as a (a)}
						<ellipse
							class="blossom-petal"
							cx="0"
							cy="-6"
							rx="4.2"
							ry="6.4"
							transform="rotate({a})"
						/>
					{/each}
					<circle class="blossom-heart" r="3.6" />
					{#each [0, 120, 240] as a (a)}
						<circle class="blossom-seed" cx="0" cy="-1.5" r="0.7" transform="rotate({a})" />
					{/each}
				</g>
			</g>
		</g>
	{/if}
	{#if has('glasses')}
		<g transform="{counter(100, 96)} translate({gx} {gy})">
			{#each [80, 120] as cx (cx)}
				<circle class="lens" {cx} cy="96" r="16.5" />
				<path class="lens-glint" d="M{cx - 9} {90}L{cx - 3} {84}M{cx - 10} {96}L{cx - 1} {87}" />
				<circle class="rim" {cx} cy="96" r="16.5" />
			{/each}
			<path class="rim" d="M96 93Q100 89.5 104 93" />
			<path class="rim temple" d="M{temple.x0} {temple.y0}L{temple.x1} {temple.y1}" />
			<path class="rim temple" d="M{200 - temple.x0} {temple.y0}L{200 - temple.x1} {temple.y1}" />
		</g>
	{/if}
	{#if has('shades')}
		<g transform="{counter(100, 96)} translate({gx} {gy + SHADES_SLIDE * slide.current})">
			<clipPath id="{m.uid}-shades-clip">
				{#each [80, 120] as cx (cx)}
					<path d={SHADE_LENS} transform="translate({cx} 96)" />
				{/each}
			</clipPath>
			<path
				class="shades-temple"
				d="M{temple.x0 + 1} {temple.y0 - 3}L{temple.x1} {temple.y1 - 2}"
			/>
			<path
				class="shades-temple"
				d="M{199 - temple.x0} {temple.y0 - 3}L{200 - temple.x1} {temple.y1 - 2}"
			/>
			<path class="shades-bridge" d="M95 91Q100 88 105 91" />
			{#each [80, 120] as cx (cx)}
				<path
					class="plate"
					d={SHADE_LENS}
					transform="translate({cx + MISPRINT.x} {96 + MISPRINT.y})"
				/>
				<path class="shades-lens" d={SHADE_LENS} transform="translate({cx} 96)" />
			{/each}
			<g clip-path={ref('shades-clip')}>
				{#each [80, 120] as cx (cx)}
					<path class="shades-glint" d="M{cx - 16} 104L{cx - 4} 86H{cx + 2}L{cx - 10} 104Z" />
					<path class="shades-glint thin" d="M{cx - 4} 108L{cx + 8} 86H{cx + 10}L{cx - 2} 108Z" />
				{/each}
			</g>
		</g>
	{/if}
	{#if has('monocle')}
		{@const anchor = monocleAnchor(hw)}
		<path class="chain" d={chain} />
		<circle class="chain-pin" cx={anchor.x} cy={anchor.y} r="1.6" />
		<g transform="{counter(MONOCLE.cx, MONOCLE.cy)} translate({gx} {gy})">
			<g
				transform="translate({MONOCLE_DROP.x * drop.current} {MONOCLE_DROP.y *
					drop.current}) rotate({MONOCLE_DROP.angle * drop.current} {MONOCLE.cx} {MONOCLE.cy})"
			>
				<circle class="lens" cx={MONOCLE.cx} cy={MONOCLE.cy} r={MONOCLE.r} />
				<path class="lens-glint" d="M111 90L117 84M110 96L119 87" />
				<circle
					class="monocle-rim"
					cx={MONOCLE.cx}
					cy={MONOCLE.cy}
					r={MONOCLE.r}
					stroke={ref('gold')}
				/>
			</g>
		</g>
	{/if}
{/if}

<style>
	.stop-cheek {
		stop-color: var(--c-cheek);
	}
	.stop-accent {
		stop-color: var(--c-accent);
	}

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

	/* horns */
	.horn {
		fill: color-mix(in oklab, var(--c-accent), #000 8%);
		stroke: color-mix(in oklab, var(--c-accent), #000 25%);
		stroke-width: 0.8;
		stroke-linejoin: round;
		transition: fill 0.4s;
	}
	.hot .horn {
		fill: color-mix(in oklab, var(--c-accent), #ff3b1f 60%);
	}
	.horn-glow {
		fill: #ff5a2a;
		opacity: 0;
		transition: opacity 0.4s;
	}
	.hot .horn-glow {
		opacity: 0.7;
		animation: breathe-glow 0.9s ease-in-out infinite alternate;
	}
	.horn-ring {
		fill: none;
		stroke: color-mix(in oklab, var(--c-accent), #000 30%);
		stroke-width: 1;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.horn-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.4;
		stroke-linecap: round;
		opacity: 0.55;
	}

	/* mustache: inked twice like the face, with the accent plate slightly off register */
	.stache {
		fill: var(--c-eye);
		stroke: var(--c-eye);
		stroke-width: 0.6;
		stroke-linejoin: round;
	}
	.stache-accent {
		fill: var(--c-accent);
		stroke: var(--c-accent);
		opacity: 0.9;
	}

	/* propeller cap */
	.cap {
		fill: var(--c-accent);
	}
	.cap-gore {
		fill: var(--c-cheek);
	}
	.cap-band {
		fill: none;
		stroke: color-mix(in oklab, var(--c-accent), #000 20%);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	.prop-stem {
		stroke: var(--c-body-dark);
		stroke-width: 2.2;
		stroke-linecap: round;
	}
	.blade {
		stroke: color-mix(in oklab, var(--c-body-dark), transparent 40%);
		stroke-width: 0.6;
	}
	.blade-a {
		fill: var(--c-accent);
	}
	.blade-b {
		fill: var(--c-cheek);
	}
	.prop-hub {
		fill: #ffd66b;
		stroke: #e9a92f;
		stroke-width: 0.8;
	}
	/* Seen from the front, a turning propeller only changes its apparent width. */
	.prop.spinning {
		animation: prop-spin 1s ease-in-out infinite alternate;
	}

	/* party hat */
	.hat {
		fill: var(--c-accent);
		stroke: color-mix(in oklab, var(--c-accent), #000 18%);
		stroke-width: 0.8;
		stroke-linejoin: round;
	}
	.hat-dot {
		fill: var(--c-body-light);
		opacity: 0.9;
	}
	.hat-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 1.6;
		stroke-linecap: round;
		opacity: 0.4;
	}
	.hat-trim {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 3.2;
		stroke-linecap: round;
		stroke-dasharray: 0.1 3.6;
	}
	.hat-pom {
		fill: var(--c-cheek);
	}

	/* hair flower */
	.blossom-sway {
		animation: sway 3.6s ease-in-out infinite alternate;
	}
	.blossom {
		transition:
			transform 0.6s cubic-bezier(0.34, 1.6, 0.5, 1),
			filter 0.6s;
	}
	.blossom.bloom {
		transform: scale(1.18) rotate(20deg);
	}
	.blossom.wilt {
		transform: translateY(2px) scale(0.86) rotate(-28deg);
		filter: saturate(0.45);
	}
	.blossom-stem {
		fill: none;
		stroke: var(--c-sprout);
		stroke-width: 1.8;
		stroke-linecap: round;
	}
	.blossom-leaf {
		fill: var(--c-sprout);
	}
	.blossom-petal {
		fill: var(--c-cheek);
		stroke: #fff;
		stroke-width: 0.7;
		stroke-opacity: 0.7;
	}
	.blossom-heart {
		fill: #ffd66b;
		stroke: #f2a93a;
		stroke-width: 0.6;
	}
	.blossom-seed {
		fill: #f2a93a;
	}

	/* monocle */
	.monocle-rim {
		fill: none;
		stroke-width: 2.8;
	}
	.chain {
		fill: none;
		stroke: #f2a93a;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-dasharray: 0.1 3.2;
	}
	.chain-pin {
		fill: #f2a93a;
	}

	/* Screen-printed extras: flat ink over an accent plate printed slightly off register. */
	.plate {
		fill: var(--c-accent);
		opacity: 0.9;
	}

	/* baseball cap */
	.ballcap {
		fill: color-mix(in oklab, var(--c-body-dark), var(--c-visor) 30%);
	}
	.ballcap-dot {
		fill: var(--c-visor);
		opacity: 0.35;
	}
	.ballcap-seam {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1;
		stroke-linecap: round;
		opacity: 0.3;
	}
	.ballcap-bill,
	.ballcap-button {
		fill: var(--c-accent);
	}

	/* nightcap */
	.nightcap {
		fill: color-mix(in oklab, var(--c-accent), #fff 55%);
	}
	.nightcap-dot {
		fill: var(--c-accent);
		opacity: 0.55;
	}
	.nightcap-cuff {
		fill: var(--c-body-light);
		stroke: var(--c-body-dark);
		stroke-width: 0.8;
	}
	.tassel {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	.tassel-knot {
		fill: var(--c-body-light);
		stroke: var(--c-body-dark);
		stroke-width: 0.8;
	}

	/* shades */
	.shades-lens {
		fill: var(--c-visor);
	}
	.shades-glint {
		fill: #fff;
		opacity: 0.28;
	}
	.shades-glint.thin {
		opacity: 0.16;
	}
	.shades-bridge,
	.shades-temple {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 2.6;
		stroke-linecap: round;
	}

	/* headband */
	.headband {
		fill: var(--c-accent);
	}
	.headband-plate {
		fill: var(--c-visor);
		opacity: 0.8;
	}
	.headband-stripe {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1.6;
	}

	/* Contact shadows: inked like the shell's occlusion, lit from the top left. */
	.contact {
		fill: var(--c-visor);
		opacity: 0.17;
	}

	@keyframes prop-spin {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(-1);
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

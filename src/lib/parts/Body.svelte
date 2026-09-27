<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import {
		BODY_GROUND_Y,
		COLLAR_H,
		COLLAR_Y,
		FOOT_SCALE,
		FOREARM,
		HIP_Y,
		LEG_X,
		SHOULDER_Y,
		UPPER_ARM,
		bodyPose,
		coreBeat,
		FOOT_COLLAR,
		legBottomY,
		shoulderX,
		torsoHalfWidth,
		torsoPath,
		type ArmAngles
	} from './body.js';

	/**
	 * Standing figure below the head: capsule torso, piston legs and feet (plain
	 * or in shoes). `feet` (legs and shoes) stays planted while the rest tilts, `back`
	 * sits behind the head (hood, torso), `front` over it (collar/outfit, arms).
	 */
	let { layer }: { layer: 'feet' | 'back' | 'front' } = $props();

	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const id = (name: string) => `${m.uid}-${name}`;

	const pose = $derived(bodyPose(m.config.hands, m.mood));
	const arms = new Spring(
		{ la1: 16, la2: -14, ra1: 16, ra2: -14, drop: 0 },
		{ stiffness: 0.09, damping: 0.42 }
	);
	$effect(() => {
		const p = pose;
		arms.set(
			{ la1: p.left.a1, la2: p.left.a2, ra1: p.right.a1, ra2: p.right.a2, drop: p.drop },
			{ instant: m.reduced }
		);
	});

	// Underdamped so one kick overshoots back and forth: the arms flail on a boop.
	const flail = new Spring(0, { stiffness: 0.1, damping: 0.16 });
	let seenBoops = m.boops;
	$effect(() => {
		const boops = m.boops;
		if (boops === seenBoops) return;
		seenBoops = boops;
		if (m.reduced) return;
		flail.set(1, { instant: true });
		flail.target = 0;
	});
	const lift = $derived(flail.current * 34 + (m.pressed ? 18 : 0));
	const left = $derived({ a1: arms.current.la1 + lift, a2: arms.current.la2 });
	const right = $derived({ a1: arms.current.ra1 + lift, a2: arms.current.ra2 });

	const hw = $derived(torsoHalfWidth(m.shape.halfWidth));
	const collarHw = $derived(Math.min(m.shape.halfWidth, 56) + 7);
	const shoulder = $derived(shoulderX(hw));
	const outfit = $derived(m.outfit);
	const shoes = $derived(m.shoes);
	const beat = $derived(coreBeat(m.mood));
	// Idle and chatty moods tap a foot; everything else stands still.
	const tapping = $derived(m.mood === 'idle' || m.mood === 'talking' || m.mood === 'listening');
	const legTop = HIP_Y - 10;
	const legBottom = $derived(legBottomY(shoes));
</script>

{#snippet arm(p: ArmAngles, swing: boolean)}
	<g transform="translate({shoulder} {SHOULDER_Y + arms.current.drop}) rotate({p.a1})">
		<path class="tube-edge" d="M0 0V{UPPER_ARM}" />
		<path class="tube" d="M0 0V{UPPER_ARM}" />
		<g transform="translate(0 {UPPER_ARM}) rotate({p.a2})">
			<g
				class="fore"
				class:swing
				class:wave={pose.swing === 'wave'}
				class:cheer={pose.swing === 'cheer'}
				class:gesture={pose.swing === 'gesture'}
			>
				<path class="tube-edge" d="M0 0V{FOREARM}" />
				<path class="tube" d="M0 0V{FOREARM}" />
				<circle class="hand" cy={FOREARM + 1} r="8" />
			</g>
		</g>
		<circle class="joint" r="7.5" />
	</g>
{/snippet}

<!-- Feet are drawn for the right side with the toe pointing outward (+x), sole on y = 0 and the heel near x = -16. -->
<!-- Plain feet are part of the body: a stubby rounded toe in the leg's color, no seam. -->
{#snippet plainFoot()}
	{@const d =
		'M-7 -10.5C-9.8 -10.5 -11 -7.5 -11 -4.5C-11 -1.5 -9.5 0 -6.5 0H10.5C14.5 0 16 -2 16 -4.8C16 -8.2 13 -10.2 8.5 -10.5Z'}
	<g class="foot-plain">
		<path class="bare" {d} />
		<path {d} fill={ref('shoe-ao')} />
		<ellipse class="bare-light" cx="7" cy="-7.6" rx="4.5" ry="1.4" />
	</g>
{/snippet}

<!--
	Shoes share one construction: the dark back rim of the collar, then the ankle (in leg
	color, so it reads as the leg going in), then the upper whose top edge is the front lip.
-->
{#snippet collar(y: number, rx: number)}
	<ellipse class="opening" cx="0" cy={-y} {rx} ry="3" />
	<rect class="ankle-stub" x="-7" y={-y - 7} width="14" height="12" rx="3" />
{/snippet}

{#snippet sneaker(high: boolean)}
	{@const c = high ? FOOT_COLLAR.hightops : FOOT_COLLAR.sneakers}
	<!-- Short, round toe box: toy sneakers read cute; long ones read as flippers from the front. -->
	{@const upper = `M-11 -9C-13 ${-c * 0.6} -12.5 ${-c} -8.6 ${-c}Q0 ${-c + 3.8} 8.6 ${-c}C${high ? 9.5 : 10} ${-c * 0.6} 11 -19 16 -17.5C21.5 -16 23 -12 22.5 -9Z`}
	<g class={high ? 'shoe-hightops' : 'shoe-sneakers'}>
		{@render collar(c, 8.6)}
		<path class="upper" d={upper} fill={ref('shoe')} />
		<path d={upper} fill={ref('shoe-ao')} />
		{#if high}
			<!-- Padded ankle collar. -->
			<path class="pad" d="M-9 {-c}Q0 {-c + 4.4} 9 {-c}" />
		{/if}
		<path class="swoosh" d="M-7 -13.5C1 -13 9 -15 19 -17.5C11 -13 4 -10.4 -7 -10.6Z" />
		<path class="laces" d="M5.5 {-c + 5}L10 {-c + 6}M7.5 {-c + 9}L12.5 {-c + 10}" />
		<ellipse class="toe-light" cx="15" cy="-15" rx="4" ry="1.6" />
		<!-- Chunky light midsole on a thin dark outsole. -->
		<path
			class="midsole"
			d="M-12.5 -10.5H22C24.8 -10.5 25.6 -6 24.4 -3.5L-13 -3.5C-14 -6 -14 -10.5 -12.5 -10.5Z"
			fill={ref('midsole')}
		/>
		<path
			class="outsole"
			d="M-13 -3.5H24.4C23.6 -1 22.2 0 19.8 0H-9.6C-11.9 0 -12.8 -1.4 -13 -3.5Z"
		/>
	</g>
{/snippet}

<!-- Chunky boot: dark rounded upper on a thick lug sole, with an accent pull tab at the heel. -->
{#snippet boot()}
	{@const c = FOOT_COLLAR.boots}
	{@const upper = `M-13 -11C-14.5 ${-c * 0.6} -13.5 ${-c} -9 ${-c}Q0 ${-c + 3.6} 9 ${-c}C10 ${-c * 0.6} 13 -21 20 -19.5C28 -18 31.5 -15 31 -11Z`}
	<g class="shoe-boots">
		<rect class="pull-tab" x="-12.5" y={-c - 6} width="5" height="9" rx="2.2" />
		{@render collar(c, 9)}
		<path class="boot-upper" d={upper} />
		<path d={upper} fill={ref('shoe-ao')} />
		<path class="cuff" d="M-9.5 {-c}Q0 {-c + 4.2} 9.5 {-c}" />
		<path class="welt" d="M-12 -12.5H29" />
		<ellipse class="boot-shine" cx="21" cy="-17" rx="5" ry="1.6" />
		<path
			class="boot-sole"
			d="M-14.5 -11.5H31C33 -11.5 33.5 -7 32.5 -3C31.8 -0.8 30.5 0 28 0H-11C-13.8 0 -15 -1.6 -15.2 -4.5C-15.4 -8 -15.4 -11.5 -14.5 -11.5Z"
		/>
		<path class="lugs" d="M-10 0V-2.6M-3 0V-2.6M4 0V-2.6M11 0V-2.6M18 0V-2.6M25 0V-2.6" />
	</g>
{/snippet}

{#if layer === 'feet'}
	<defs>
		<linearGradient id={id('shoe')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-light" />
			<stop offset="1" class="stop-mid" />
		</linearGradient>
		<linearGradient id={id('shoe-ao')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0.5" class="stop-ink" stop-opacity="0" />
			<stop offset="1" class="stop-ink" stop-opacity="0.18" />
		</linearGradient>
		<linearGradient id={id('midsole')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-light" />
			<stop offset="1" class="stop-dark" />
		</linearGradient>
	</defs>

	{#each [-1, 1] as side (side)}
		<g transform="translate({100 + side * LEG_X} 0)">
			<rect class="leg" x="-8.5" y={legTop} width="17" height={legBottom - legTop} rx="8.5" />
			<rect class="knee" x="-9" y={(legTop + legBottom) / 2} width="18" height="2.6" rx="1.3" />
		</g>
	{/each}

	<!-- Each foot is centered on its leg: the leg steps into the collar instead of standing on the shoe. -->
	{#each [-1, 1] as side (side)}
		{@const x = 100 + side * LEG_X}
		<g
			class="foot"
			class:tap={side === 1 && tapping}
			style:transform-origin="{x - side * 12 * FOOT_SCALE}px {BODY_GROUND_Y - 2}px"
		>
			<g transform="translate({x} {BODY_GROUND_Y}) scale({side * FOOT_SCALE} {FOOT_SCALE})">
				{#if shoes === 'sneakers' || shoes === 'hightops'}
					{@render sneaker(shoes === 'hightops')}
				{:else if shoes === 'boots'}
					{@render boot()}
				{:else}
					{@render plainFoot()}
				{/if}
			</g>
		</g>
	{/each}
{:else if layer === 'back'}
	<defs>
		<linearGradient id={id('torso-ao')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-ink" stop-opacity="0.16" />
			<stop offset="0.35" class="stop-ink" stop-opacity="0" />
			<stop offset="0.8" class="stop-ink" stop-opacity="0" />
			<stop offset="1" class="stop-ink" stop-opacity="0.14" />
		</linearGradient>
	</defs>

	{#if outfit === 'hoodie'}
		<rect
			class="hood"
			x={100 - m.shape.halfWidth - 7}
			y={m.shape.top + 34}
			width={m.shape.halfWidth * 2 + 14}
			height={COLLAR_Y + 8 - m.shape.top - 34}
			rx={m.shape.halfWidth}
		/>
	{/if}

	<path d={torsoPath(hw)} fill={ref('body')} />
	<path d={torsoPath(hw)} fill="url(#{id('torso-ao')})" />
	{#if outfit === 'hoodie'}
		<path class="hoodie" d={torsoPath(hw + 1.5)} />
		<path
			class="pocket"
			d="M{100 - hw * 0.55} {HIP_Y - 8}L{100 - hw * 0.45} {HIP_Y - 26}H{100 + hw * 0.45}L{100 +
				hw * 0.55} {HIP_Y - 8}"
		/>
		<rect class="hem" x={100 - hw * 0.8} y={HIP_Y - 7} width={hw * 1.6} height="3" rx="1.5" />
	{/if}
	<path class="edge" d={torsoPath(hw)} />

	<!-- A tiny status light on the chest echoes the LED face; it beats with the mood. -->
	<g class="status {beat.mode}" class:love={m.mood === 'love'} style:--beat="{beat.period}s">
		{#each [-5, 0, 5] as dx, i (dx)}
			<circle
				cx={100 + dx}
				cy={COLLAR_Y + COLLAR_H + 16}
				r="1.7"
				style:animation-delay="{i * 0.08}s"
			/>
		{/each}
	</g>
{:else}
	{#if outfit === 'puffer'}
		<ellipse class="collar-shadow" cx="100" cy={COLLAR_Y + COLLAR_H + 1} rx={collarHw - 6} ry="5" />
		<rect
			class="puffer"
			x={100 - collarHw}
			y={COLLAR_Y}
			width={collarHw * 2}
			height={COLLAR_H}
			rx={COLLAR_H / 2}
		/>
		{#each [-3, -2, -1, 1, 2, 3] as k (k)}
			<path
				class="quilt"
				d="M{100 + k * collarHw * 0.28} {COLLAR_Y + 3}V{COLLAR_Y + COLLAR_H - 3}"
			/>
		{/each}
		<rect
			class="puffer-light"
			x={100 - collarHw + 10}
			y={COLLAR_Y + 3}
			width={collarHw * 2 - 20}
			height="7"
			rx="3.5"
		/>
		<!-- Zipper pull and a little brand tag: the kind of detail that makes it feel like a real product. -->
		<rect class="zip" x="98.4" y={COLLAR_Y + COLLAR_H - 12} width="3.2" height="14" rx="1.6" />
		<rect class="tag" x={100 + collarHw - 22} y={COLLAR_Y + 10} width="11" height="7" rx="2" />
		{#each [-3, 0, 3] as dx (dx)}
			<circle class="tag-dot" cx={100 + collarHw - 16.5 + dx} cy={COLLAR_Y + 13.5} r="0.9" />
		{/each}
	{:else if outfit === 'scarf'}
		<rect
			class="scarf"
			x={100 - collarHw + 3}
			y={COLLAR_Y + 4}
			width={collarHw * 2 - 6}
			height="20"
			rx="10"
		/>
		{#each [-2, 0, 2] as k (k)}
			<path class="scarf-stripe" d="M{100 + k * 12} {COLLAR_Y + 6}V{COLLAR_Y + 22}" />
		{/each}
		<g class="tail" style:transform-origin="{100 - 18}px {COLLAR_Y + 18}px">
			<path
				class="scarf"
				d="M{100 - 26} {COLLAR_Y + 16}H{100 - 12}L{100 - 14} {COLLAR_Y + 62}H{100 - 28}Z"
			/>
			<path
				class="scarf-stripe"
				d="M{100 - 27} {COLLAR_Y + 40}H{100 - 13}M{100 - 27.5} {COLLAR_Y + 48}H{100 - 13.5}"
			/>
			<path
				class="fringe"
				d="M{100 - 26} {COLLAR_Y + 62}V{COLLAR_Y + 67}M{100 - 21} {COLLAR_Y + 62}V{COLLAR_Y +
					67}M{100 - 16} {COLLAR_Y + 62}V{COLLAR_Y + 67}"
			/>
		</g>
	{:else if outfit === 'bowtie'}
		<g transform="translate(100 {COLLAR_Y + 22})">
			<path class="bow" d="M0 0L-13 -8C-16 -9 -17 -7 -17 0C-17 7 -16 9 -13 8Z" />
			<path class="bow" d="M0 0L13 -8C16 -9 17 -7 17 0C17 7 16 9 13 8Z" />
			<rect class="bow-knot" x="-4" y="-5" width="8" height="10" rx="3" />
		</g>
	{:else if outfit === 'hoodie'}
		<rect
			class="rib"
			x={100 - collarHw + 4}
			y={COLLAR_Y + 8}
			width={collarHw * 2 - 8}
			height="16"
			rx="8"
		/>
		<path
			class="string"
			d="M94 {COLLAR_Y + 22}V{COLLAR_Y + 44}M106 {COLLAR_Y + 22}V{COLLAR_Y + 40}"
		/>
		<rect class="aglet" x="92.8" y={COLLAR_Y + 43} width="2.4" height="5" rx="1.2" />
		<rect class="aglet" x="104.8" y={COLLAR_Y + 39} width="2.4" height="5" rx="1.2" />
	{/if}

	<g class="arms" class:sleeve={outfit === 'hoodie'} class:fidget={m.hovered}>
		<g class="arm">
			{@render arm(left, pose.swingArm !== 'right')}
		</g>
		<g transform="translate(200 0) scale(-1 1)">
			<g class="arm arm-r">
				{@render arm(right, pose.swingArm !== 'left')}
			</g>
		</g>
	</g>
{/if}

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
	.leg {
		fill: var(--c-body-dark);
	}
	.knee {
		fill: var(--c-visor);
		opacity: 0.16;
	}

	.bare {
		fill: var(--c-body-dark);
	}
	.bare-light {
		fill: #fff;
		opacity: 0.3;
	}

	.heel-tab,
	.swoosh,
	.pull-tab {
		fill: var(--c-accent);
	}
	.laces {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.1;
		stroke-linecap: round;
		opacity: 0.45;
	}
	.opening {
		fill: var(--c-visor);
		opacity: 0.7;
	}
	.ankle-stub {
		fill: var(--c-body-dark);
	}
	.upper {
		stroke: var(--c-visor);
		stroke-width: 0.8;
		stroke-opacity: 0.14;
	}
	.pad {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 3.2;
		stroke-linecap: round;
	}
	.toe-light,
	.boot-shine {
		fill: #fff;
		opacity: 0.45;
	}
	.outsole {
		fill: var(--c-visor);
	}
	.stop-light {
		stop-color: var(--c-body-light);
	}
	.stop-mid {
		stop-color: var(--c-body-mid);
	}
	.stop-dark {
		stop-color: var(--c-body-dark);
	}
	.boot-upper {
		fill: var(--c-visor);
	}
	.cuff {
		fill: none;
		stroke: var(--c-body-mid);
		stroke-width: 3.4;
		stroke-linecap: round;
	}
	.welt {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 0.9;
		stroke-dasharray: 2 2.4;
		opacity: 0.5;
	}
	.boot-sole {
		fill: var(--c-body-dark);
	}
	.lugs {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 2.2;
		opacity: 0.35;
	}
	/* The foot pivots on its heel, so a tap lifts the toe. */
	.foot {
		transform-box: view-box;
	}
	.foot.tap {
		animation: tap 4.6s ease-in-out infinite;
	}

	.status circle {
		fill: var(--c-eye);
		animation: beat var(--beat) ease-in-out infinite;
	}
	.status.love circle {
		fill: var(--c-cheek);
	}
	.status.dim circle {
		animation-name: dim;
	}
	.status.flicker circle {
		animation-name: flicker;
	}

	.hood,
	.hoodie {
		fill: var(--c-accent);
	}
	.hood {
		filter: brightness(0.82);
	}
	.pocket {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.4;
		stroke-linejoin: round;
		opacity: 0.2;
	}
	.hem,
	.rib {
		fill: var(--c-visor);
		opacity: 0.14;
	}
	.rib {
		fill: var(--c-accent);
		opacity: 1;
		filter: brightness(0.9);
	}
	.string {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	.aglet {
		fill: var(--c-visor);
	}

	.collar-shadow {
		fill: var(--c-visor);
		opacity: 0.12;
	}
	.puffer {
		fill: var(--c-accent);
	}
	.quilt {
		stroke: var(--c-visor);
		stroke-width: 1.4;
		stroke-linecap: round;
		opacity: 0.16;
	}
	.puffer-light {
		fill: #fff;
		opacity: 0.22;
	}
	.zip {
		fill: var(--c-visor);
	}
	.tag {
		fill: var(--c-body-light);
	}
	.tag-dot {
		fill: var(--c-visor);
	}

	.scarf {
		fill: var(--c-accent);
	}
	.scarf-stripe,
	.fringe {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 2.4;
		stroke-linecap: round;
	}
	.fringe {
		stroke: var(--c-accent);
		stroke-width: 2;
	}
	.tail {
		transform-box: view-box;
		animation: tail 2.8s ease-in-out infinite alternate;
	}

	.bow,
	.bow-knot {
		fill: var(--c-accent);
	}
	.bow-knot {
		filter: brightness(0.85);
	}

	.tube-edge {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 15.6;
		stroke-linecap: round;
		opacity: 0.14;
	}
	.tube {
		fill: none;
		stroke: var(--c-body-mid);
		stroke-width: 14;
		stroke-linecap: round;
	}
	.sleeve .tube {
		stroke: var(--c-accent);
	}
	.joint {
		fill: var(--c-body-mid);
	}
	.sleeve .joint {
		fill: var(--c-accent);
	}
	.hand {
		fill: var(--c-body-light);
		stroke: var(--c-visor);
		stroke-width: 1.2;
		stroke-opacity: 0.2;
	}

	/* The forearm group's origin is the elbow, so rotating it swings the forearm like a real wave. */
	.fore {
		transform-box: view-box;
		transform-origin: 0 0;
	}
	.fore.swing.wave {
		animation: wave 0.34s ease-in-out infinite alternate;
	}
	.fore.swing.cheer {
		animation: cheer 0.42s ease-in-out infinite alternate;
	}
	.arm-r .fore.swing.cheer {
		animation-delay: -0.21s;
	}
	.fore.swing.gesture {
		animation: gesture 1.1s ease-in-out infinite alternate;
	}
	.fidget .hand {
		transform-box: fill-box;
		transform-origin: center;
		animation: fidget 0.5s ease-in-out 2;
	}

	@keyframes tap {
		0%,
		76%,
		100% {
			transform: rotate(0);
		}
		81% {
			transform: rotate(-13deg);
		}
		86% {
			transform: rotate(0);
		}
		91% {
			transform: rotate(-9deg);
		}
		96% {
			transform: rotate(0);
		}
	}
	@keyframes beat {
		0%,
		60%,
		100% {
			opacity: 0.35;
		}
		20% {
			opacity: 1;
		}
	}
	@keyframes dim {
		0%,
		100% {
			opacity: 0.15;
		}
		50% {
			opacity: 0.45;
		}
	}
	@keyframes flicker {
		0%,
		100% {
			opacity: 0.6;
		}
		40% {
			opacity: 0.2;
		}
		45% {
			opacity: 0.7;
		}
		50% {
			opacity: 0.15;
		}
	}
	@keyframes tail {
		from {
			transform: rotate(-4deg);
		}
		to {
			transform: rotate(5deg);
		}
	}
	@keyframes wave {
		from {
			transform: rotate(-20deg);
		}
		to {
			transform: rotate(24deg);
		}
	}
	@keyframes cheer {
		from {
			transform: rotate(-8deg);
		}
		to {
			transform: rotate(10deg);
		}
	}
	@keyframes gesture {
		from {
			transform: rotate(-10deg);
		}
		to {
			transform: rotate(14deg);
		}
	}
	@keyframes fidget {
		0%,
		100% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.15);
		}
	}
</style>

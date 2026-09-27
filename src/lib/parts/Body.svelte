<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import {
		FOREARM,
		MITTEN_PATH,
		NECK_Y,
		SHOULDER_X,
		SHOULDER_Y,
		TORSO_PATH,
		UPPER_ARM,
		bodyPose,
		coreBeat,
		type ArmAngles
	} from './body.js';

	/**
	 * Full-body figure below the head (y ≈ 160..290 in the 200×300 viewBox).
	 * `back` draws the torso behind the head, `front` the arms over it. Both
	 * layers run the same springs so the shoulders stay attached to the torso.
	 */
	let { layer }: { layer: 'back' | 'front' } = $props();

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

	// Underdamped so one kick overshoots back and forth: that reads as a wiggle.
	const bounce = new Spring(0, { stiffness: 0.1, damping: 0.16 });
	let seenBoops = m.boops;
	$effect(() => {
		const boops = m.boops;
		if (boops === seenBoops) return;
		seenBoops = boops;
		if (m.reduced) return;
		bounce.set(1, { instant: true });
		bounce.target = 0;
	});

	const crouch = new Spring(0, { stiffness: 0.2, damping: 0.55 });
	$effect(() => {
		crouch.set(m.pressed ? 1 : 0, { instant: m.reduced });
	});

	const b = $derived(bounce.current);
	const c = $derived(crouch.current);
	// Anchored at the neck: crouching lifts the pod instead of pulling the torso off the head.
	const bodyTransform = $derived(
		`rotate(${(b * 6).toFixed(2)} 100 ${NECK_Y}) translate(100 ${NECK_Y}) scale(${(1 + c * 0.05 + b * 0.03).toFixed(3)} ${(1 - c * 0.08 - b * 0.04).toFixed(3)}) translate(-100 ${-NECK_Y})`
	);
	const lift = $derived(b * 34 + c * 14);
	const left = $derived({ a1: arms.current.la1 + lift, a2: arms.current.la2 });
	const right = $derived({ a1: arms.current.ra1 + lift, a2: arms.current.ra2 });

	const beat = $derived(coreBeat(m.mood));
	const love = $derived(m.mood === 'love');
	const outfit = $derived(m.outfit);
	const neck = $derived(m.shape.bottom);
</script>

{#snippet arm(p: ArmAngles, swing: boolean)}
	<g transform="translate({SHOULDER_X} {SHOULDER_Y + arms.current.drop}) rotate({p.a1})">
		<path class="tube-edge" d="M0 0V{UPPER_ARM}" />
		<path class="tube" d="M0 0V{UPPER_ARM}" />
		<path class="tube-shine" d="M-2 1V{UPPER_ARM - 1}" />
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
				<path class="tube-shine" d="M-2 1V{FOREARM - 1}" />
				<g transform="translate(0 {FOREARM - 1.5}) scale(1.3)">
					<g class="mitten">
						<ellipse class="cuff" cx="0" cy="0.6" rx="4.6" ry="1.9" />
						<path d={MITTEN_PATH} fill={ref('hand')} class="mitten-skin" />
						<path class="mitten-shine" d="M-3.4 3.5C-4 6-3.6 8.4-2.2 9.6" />
					</g>
				</g>
			</g>
		</g>
		<circle class="joint" r="6" fill={ref('hand')} />
	</g>
{/snippet}

{#if layer === 'back'}
	<defs>
		<linearGradient id={id('bsheen')} x1="0" y1="0" x2="1" y2="1">
			<stop offset="0.1" class="stop-eye" stop-opacity="0" />
			<stop offset="0.45" class="stop-cheek" stop-opacity="0.26" />
			<stop offset="0.72" class="stop-accent" stop-opacity="0.34" />
			<stop offset="1" class="stop-eye" stop-opacity="0.05" />
		</linearGradient>
		<linearGradient id={id('fabric')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.28" />
			<stop offset="0.55" stop-color="#fff" stop-opacity="0" />
			<stop offset="1" class="stop-visor" stop-opacity="0.3" />
		</linearGradient>
		<linearGradient id={id('jet')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-eye" stop-opacity="0.9" />
			<stop offset="1" class="stop-eye" stop-opacity="0" />
		</linearGradient>
		<radialGradient id={id('core')}>
			<stop offset="0" class={love ? 'stop-cheek' : 'stop-eye'} stop-opacity="0.75" />
			<stop offset="1" class={love ? 'stop-cheek' : 'stop-eye'} stop-opacity="0" />
		</radialGradient>
		<clipPath id={id('torso')}>
			<path d={TORSO_PATH} />
		</clipPath>
	</defs>

	<g transform={bodyTransform}>
		<g class="sway">
			{#if outfit === 'cape'}
				<g class="cape">
					<path
						class="fabric-cape"
						d="M76 172C60 190 52 226 55 256Q66 262 78 256Q89 264 100 257Q111 264 122 256Q134 262 145 256C148 226 140 190 124 172Z"
					/>
					<path
						d="M76 172C60 190 52 226 55 256Q66 262 78 256Q89 264 100 257Q111 264 122 256Q134 262 145 256C148 226 140 190 124 172Z"
						fill={ref('fabric')}
					/>
				</g>
			{/if}

			<g class="pod">
				<ellipse class="jet-halo" cx="100" cy="258" rx="11" ry="7" filter={ref('soft')} />
				<g transform="translate(100 249) scale({1 + b * 0.7} {1 + b * 0.9 + c * 0.3})">
					<path
						class="jet"
						d="M-7 0Q0 3 7 0Q5 12 0 19Q-5 12-7 0Z"
						fill={ref('jet')}
						filter={ref('soft')}
					/>
					<path class="jet-core" d="M-3 0Q0 1.4 3 0Q2 6 0 9Q-2 6-3 0Z" />
				</g>
				<circle class="spark" cx="97" cy="256" r="1.1" />
				<circle class="spark late" cx="103.5" cy="256" r="0.9" />
				<ellipse class="thruster" cx="100" cy="246.4" rx="10.5" ry="3.6" />
				<ellipse class="thruster-ring" cx="100" cy="247.4" rx="7" ry="2" filter={ref('glow')} />
			</g>

			<path d={TORSO_PATH} fill={ref('body')} />
			<path d={TORSO_PATH} fill={ref('bsheen')} />

			<g clip-path={ref('torso')}>
				<ellipse
					class="occlusion"
					cx="100"
					cy={neck + 3}
					rx={Math.min(m.shape.halfWidth * 0.62, 40)}
					ry="9"
					filter={ref('soft')}
				/>
				{#if outfit === 'hoodie'}
					<g class="hoodie">
						<rect class="fabric-accent" x="58" y="160" width="34.5" height="92" />
						<rect class="fabric-accent" x="107.5" y="160" width="34.5" height="92" />
						<rect x="58" y="160" width="34.5" height="92" fill={ref('fabric')} />
						<rect x="107.5" y="160" width="34.5" height="92" fill={ref('fabric')} />
						<path class="seam" d="M92.5 176V250M107.5 176V250" />
						<path class="stitch" d="M66 224Q78 219 90 225M110 225Q122 219 134 224" />
						<path class="hem" d="M60 238Q100 252 140 238" />
					</g>
				{/if}
			</g>
			<path class="rim" d={TORSO_PATH} />

			{#if outfit !== 'hoodie'}
				<path class="seam soft" d="M70 229Q100 241 130 229" />
				<ellipse
					class="belly-shine"
					cx="83"
					cy="195"
					rx="6"
					ry="11"
					transform="rotate(24 83 195)"
					filter={ref('soft')}
				/>
				<circle class="spec" cx="76.5" cy="189" r="1.5" />
			{/if}

			{#if outfit === 'hoodie'}
				<ellipse class="fabric-accent" cx="100" cy={neck + 2} rx="31" ry="10" />
				<ellipse cx="100" cy={neck + 2} rx="31" ry="10" fill={ref('fabric')} />
				<path
					class="string"
					d="M94.5 {neck + 9}Q93.5 188 94.5 197M105.5 {neck + 9}Q106.5 188 105.5 197"
				/>
				<circle class="aglet" cx="94.5" cy="198" r="1.3" />
				<circle class="aglet" cx="105.5" cy="198" r="1.3" />
			{/if}

			<ellipse class="collar" cx="100" cy={neck - 1} rx="19" ry="5.5" />
			<ellipse class="collar-light" cx="100" cy={neck - 0.5} rx="18" ry="5.2" />

			<g transform="translate(100 211)">
				<g class="core {beat.mode}" style="--beat: {beat.period}s">
					<circle class="core-bloom" r="14" fill={ref('core')} />
					<circle class="core-ring" r="10.6" />
					<circle class="core-plate" r="8.6" />
					<path
						class="core-heart"
						class:love
						d="M0 3.6C-5.2 .2-5 -4 -2.4 -4C-1.1 -4-.4 -3.2 0 -2.3C.4 -3.2 1.1 -4 2.4 -4C5 -4 5.2 .2 0 3.6Z"
						filter={ref('glow')}
					/>
					<path class="core-glint" d="M-5.6 -3.4A6.6 6.6 0 0 1 -2.4 -6.2" />
				</g>
			</g>

			{#if outfit === 'scarf'}
				<g class="scarf">
					<g transform="translate(115 186)">
						<g class="tails">
							<path class="fabric-cheek" d="M-3 0C-2 8-4 15-2 23L5 22C4 15 6 8 4 0Z" />
							<path class="fabric-cheek" d="M1 0C4 7 5 12 10 18L15 14C10 9 8 5 6 -1Z" />
							<path d="M-3 0C-2 8-4 15-2 23L5 22C4 15 6 8 4 0Z" fill={ref('fabric')} />
							<path class="fringe" d="M-1.5 23.5V26M1 23.3V25.8M3.5 23V25.5" />
							<path class="stripe" d="M-3 13.5L5 13M-2.7 17L5.2 16.5" />
						</g>
					</g>
					<path
						class="fabric-cheek"
						d="M69 {neck + 1}Q100 {neck + 13} 131 {neck + 1}Q134.5 {neck + 6} 131 {neck +
							11}Q100 {neck + 24} 69 {neck + 11}Q65.5 {neck + 6} 69 {neck + 1}Z"
					/>
					<path
						d="M69 {neck + 1}Q100 {neck + 13} 131 {neck + 1}Q134.5 {neck + 6} 131 {neck +
							11}Q100 {neck + 24} 69 {neck + 11}Q65.5 {neck + 6} 69 {neck + 1}Z"
						fill={ref('fabric')}
					/>
					<path class="stripe" d="M78 {neck + 6}Q100 {neck + 16} 122 {neck + 6}" />
					<rect class="fabric-cheek knot" x="109.5" y={neck + 9} width="11" height="9" rx="4" />
				</g>
			{:else if outfit === 'bowtie'}
				<g transform="translate(100 {neck + 7})">
					<g class="bowtie">
						<path
							class="fabric-cheek"
							d="M0 0C-4 -6-12 -6.5-12 0C-12 6.5-4 6 0 0ZM0 0C4 -6 12 -6.5 12 0C12 6.5 4 6 0 0Z"
						/>
						<path
							d="M0 0C-4 -6-12 -6.5-12 0C-12 6.5-4 6 0 0ZM0 0C4 -6 12 -6.5 12 0C12 6.5 4 6 0 0Z"
							fill={ref('fabric')}
						/>
						<path class="fold" d="M-9 -1.5Q-6 0-9 1.5M9 -1.5Q6 0 9 1.5" />
						<rect class="fabric-cheek knot" x="-3" y="-3.4" width="6" height="6.8" rx="2.2" />
						<circle class="spec" cx="-1" cy="-1.6" r="0.8" />
					</g>
				</g>
			{/if}
		</g>
	</g>
{:else}
	<g transform={bodyTransform}>
		<g class="sway arms" class:sleeve={outfit === 'hoodie'} class:fidget={m.hovered}>
			<g class="arm">
				{@render arm(left, pose.swingArm !== 'right')}
			</g>
			<g transform="translate(200 0) scale(-1 1)">
				<g class="arm arm-r">
					{@render arm(right, pose.swingArm !== 'left')}
				</g>
			</g>
		</g>
	</g>
{/if}

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
	.stop-visor {
		stop-color: var(--c-visor);
	}

	/* Body motion pivots at the neck (view-box coordinates) so the torso never leaves the head. */
	.sway {
		transform-box: view-box;
		transform-origin: 100px 170px;
		animation: sway calc(var(--float-speed) * 1.7) ease-in-out infinite alternate;
	}

	.rim {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.55;
		stroke-width: 1.3;
	}
	.occlusion {
		fill: var(--c-visor);
		opacity: 0.32;
	}
	.belly-shine {
		fill: #fff;
		opacity: 0.55;
	}
	.spec {
		fill: #fff;
		opacity: 0.85;
	}
	.seam {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.45;
		stroke-width: 0.9;
		stroke-linecap: round;
	}
	.seam.soft {
		stroke-opacity: 0.35;
	}
	.collar {
		fill: var(--c-visor);
	}
	.collar-light {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 1;
		stroke-opacity: 0.8;
	}

	/* Chest core */
	.core {
		transform-box: fill-box;
		transform-origin: center;
	}
	.core-bloom {
		opacity: 0.7;
	}
	.core-ring {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 1;
		stroke-opacity: 0.7;
	}
	.core-plate {
		fill: var(--c-visor);
		stroke: #fff;
		stroke-opacity: 0.45;
		stroke-width: 0.8;
	}
	.core-heart {
		fill: var(--c-eye);
		transform-box: fill-box;
		transform-origin: center;
	}
	.core-heart.love {
		fill: var(--c-cheek);
	}
	.core-glint {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.55;
		stroke-width: 1;
		stroke-linecap: round;
	}
	.core.beat .core-heart,
	.core.beat .core-bloom {
		transform-box: fill-box;
		transform-origin: center;
		animation: heartbeat var(--beat) ease-out infinite;
	}
	.core.dim .core-heart,
	.core.dim .core-bloom {
		animation: dim var(--beat) ease-in-out infinite alternate;
	}
	.core.flicker .core-heart,
	.core.flicker .core-bloom {
		animation: flicker var(--beat) linear infinite;
	}

	/* Hover pod */
	.thruster {
		fill: var(--c-visor);
		stroke: #fff;
		stroke-opacity: 0.35;
		stroke-width: 0.7;
	}
	.thruster-ring {
		fill: none;
		stroke: var(--c-eye);
		stroke-width: 1.4;
	}
	.jet-halo {
		fill: var(--c-eye);
		opacity: 0.35;
		transform-box: fill-box;
		transform-origin: center top;
		animation: halo calc(var(--float-speed) / 2) ease-in-out infinite alternate;
	}
	.jet {
		opacity: 0.7;
		transform-box: fill-box;
		transform-origin: center top;
		animation: jet 0.16s steps(2) infinite alternate;
	}
	.jet-core {
		fill: #fff;
		opacity: 0.75;
	}
	.spark {
		fill: var(--c-eye);
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
		animation: spark 1.4s ease-in infinite;
	}
	.spark.late {
		animation-delay: -0.7s;
	}
	:global([data-mood='sleepy']) .jet,
	:global([data-mood='sleepy']) .jet-halo {
		opacity: 0.3;
	}

	/* Outfits */
	.fabric-cape {
		fill: var(--c-accent);
	}
	.cape {
		transform-box: view-box;
		transform-origin: 100px 172px;
		animation: cape calc(var(--float-speed) * 0.9) ease-in-out infinite alternate;
	}
	.fabric-accent {
		fill: var(--c-accent);
	}
	.fabric-cheek {
		fill: var(--c-cheek);
	}
	.stitch {
		fill: none;
		stroke: var(--c-visor);
		stroke-opacity: 0.35;
		stroke-width: 0.9;
		stroke-dasharray: 1.6 1.4;
		stroke-linecap: round;
	}
	.hem {
		fill: none;
		stroke: var(--c-visor);
		stroke-opacity: 0.25;
		stroke-width: 3;
	}
	.string {
		fill: none;
		stroke: #fff;
		stroke-width: 1.1;
		stroke-linecap: round;
		opacity: 0.9;
	}
	.aglet {
		fill: #fff;
	}
	.stripe,
	.fold {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.5;
		stroke-width: 1.3;
		stroke-linecap: round;
	}
	.fringe {
		fill: none;
		stroke: var(--c-cheek);
		stroke-width: 1.2;
		stroke-linecap: round;
	}
	.knot {
		stroke: var(--c-visor);
		stroke-opacity: 0.2;
		stroke-width: 0.8;
	}
	.tails {
		transform-box: view-box;
		transform-origin: 0 0;
		animation: tails calc(var(--float-speed) * 0.7) ease-in-out infinite alternate;
	}
	.bowtie {
		transform-box: view-box;
		transform-origin: 0 0;
	}

	/* Arms */
	.tube-edge,
	.tube,
	.tube-shine {
		fill: none;
		stroke-linecap: round;
	}
	.tube-edge {
		stroke: var(--c-body-dark);
		stroke-opacity: 0.6;
		stroke-width: 10.4;
	}
	.tube {
		stroke: var(--c-body-mid);
		stroke-width: 8.6;
	}
	.tube-shine {
		stroke: var(--c-body-light);
		stroke-width: 2.6;
		stroke-opacity: 0.9;
	}
	.sleeve .tube {
		stroke: var(--c-accent);
	}
	.sleeve .tube-shine {
		stroke: #fff;
		stroke-opacity: 0.35;
	}
	.joint {
		stroke: #fff;
		stroke-opacity: 0.5;
		stroke-width: 0.7;
	}
	.sleeve .joint {
		fill: var(--c-accent);
	}
	.mitten-skin {
		stroke: #fff;
		stroke-opacity: 0.6;
		stroke-width: 0.8;
	}
	.mitten-shine {
		fill: none;
		stroke: #fff;
		stroke-opacity: 0.8;
		stroke-width: 1.1;
		stroke-linecap: round;
	}
	.cuff {
		fill: var(--c-accent);
		stroke: #fff;
		stroke-opacity: 0.5;
		stroke-width: 0.6;
	}
	.sleeve .cuff {
		fill: #fff;
	}

	/* The forearm group's origin is the elbow, so rotating it swings the forearm like a real wave. */
	.fore,
	.mitten {
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
	.fidget .mitten {
		animation: fidget 0.5s ease-in-out 2;
	}
	.fidget .arm-r .mitten {
		animation-delay: 0.12s;
	}

	@keyframes sway {
		from {
			transform: rotate(-1.4deg);
		}
		to {
			transform: rotate(1.4deg);
		}
	}
	@keyframes heartbeat {
		0%,
		100% {
			transform: scale(1);
		}
		14% {
			transform: scale(1.26);
		}
		28% {
			transform: scale(1);
		}
		42% {
			transform: scale(1.14);
		}
		64% {
			transform: scale(1);
		}
	}
	@keyframes dim {
		from {
			opacity: 0.25;
		}
		to {
			opacity: 0.6;
		}
	}
	@keyframes flicker {
		0%,
		18%,
		22%,
		58%,
		100% {
			opacity: 0.75;
		}
		20% {
			opacity: 0.2;
		}
		60% {
			opacity: 0.35;
		}
		64% {
			opacity: 0.8;
		}
		66% {
			opacity: 0.25;
		}
	}
	@keyframes jet {
		from {
			transform: scale(1, 0.86);
		}
		to {
			transform: scale(0.92, 1.05);
		}
	}
	@keyframes halo {
		to {
			transform: scale(1.2, 0.9);
			opacity: 0.2;
		}
	}
	@keyframes spark {
		0% {
			opacity: 0;
			transform: translateY(0) scale(1);
		}
		20% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: translateY(18px) scale(0.3);
		}
	}
	@keyframes cape {
		from {
			transform: skewX(-2.5deg);
		}
		to {
			transform: skewX(2.5deg);
		}
	}
	@keyframes tails {
		from {
			transform: rotate(-7deg);
		}
		to {
			transform: rotate(6deg);
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
			transform: rotate(0);
		}
		30% {
			transform: rotate(-16deg) scale(1.08);
		}
		70% {
			transform: rotate(12deg) scale(0.95);
		}
	}
</style>

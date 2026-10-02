<script lang="ts">
	import HeldItem from './HeldItem.svelte';
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { clamp } from '../geometry.js';
	import {
		RELEASE_SPRING,
		drag,
		legStretch,
		legSwing,
		reachArm,
		toFrame,
		tune,
		type ArmReach,
		type Point
	} from '../grab.js';
	import {
		COLLAR_H,
		COLLAR_Y,
		HIP_Y,
		bodyPose,
		coreBeat,
		FOOT_COLLAR,
		legBottomY,
		shortsBottomY,
		shoulderX,
		torsoHalfWidth,
		torsoOuterWidth,
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

	const pose = $derived.by(() => {
		const p = bodyPose(m.config.hands, m.mood);
		if (m.heldItem === 'none') return p;
		const right =
			m.heldItem === 'sword'
				? { a1: 35, a2: 135 }
				: m.heldItem === 'microphone'
					? { a1: -25, a2: -145 }
					: { a1: 25, a2: 145 };
		return { ...p, right };
	});
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

	type Side = 'left' | 'right';
	/** Where the pointer wants an arm it holds; null while the arm is free. */
	const heldArm = $state<Record<Side, ArmReach | null>>({ left: null, right: null });
	// Each arm's offset from its pose (stretch as the amount past 1) lives in its own spring:
	// direct while held, loose once let go, so it snaps
	// back like rubber, all without disturbing the pose spring or the other arm.
	const offset: Record<Side, Spring<ArmReach>> = {
		left: new Spring({ a1: 0, a2: 0, stretch: 0 }, RELEASE_SPRING),
		right: new Spring({ a1: 0, a2: 0, stretch: 0 }, RELEASE_SPRING)
	};
	const posed = (side: Side): ArmAngles =>
		side === 'left'
			? { a1: arms.current.la1 + lift, a2: arms.current.la2 }
			: { a1: arms.current.ra1 + lift, a2: arms.current.ra2 };
	const shown = (side: Side): ArmReach => {
		const p = posed(side);
		const o = offset[side].current;
		// The snap back overshoots into a brief squash, but never folds the arm up entirely.
		return { a1: p.a1 + o.a1, a2: p.a2 + o.a2, stretch: Math.max(1 + o.stretch, 0.6) };
	};
	const left = $derived(shown('left'));
	const right = $derived(shown('right'));
	$effect(() => {
		for (const side of ['left', 'right'] as const) {
			const held = heldArm[side];
			if (!held) continue;
			const p = posed(side);
			offset[side].set(
				{ a1: held.a1 - p.a1, a2: held.a2 - p.a2, stretch: held.stretch - 1 },
				{ instant: true }
			);
		}
	});
	/** The `.arm` groups: both arms use left-arm math inside them, the right one is mirrored. */
	const armFrames: Record<Side, SVGGElement | undefined> = $state({
		left: undefined,
		right: undefined
	});

	function grabArm(e: PointerEvent, side: Side) {
		// Capture the grip before the press animation can lift the hand.
		const frame = armFrames[side];
		const hand = frame?.querySelector<SVGCircleElement | SVGEllipseElement>('.hand');
		const matrix = hand?.getScreenCTM();
		if (!frame || !hand || !matrix) return;
		const screen = new DOMPoint(0, hand.cy.baseVal.value).matrixTransform(matrix);
		const center = toFrame(frame, screen.x, screen.y);
		const from = toFrame(frame, e.clientX, e.clientY);
		if (!center || !from) return;
		const grip = { x: from.x - center.x, y: from.y - center.y };
		drag(e, {
			frame: () => armFrames[side],
			start: () => {
				if (!m.grab(side === 'left' ? 'arm-left' : 'arm-right')) return false;
				tune(offset[side], true);
			},
			move: (to) => {
				// Preserve where the hand was caught instead of snapping its center to the pointer.
				heldArm[side] = reachArm(
					{ x: to.x - grip.x, y: to.y - grip.y },
					{ x: shoulder, y: b.shoulderY + arms.current.drop },
					b.upperArm,
					b.forearm + 1,
					heldArm[side] ?? shown(side)
				);
			},
			end: () => {
				heldArm[side] = null;
				tune(offset[side], false);
				offset[side].set({ a1: 0, a2: 0, stretch: 0 }, { instant: m.reduced });
				m.release();
			}
		});
	}

	const b = $derived(m.build);
	const hw = $derived(torsoHalfWidth(m.shape.halfWidth, b));
	const hipHw = $derived(hw * b.torso.hip);
	/** Fabric that spans the whole torso (clipped to it) has to cover a belly too. */
	const outerHw = $derived(torsoOuterWidth(hw, b));
	/** Stripes running top to bottom stay inside wherever the torso is narrowest. */
	const innerHw = $derived(hw * Math.min(b.torso.shoulder, b.torso.hip));
	// Neckwear and chest details follow the torso width, within limits so they stay readable.
	const u = $derived(Math.min(Math.max(hw / 48, 0.75), 1.2));
	// Room between collar and hips, relative to the standard build: ties and scarves hang to fit.
	const v = $derived((b.hipY - COLLAR_Y) / (HIP_Y - COLLAR_Y));
	// The head is scaled around its bottom per build; the hood has to wrap the scaled head.
	const headHw = $derived(m.shape.halfWidth * b.headScale);
	const headTop = $derived(m.shape.bottom + b.headY - (m.shape.bottom - m.shape.top) * b.headScale);
	// Small torsos (chibi) keep the collar close so it reads as a collar, not a ruff.
	const collarHw = $derived(Math.min(headHw, 56, hw + 15) + 7);
	const shoulder = $derived(shoulderX(hw, b));
	const outfit = $derived(m.outfit);
	const shoes = $derived(m.shoes);
	const beat = $derived(coreBeat(m.mood));
	// Idle and chatty moods tap a foot; everything else stands still.
	const tapping = $derived(m.mood === 'idle' || m.mood === 'talking' || m.mood === 'listening');
	const legTop = $derived(b.hipY - 10);
	const legHw = $derived(b.legWidth / 2);
	const legBottom = $derived(legBottomY(shoes, b));
	const hip = (side: number): Point => ({ x: 100 + side * b.legX, y: legTop + legHw });
	/**
	 * Swing of each leg (with its foot) around the hip in `rotate()` degrees, and how many
	 * units it is stretched along its length; index 0 is the left leg.
	 */
	const legPulls = [
		new Spring({ angle: 0, grow: 0 }, RELEASE_SPRING),
		new Spring({ angle: 0, grow: 0 }, RELEASE_SPRING)
	];
	const legPull = (side: number) => legPulls[side < 0 ? 0 : 1];
	let heldLeg = $state(0);
	/** Wraps the whole feet layer without being swung itself, so drag points stay put. */
	let feetFrame: SVGGElement | undefined = $state();

	function turn(p: Point, pivot: Point, deg: number): Point {
		const r = (deg * Math.PI) / 180;
		const dx = p.x - pivot.x;
		const dy = p.y - pivot.y;
		return {
			x: pivot.x + dx * Math.cos(r) - dy * Math.sin(r),
			y: pivot.y + dx * Math.sin(r) + dy * Math.cos(r)
		};
	}

	function grabLeg(e: PointerEvent, side: -1 | 1) {
		const spring = legPull(side);
		// Where the grabbed point sits on the unswung leg, so catching a leg mid-bounce doesn't snap it.
		let rest: Point | null = null;
		drag(e, {
			frame: () => feetFrame,
			start: (from) => {
				if (!m.grab(side < 0 ? 'leg-left' : 'leg-right')) return false;
				heldLeg = side;
				tune(spring, true);
				rest = turn(from, hip(side), -spring.current.angle);
			},
			move: (to) => {
				if (!rest) return;
				const pivot = hip(side);
				spring.set(
					{ angle: legSwing(pivot, rest, to, side), grow: legStretch(pivot, rest, to) },
					{ instant: true }
				);
			},
			end: () => {
				heldLeg = 0;
				tune(spring, false);
				spring.set({ angle: 0, grow: 0 }, { instant: m.reduced });
				m.release();
			}
		});
	}

	// A swung-out or stretched foot leaves the ground; Mascot fades its contact shadow.
	$effect(() => {
		for (const side of [-1, 1] as const) {
			const { angle, grow } = legPull(side).current;
			m.footLift(side, clamp(Math.max(Math.abs(angle) / 25, Math.abs(grow) / 20), 0, 1));
		}
	});
	const shortsBottom = $derived(shortsBottomY(shoes, b));
	const tieY = (dy: number) => COLLAR_Y + 25 + dy * v;
	const tieBlade = $derived(
		`M${100 - 4 * u} ${COLLAR_Y + 25}L${100 - 7 * u} ${tieY(33)}L100 ${tieY(41)}L${100 + 7 * u} ${tieY(33)}L${100 + 4 * u} ${COLLAR_Y + 25}Z`
	);
	const scarfLength = $derived(Math.min(62, b.hipY - COLLAR_Y - 10));
	// Without legs the torso reaches the ground, so the cape stops just above it.
	const capeHem = $derived(Math.min(b.hipY + 18, b.groundY - 4));
</script>

{#snippet arm(p: ArmReach, swing: boolean, carrying = false)}
	{@const upper = b.upperArm * p.stretch}
	{@const fore = b.forearm * p.stretch}
	<!-- A stretched arm thins out, like pulled rubber keeping its volume; the hand keeps its size. -->
	<g
		transform="translate({shoulder} {b.shoulderY + arms.current.drop}) rotate({p.a1})"
		style:--arm="{b.armWidth / Math.sqrt(p.stretch)}px"
	>
		<path class="tube-edge" d="M0 0V{upper}" />
		<path class="tube upper-arm" d="M0 0V{upper}" />
		{#if outfit === 'jersey'}
			<path class="sleeve-band" d="M{-b.armWidth / 2} {upper - 8}H{b.armWidth / 2}" />
		{/if}
		<g transform="translate(0 {upper}) rotate({p.a2})">
			<g
				class="fore"
				class:swing={swing && !carrying}
				class:sword={carrying && swing && m.heldItem === 'sword'}
				class:microphone={carrying && swing && m.heldItem === 'microphone' && m.mood === 'talking'}
				class:phone={carrying && swing && m.heldItem === 'phone'}
				class:wave={pose.swing === 'wave'}
				class:cheer={pose.swing === 'cheer'}
				class:gesture={pose.swing === 'gesture'}
			>
				<path class="tube-edge" d="M0 0V{fore}" />
				<path class="tube" d="M0 0V{fore}" />
				{#if carrying}
					<g
						transform="translate(0 {fore + 1}) rotate(180) scale({Math.min(
							1.1,
							Math.max(0.8, b.armWidth / 14)
						)})"
					>
						<HeldItem item={m.heldItem} />
					</g>
				{/if}
				{#if carrying && m.heldItem === 'phone'}
					<ellipse
						class="hand"
						cy={fore + 1}
						rx={(b.armWidth * 3.5) / 14}
						ry={(b.armWidth * 5) / 14}
					/>
				{:else}
					<circle class="hand" cy={fore + 1} r={(b.armWidth * 8) / 14} />
				{/if}
				{#if m.species === 'critter'}
					<ellipse class="paw-pad" cy={fore + 3} rx="3.5" ry="3" />
					{#each [-1, 0, 1] as toe (toe)}
						<circle class="paw-pad" cx={toe * 4} cy={fore - 2} r="1.4" />
					{/each}
				{/if}
			</g>
		</g>
		{#if m.species === 'bob'}<circle class="joint" r={b.armWidth / 2 + 0.5} />{/if}
	</g>
{/snippet}

<!-- Feet are drawn for the right side with the toe pointing outward (+x), sole on y = 0 and the heel near x = -16. -->
<!-- Plain feet are part of the body: a stubby rounded toe in the leg's color, no seam. -->
{#snippet plainFoot()}
	{@const d =
		m.species === 'critter'
			? 'M-8-13C-12-13-14-8-13-4C-12 0-7 1 0 0C7 1 16 0 17-5C18-10 11-14 5-14Q-2-16-8-13Z'
			: 'M-7 -10.5C-9.8 -10.5 -11 -7.5 -11 -4.5C-11 -1.5 -9.5 0 -6.5 0H10.5C14.5 0 16 -2 16 -4.8C16 -8.2 13 -10.2 8.5 -10.5Z'}
	<g class="foot-plain">
		<path class="bare" {d} />
		<path {d} fill={ref('shoe-ao')} />
		<ellipse class="bare-light" cx="7" cy="-7.6" rx="4.5" ry="1.4" />
		{#if m.species === 'critter'}
			<path class="paw-toes" d="M7-8V-3M12-7V-3" />
		{/if}
	</g>
{/snippet}

<!--
	Shoes are drawn in two passes around the fixed leg: the dark back rim of the collar
	behind it, then the upper, whose top edge is the front lip. The leg itself reaches into
	the shoe, so a toe tap can never pull a seam open between them.
-->

{#snippet sneaker(high: boolean, side: number)}
	{@const c = high ? FOOT_COLLAR.hightops : FOOT_COLLAR.sneakers}
	<!-- Short, round toe box: toy sneakers read cute; long ones read as flippers from the front. -->
	{@const upper = `M-11 -9C-13 ${-c * 0.6} -12.5 ${-c} -8.6 ${-c}Q0 ${-c + 3.8} 8.6 ${-c}C${high ? 9.5 : 10} ${-c * 0.6} 11 -19 16 -17.5C21.5 -16 23 -12 22.5 -9Z`}
	<g class={high ? 'shoe-hightops' : 'shoe-sneakers'}>
		<path class="upper" d={upper} fill={ref('shoe')} />
		<path d={upper} fill={ref('shoe-ao')} />
		{#if high}
			<!-- Padded ankle collar. -->
			<path class="pad" d="M-9 {-c}Q0 {-c + 4.4} 9 {-c}" />
		{/if}
		<clipPath id={id(`upper-${side}`)}>
			<path d={upper} />
		</clipPath>
		<!-- Details are clipped to the upper so nothing pokes past the shoe's outline. -->
		<g clip-path={ref(`upper-${side}`)}>
			<path class="swoosh" d="M-7 -13.5C1 -13 9 -15 19 -17.5C11 -13 4 -10.4 -7 -10.6Z" />
			<path class="laces" d="M4 -19L8.5 -18M6 -15.5L11 -14.5" />
			<ellipse class="toe-light" cx="15" cy="-15" rx="4" ry="1.6" />
		</g>
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

<!-- Plush slipper: a puffy accent upper with a fluffy cuff and a pom-pom on the toe. -->
{#snippet slipper()}
	{@const c = FOOT_COLLAR.slippers}
	{@const upper = `M-12 -3.5C-13.5 -8 -12.5 ${-c} -8.6 ${-c}Q0 ${-c + 3.4} 8.6 ${-c}C11 ${-c} 14 -13.2 18 -11.4C23 -9.2 25 -6.4 24.4 -3.5Z`}
	<g class="shoe-slippers">
		<path class="slipper" d={upper} />
		<path d={upper} fill={ref('shoe-ao')} />
		<path class="fluff" d="M-9 {-c + 0.4}Q0 {-c + 4} 9 {-c + 0.4}" />
		<ellipse class="toe-light" cx="17" cy="-8.6" rx="3.6" ry="1.3" />
		<circle class="pompom" cx="14.5" cy="-12.2" r="4.4" />
		<circle class="pompom-light" cx="13.4" cy="-13.6" r="1.5" />
		<path
			class="slipper-sole"
			d="M-12.8 -3.5H24.4C24.2 -1.2 22.6 0 20.4 0H-9.6C-11.6 0 -12.6 -1.2 -12.8 -3.5Z"
		/>
	</g>
{/snippet}

<!-- Glossy wellies: a tall accent shaft with a light top band and a long wet shine. -->
{#snippet rainboot()}
	{@const c = FOOT_COLLAR.rainboots}
	{@const upper = `M-12 -9C-12.8 ${-c * 0.6} -11.6 ${-c} -9.5 ${-c}Q0 ${-c + 3.4} 9.5 ${-c}C11.2 ${-c * 0.6} 11 -20 16 -17.8C22 -15.6 24 -12.4 23.6 -9Z`}
	<g class="shoe-rainboots">
		<path class="welly" d={upper} />
		<path d={upper} fill={ref('shoe-ao')} />
		<path class="welly-band" d="M-10 {-c + 0.6}Q0 {-c + 4.2} 10 {-c + 0.6}" />
		<path class="welly-shine" d="M-6.5 {-c + 8}V{-c * 0.45}" />
		<ellipse class="toe-light" cx="16" cy="-14.6" rx="4.2" ry="1.5" />
		<path
			class="welly-sole"
			d="M-13 -9.5H24C25.6 -9.5 26.2 -5 25.2 -2.6C24.6 -0.8 23.2 0 21 0H-10.4C-12.6 0 -13.6 -1.4 -13.8 -3.8C-14 -6.6 -14 -9.5 -13 -9.5Z"
		/>
		<path class="welly-tread" d="M-13.6 -4.6H25.4" />
	</g>
{/snippet}

<!-- Roller skate: a hightop boot bolted to a dark plate, two accent wheels and a toe stop. -->
{#snippet skate(side: number)}
	{@const c = FOOT_COLLAR.skates}
	{@const upper = `M-11 -12C-12.6 ${-c * 0.6} -12 ${-c} -8.6 ${-c}Q0 ${-c + 3.8} 8.6 ${-c}C9.6 ${-c * 0.62} 11 -27 16 -25.4C21.4 -23.6 22.8 -18.4 22.4 -12Z`}
	<g class="shoe-skates">
		<path class="upper" d={upper} fill={ref('shoe')} />
		<path d={upper} fill={ref('shoe-ao')} />
		<path class="pad" d="M-9 {-c}Q0 {-c + 4.4} 9 {-c}" />
		<clipPath id={id(`skate-${side}`)}>
			<path d={upper} />
		</clipPath>
		<g clip-path={ref(`skate-${side}`)}>
			<path class="skate-stripe" d="M-13 -16.5H24" />
			<path class="laces" d="M5.5 -36L10 -34M6 -31L10.5 -29M6.8 -26L11.6 -24.4" />
			<ellipse class="toe-light" cx="16" cy="-21.6" rx="3.6" ry="1.4" />
		</g>
		<rect class="toe-stop" x="19.5" y="-12" width="7" height="7.5" rx="2.6" />
		<rect class="plate" x="-12.5" y="-13" width="35" height="4" rx="2" />
		{#each [-5.5, 14.5] as wx (wx)}
			<circle class="wheel" cx={wx} cy="-4.6" r="4.6" />
			<circle class="hub" cx={wx} cy="-4.6" r="1.6" />
		{/each}
	</g>
{/snippet}

{#if layer === 'feet'}
	{#if b.legs}
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
			<linearGradient id={id('leg-ao')} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" class="stop-ink" stop-opacity="0.2" />
				<stop offset="1" class="stop-ink" stop-opacity="0" />
			</linearGradient>
		</defs>

		{#snippet foot(side: number, rim: boolean)}
			{@const x = 100 + side * b.legX}
			<!-- Both passes run the same animation from mount, so they stay in lockstep. -->
			<g
				class="foot"
				class:tap={side === 1 && tapping && heldLeg !== side}
				style:transform-origin="{x}px {b.groundY - (FOOT_COLLAR[shoes] ?? 0) * b.footScale}px"
			>
				<g transform="translate({x} {b.groundY}) scale({side * b.footScale} {b.footScale})">
					{#if rim}
						{#if shoes !== 'none'}
							<ellipse
								class="opening"
								cx="0"
								cy={-FOOT_COLLAR[shoes]}
								rx={shoes === 'boots' ? 9 : shoes === 'rainboots' ? 9.5 : 8.6}
								ry="3"
							/>
						{/if}
					{:else if shoes === 'sneakers' || shoes === 'hightops'}
						{@render sneaker(shoes === 'hightops', side)}
					{:else if shoes === 'boots'}
						{@render boot()}
					{:else if shoes === 'slippers'}
						{@render slipper()}
					{:else if shoes === 'rainboots'}
						{@render rainboot()}
					{:else if shoes === 'skates'}
						{@render skate(side)}
					{:else}
						{@render plainFoot()}
					{/if}
				</g>
			</g>
		{/snippet}

		{#snippet leg(side: number)}
			{@const grow = legPull(side).current.grow}
			<!-- Like the arms, a stretched leg thins out. -->
			{@const legHw =
				(b.legWidth / 2) * Math.sqrt((legBottom - legTop) / Math.max(legBottom - legTop + grow, 8))}
			<g transform="translate({100 + side * b.legX} 0)">
				<rect
					class="leg"
					x={-legHw}
					y={legTop}
					width={legHw * 2}
					height={Math.max(legBottom - legTop + grow, 8)}
					rx={legHw}
				/>
				{#if m.species === 'bob'}
					<rect
						class="knee"
						x={-legHw - 0.5}
						y={(legTop + legBottom + grow) / 2}
						width={legHw * 2 + 1}
						height="2.6"
						rx="1.3"
					/>
				{/if}
				{#if outfit === 'overalls'}
					<rect
						class="shorts"
						x={-legHw - 1.5}
						y={legTop}
						width={legHw * 2 + 3}
						height={shortsBottom - legTop}
						rx="4"
					/>
					<rect
						class="shorts-cuff"
						x={-legHw - 1.5}
						y={shortsBottom - 3.5}
						width={legHw * 2 + 3}
						height="3.5"
						rx="1.75"
					/>
				{/if}
				<!-- The torso's hem shades the top of each leg so the legs tuck in instead of being pinned on. -->
				<rect
					class="leg-ao"
					x={-legHw - 1.5}
					y={legTop}
					width={legHw * 2 + 3}
					height="22"
					rx={legHw}
					fill={ref('leg-ao')}
				/>
			</g>
		{/snippet}
		<!-- A leg and both passes of its foot swing as one around the hip; the swing sits on a
		     wrapper because `.foot` has its own CSS transform for the tap. -->
		{#snippet swung(side: -1 | 1, part: 'rim' | 'leg' | 'shoe')}
			{@const pivot = hip(side)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g
				transform="rotate({legPull(side).current.angle} {pivot.x} {pivot.y})"
				class:grabbable={m.canGrab}
				data-grab={side < 0 ? 'leg-left' : 'leg-right'}
				onpointerdown={(e) => grabLeg(e, side)}
			>
				{#if part === 'leg'}
					{@render leg(side)}
				{:else}
					<!-- The leg points straight down in here, so stretching it pushes the foot along y. -->
					<g transform="translate(0 {legPull(side).current.grow})">
						{@render foot(side, part === 'rim')}
					</g>
				{/if}
			</g>
		{/snippet}

		<g bind:this={feetFrame}>
			{#each [-1, 1] as const as side (side)}
				{@render swung(side, 'rim')}
			{/each}

			{#each [-1, 1] as const as side (side)}
				{@render swung(side, 'leg')}
			{/each}

			<!-- Each foot is centered on its leg: the leg steps into the collar instead of standing on the shoe. -->
			{#each [-1, 1] as const as side (side)}
				{@render swung(side, 'shoe')}
			{/each}
		</g>
	{/if}
{:else if layer === 'back'}
	{#if m.species === 'critter'}
		<g transform="translate({100 + hw * 0.75} {b.hipY - 13}) scale({m.proportions.tail})">
			<g class="critter-tail" class:excited={m.mood === 'happy' || m.mood === 'love'}>
				<path
					class="bare"
					d="M0 0C36 5 52-24 41-50C37-59 26-60 21-50C16-40 31-28 20-19Q10-12 0-12Z"
				/>
				<path
					class="tail-tip"
					d="M41-50C37-59 26-60 21-50C18-44 21-37 23-32Q37-29 45-36Q45-43 41-50Z"
				/>
			</g>
		</g>
	{/if}
	<defs>
		<linearGradient id={id('torso-ao')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-ink" stop-opacity="0.16" />
			<stop offset="0.35" class="stop-ink" stop-opacity="0" />
			<stop offset="0.8" class="stop-ink" stop-opacity="0" />
			<stop offset="1" class="stop-ink" stop-opacity="0.14" />
		</linearGradient>
		<clipPath id={id('torso')}>
			<path d={torsoPath(hw, b)} />
		</clipPath>
		<radialGradient id={id('head-shadow')}>
			<stop offset="0" class="stop-ink" stop-opacity="0.22" />
			<stop offset="0.6" class="stop-ink" stop-opacity="0.1" />
			<stop offset="1" class="stop-ink" stop-opacity="0" />
		</radialGradient>
	</defs>

	{#if outfit === 'cape'}
		<!-- Hangs from the shoulders behind the torso; the hem arches up in the middle so it never hides the legs. -->
		<g class="cape-wave" style:transform-origin="100px {b.torsoTop + 10}px">
			<path
				class="cape"
				d="M{100 - outerHw - 2} {b.torsoTop + 10}H{100 + outerHw + 2}L{100 +
					outerHw +
					14} {capeHem}Q{100 + hipHw * 0.55} {b.hipY - 2} 100 {b.hipY - 12}Q{100 -
					hipHw * 0.55} {b.hipY - 2} {100 - outerHw - 14} {capeHem}Z"
			/>
			<path
				class="cape-fold"
				d="M{100 - outerHw - 5} {b.torsoTop + 40}L{100 - outerHw - 10} {capeHem - 6}M{100 +
					outerHw +
					5} {b.torsoTop + 40}L{100 + outerHw + 10} {capeHem - 6}"
			/>
		</g>
	{:else if outfit === 'hoodie'}
		<rect
			class="hood"
			x={100 - headHw - 7}
			y={headTop + 34 * b.headScale}
			width={headHw * 2 + 14}
			height={COLLAR_Y + 8 - headTop - 34 * b.headScale}
			rx={headHw}
		/>
	{/if}

	<path d={torsoPath(hw, b)} fill={ref('body')} />
	<path d={torsoPath(hw, b)} fill="url(#{id('torso-ao')})" />
	{#if outfit === 'hoodie'}
		<path class="hoodie" d={torsoPath(hw + 1.5, b)} />
		<path
			class="pocket"
			d="M{100 - hipHw * 0.55} {b.hipY - 8}L{100 - hipHw * 0.45} {b.hipY - 26}H{100 +
				hipHw * 0.45}L{100 + hipHw * 0.55} {b.hipY - 8}"
		/>
		<rect
			class="hem"
			x={100 - hipHw * 0.8}
			y={b.hipY - 7}
			width={hipHw * 1.6}
			height="3"
			rx="1.5"
		/>
	{:else if outfit === 'overalls'}
		<g class="overalls" clip-path={ref('torso')}>
			<path
				class="strap"
				d="M{100 - hw * 0.62} {b.torsoTop}L{100 - hw * 0.42} {COLLAR_Y + 40}M{100 +
					hw * 0.62} {b.torsoTop}L{100 + hw * 0.42} {COLLAR_Y + 40}"
			/>
			<rect class="denim" x={100 - hw * 0.5} y={COLLAR_Y + 36} width={hw} height="40" rx="4" />
			<rect
				class="denim"
				x={100 - outerHw - 2}
				y={b.hipY - 18}
				width={outerHw * 2 + 4}
				height="22"
			/>
			<path
				class="bib-pocket"
				d="M{100 - hw * 0.26} {COLLAR_Y + 52}V{COLLAR_Y + 60}Q100 {COLLAR_Y + 64} {100 +
					hw * 0.26} {COLLAR_Y + 60}V{COLLAR_Y + 52}Z"
			/>
			<path class="stitch" d="M{100 - outerHw - 2} {b.hipY - 15}H{100 + outerHw + 2}" />
			{#each [-1, 1] as k (k)}
				<circle class="button" cx={100 + k * hw * 0.42} cy={COLLAR_Y + 40} r="2.4" />
			{/each}
		</g>
	{:else if outfit === 'jersey'}
		<path class="jersey" d={torsoPath(hw + 1.5, b)} />
		<g clip-path={ref('torso')}>
			{#each [-1, 1] as k (k)}
				<path class="jersey-stripe" d="M{100 + k * (innerHw - 5)} {b.torsoTop}V{b.hipY}" />
			{/each}
		</g>
		<!-- The number sits under the status light, like a player's number under the crest. -->
		<path
			class="jersey-number"
			d="M{100 - 6.5 * u} {b.hipY - 20}H{100 + 6.5 * u}L{100 - u} {b.hipY - 5}"
		/>
	{/if}
	<!-- Drawn over the outfit because the head shades whatever the torso wears; the head itself
	     covers the top half, so only the falloff below the chin shows. Offset right, away from
	     the top-left light. -->
	<ellipse
		class="head-shadow"
		clip-path={ref('torso')}
		cx={100 + hw * 0.08}
		cy={m.shape.bottom + b.headY}
		rx={hw * 0.8}
		ry="8"
		fill={ref('head-shadow')}
	/>
	<path class="edge" d={torsoPath(hw, b)} />

	<!-- A tiny status light on the chest echoes the LED face; it beats with the mood. -->
	{#if m.species === 'critter' && outfit === 'none'}
		<ellipse class="belly-patch" cx="100" cy={b.hipY - 17} rx={hw * 0.55} ry="14" />
	{:else if m.species === 'bob'}
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
	{/if}
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
		{@const len = scarfLength}
		{@const at = (y: number) => COLLAR_Y + (y * len) / 62}
		<g class="tail" style:transform-origin="{100 - 18 * u}px {COLLAR_Y + 18}px">
			<path
				class="scarf"
				d="M{100 - 26 * u} {COLLAR_Y + 16}H{100 - 12 * u}L{100 - 14 * u} {COLLAR_Y + len}H{100 -
					28 * u}Z"
			/>
			<path
				class="scarf-stripe"
				d="M{100 - 27 * u} {at(40)}H{100 - 13 * u}M{100 - 27.5 * u} {at(48)}H{100 - 13.5 * u}"
			/>
			<path
				class="fringe"
				d="M{100 - 26 * u} {COLLAR_Y + len}V{COLLAR_Y + len + 5}M{100 - 21 * u} {COLLAR_Y +
					len}V{COLLAR_Y + len + 5}M{100 - 16 * u} {COLLAR_Y + len}V{COLLAR_Y + len + 5}"
			/>
		</g>
	{:else if outfit === 'bowtie'}
		<g transform="translate(100 {COLLAR_Y + 22}) scale({u})">
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
			d="M{100 - 6 * u} {COLLAR_Y + 22}V{COLLAR_Y + 44}M{100 + 6 * u} {COLLAR_Y + 22}V{COLLAR_Y +
				40}"
		/>
		<rect class="aglet" x={100 - 6 * u - 1.2} y={COLLAR_Y + 43} width="2.4" height="5" rx="1.2" />
		<rect class="aglet" x={100 + 6 * u - 1.2} y={COLLAR_Y + 39} width="2.4" height="5" rx="1.2" />
	{:else if outfit === 'jersey'}
		<rect
			class="neck-band"
			x={100 - collarHw + 8}
			y={COLLAR_Y + 16}
			width={collarHw * 2 - 16}
			height="10"
			rx="5"
		/>
	{:else if outfit === 'tie'}
		<!-- Shirt collar points first, so the knot sits on top of them. -->
		<path
			class="shirt-collar"
			d="M100 {COLLAR_Y + 20}L{100 - 16 * u} {COLLAR_Y + 12}L{100 - 12 * u} {COLLAR_Y +
				30}ZM100 {COLLAR_Y + 20}L{100 + 16 * u} {COLLAR_Y + 12}L{100 + 12 * u} {COLLAR_Y + 30}Z"
		/>
		<clipPath id={id('tie')}>
			<path d={tieBlade} />
		</clipPath>
		<g class="tie-sway" style:transform-origin="100px {COLLAR_Y + 22}px">
			<path class="tie" d={tieBlade} />
			<path
				class="tie-stripe"
				d="M{100 - 8 * u} {tieY(11)}L{100 + 8 * u} {tieY(5)}M{100 - 8 * u} {tieY(21)}L{100 +
					8 * u} {tieY(15)}M{100 - 8 * u} {tieY(31)}L{100 + 8 * u} {tieY(25)}"
				clip-path={ref('tie')}
			/>
		</g>
		<rect class="tie-knot" x={100 - 5 * u} y={COLLAR_Y + 17} width={10 * u} height="9" rx="3" />
	{:else if outfit === 'cape'}
		<rect
			class="cape-band"
			x={100 - collarHw + 6}
			y={COLLAR_Y + 18}
			width={collarHw * 2 - 12}
			height="7"
			rx="3.5"
		/>
		<circle class="clasp" cx="100" cy={COLLAR_Y + 21.5} r="5.5" />
		<circle class="clasp-light" cx="98.6" cy={COLLAR_Y + 20} r="1.6" />
	{/if}

	<g
		class="arms"
		style:--arm="{b.armWidth}px"
		class:sleeve={outfit === 'hoodie'}
		class:short={outfit === 'jersey'}
		class:fidget={m.hovered}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<g
			class="arm"
			class:held={heldArm.left !== null}
			class:grabbable={m.canGrab}
			data-grab="arm-left"
			bind:this={armFrames.left}
			onpointerdown={(e) => grabArm(e, 'left')}
		>
			{@render arm(left, pose.swingArm !== 'right' && !heldArm.left)}
		</g>
		<g transform="translate(200 0) scale(-1 1)">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g
				class="arm arm-r"
				class:held={heldArm.right !== null}
				class:grabbable={m.canGrab}
				data-grab="arm-right"
				bind:this={armFrames.right}
				onpointerdown={(e) => grabArm(e, 'right')}
			>
				{@render arm(
					right,
					(m.heldItem !== 'none' || pose.swingArm !== 'left') && !heldArm.right,
					m.heldItem !== 'none'
				)}
			</g>
		</g>
	</g>
{/if}

<style>
	.paw-pad,
	.tail-tip {
		fill: var(--c-accent);
	}
	.belly-patch {
		fill: var(--c-body-light);
	}
	.paw-toes {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1;
		opacity: 0.4;
	}
	.critter-tail {
		transform-origin: 0 0;
		animation: critter-wag 2.5s ease-in-out infinite alternate;
	}
	.critter-tail.excited {
		animation-duration: 0.4s;
	}
	@keyframes critter-wag {
		from {
			transform: rotate(-8deg);
		}
		to {
			transform: rotate(12deg);
		}
	}
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
	.slipper {
		fill: var(--c-accent);
	}
	.fluff {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 4.4;
		stroke-linecap: round;
	}
	.pompom {
		fill: var(--c-body-light);
	}
	.pompom-light {
		fill: #fff;
		opacity: 0.7;
	}
	.slipper-sole {
		fill: var(--c-body-dark);
	}
	.welly {
		fill: var(--c-accent);
	}
	.welly-band {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 3.6;
		stroke-linecap: round;
	}
	.welly-shine {
		fill: none;
		stroke: #fff;
		stroke-width: 2.4;
		stroke-linecap: round;
		opacity: 0.4;
	}
	.welly-sole {
		fill: var(--c-visor);
	}
	.welly-tread {
		fill: none;
		stroke: var(--c-body-mid);
		stroke-width: 0.8;
		opacity: 0.35;
	}
	.skate-stripe {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 3;
	}
	.plate {
		fill: var(--c-visor);
	}
	.toe-stop {
		fill: var(--c-body-dark);
	}
	.wheel {
		fill: var(--c-accent);
		stroke: var(--c-visor);
		stroke-width: 1;
		stroke-opacity: 0.35;
	}
	.hub {
		fill: var(--c-body-light);
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
	/*
	 * The foot pivots on the ankle, where the leg enters it: the joint stays closed while the
	 * toe lifts. The small lift keeps the heel from sinking into the ground.
	 */
	.foot {
		transform-box: view-box;
	}
	.grabbable {
		cursor: grab;
		touch-action: none;
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

	.cape,
	.cape-band {
		fill: var(--c-accent);
	}
	.cape {
		filter: brightness(0.78);
	}
	.cape-fold {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-linecap: round;
		opacity: 0.14;
	}
	.cape-wave {
		transform-box: view-box;
		animation: billow 3.4s ease-in-out infinite alternate;
	}
	.clasp {
		fill: var(--c-body-light);
		stroke: var(--c-visor);
		stroke-width: 1.2;
		stroke-opacity: 0.25;
	}
	.clasp-light {
		fill: #fff;
		opacity: 0.6;
	}

	.denim,
	.shorts {
		fill: var(--c-accent);
	}
	.strap {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 6;
		stroke-linecap: round;
		filter: brightness(0.88);
	}
	.shorts-cuff {
		fill: var(--c-accent);
		filter: brightness(0.82);
	}
	.bib-pocket {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 1.2;
		stroke-linejoin: round;
		opacity: 0.22;
	}
	.stitch {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 0.9;
		stroke-dasharray: 2 2.2;
		opacity: 0.6;
	}
	.button {
		fill: var(--c-body-light);
		stroke: var(--c-visor);
		stroke-width: 0.8;
		stroke-opacity: 0.3;
	}

	.jersey {
		fill: var(--c-accent);
	}
	.jersey-stripe,
	.sleeve-band {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 3;
	}
	.sleeve-band {
		stroke-width: 2.2;
	}
	.jersey-number {
		fill: none;
		stroke: var(--c-body-light);
		stroke-width: 3.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.neck-band {
		fill: var(--c-body-light);
	}

	.shirt-collar {
		fill: var(--c-body-light);
		stroke: var(--c-visor);
		stroke-width: 1;
		stroke-linejoin: round;
		stroke-opacity: 0.2;
	}
	.tie,
	.tie-knot {
		fill: var(--c-accent);
	}
	.tie-knot {
		filter: brightness(0.85);
	}
	.tie-stripe {
		fill: none;
		stroke: var(--c-visor);
		stroke-width: 2.2;
		opacity: 0.2;
	}
	.tie-sway {
		transform-box: view-box;
		animation: sway 3.2s ease-in-out infinite alternate;
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
		stroke-width: calc(var(--arm, 14px) + 1.6px);
		stroke-linecap: round;
		opacity: 0.14;
	}
	.tube {
		fill: none;
		stroke: var(--c-body-mid);
		stroke-width: var(--arm, 14px);
		stroke-linecap: round;
	}
	.sleeve .tube {
		stroke: var(--c-accent);
	}
	.joint {
		fill: var(--c-body-mid);
	}
	.sleeve .joint,
	.short .joint {
		fill: var(--c-accent);
	}
	.short .upper-arm {
		stroke: var(--c-accent);
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
	.fore.sword {
		animation: sword-swing 2.8s ease-in-out infinite;
	}
	.fore.microphone {
		animation: gesture 0.8s ease-in-out infinite alternate;
	}
	.fore.phone {
		animation: gesture 2.4s ease-in-out infinite alternate;
	}
	@keyframes sword-swing {
		0%,
		65%,
		100% {
			transform: rotate(0deg);
		}
		75% {
			transform: rotate(-24deg);
		}
		84% {
			transform: rotate(18deg);
		}
		92% {
			transform: rotate(-6deg);
		}
	}
	.fidget .arm:not(.held) .hand {
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
			transform: translateY(-2.5px) rotate(-8deg);
		}
		86% {
			transform: rotate(0);
		}
		91% {
			transform: translateY(-1.6px) rotate(-5deg);
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
	@keyframes billow {
		from {
			transform: scale(1, 1);
		}
		to {
			transform: scale(1.05, 1.03);
		}
	}
	@keyframes sway {
		from {
			transform: rotate(-3deg);
		}
		to {
			transform: rotate(3deg);
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

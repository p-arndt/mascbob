<script lang="ts">
	import { untrack } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { getMascot, svgRef } from '../context.js';
	import { clamp, HEART_PATH } from '../geometry.js';
	import { createLaugh, createVisemes, VOWELS } from '../speech.js';
	import type { EyeParams } from '../types.js';
	import { drag, RELEASE_SPRING, rubber } from '../grab.js';
	import {
		EYE_SIZES,
		MISPRINT,
		browPath,
		catMouthPath,
		duchenne,
		eyeClosure,
		eyeLids,
		eyeOutline,
		halftone,
		mouthPath,
		smoothPath,
		type EyeShape,
		type Side
	} from './face.js';

	/**
	 * The face is screen-printed onto the shell like a sticker: an ink plate with the
	 * features and an accent plate under it that never quite lines up. The misprint
	 * is the signature: it re-registers with a wobble on every mood change and
	 * shivers with the voice while talking. Cheeks are halftone dots.
	 */
	const m = getMascot();
	const ref = (name: string) => svgRef(m.uid, name);
	const stalkPulls = [
		new Spring({ x: 0, y: 0 }, RELEASE_SPRING),
		new Spring({ x: 0, y: 0 }, RELEASE_SPRING)
	];
	let stalkFrame = $state<SVGGElement>();
	function grabEye(event: PointerEvent, index: number) {
		event.stopPropagation();
		const origin = { ...eyes[index].shape };
		let from = { x: 0, y: 0 };
		drag(event, {
			frame: () => stalkFrame,
			start: (point) => {
				if (!m.grab(index === 0 ? 'arm-left' : 'arm-right')) return false;
				from = point;
			},
			move: (point) => {
				const pull = stalkPulls[index];
				const rest = eyes[index].shape;
				const soften = (value: number) =>
					Math.abs(value) <= 45
						? value
						: Math.sign(value) * (45 + rubber(Math.abs(value) - 45, 65));
				pull.set(
					{
						x: origin.cx + soften(point.x - from.x) - (rest.cx - pull.current.x),
						y: origin.cy + soften(point.y - from.y) - (rest.cy - pull.current.y)
					},
					{ instant: true }
				);
			},
			end: () => {
				stalkPulls[index].set({ x: 0, y: 0 }, { instant: m.reduced });
				m.release();
			}
		});
	}

	// Pressing squeezes the eyes into "> <"; the underdamped spring overshoots below 0 on release, which reads as a pop.
	const squeeze = new Spring(0, { stiffness: 0.2, damping: 0.36 });
	const curious = new Spring(0, { stiffness: 0.12, damping: 0.5 });
	const saccade = new Spring({ x: 0, y: 0 }, { stiffness: 0.4, damping: 0.9 });
	// Starts far off so the face "prints" into place on mount.
	const plate = new Spring({ x: -3, y: 2.5 }, { stiffness: 0.08, damping: 0.45 });

	$effect(() => {
		squeeze.set(m.pressed ? 1 : 0, { instant: m.reduced });
	});
	$effect(() => {
		curious.set(m.hovered ? 1 : 0, { instant: m.reduced });
	});

	let printedMood = m.mood;
	$effect(() => {
		if (m.reduced) {
			plate.set(MISPRINT, { instant: true });
			return;
		}
		if (m.mood !== printedMood) {
			printedMood = m.mood;
			// A small kick: a big one slides the accent clear off thin features like a crescent eye.
			plate.set({ x: MISPRINT.x - 2.2, y: MISPRINT.y + 1.5 }, { instant: true });
		}
		plate.target = MISPRINT;
	});

	// Tiny involuntary eye jumps keep a resting face from looking frozen.
	$effect(() => {
		if (m.reduced || m.mood === 'sleepy' || !m.onscreen) {
			saccade.set({ x: 0, y: 0 }, { instant: true });
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const jump = () => {
			saccade.target =
				Math.random() < 0.35
					? { x: 0, y: 0 }
					: { x: (Math.random() * 2 - 1) * 2, y: (Math.random() * 2 - 1) * 1.2 };
			timer = setTimeout(jump, 900 + Math.random() * 2600);
		};
		timer = setTimeout(jump, 1500);
		return () => clearTimeout(timer);
	});

	// Each syllable picks a vowel, so the mouth cycles through shapes instead of just flapping;
	// some start with the lips pressed shut, like an M, B or P, before they pop open.
	const visemes = createVisemes();
	const vowel = new Spring(VOWELS[1], { stiffness: 0.35, damping: 0.7 });
	let voiced = false;
	let leadTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const level = m.talk;
		if (!voiced && level > 0.15) {
			voiced = true;
			const { lead, vowel: next } = visemes.onset();
			clearTimeout(leadTimer);
			if (lead) {
				vowel.target = lead;
				leadTimer = setTimeout(() => (vowel.target = next), 70);
			} else {
				vowel.target = next;
			}
		} else if (voiced && level < 0.08) {
			voiced = false;
		}
	});
	$effect(() => () => clearTimeout(leadTimer));

	// Laughing pulses the jaw on its own: `talk` is speech only, and a laugh is not a word.
	let laugh = $state(0);
	const laughing = $derived(m.mood === 'laughing');
	$effect(() => {
		if (!laughing || m.reduced || !m.onscreen) {
			laugh = 0;
			return;
		}
		untrack(() => {
			clearTimeout(leadTimer);
			vowel.target = VOWELS[0];
		});
		const ha = createLaugh();
		let raf = 0;
		const tick = (t: number) => {
			laugh = ha.level(t);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	const f = $derived(m.face);
	const talk = $derived(Math.max(m.talk, laugh * 0.6));
	const sq = $derived(clamp(squeeze.current, 0, 1));
	const pop = $derived(1 + Math.max(0, -squeeze.current) * 0.6);
	const grow = $derived(1 + curious.current * 0.1);
	// A big grin pushes the cheeks and lower lids up with it.
	const smile = $derived(duchenne(f.mouthCurve, f.mouthRound));
	// Eyes travel further up than down; the face sits high on the head.
	const eyeY = $derived(
		96 -
			(m.species === 'snail' ? 16 + 20 * (m.body ? m.proportions.arms : 1) : 0) +
			m.gazeY * (m.species === 'snail' ? 20 : m.gazeY < 0 ? 12 : 10) +
			saccade.current.y
	);
	// Syllables knock the accent plate around a little, like a speaker cone.
	const offset = $derived({ x: plate.current.x + talk * 1, y: plate.current.y - talk * 0.7 });

	function eye(p: EyeParams, baseX: number, side: Side) {
		const base = EYE_SIZES[m.eyes] ?? EYE_SIZES.round;
		const outward = side === 'left' ? -1 : 1;
		// A close pointer pulls both eyes in a little (vergence); eyes travel furthest of all
		// features, which is what makes the flat face read as a turning head.
		const pull =
			m.species === 'snail' ? stalkPulls[side === 'left' ? 0 : 1].current : { x: 0, y: 0 };
		const cx =
			baseX +
			m.gazeX * (m.species === 'snail' ? 24 : 9) +
			saccade.current.x -
			outward * m.focus * 1.4 +
			pull.x;
		const cy = eyeY + pull.y;
		const heart = clamp(p.heart, 0, 1);
		const size = p.scale * grow * pop * (1 - heart) * (1 + m.focus * 0.08);
		const fullH = base.h * size;
		// Looking up opens the eyes wide; looking down droops the upper lid, like a real eye
		// following its gaze. Both eyes always share one shape.
		const up = Math.max(0, -m.gazeY);
		const down = Math.max(0, m.gazeY);
		const lift = p.lift + smile * 0.22;
		const lids = eyeLids(base, { ...p, lift });
		const closure = eyeClosure(m.blink, down);
		const shape: EyeShape = {
			cx,
			cy,
			w: base.w * size,
			h: fullH * Math.max(0, p.open) * (1 + up * 0.12) * closure.hScale * (1 - sq),
			round: base.round,
			lift,
			lidLeft: side === 'left' ? lids.outer : lids.inner,
			lidRight: side === 'left' ? lids.inner : lids.outer,
			lidDrop: closure.lidDrop
		};
		const lid = (lids.inner + lids.outer) / 2;
		const len = clamp(base.w * p.scale * 0.85, 9, 15);
		// Brows bounce with the voice: talking faces are mostly eyebrows.
		const browY =
			cy - (base.h * p.scale * clamp(p.open, 0.5, 1.25)) / 2 - 6 - p.browLift - talk * 2.2 - up * 3;
		// Positive tilt raises the inner end (toward the nose).
		const rise = p.browTilt * len * 0.45 * (side === 'left' ? 1 : -1);
		return {
			shape,
			d: smoothPath(eyeOutline(shape)),
			heart: { cx, cy, s: heart * base.w * 1.5 * p.scale * grow },
			// The glint rides under the dropping lid too, or a blink would slice through it.
			lid: lid + (1 - lid) * closure.lidDrop,
			glint: base.glint ?? 1,
			shine:
				clamp(((shape.h / base.h) * (1 - closure.lidDrop) - 0.3) * 2.5, 0, 1) *
				clamp(1.6 - lift * 2, 0, 1) *
				(1 - heart) *
				(1 - sq),
			brow: {
				d: browPath(cx - len / 2, browY + rise, cx + len / 2, browY - rise, p.browTilt),
				alpha: clamp(p.brow, 0, 1) * (1 - sq)
			}
		};
	}

	const left = $derived(eye(f.left, 80, 'left'));
	const right = $derived(eye(f.right, 120, 'right'));
	const eyes = $derived([left, right]);

	const mouth = $derived.by(() => {
		const v = vowel.current;
		const press = clamp(v.press, 0, 1);
		const open = Math.max(0, f.mouthOpen * (1 - press * 0.8) + talk * 11 * (1 - press));
		const shape = {
			cx: 100 + f.mouthX + m.gazeX * 6,
			// The jaw drops with the syllable.
			y: (m.species === 'critter' ? 126 : 118) + m.gazeY * 5 + talk * 1.5,
			width: f.mouthWidth * (1 + talk * v.wide) * (1 - sq * 0.3),
			curve: f.mouthCurve,
			open,
			round: clamp(f.mouthRound + talk * v.round, 0, 1),
			skew: f.mouthSkew
		};
		return {
			...shape,
			d: mouthPath(shape),
			cat: clamp(Math.max(f.mouthCat, sq), 0, 1),
			tongue: clamp((open - 2) / 3, 0, 1) * f.tongue
		};
	});

	const cheekX = $derived(Math.min(m.shape.halfWidth, 62) - 16);
	// Keep the nose above even the upper lip's control points, including speech and skew.
	const noseY = $derived(
		Math.min(
			(m.species === 'critter' ? 114 : 108) + m.gazeY * 3,
			mouth.y -
				Math.abs(mouth.curve) / 2 -
				mouth.open * mouth.round * 0.9 -
				Math.abs(mouth.skew) -
				8
		)
	);
	const blush = $derived(clamp(f.cheeks + curious.current * 0.3 + sq * 0.4 + smile * 0.15, 0, 1));
	const blushLines = $derived(clamp(Math.max(f.blushLines, sq * 0.9), 0, 1));
	const DOTS = halftone(9.5, 6, 2.7);
</script>

<defs>
	<clipPath id="{m.uid}-mouth-clip">
		<path d={mouth.d} />
	</clipPath>
	{#each eyes as e, i (i)}
		<clipPath id="{m.uid}-eye-clip-{i}">
			<path d={e.d} />
		</clipPath>
	{/each}
</defs>

{#if m.species === 'critter'}
	<!-- The muzzle belongs to the face: it follows the gaze with the nose and mouth. -->
	<g clip-path={ref('shell-clip')}>
		<g transform="translate({100 + m.gazeX * 5} {130 + m.gazeY * 4 + talk})">
			<path
				class="muzzle"
				d="M-33-1C-33-13-19-20 0-20C19-20 33-12 33 0C33 14 17 20 0 20C-18 20-33 13-33-1Z"
			/>
		</g>
	</g>
{/if}

{#if m.species === 'snail'}
	<!-- The existing morphing eyes sit on living stalks, not a second face on the body. -->
	{#each eyes as e, i (i)}
		<g class="eye-stalk">
			<path
				class="stalk-edge"
				d="M{i === 0 ? 83 : 117} {m.shape.top + 10}Q{i === 0 ? 73 : 127} {e.shape.cy + 22} {e.shape
					.cx} {e.shape.cy}"
			/>
			<path
				class="stalk-skin"
				d="M{i === 0 ? 83 : 117} {m.shape.top + 10}Q{i === 0 ? 73 : 127} {e.shape.cy + 22} {e.shape
					.cx} {e.shape.cy}"
			/>
			<ellipse
				class="eye-bulb"
				cx={e.shape.cx}
				cy={e.shape.cy}
				rx={Math.max(11, e.shape.w / 2 + 4)}
				ry={Math.max(12, e.shape.h / 2 + 4)}
			/>
		</g>
	{/each}
{/if}

<!-- Halftone cheeks: blush grows the dots rather than fading them, like more ink on the screen. -->
{#each [-1, 1] as side (side)}
	<g
		class="cheek"
		transform="translate({100 + side * cheekX + m.gazeX * 4} {112 - smile * 2 + m.gazeY * 2.5})"
	>
		{#each DOTS as d, i (i)}
			<circle cx={d.x} cy={d.y} r={d.r * blush} />
		{/each}
		{#if blushLines > 0.01}
			<g class="hatch" opacity={blushLines}>
				{#each [-4, 0, 4] as x (x)}
					<path d="M{x - 1.5} 3L{x + 1.5} -3" />
				{/each}
			</g>
		{/if}
	</g>
{/each}

{#snippet features(ink: boolean)}
	{#each eyes as e, i (i)}
		<!-- A crescent's concave lower edge would show the accent as a second, detached lid,
		     so the accent eye only slides sideways as the eye arches. -->
		<path
			d={e.d}
			transform={ink ? undefined : `translate(0 ${-offset.y * clamp(e.shape.lift / 0.8, 0, 1)})`}
		/>
		{#if e.heart.s > 0.5}
			<path d={HEART_PATH} transform="translate({e.heart.cx} {e.heart.cy}) scale({e.heart.s})" />
		{/if}
		{#if e.brow.alpha > 0.01}
			{@const alpha = clamp(e.brow.alpha * 1.8, 0, 1)}
			<!-- A faint ink brow is mixed toward the shell instead of made see-through, or the
			     accent plate shows through it as a muddy brown. -->
			<path
				class="line"
				class:brow-ink={ink}
				d={e.brow.d}
				opacity={ink ? undefined : alpha}
				style:--alpha={ink ? `${alpha * 100}%` : undefined}
			/>
		{/if}
	{/each}
	{#if sq > 0.01}
		<!-- "> <" -->
		<g class="line thin" opacity={sq}>
			<path
				d="M{left.shape.cx - 6} {left.shape.cy - 6}L{left.shape.cx + 5} {left.shape.cy}L{left.shape
					.cx - 6} {left.shape.cy + 6}"
			/>
			<path
				d="M{right.shape.cx + 6} {right.shape.cy - 6}L{right.shape.cx - 5} {right.shape.cy}L{right
					.shape.cx + 6} {right.shape.cy + 6}"
			/>
		</g>
	{/if}
	{#if m.species === 'critter'}
		<ellipse class="nose" cx={100 + m.gazeX * 6} cy={noseY} rx="3.8" ry="2.5" />
	{/if}
	<path class="mouth" d={mouth.d} opacity={1 - mouth.cat} />
	{#if mouth.cat > 0.01}
		<path
			class="line thin"
			d={catMouthPath(mouth.cx, mouth.y, Math.max(mouth.width, 10))}
			opacity={mouth.cat}
		/>
	{/if}
{/snippet}

<g class="plate accent" transform="translate({offset.x} {offset.y})">
	{@render features(false)}
</g>
<g class="plate ink">
	{@render features(true)}
	{#if mouth.tongue > 0.01}
		<g clip-path={ref('mouth-clip')} opacity={(1 - mouth.cat) * mouth.tongue}>
			<ellipse
				class="tongue"
				cx={mouth.cx + 1}
				cy={mouth.y + mouth.curve * 0.25 + mouth.open * 0.8}
				rx={mouth.width * 0.32}
				ry={mouth.open * 0.45}
			/>
		</g>
	{/if}
	{#each eyes as e, i (i)}
		{#if e.shine > 0.01}
			<!-- Same glint on both eyes, lit from the top left like the shell: one lamp for the whole sticker. -->
			<g clip-path={ref(`eye-clip-${i}`)} opacity={e.shine}>
				<!-- Hung below the lid, or a heavy-lidded eye would clip its glint away. -->
				<ellipse
					class="shine"
					cx={e.shape.cx - e.shape.w * (0.2 + m.gazeX * 0.14)}
					cy={e.shape.cy - e.shape.h * (0.5 - e.lid - (1 - e.lid) * 0.3 + m.gazeY * 0.1)}
					rx={e.shape.w * 0.17 * e.glint}
					ry={e.shape.h * 0.14 * e.glint * (1 - e.lid * 0.5)}
				/>
				<circle
					class="shine"
					cx={e.shape.cx + e.shape.w * 0.14 * e.glint}
					cy={e.shape.cy + e.shape.h * 0.2}
					r={e.shape.w * 0.07 * e.glint}
				/>
			</g>
		{/if}
	{/each}
</g>

{#if m.config.effect === 'tear'}
	<g transform="translate({left.shape.cx - left.shape.w * 0.35} {left.shape.cy + 9})">
		<path class="tear" d="M0 -4.5C1.8 -1.6 3 0 3 1.6A3 3 0 0 1 -3 1.6C-3 0 -1.8 -1.6 0 -4.5Z" />
	</g>
{:else if m.config.effect === 'sweat'}
	<!-- Beads on the temple beside the right eye, turning with the face like the cheeks. -->
	<g transform="translate({100 + cheekX + 4 + m.gazeX * 3} {80 + m.gazeY * 2})">
		<g class="sweat">
			<path class="sweat-drop" d="M0 -6C2.4 -2.2 4 0 4 2.2A4 4 0 0 1 -4 2.2C-4 0 -2.4 -2.2 0 -6Z" />
			<ellipse class="shine" cx="-1.4" cy="2" rx="0.9" ry="1.5" />
		</g>
	</g>
{/if}

{#if m.species === 'snail'}
	<g bind:this={stalkFrame}>
		{#each eyes as e, i (i)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<ellipse
				class="stalk-grip"
				class:grabbable={m.canGrab}
				data-grab={i === 0 ? 'arm-left' : 'arm-right'}
				cx={e.shape.cx}
				cy={e.shape.cy}
				rx={Math.max(14, e.shape.w / 2 + 6)}
				ry={Math.max(16, e.shape.h / 2 + 6)}
				onpointerdown={(event) => grabEye(event, i)}
				style:touch-action="none"
			/>
		{/each}
	</g>
{/if}

<style>
	.stalk-grip {
		fill: transparent;
	}
	.grabbable {
		cursor: grab;
	}
	.stalk-edge,
	.stalk-skin {
		fill: none;
		stroke-linecap: round;
	}
	.stalk-edge {
		stroke: var(--c-visor);
		stroke-width: 11.6;
		stroke-opacity: 0.5;
	}
	.stalk-skin {
		stroke: var(--c-body-mid);
		stroke-width: 10;
	}
	.eye-bulb {
		fill: var(--c-body-light);
		stroke: var(--c-visor);
		stroke-width: 1.6;
		stroke-opacity: 0.5;
	}
	.muzzle {
		fill: var(--c-body-light);
	}
	.plate {
		fill: currentColor;
		stroke: currentColor;
		stroke-width: 0;
	}
	.ink {
		color: var(--c-eye);
	}
	.accent {
		color: var(--c-accent);
		opacity: 0.9;
	}
	.mouth {
		stroke-width: 3.4;
		stroke-linejoin: round;
	}
	.line {
		fill: none;
		stroke-width: 3.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.brow-ink {
		stroke: color-mix(in oklab, currentColor var(--alpha), var(--c-body-light));
	}
	.thin {
		stroke-width: 2.8;
	}
	.tongue {
		fill: var(--c-cheek);
		stroke: none;
	}
	.shine {
		fill: #fff;
		stroke: none;
	}
	.cheek {
		fill: var(--c-cheek);
	}
	.hatch {
		fill: none;
		stroke: var(--c-cheek);
		stroke-width: 1.3;
		stroke-linecap: round;
		filter: brightness(0.8);
	}
	.tear {
		fill: var(--c-eye);
		transform-box: fill-box;
		transform-origin: center;
		animation: drip 1.8s ease-in infinite;
	}

	.sweat {
		transform-box: fill-box;
		transform-origin: center;
		animation: sweat 2.7s ease-in infinite;
	}
	.sweat-drop {
		fill: #fff;
		fill-opacity: 0.85;
		stroke: var(--c-eye);
		stroke-width: 1.4;
		stroke-linejoin: round;
	}

	@keyframes sweat {
		0% {
			transform: translateY(-2px) scale(0.5);
			opacity: 0;
		}
		15% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		70% {
			transform: translateY(5px) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(12px) scale(0.9);
			opacity: 0;
		}
	}
	@keyframes drip {
		0% {
			transform: translateY(0) scale(0.4);
			opacity: 0;
		}
		20% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(16px) scale(1);
			opacity: 0;
		}
	}
</style>

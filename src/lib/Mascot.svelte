<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Spring, Tween } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { setMascot, svgRef } from './context.js';
	import { SHAPE_DEFS, clamp } from './geometry.js';
	import Accessories from './parts/Accessories.svelte';
	import Body from './parts/Body.svelte';
	import { BODY_GROUND_Y, BODY_VIEWBOX_HEIGHT } from './parts/body.js';
	import Effects from './parts/Effects.svelte';
	import Face from './parts/Face.svelte';
	import Hands from './parts/Hands.svelte';
	import Shell from './parts/Shell.svelte';
	import { moodConfig } from './moods.js';
	import { createBabble } from './speech.js';
	import { resolveTheme, themeStyle, type ThemeInput } from './themes.js';
	import type { Accessory, EyeStyle, LookAt, Mood, Motion, Outfit, Shape, Shoes } from './types.js';

	interface Props {
		mood?: Mood;
		/** Preset name or `{ base?, ...colors }`. `--mascott-*` CSS variables override it. */
		theme?: ThemeInput;
		shape?: Shape;
		eyes?: EyeStyle;
		accessories?: Accessory[];
		/** Floating hands that gesture with the mood (head-only mode). */
		hands?: boolean;
		/** Full figure with legs (default). `false` shows just the head, square, e.g. for avatars. */
		body?: boolean;
		/** Clothing on the full figure; bare shell by default. */
		outfit?: Outfit;
		/** Footwear on the full figure; plain feet by default. */
		shoes?: Shoes;
		lookAt?: LookAt;
		/** Mouth opening 0..1 while `mood` is `talking`, e.g. from audio amplitude. Omit to animate on its own. */
		level?: number;
		/** Pixels, or any CSS length. */
		size?: number | string;
		float?: boolean;
		motion?: Motion;
		/** Renders as a button that reacts to clicks and fires `onboop`. */
		interactive?: boolean;
		label?: string;
		onboop?: () => void;
		/** Custom SVG drawn on top of the head, in the head's 200×200 coordinates. */
		accessory?: Snippet<[{ top: number; halfWidth: number }]>;
		class?: string;
	}

	let {
		mood = 'idle',
		theme = 'og',
		shape = 'capsule',
		eyes = 'round',
		accessories = [],
		hands = true,
		body = true,
		outfit = 'none',
		shoes = 'none',
		lookAt = 'pointer',
		level,
		size = 160,
		float = true,
		motion = 'auto',
		interactive = true,
		label = 'Mascott',
		onboop,
		accessory,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const ref = (name: string) => svgRef(uid, name);

	const prefersReduced = new MediaQuery('(prefers-reduced-motion: reduce)');
	const reduced = $derived(motion === 'reduced' || (motion === 'auto' && prefersReduced.current));

	let booping = $state(false);
	let hovered = $state(false);
	let pressed = $state(false);
	let boops = $state(0);
	const activeMood: Mood = $derived(booping ? 'happy' : mood);
	const config = $derived(moodConfig(activeMood));
	const head = $derived(SHAPE_DEFS[shape] ?? SHAPE_DEFS.pebble);
	const style = $derived(themeStyle(resolveTheme(theme)));

	// Tweens may call `duration` after unmount, where reading a derived would warn; mirror it into a plain variable.
	let instant = false;
	$effect.pre(() => {
		instant = reduced;
	});
	const face = Tween.of(() => config.face, {
		duration: () => (instant ? 0 : 380),
		easing: cubicOut
	});
	const blink = new Tween(0, { duration: 70 });
	const gaze = new Spring({ x: 0, y: 0 }, { stiffness: 0.07, damping: 0.45 });
	const squish = new Spring({ x: 1, y: 1 }, { stiffness: 0.16, damping: 0.18 });
	/** Degrees; leaning toward a hovering pointer. */
	const lean = new Spring(0, { stiffness: 0.06, damping: 0.4 });
	/** Degrees; a loose spring so kicks ring out as a wobble. */
	const wobble = new Spring(0, { stiffness: 0.12, damping: 0.14 });
	/** ViewBox units, negative is up. */
	const hop = new Tween(0);

	let root = $state<HTMLElement>();
	// Offscreen mascots pause their timers, pointer tracking and CSS loops: a page full of them stays smooth.
	let onscreen = $state(true);
	$effect(() => {
		if (!root || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(([entry]) => (onscreen = entry.isIntersecting), {
			rootMargin: '120px'
		});
		io.observe(root);
		return () => io.disconnect();
	});
	let talk = $state(0);
	let pointerX = $state(0);
	let entered = $state(false);

	// Matches the CSS pop-in, so parts can hold back their own flourishes until it is done.
	$effect(() => {
		if (reduced) {
			entered = true;
			return;
		}
		const timer = setTimeout(() => (entered = true), 650);
		return () => clearTimeout(timer);
	});

	const restSquish = () =>
		pressed ? { x: 1.1, y: 0.88 } : hovered ? { x: 0.985, y: 1.03 } : { x: 1, y: 1 };

	// Pressing squashes and holds (well damped, so it doesn't jiggle while held); releasing
	// springs back loosely, which overshoots into a jelly bounce.
	$effect(() => {
		if (reduced) {
			squish.set({ x: 1, y: 1 }, { instant: true });
			return;
		}
		squish.damping = pressed ? 0.6 : 0.18;
		squish.stiffness = pressed ? 0.25 : 0.16;
		squish.target = restSquish();
	});

	$effect(() => {
		lean.target = reduced || !hovered ? 0 : pointerX * 6;
	});

	let hopId = 0;
	/** Jump up by `height` viewBox units and land with a little squash. */
	async function jump(height: number, up = 150) {
		if (instant) return;
		const id = ++hopId;
		await hop.set(-height, { duration: up, easing: cubicOut });
		if (id !== hopId) return;
		await hop.set(0, { duration: up * 1.1, easing: cubicIn });
		if (id !== hopId) return;
		const impact = Math.min(height / 90, 0.14);
		squish.set({ x: 1 + impact, y: 1 - impact }, { instant: true });
		squish.target = restSquish();
	}

	let wobbleTimer: ReturnType<typeof setTimeout> | undefined;
	function kickWobble(deg: number) {
		if (instant) return;
		wobble.target = deg;
		clearTimeout(wobbleTimer);
		wobbleTimer = setTimeout(() => (wobble.target = 0), 110);
	}
	$effect(() => () => clearTimeout(wobbleTimer));

	// Mood changes get a small anticipation hop and a wobble; the boop's own `happy` doesn't count.
	let lastMood: Mood | undefined;
	$effect(() => {
		const next = mood;
		if (lastMood !== undefined && lastMood !== next) {
			untrack(() => {
				jump(6, 130);
				kickWobble(Math.random() < 0.5 ? -4 : 4);
			});
		}
		lastMood = next;
	});

	// Rare idle fidgets keep it alive without being busy.
	$effect(() => {
		if (reduced || !onscreen) return;
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(
				() => {
					if (!hovered && !pressed && !booping) {
						if (Math.random() < 0.5) kickWobble(Math.random() < 0.5 ? -3 : 3);
						else jump(4, 140);
					}
					schedule();
				},
				7000 + Math.random() * 9000
			);
		};
		schedule();
		return () => clearTimeout(timer);
	});

	// Blinking, with the occasional double blink; sleepy eyes are already closed.
	$effect(() => {
		if (activeMood === 'sleepy' || !onscreen) return;
		let alive = true;
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(
				async () => {
					const times = Math.random() < 0.2 ? 2 : 1;
					for (let i = 0; i < times && alive; i++) {
						await blink.set(1);
						await blink.set(0);
					}
					if (alive) schedule();
				},
				2200 + Math.random() * 3800
			);
		};
		schedule();
		return () => {
			alive = false;
			clearTimeout(timer);
			blink.set(0, { duration: 0 });
		};
	});

	$effect(() => {
		const target = lookAt;
		if (typeof target === 'object') {
			gaze.target = { x: clamp(target.x, -1, 1), y: clamp(target.y, -1, 1) };
			return;
		}
		if (target === 'none') {
			gaze.target = { x: 0, y: 0 };
			return;
		}
		if (!onscreen) return;
		if (target === 'wander') {
			let timer: ReturnType<typeof setTimeout>;
			const glance = () => {
				gaze.target =
					Math.random() < 0.35
						? { x: 0, y: 0 }
						: { x: Math.random() * 1.8 - 0.9, y: Math.random() * 1.2 - 0.6 };
				timer = setTimeout(glance, 1200 + Math.random() * 2400);
			};
			glance();
			return () => clearTimeout(timer);
		}
		// After a while without pointer movement it glances around on its own.
		let idleTimer: ReturnType<typeof setTimeout>;
		const glanceAround = () => {
			gaze.target =
				Math.random() < 0.3
					? { x: 0, y: 0 }
					: { x: Math.random() * 1.6 - 0.8, y: Math.random() * 1 - 0.5 };
			idleTimer = setTimeout(glanceAround, 1400 + Math.random() * 2200);
		};
		const armIdle = () => {
			clearTimeout(idleTimer);
			idleTimer = setTimeout(glanceAround, 4000);
		};
		armIdle();
		const move = (e: PointerEvent) => {
			armIdle();
			if (!root) return;
			const rect = root.getBoundingClientRect();
			// Normalize by a reach larger than the mascot so the eyes keep following far-away pointers.
			const reach = Math.max(rect.width * 2, 240);
			gaze.target = {
				x: clamp((e.clientX - (rect.left + rect.width / 2)) / reach, -1, 1),
				y: clamp((e.clientY - (rect.top + rect.height * 0.45)) / reach, -1, 1)
			};
		};
		const reset = () => (gaze.target = { x: 0, y: 0 });
		window.addEventListener('pointermove', move);
		document.documentElement.addEventListener('pointerleave', reset);
		return () => {
			clearTimeout(idleTimer);
			window.removeEventListener('pointermove', move);
			document.documentElement.removeEventListener('pointerleave', reset);
		};
	});

	// Without a `level`, fake speech: words of snappy syllables with pauses.
	$effect(() => {
		if (activeMood !== 'talking' || level !== undefined || reduced || !onscreen) {
			talk = 0;
			return;
		}
		const babble = createBabble();
		let raf = 0;
		const tick = (t: number) => {
			talk = babble.level(t);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	let boopTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(boopTimer));

	function boop() {
		if (!reduced) {
			// Stretch on take-off; `jump` squashes again on landing.
			squish.set({ x: 0.86, y: 1.16 }, { instant: true });
			squish.target = restSquish();
			jump(11);
			kickWobble(pointerX < 0 ? -3 : 3);
		}
		booping = true;
		boops++;
		clearTimeout(boopTimer);
		boopTimer = setTimeout(() => (booping = false), 900);
		onboop?.();
	}

	const f = $derived(face.current);
	const gx = $derived(clamp(gaze.current.x + f.gazeX, -1, 1));
	const gy = $derived(clamp(gaze.current.y + f.gazeY, -1, 1));
	const mouthLevel = $derived(
		activeMood !== 'talking' ? 0 : level !== undefined ? clamp(level, 0, 1) : talk
	);
	const sx = $derived(squish.current.x * (1 - f.stretch * 0.6));
	const sy = $derived(squish.current.y * (1 + f.stretch));
	const t = $derived(head.top);
	const hw = $derived(head.halfWidth);
	const cssSize = $derived(typeof size === 'number' ? `${size}px` : size);
	const viewH = $derived(body ? BODY_VIEWBOX_HEIGHT : 200);
	const groundY = $derived(body ? BODY_GROUND_Y + 1 : head.bottom + 14);
	// With a body, the whole figure leans around its hips instead of the head's center.
	const tiltPivot = $derived(body ? '100 214' : '100 110');
	// Lean and wobble rock from the base (the soles with a body), like something standing.
	const rockPivot = $derived(body ? `100 ${BODY_GROUND_Y}` : `100 ${head.bottom}`);
	const rock = $derived(lean.current + wobble.current);
	// The ground reacts to the hop and the squash: smaller and fainter while airborne.
	const air = $derived(clamp(-hop.current / 24, 0, 1));
	const groundScale = $derived((1 - air * 0.35) * (1 + (squish.current.x - 1) * 0.8));
	// With a body the neck pivot gets a bit less, since the whole figure squashes too.
	const headSx = $derived(body ? 1 + (sx - 1) * 0.7 : sx);
	const headSy = $derived(body ? 1 + (sy - 1) * 0.7 : sy);
	// In full-body mode the legs take some of the squash so the head doesn't sink into the torso.
	const figureSquash = $derived(
		body
			? `translate(100 ${BODY_GROUND_Y}) scale(${1 + (sx - 1) * 0.35} ${1 + (sy - 1) * 0.35}) translate(-100 ${-BODY_GROUND_Y})`
			: ''
	);

	function trackPointer(e: PointerEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		pointerX = clamp((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
	}

	setMascot({
		uid,
		get mood() {
			return activeMood;
		},
		get config() {
			return config;
		},
		get face() {
			return f;
		},
		get blink() {
			return blink.current;
		},
		get gazeX() {
			return gx;
		},
		get gazeY() {
			return gy;
		},
		get talk() {
			return mouthLevel;
		},
		get shape() {
			return head;
		},
		get eyes() {
			return eyes;
		},
		get accessories() {
			return accessories;
		},
		get hovered() {
			return hovered;
		},
		get pressed() {
			return pressed;
		},
		get boops() {
			return boops;
		},
		get reduced() {
			return reduced;
		},
		get body() {
			return body;
		},
		get outfit() {
			return outfit;
		},
		get shoes() {
			return shoes;
		},
		get lean() {
			return rock;
		},
		get hop() {
			return hop.current;
		},
		get squashX() {
			return headSx;
		},
		get squashY() {
			return headSy;
		},
		get entered() {
			return entered;
		},
		get onscreen() {
			return onscreen;
		}
	});
</script>

{#snippet art()}
	<svg viewBox="0 0 200 {viewH}" aria-hidden="true" focusable="false">
		<defs>
			<radialGradient id="{uid}-body" cx="0.36" cy="0.28" r="0.9">
				<stop offset="0" class="stop-light" />
				<stop offset="0.5" class="stop-mid" />
				<stop offset="1" class="stop-dark" />
			</radialGradient>
			<radialGradient id="{uid}-hand" cx="0.35" cy="0.3" r="0.8">
				<stop offset="0" class="stop-light" />
				<stop offset="1" class="stop-mid" />
			</radialGradient>
			<filter id="{uid}-glow" x="-60%" y="-60%" width="220%" height="220%">
				<feGaussianBlur stdDeviation="2.2" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
			<radialGradient id="{uid}-ground-glow">
				<stop offset="0" class="stop-accent" stop-opacity="0.38" />
				<stop offset="0.55" class="stop-accent" stop-opacity="0.12" />
				<stop offset="1" class="stop-accent" stop-opacity="0" />
			</radialGradient>
			<radialGradient id="{uid}-ground-shadow">
				<stop offset="0" class="stop-visor" stop-opacity="0.34" />
				<stop offset="0.6" class="stop-visor" stop-opacity="0.14" />
				<stop offset="1" class="stop-visor" stop-opacity="0" />
			</radialGradient>
			<filter id="{uid}-soft" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="2.4" />
			</filter>
		</defs>

		<g transform="translate(100 {groundY}) scale({groundScale} 1)" opacity={1 - air * 0.5}>
			<ellipse class="ground-glow" rx={hw * 1.15} ry="14" fill={ref('ground-glow')} />
			<ellipse class="shadow" rx={hw * 0.72} ry="6.5" fill={ref('ground-shadow')} />
			<ellipse class="contact" rx={hw * 0.36} ry="2.6" fill={ref('ground-shadow')} />
		</g>

		<g class="pop">
			<!-- Standing figures shift their weight instead of floating. -->
			<g class={body ? 'stand' : 'float'}>
				<g transform="translate(0 {hop.current}) rotate({rock} {rockPivot})">
					<g transform={figureSquash}>
						<!-- Feet stay planted while the upper body tilts with the mood. -->
						{#if body}
							<Body layer="feet" />
						{/if}
						<g transform="rotate({f.tilt} {tiltPivot})">
							{#if body}
								<Body layer="back" />
							{/if}
							<g
								class="head"
								transform="translate(100 {head.bottom}) scale({headSx} {headSy}) translate(-100 {-head.bottom})"
							>
								<g class="breathe">
									<Accessories layer="back" />
									<Shell />
									<Face />
									<Accessories layer="front" />
									{@render accessory?.({ top: t, halfWidth: hw })}
								</g>
							</g>
							{#if body}
								<Body layer="front" />
							{:else if hands}
								<Hands />
							{/if}
							<Effects />
						</g>
					</g>
				</g>
			</g>
		</g>
	</svg>
{/snippet}

{#if interactive}
	<button
		bind:this={root}
		type="button"
		class="mascott {className}"
		class:still={reduced}
		class:paused={!onscreen}
		class:no-float={!float || body}
		aria-label={label}
		data-mood={activeMood}
		style="{style}; --float-speed: {config.floatSpeed}s"
		style:width={cssSize}
		style:aspect-ratio="200 / {viewH}"
		onclick={boop}
		onpointerenter={(e) => {
			hovered = true;
			trackPointer(e);
		}}
		onpointermove={trackPointer}
		onpointerleave={() => {
			hovered = pressed = false;
			pointerX = 0;
		}}
		onpointerdown={() => (pressed = true)}
		onpointerup={() => (pressed = false)}
		onpointercancel={() => (pressed = false)}
	>
		{@render art()}
	</button>
{:else}
	<div
		bind:this={root}
		role="img"
		class="mascott {className}"
		class:still={reduced}
		class:paused={!onscreen}
		class:no-float={!float || body}
		aria-label={label}
		data-mood={activeMood}
		style="{style}; --float-speed: {config.floatSpeed}s"
		style:width={cssSize}
		style:aspect-ratio="200 / {viewH}"
	>
		{@render art()}
	</div>
{/if}

<style>
	.mascott {
		--c-body-light: var(--mascott-body-light, var(--_mascott-body-light));
		--c-body-mid: var(--mascott-body-mid, var(--_mascott-body-mid));
		--c-body-dark: var(--mascott-body-dark, var(--_mascott-body-dark));
		--c-visor: var(--mascott-visor, var(--_mascott-visor));
		--c-eye: var(--mascott-eye, var(--_mascott-eye));
		--c-cheek: var(--mascott-cheek, var(--_mascott-cheek));
		--c-accent: var(--mascott-accent, var(--_mascott-accent));
		--c-sprout: var(--mascott-sprout, #6fdc8c);

		display: inline-block;
		padding: 0;
		border: 0;
		background: none;
		line-height: 0;
		-webkit-tap-highlight-color: transparent;
	}
	button.mascott {
		cursor: pointer;
		border-radius: 50%;
	}
	button.mascott:focus-visible {
		outline: 2px solid var(--c-accent);
		outline-offset: 4px;
	}
	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
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

	.stop-accent {
		stop-color: var(--c-accent);
	}
	.stop-visor {
		stop-color: var(--c-visor);
	}

	/* Transform-origin in SVG only means something relative to the element's own box. */
	.float,
	.breathe,
	.shadow,
	.contact,
	.ground-glow,
	.pop {
		transform-box: fill-box;
		transform-origin: center;
	}
	.pop {
		transform-origin: 50% 100%;
		animation: pop-in 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.float {
		animation: float var(--float-speed) ease-in-out infinite alternate;
	}
	.stand {
		transform-box: view-box;
		transform-origin: 100px 274px;
		animation: shift calc(var(--float-speed) * 1.6) ease-in-out infinite alternate;
	}
	.shadow,
	.contact,
	.ground-glow {
		animation: shadow var(--float-speed) ease-in-out infinite alternate;
	}
	/* A slightly off-beat, uneven cycle so breathing never syncs with the float and feels organic. */
	.breathe {
		transform-origin: 50% 100%;
		animation: breathe calc(var(--float-speed) * 1.37) ease-in-out infinite;
	}
	.no-float .float,
	.no-float .shadow,
	.no-float .contact,
	.no-float .ground-glow {
		animation: none;
	}
	.paused :global(*) {
		animation-play-state: paused !important;
	}
	.still :global(*),
	.still {
		animation: none !important;
	}

	@keyframes pop-in {
		from {
			transform: scale(0.6);
			opacity: 0;
		}
		40% {
			opacity: 1;
		}
	}
	@keyframes shift {
		from {
			transform: rotate(-0.8deg);
		}
		to {
			transform: rotate(0.8deg);
		}
	}
	@keyframes float {
		to {
			transform: translateY(-7px);
		}
	}
	@keyframes shadow {
		to {
			transform: scaleX(0.82);
			opacity: 0.55;
		}
	}
	@keyframes breathe {
		0%,
		100% {
			transform: scale(1, 1);
		}
		38% {
			transform: scale(1.008, 0.99);
		}
		52% {
			transform: scale(1.009, 0.988);
		}
		78% {
			transform: scale(0.998, 1.003);
		}
	}
</style>

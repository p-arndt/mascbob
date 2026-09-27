<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Spring, Tween } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import { cubicOut } from 'svelte/easing';
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
	import { resolveTheme, themeStyle, type ThemeInput } from './themes.js';
	import type { Accessory, EyeStyle, LookAt, Mood, Motion, Outfit, Shape } from './types.js';

	interface Props {
		mood?: Mood;
		/** Preset name or `{ base?, ...colors }`. `--mascott-*` CSS variables override it. */
		theme?: ThemeInput;
		shape?: Shape;
		eyes?: EyeStyle;
		accessories?: Accessory[];
		/** Floating hands that gesture with the mood (head-only mode). */
		hands?: boolean;
		/** Draw a full body below the head. The mascot then is 2:3 instead of square. */
		body?: boolean;
		outfit?: Outfit;
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
		theme = 'aurora',
		shape = 'pebble',
		eyes = 'round',
		accessories = [],
		hands = true,
		body = false,
		outfit = 'none',
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

	let root = $state<HTMLElement>();
	let talk = $state(0);

	// Blinking, with the occasional double blink; sleepy eyes are already closed.
	$effect(() => {
		if (activeMood === 'sleepy') return;
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
		const move = (e: PointerEvent) => {
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
			window.removeEventListener('pointermove', move);
			document.documentElement.removeEventListener('pointerleave', reset);
		};
	});

	// Without a `level`, fake speech: random syllable openings with short pauses.
	$effect(() => {
		if (activeMood !== 'talking' || level !== undefined || reduced) {
			talk = 0;
			return;
		}
		let raf = 0;
		let next = 0;
		let target = 0;
		const tick = (t: number) => {
			if (t > next) {
				target = Math.random() < 0.18 ? 0 : 0.3 + Math.random() * 0.7;
				next = t + 80 + Math.random() * 110;
			}
			talk += (target - talk) * 0.35;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	let boopTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(boopTimer));

	function boop() {
		if (!reduced) {
			squish.set({ x: 1.14, y: 0.84 }, { instant: true });
			squish.target = { x: 1, y: 1 };
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
	const groundY = $derived(body ? BODY_GROUND_Y : head.bottom + 14);
	// With a body, the whole figure leans around its hips instead of the head's center.
	const tiltPivot = $derived(body ? '100 230' : '100 110');

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
			<filter id="{uid}-soft" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="2.4" />
			</filter>
		</defs>

		<ellipse class="shadow" cx="100" cy={groundY} rx={hw * 0.7} ry="6" filter={ref('soft')} />

		<g class="float">
			<g transform="rotate({f.tilt} {tiltPivot})">
				{#if body}
					<Body layer="back" />
				{/if}
				<g transform="translate(100 {head.bottom}) scale({sx} {sy}) translate(-100 {-head.bottom})">
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
	</svg>
{/snippet}

{#if interactive}
	<button
		bind:this={root}
		type="button"
		class="mascott {className}"
		class:still={reduced}
		class:no-float={!float}
		aria-label={label}
		data-mood={activeMood}
		style="{style}; --float-speed: {config.floatSpeed}s"
		style:width={cssSize}
		style:aspect-ratio="200 / {viewH}"
		onclick={boop}
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => (hovered = pressed = false)}
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
		class:no-float={!float}
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

	.shadow {
		fill: var(--c-visor);
		opacity: 0.2;
	}

	/* Transform-origin in SVG only means something relative to the element's own box. */
	.float,
	.breathe,
	.shadow {
		transform-box: fill-box;
		transform-origin: center;
	}
	.float {
		animation: float var(--float-speed) ease-in-out infinite alternate;
	}
	.shadow {
		animation: shadow var(--float-speed) ease-in-out infinite alternate;
	}
	.breathe {
		transform-origin: 50% 100%;
		animation: breathe calc(var(--float-speed) * 1.3) ease-in-out infinite alternate;
	}
	.no-float .float,
	.no-float .shadow {
		animation: none;
	}
	.still :global(*),
	.still {
		animation: none !important;
	}

	@keyframes float {
		to {
			transform: translateY(-7px);
		}
	}
	@keyframes shadow {
		to {
			transform: scaleX(0.8);
			opacity: 0.1;
		}
	}
	@keyframes breathe {
		to {
			transform: scale(1.012, 0.985);
		}
	}
</style>

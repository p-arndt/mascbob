<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Spring, Tween } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import { cubicOut } from 'svelte/easing';
	import {
		EYE_SIZES,
		HEART_PATH,
		SHAPE_DEFS,
		SPARKLE_PATH,
		clamp,
		eyePath,
		mouthPath
	} from './geometry.js';
	import { moodConfig } from './moods.js';
	import { resolveTheme, themeStyle, type ThemeInput } from './themes.js';
	import type {
		Accessory,
		EyeParams,
		EyeStyle,
		HandPose,
		LookAt,
		Mood,
		Motion,
		Shape
	} from './types.js';

	interface Props {
		mood?: Mood;
		/** Preset name or `{ base?, ...colors }`. `--mascott-*` CSS variables override it. */
		theme?: ThemeInput;
		shape?: Shape;
		eyes?: EyeStyle;
		accessories?: Accessory[];
		/** Floating hands that gesture with the mood. */
		hands?: boolean;
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
		/** Custom SVG drawn on top of the body, in the 200×200 viewBox. */
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
	const ref = (name: string) => `url(#${uid}-${name})`;

	const prefersReduced = new MediaQuery('(prefers-reduced-motion: reduce)');
	const reduced = $derived(motion === 'reduced' || (motion === 'auto' && prefersReduced.current));

	let booping = $state(false);
	let hovered = $state(false);
	const activeMood: Mood = $derived(booping ? 'happy' : mood);
	const config = $derived(moodConfig(activeMood));
	const body = $derived(SHAPE_DEFS[shape] ?? SHAPE_DEFS.pebble);
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
	const handPos = Spring.of(() => handPositions(config.hands, body.halfWidth), {
		stiffness: 0.07,
		damping: 0.4
	});

	let root = $state<HTMLElement>();
	let talk = $state(0);

	function handPositions(pose: HandPose, hw: number) {
		const left = 100 - hw - 12;
		const right = 100 + hw + 12;
		switch (pose) {
			case 'up':
				return { lx: left - 6, ly: 84, rx: right + 6, ry: 84 };
			case 'wave':
				return { lx: left, ly: 134, rx: right + 4, ry: 86 };
			case 'think':
				return { lx: left, ly: 134, rx: 100 + hw - 10, ry: 152 };
			default:
				return { lx: left, ly: 134, rx: right, ry: 134 };
		}
	}

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
		clearTimeout(boopTimer);
		boopTimer = setTimeout(() => (booping = false), 900);
		onboop?.();
	}

	const f = $derived(face.current);
	const gx = $derived(clamp(gaze.current.x + f.gazeX, -1, 1));
	const gy = $derived(clamp(gaze.current.y + f.gazeY, -1, 1));
	const visorW = $derived(Math.min(106, body.halfWidth * 2 - 24));
	const ox = $derived(gx * 2.5);
	const oy = $derived(gy * 2);
	const eyeY = $derived(96 + gy * 5);
	const mouthLevel = $derived(
		activeMood !== 'talking' ? 0 : level !== undefined ? clamp(level, 0, 1) : talk
	);

	function eye(p: EyeParams, cx: number, side: 'left' | 'right') {
		const base = EYE_SIZES[eyes] ?? EYE_SIZES.round;
		const w = base.w * p.scale;
		const h = base.h * p.scale * Math.max(0, p.open) * (1 - blink.current);
		const d = eyePath(cx, eyeY, w, h, {
			lift: p.lift,
			lidLeft: side === 'left' ? p.lidOuter : p.lidInner,
			lidRight: side === 'left' ? p.lidInner : p.lidOuter
		});
		const heart = clamp(p.heart, 0, 1);
		const shine = clamp(h / base.h, 0, 1) * clamp(1 - p.lift * 1.2, 0, 1) * (1 - heart);
		return { d, cx, w, h, heart, shine, scale: p.scale };
	}

	const leftEye = $derived(eye(f.left, 80 + gx * 7, 'left'));
	const rightEye = $derived(eye(f.right, 120 + gx * 7, 'right'));
	const mouth = $derived(
		mouthPath(
			100 + f.mouthX + gx * 5,
			116 + gy * 4,
			f.mouthWidth,
			f.mouthCurve,
			f.mouthOpen + mouthLevel * 7
		)
	);
	const cheekOpacity = $derived(clamp(f.cheeks + (hovered ? 0.3 : 0), 0, 1) * 0.85);
	const sx = $derived(squish.current.x * (1 - f.stretch * 0.6));
	const sy = $derived(squish.current.y * (1 + f.stretch));
	const has = (a: Accessory) => accessories.includes(a);
	const t = $derived(body.top);
	const hw = $derived(body.halfWidth);
	const cssSize = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

{#snippet art()}
	<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
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
			<linearGradient id="{uid}-sheen" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0.15" class="stop-eye" stop-opacity="0" />
				<stop offset="0.45" class="stop-cheek" stop-opacity="0.28" />
				<stop offset="0.7" class="stop-accent" stop-opacity="0.32" />
				<stop offset="1" class="stop-eye" stop-opacity="0" />
			</linearGradient>
			<linearGradient id="{uid}-visor-sheen" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#fff" stop-opacity="0.2" />
				<stop offset="0.45" stop-color="#fff" stop-opacity="0" />
			</linearGradient>
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
			<clipPath id="{uid}-ring-back" clipPathUnits="userSpaceOnUse">
				<rect x="-20" y="-20" width="240" height="154" />
			</clipPath>
			<clipPath id="{uid}-ring-front" clipPathUnits="userSpaceOnUse">
				<rect x="-20" y="134" width="240" height="86" />
			</clipPath>
		</defs>

		<ellipse
			class="shadow"
			cx="100"
			cy={body.bottom + 14}
			rx={hw * 0.7}
			ry="6"
			filter={ref('soft')}
		/>

		<g class="float">
			<g transform="rotate({f.tilt} 100 110)">
				<g transform="translate(100 {body.bottom}) scale({sx} {sy}) translate(-100 {-body.bottom})">
					<g class="breathe">
						<!-- Back layer: parts that must disappear behind the body. -->
						{#if has('ring')}
							<g transform="rotate(-8 100 134)" clip-path={ref('ring-back')}>
								<ellipse class="ring" cx="100" cy="134" rx="96" ry="16" />
							</g>
						{/if}
						{#if has('ears')}
							<g class="ears">
								<path
									class="ear"
									d="M62 {t + 34}C58 {t + 4} 60 {t - 14} 70 {t - 12}C80 {t - 10} 92 {t + 6} 94 {t +
										14}Z"
								/>
								<path
									class="ear-inner"
									d="M68 {t + 20}C66 {t + 6} 68 {t - 4} 72 {t - 3}C77 {t - 2} 84 {t + 6} 86 {t +
										12}Z"
								/>
								<path
									class="ear"
									d="M138 {t + 34}C142 {t + 4} 140 {t - 14} 130 {t - 12}C120 {t - 10} 108 {t +
										6} 106 {t + 14}Z"
								/>
								<path
									class="ear-inner"
									d="M132 {t + 20}C134 {t + 6} 132 {t - 4} 128 {t - 3}C123 {t - 2} 116 {t +
										6} 114 {t + 12}Z"
								/>
							</g>
						{/if}
						{#if has('headphones')}
							<path
								class="band"
								d="M{100 - hw - 2} 104C{100 - hw - 2} {t - 46} {100 + hw + 2} {t - 46} {100 +
									hw +
									2} 104"
							/>
						{/if}
						{#if has('antenna')}
							<line class="stalk" x1="100" y1={t + 4} x2="100" y2={t - 14} />
							<circle class="antenna-tip" cx="100" cy={t - 18} r="6" filter={ref('glow')} />
						{/if}
						{#if has('sprout')}
							<g class="sprout" style:transform-origin="100px {t}px">
								<path class="stem" d="M100 {t + 4}Q98 {t - 6} 100 {t - 14}" />
								<path
									class="leaf"
									d="M100 {t - 12}C92 {t - 26} 78 {t - 22} 76 {t - 16}C84 {t - 8} 94 {t -
										8} 100 {t - 12}Z"
								/>
								<path
									class="leaf"
									d="M100 {t - 14}C106 {t - 30} 122 {t - 28} 124 {t - 22}C116 {t - 12} 106 {t -
										10} 100 {t - 14}Z"
								/>
							</g>
						{/if}

						<!-- Body -->
						<path class="body" d={body.d} fill={ref('body')} />
						<path d={body.d} fill={ref('sheen')} />
						<path class="rim" d={body.d} />
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

						<!-- Face screen, shifted slightly with the gaze for a bit of depth. -->
						<g transform="translate({ox} {oy})">
							<rect class="visor" x={100 - visorW / 2} y="69" width={visorW} height="62" rx="31" />
							<rect
								x={100 - visorW / 2}
								y="69"
								width={visorW}
								height="62"
								rx="31"
								fill={ref('visor-sheen')}
							/>
							<rect
								class="visor-rim"
								x={100 - visorW / 2}
								y="69"
								width={visorW}
								height="62"
								rx="31"
							/>
						</g>
						<g class="cheeks" opacity={cheekOpacity} filter={ref('soft')}>
							<ellipse cx={100 - visorW / 2 + 14 + ox} cy={113 + oy} rx="7.5" ry="4.5" />
							<ellipse cx={100 + visorW / 2 - 14 + ox} cy={113 + oy} rx="7.5" ry="4.5" />
						</g>
						<g class="face" filter={ref('glow')}>
							{#each [leftEye, rightEye] as e, i (i)}
								<path class="eye" d={e.d} opacity={1 - e.heart} />
								{#if e.heart > 0.01}
									<path
										class="eye-heart"
										d={HEART_PATH}
										opacity={e.heart}
										transform="translate({e.cx} {eyeY}) scale({22 *
											e.scale *
											(0.6 + 0.4 * e.heart)})"
									/>
								{/if}
								<circle
									class="shine"
									cx={e.cx + e.w * 0.2}
									cy={eyeY - e.h * 0.22}
									r={2.2 * e.scale}
									opacity={e.shine}
								/>
							{/each}
							<path class="mouth" d={mouth} />
						</g>
						{#if config.effect === 'tear'}
							<g transform="translate({leftEye.cx - 8 + ox} {eyeY + 12})">
								<path class="tear" d="M0 -5C3 0 4 3 0 5C-4 3-3 0 0-5Z" />
							</g>
						{/if}

						<!-- Front layer -->
						{#if has('ring')}
							<g transform="rotate(-8 100 134)" clip-path={ref('ring-front')}>
								<ellipse class="ring" cx="100" cy="134" rx="96" ry="16" />
								<ellipse class="ring-dash" cx="100" cy="134" rx="96" ry="16" />
							</g>
						{/if}
						{#if has('headphones')}
							<rect class="cup" x={100 - hw - 9} y="88" width="16" height="32" rx="8" />
							<rect class="cup" x={100 + hw - 7} y="88" width="16" height="32" rx="8" />
							<rect
								class="cup-light"
								x={100 - hw - 4}
								y="98"
								width="4"
								height="12"
								rx="2"
								filter={ref('glow')}
							/>
							<rect
								class="cup-light"
								x={100 + hw}
								y="98"
								width="4"
								height="12"
								rx="2"
								filter={ref('glow')}
							/>
						{/if}
						{#if has('halo')}
							<ellipse class="halo" cx="100" cy={t - 12} rx="30" ry="7" filter={ref('glow')} />
						{/if}
						{@render accessory?.({ top: t, halfWidth: hw })}
					</g>
				</g>

				{#if hands}
					<g class="hand">
						<circle
							class="hand-orb"
							cx={handPos.current.lx}
							cy={handPos.current.ly}
							r="10"
							fill={ref('hand')}
						/>
					</g>
					<g class="hand" class:waving={config.hands === 'wave'}>
						<circle
							class="hand-orb"
							cx={handPos.current.rx}
							cy={handPos.current.ry}
							r="10"
							fill={ref('hand')}
						/>
					</g>
				{/if}

				<g class="effects">
					{#if config.effect === 'sparkles'}
						{#each [[100 + hw + 6, t + 12, 7], [100 - hw - 2, t + 28, 5], [100 + hw - 16, t - 8, 4]] as [x, y, s], i (i)}
							<g transform="translate({x} {y}) scale({s})">
								<path class="sparkle" d={SPARKLE_PATH} style:animation-delay="{i * 0.35}s" />
							</g>
						{/each}
					{:else if config.effect === 'hearts'}
						{#each [[100 + hw - 4, t + 6, 11], [100 - hw + 4, t + 14, 8], [100 + hw + 10, t + 34, 7]] as [x, y, s], i (i)}
							<g transform="translate({x} {y}) scale({s})">
								<path class="heart" d={HEART_PATH} style:animation-delay="{i * 0.5}s" />
							</g>
						{/each}
					{:else if config.effect === 'zzz'}
						{#each [0, 1, 2] as i (i)}
							<text class="zzz" x={100 + hw - 12} y={t + 4} style:animation-delay="{i * 0.9}s"
								>z</text
							>
						{/each}
					{:else if config.effect === 'dots'}
						<circle class="bubble" cx={100 + hw - 6} cy={t + 2} r="3" />
						<circle class="bubble" cx={100 + hw + 2} cy={t - 8} r="4.5" />
						<ellipse class="bubble" cx={100 + hw - 2} cy={t - 26} rx="20" ry="12" />
						{#each [-8, 0, 8] as dx, i (i)}
							<circle
								class="dot"
								cx={100 + hw - 2 + dx}
								cy={t - 26}
								r="2.6"
								style:animation-delay="{i * 0.18}s"
							/>
						{/each}
					{:else if config.effect === 'waves'}
						{#each [0, 1, 2] as i (i)}
							<path
								class="wave"
								d="M{100 + hw + 8 + i * 7} {100 - 8 - i * 4}Q{100 + hw + 14 + i * 7} 104 {100 +
									hw +
									8 +
									i * 7} {108 + i * 4}"
								style:animation-delay="{i * 0.25}s"
							/>
							<path
								class="wave"
								d="M{100 - hw - 8 - i * 7} {100 - 8 - i * 4}Q{100 - hw - 14 - i * 7} 104 {100 -
									hw -
									8 -
									i * 7} {108 + i * 4}"
								style:animation-delay="{i * 0.25}s"
							/>
						{/each}
					{/if}
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
		class:no-float={!float}
		aria-label={label}
		data-mood={activeMood}
		style="{style}; --float-speed: {config.floatSpeed}s"
		style:width={cssSize}
		onclick={boop}
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => (hovered = false)}
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
		aspect-ratio: 1;
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
	.stop-eye {
		stop-color: var(--c-eye);
	}
	.stop-cheek {
		stop-color: var(--c-cheek);
	}
	.stop-accent {
		stop-color: var(--c-accent);
	}

	.shadow {
		fill: var(--c-visor);
		opacity: 0.2;
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
	.visor {
		fill: var(--c-visor);
	}
	.visor-rim {
		fill: none;
		stroke: var(--c-accent);
		stroke-opacity: 0.45;
		stroke-width: 1.2;
	}
	.cheeks {
		fill: var(--c-cheek);
	}
	.eye {
		fill: var(--c-eye);
		stroke: var(--c-eye);
		stroke-width: 1.2;
		stroke-linejoin: round;
	}
	.eye-heart {
		fill: var(--c-eye);
	}
	.shine {
		fill: #fff;
	}
	.mouth {
		fill: var(--c-eye);
		stroke: var(--c-eye);
		stroke-width: 2.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.tear {
		fill: var(--c-eye);
		opacity: 0.85;
	}
	.ring {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 3;
		stroke-opacity: 0.85;
	}
	.ring-dash {
		fill: none;
		stroke: #fff;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 1 26;
		opacity: 0.9;
	}
	.halo {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 4;
	}
	.ear {
		fill: var(--c-body-mid);
	}
	.ear-inner {
		fill: var(--c-cheek);
		opacity: 0.55;
	}
	.band {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 6;
		stroke-linecap: round;
	}
	.cup {
		fill: var(--c-visor);
	}
	.cup-light {
		fill: var(--c-accent);
	}
	.stalk {
		stroke: var(--c-body-dark);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.antenna-tip {
		fill: var(--c-accent);
	}
	.stem {
		fill: none;
		stroke: var(--c-sprout);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.leaf {
		fill: var(--c-sprout);
	}
	.hand-orb {
		stroke: #fff;
		stroke-opacity: 0.5;
		stroke-width: 1;
	}
	.sparkle {
		fill: var(--c-accent);
	}
	.heart {
		fill: var(--c-cheek);
	}
	.zzz {
		fill: var(--c-accent);
		font:
			700 13px system-ui,
			sans-serif;
	}
	.bubble {
		fill: #fff;
		opacity: 0.9;
	}
	.dot {
		fill: var(--c-visor);
	}
	.wave {
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	/* Transform-origin in SVG only means something relative to the element's own box. */
	.float,
	.breathe,
	.shadow,
	.hand,
	.sparkle,
	.heart,
	.zzz,
	.dot,
	.wave,
	.tear,
	.halo,
	.antenna-tip,
	.sprout {
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
	.hand {
		animation: bob calc(var(--float-speed) * 0.8) ease-in-out infinite alternate;
	}
	.hand + .hand {
		animation-delay: -0.6s;
	}
	.hand.waving {
		animation: wave 0.5s ease-in-out infinite alternate;
	}
	.ring-dash {
		animation: orbit 6s linear infinite;
	}
	.halo {
		animation: bob 2.4s ease-in-out infinite alternate;
	}
	.antenna-tip {
		animation: pulse 1.6s ease-in-out infinite alternate;
	}
	.sprout {
		transform-box: view-box;
		animation: sway 3s ease-in-out infinite alternate;
	}
	.sparkle {
		animation: twinkle 1.4s ease-in-out infinite;
	}
	.heart {
		animation: rise 2.2s ease-out infinite;
	}
	.zzz {
		animation: drift 2.7s ease-out infinite;
		opacity: 0;
	}
	.dot {
		animation: hop 0.9s ease-in-out infinite;
	}
	.wave {
		animation: ping 1.2s ease-out infinite;
		opacity: 0;
	}
	.tear {
		animation: fall 2.4s ease-in infinite;
	}

	.no-float .float,
	.no-float .shadow {
		animation: none;
	}
	.still *,
	.still {
		animation: none !important;
	}
	.still .zzz,
	.still .wave {
		opacity: 1;
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
	@keyframes bob {
		to {
			transform: translateY(-4px);
		}
	}
	@keyframes wave {
		from {
			transform: translate(-2px, 2px) rotate(-8deg);
		}
		to {
			transform: translate(3px, -3px) rotate(8deg);
		}
	}
	@keyframes orbit {
		to {
			stroke-dashoffset: -108;
		}
	}
	@keyframes pulse {
		to {
			transform: scale(1.25);
			opacity: 0.8;
		}
	}
	@keyframes sway {
		from {
			transform: rotate(-6deg);
		}
		to {
			transform: rotate(6deg);
		}
	}
	@keyframes twinkle {
		0%,
		100% {
			transform: scale(0.4) rotate(0deg);
			opacity: 0.2;
		}
		50% {
			transform: scale(1) rotate(45deg);
			opacity: 1;
		}
	}
	@keyframes rise {
		0% {
			transform: translateY(0.5px) scale(0.6);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translateY(-1.6px) scale(1);
			opacity: 0;
		}
	}
	@keyframes drift {
		0% {
			transform: translate(0, 0) scale(0.6);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translate(14px, -26px) scale(1.2);
			opacity: 0;
		}
	}
	@keyframes hop {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-3px);
		}
	}
	@keyframes ping {
		0% {
			opacity: 0;
			transform: scale(0.9);
		}
		40% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: scale(1.1);
		}
	}
	@keyframes fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(14px);
			opacity: 0;
		}
	}
</style>

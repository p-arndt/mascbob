<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Spring, Tween } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { setMascot, svgRef } from './context.js';
	import { SHAPE_DEFS, clamp } from './geometry.js';
	import Accessories from './parts/Accessories.svelte';
	import Body from './parts/Body.svelte';
	import { buildDef, torsoHalfWidth, type Build } from './parts/body.js';
	import Effects from './parts/Effects.svelte';
	import Face from './parts/Face.svelte';
	import Hands from './parts/Hands.svelte';
	import Shell from './parts/Shell.svelte';
	import { moodConfig } from './moods.js';
	import { createBabble } from './speech.js';
	import { aimAt, saccade } from './gaze.js';
	import {
		ReactionController,
		resolveReactions,
		type Fidget,
		type IdleCue,
		type PointerSample,
		type ReactionEvent,
		type ReactionState,
		type ReactionsInput
	} from './interaction.js';
	import { resolveTheme, themeStyle, type ThemeInput } from './themes.js';
	import type { Accessory, EyeStyle, LookAt, Mood, Motion, Outfit, Shape, Shoes } from './types.js';

	interface Props {
		mood?: Mood;
		/** Preset name or `{ base?, ...colors }`. `--mascbob-*` CSS variables override it. */
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
		/** Body proportions of the full figure; `blob` has no legs and bobs instead of standing. */
		build?: Build;
		lookAt?: LookAt;
		/** Mouth opening 0..1 while `mood` is `talking`, e.g. from audio amplitude. Omit to animate on its own. */
		level?: number;
		/** Pixels, or any CSS length. */
		size?: number | string;
		float?: boolean;
		/** Particles around the head: mood effects (sparkles, hearts, zzz, …) and boop bursts. */
		effects?: boolean;
		motion?: Motion;
		/** Renders as a button that reacts to clicks and fires `onboop`. */
		interactive?: boolean;
		label?: string;
		onboop?: () => void;
		/**
		 * Pointer reactions (needs `interactive`): `follow`, `pet`, `dizzy`, `tickle` and `bored`
		 * are on by default, `startle` and `shy` are opt-in. `true` = defaults, `false` = none,
		 * a list enables exactly those, an object like `{ shy: true, bored: false }` toggles
		 * individual ones on top of the defaults. Reactions only override `mood` briefly.
		 */
		reactions?: ReactionsInput;
		/** Fires when a reaction triggers: `pet` (hearts), `startle`, `dizzy`, `shy`, `tickle`, `bored`, `wake`. */
		onreaction?: (event: ReactionEvent) => void;
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
		build = 'standard',
		lookAt = 'pointer',
		level,
		size = 160,
		float = true,
		effects = true,
		motion = 'auto',
		interactive = true,
		label = 'Mascbob',
		onboop,
		reactions = true,
		onreaction,
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
	let reaction = $state<ReactionState | null>(null);
	const activeMood: Mood = $derived(reaction?.mood ?? (booping ? 'happy' : mood));
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
	const blink = new Tween(0);
	/** Seconds; the idle loops' CSS duration, matching `--float-speed` in the styles. */
	const BASE_FLOAT_SPEED = 3.2;
	/** Toe tip and heel of each sole along x, in body.ts' local foot units (toe points outward). */
	const SOLES: Record<Shoes, { toe: number; heel: number }> = {
		none: { toe: 16, heel: -11 },
		sneakers: { toe: 25.6, heel: -13 },
		hightops: { toe: 25.6, heel: -13 },
		boots: { toe: 33.5, heel: -15.4 },
		slippers: { toe: 24.4, heel: -12.8 },
		rainboots: { toe: 26.2, heel: -14 },
		skates: { toe: 26.5, heel: -12.5 }
	};
	/** Face center in head coordinates, where the eyes aim from. */
	const FACE_Y = 100;
	// Stiff and well damped: eyes snap to a new target and hold it, like real saccades.
	const gaze = new Spring({ x: 0, y: 0 }, { stiffness: 0.24, damping: 0.74 });
	/** 0..1, how close the pointer is to the face; the eyes converge and widen on it. */
	const focus = new Spring(0, { stiffness: 0.1, damping: 0.6 });
	const squish = new Spring({ x: 1, y: 1 }, { stiffness: 0.16, damping: 0.18 });
	/** Degrees; the head tilts toward the pointer on its neck while the body stays planted. */
	const headTurn = new Spring(0, { stiffness: 0.07, damping: 0.42 });
	/** Degrees; a loose spring so kicks ring out as a wobble. */
	const wobble = new Spring(0, { stiffness: 0.12, damping: 0.14 });
	// A standing figure regains its balance; a lone head may keep rocking like a toy.
	$effect(() => {
		wobble.damping = body ? 0.28 : 0.14;
	});
	/** ViewBox units, negative is up. */
	const hop = new Tween(0);
	// Follow-through: the head trails the body's rock and hop and settles a beat after it.
	const headLag = new Spring(0, { stiffness: 0.08, damping: 0.32 });
	const headBob = new Spring(0, { stiffness: 0.12, damping: 0.4 });
	// Softer than `squish`, so the head's jelly lands after the body's.
	const headSquish = new Spring({ x: 1, y: 1 }, { stiffness: 0.11, damping: 0.26 });
	$effect(() => {
		const opts = { instant: reduced };
		headLag.set(wobble.current, opts);
		headBob.set(hop.current, opts);
		headSquish.set(squish.current, opts);
	});
	/** 0..1; heavy lids on top of blinks while drooping or yawning. */
	const lids = new Tween(0);
	/** 0..1; the head nods down while drooping or looking at the feet. */
	const sag = new Tween(0);
	/** 0..1; mouth opening of a yawn. */
	const yawnMouth = new Tween(0);

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
	// The idle loops run at a fixed CSS duration and the mood only changes their playback rate:
	// retiming a running CSS animation jumps its progress, a playback rate keeps the phase.
	const PACED = ['float', 'stand', 'shadow', 'contact', 'ground-glow', 'breathe', 'bob'];
	const pacedBy = (a: Animation) => {
		const target = a.effect instanceof KeyframeEffect ? a.effect.target : null;
		return !!target && PACED.some((c) => target.classList.contains(c));
	};
	$effect(() => {
		const el = root;
		if (!el || typeof el.getAnimations !== 'function') return;
		const rate = BASE_FLOAT_SPEED / config.floatSpeed;
		const pace = (a: Animation) => {
			if (pacedBy(a) && a.playbackRate !== rate) a.updatePlaybackRate(rate);
		};
		el.getAnimations({ subtree: true }).forEach(pace);
		// Loops that (re)start later, e.g. after reduced motion or when hands appear, get paced too.
		const started = (e: AnimationEvent) => {
			if (e.target instanceof Element) e.target.getAnimations().forEach(pace);
		};
		el.addEventListener('animationstart', started);
		return () => el.removeEventListener('animationstart', started);
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
	const loosenSquish = () => {
		squish.damping = pressed ? 0.6 : 0.18;
		squish.stiffness = pressed ? 0.25 : 0.16;
	};
	$effect(() => {
		if (reduced) {
			squish.set({ x: 1, y: 1 }, { instant: true });
			return;
		}
		loosenSquish();
		squish.target = restSquish();
	});

	// One-shot steps of gestures; all dropped on unmount and under reduced motion.
	let pending: ReturnType<typeof setTimeout>[] = [];
	function later(fn: () => void, ms: number) {
		const id = setTimeout(() => {
			pending = pending.filter((p) => p !== id);
			fn();
		}, ms);
		pending.push(id);
	}
	const cancelLater = () => {
		pending.forEach(clearTimeout);
		pending = [];
	};
	$effect(() => cancelLater);
	$effect(() => {
		if (reduced) untrack(cancelLater);
	});
	const flip = () => (Math.random() < 0.5 ? -1 : 1);

	let reactionLean = $state(0);
	/** Degrees the head turns after an idle glance. */
	let idleTurn = $state(0);
	/** Degrees of a mood entry's head tilt. */
	let gestureTurn = $state(0);
	$effect(() => {
		headTurn.target = reduced
			? 0
			: (hovered ? pointerX * 5 : 0) + reactionLean + idleTurn + gestureTurn;
	});

	let hopId = 0;
	/**
	 * Crouch (unless `crouch` is false), jump up by `height` viewBox units and land with a
	 * little squash. Resolves true if it landed without a newer jump cutting it short.
	 */
	async function jump(height: number, up = 150, crouch = true): Promise<boolean> {
		if (instant) return false;
		const id = ++hopId;
		const k = clamp(height / 12, 0.35, 1);
		if (crouch) {
			squish.target = { x: 1 + 0.08 * k, y: 1 - 0.1 * k };
			await new Promise<void>((r) => later(r, 80));
			if (id !== hopId) return false;
		}
		squish.set({ x: 1 - 0.08 * k, y: 1 + 0.1 * k }, { instant: true });
		squish.target = restSquish();
		await hop.set(-height, { duration: up, easing: cubicOut });
		if (id !== hopId) return false;
		await hop.set(0, { duration: up * 1.1, easing: cubicIn });
		if (id !== hopId) return false;
		const impact = Math.min(height / 90, 0.14);
		squish.set({ x: 1 + impact, y: 1 - impact }, { instant: true });
		squish.target = restSquish();
		return true;
	}

	let wobbleTimer: ReturnType<typeof setTimeout> | undefined;
	function kickWobble(deg: number, hold = 110) {
		if (instant) return;
		wobble.target = deg;
		clearTimeout(wobbleTimer);
		wobbleTimer = setTimeout(() => (wobble.target = 0), hold);
	}
	$effect(() => () => clearTimeout(wobbleTimer));

	/** Eases the squash toward `to` on a slow, well damped spring, holds it, and eases back. */
	function settle(to: { x: number; y: number }, hold: number, stiffness = 0.05, damping = 0.9) {
		if (instant) return;
		squish.stiffness = stiffness;
		squish.damping = damping;
		squish.target = to;
		later(() => (squish.target = restSquish()), hold);
		// Back on the loose spring only once it has eased home, or the return would jiggle.
		later(loosenSquish, hold + 700);
	}

	function tiltHead(deg: number, hold: number) {
		if (instant) return;
		gestureTurn = deg;
		later(() => (gestureTurn = 0), hold);
	}

	function stamp(depth: number) {
		if (instant) return;
		squish.set({ x: 1 + depth, y: 1 - depth * 1.15 }, { instant: true });
		squish.target = restSquish();
	}

	const bounce = () => jump(8, 120).then((landed) => landed && jump(5, 110, false));
	/**
	 * How the figure enters a mood. Keyed by plain strings, so a mood without its own
	 * gesture falls back to `enterMood`'s small hop and wobble.
	 */
	const ENTRY_GESTURES: Partial<Record<string, () => void>> = {
		happy: bounce,
		love: bounce,
		laughing: bounce,
		sad: () => settle({ x: 1.05, y: 0.93 }, 900, 0.03, 0.95),
		sleepy: () => {
			settle({ x: 1.03, y: 0.95 }, 1100, 0.03, 0.95);
			kickWobble(2 * flip(), 500);
		},
		surprised: () => jump(16, 120),
		grumpy: () => {
			stamp(0.1);
			later(() => stamp(0.06), 220);
		},
		thinking: () => tiltHead(7 * flip(), 1400),
		curious: () => {
			jump(5, 120);
			tiltHead(6 * flip(), 1100);
		},
		nervous: () => {
			kickWobble(2);
			later(() => kickWobble(-2), 130);
			later(() => kickWobble(1.5), 260);
		}
	};
	function enterMood(next: string) {
		const gesture = ENTRY_GESTURES[next];
		if (gesture) return gesture();
		jump(6, 130);
		kickWobble(4 * flip());
	}

	// Mood changes get an entry gesture; the boop's own `happy` doesn't count.
	let lastMood: Mood | undefined;
	$effect(() => {
		const next = mood;
		if (lastMood !== undefined && lastMood !== next) untrack(() => enterMood(next));
		lastMood = next;
	});

	const asleep = $derived(activeMood === 'sleepy');
	let blinkId = 0;
	/** Lids snap shut and ease open, like real ones; a newer blink cuts an older one short. */
	async function blinkEyes(times = 1, depth = 1) {
		const id = ++blinkId;
		for (let i = 0; i < times; i++) {
			await blink.set(depth, { duration: 60, easing: cubicIn });
			if (id !== blinkId) return;
			await blink.set(0, { duration: 140, easing: cubicOut });
			if (id !== blinkId) return;
		}
	}

	// Blinking, with the occasional half or double blink; sleepy eyes are already closed.
	$effect(() => {
		if (asleep || !onscreen) return;
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(
				() => {
					const r = Math.random();
					if (r < 0.15) blinkEyes(1, 0.55);
					else blinkEyes(r < 0.32 ? 2 : 1);
					schedule();
				},
				2200 + Math.random() * 3800
			);
		};
		schedule();
		return () => {
			clearTimeout(timer);
			blinkId++;
			blink.set(0, { duration: 0 });
		};
	});

	// A blink right as the mood changes hides the face morphing underneath it.
	let blinkMood: Mood | undefined;
	$effect(() => {
		const next = activeMood;
		if (blinkMood !== undefined && blinkMood !== next) {
			untrack(() => {
				if (!reduced && onscreen && next !== 'sleepy') blinkEyes();
			});
		}
		blinkMood = next;
	});

	// Bumped whenever the idle ladder is interrupted, so its delayed steps don't land afterwards.
	let idleEpoch = 0;
	/** The idle ladder in interaction.ts decides when; this decides how. */
	function idleCue(cue: IdleCue) {
		if (cue.type === 'rouse') {
			idleEpoch++;
			idleTurn = 0;
			const quick = { duration: instant ? 0 : 180, easing: cubicOut };
			lids.set(0, quick);
			sag.set(0, quick);
			yawnMouth.set(0, quick);
			return;
		}
		if (instant) return;
		if (cue.type === 'glance') glance(cue.x, cue.y);
		else if (cue.type === 'fidget') fidget(cue.fidget);
		else if (cue.type === 'yawn') yawn();
		else if (cue.type === 'droop') {
			lids.set(0.45, { duration: 1400, easing: cubicOut });
			sag.set(1, { duration: 1600, easing: cubicOut });
		}
	}

	let glanced = false;
	/** Eyes first, the head follows a moment later; a long glance hides behind a blink. */
	function glance(x: number, y: number) {
		if (lookAt !== 'pointer' || reactor.holdsGaze || pressed) return;
		const from = gaze.target;
		gaze.target = { x, y };
		glanced = true;
		if (Math.hypot(x - from.x, y - from.y) > 0.9 && blink.current === 0 && !asleep) blinkEyes();
		const epoch = idleEpoch;
		later(() => {
			if (epoch === idleEpoch) idleTurn = x * 4;
		}, 100);
	}

	function fidget(kind: Fidget) {
		if (hovered || pressed || booping) return;
		const epoch = idleEpoch;
		if (kind === 'shift') kickWobble(2.5 * flip(), 650);
		else if (kind === 'shrug') {
			squish.target = { x: 1.05, y: 0.93 };
			later(() => (squish.target = { x: 0.97, y: 1.05 }), 170);
			later(() => (squish.target = restSquish()), 380);
		} else if (kind === 'feet') {
			const free = lookAt === 'pointer' && !reactor.holdsGaze;
			if (free) gaze.target = { x: 0.15 * flip(), y: 0.95 };
			sag.set(0.5, { duration: 320, easing: cubicOut });
			later(() => {
				if (epoch !== idleEpoch) return;
				if (free) gaze.target = { x: 0, y: 0 };
				sag.set(0, { duration: 420, easing: cubicOut });
			}, 1200);
		} else if (kind === 'blink') {
			if (!asleep) blinkEyes(2);
		} else if (kind === 'sigh') settle({ x: 1.03, y: 0.955 }, 450, 0.06, 0.85);
		else jump(4, 140);
	}

	function yawn() {
		const epoch = idleEpoch;
		settle({ x: 0.94, y: 1.1 }, 1100, 0.04, 0.85);
		yawnMouth.set(0.85, { duration: 700, easing: cubicOut });
		lids.set(0.8, { duration: 600, easing: cubicOut });
		later(() => {
			if (epoch !== idleEpoch) return;
			yawnMouth.set(0, { duration: 500, easing: cubicIn });
			lids.set(0.2, { duration: 700, easing: cubicOut });
		}, 1400);
	}

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
		// Resting pointers hand the eyes over to the idle ladder's glances.
		let fixed = { x: 0, y: 0 };
		const move = (e: PointerEvent) => {
			reactor.activity();
			if (!root || reactor.holdsGaze) return;
			const rect = root.getBoundingClientRect();
			// Aim from the face, not the middle of the figure.
			const faceY = rect.top + rect.height * (FACE_Y / viewH);
			const aim = aimAt(e.clientX - (rect.left + rect.width / 2), e.clientY - faceY, rect.width);
			focus.target = reduced ? 0 : aim.focus;
			const next = { x: clamp(aim.x, -1, 1), y: clamp(aim.y, -1, 1) };
			const s = saccade(fixed, next);
			if (!s.jump && !glanced) return;
			glanced = false;
			fixed = next;
			gaze.target = next;
			if (s.blink && !reduced && blink.current === 0 && !asleep) blinkEyes();
		};
		const reset = () => {
			gaze.target = { x: 0, y: 0 };
			focus.target = 0;
		};
		window.addEventListener('pointermove', move);
		document.documentElement.addEventListener('pointerleave', reset);
		return () => {
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
			// Pressing was the crouch, so it takes off right away.
			jump(11, 150, false);
			squish.set({ x: 0.86, y: 1.16 }, { instant: true });
			squish.target = restSquish();
			kickWobble(pointerX < 0 ? -3 : 3);
		}
		booping = true;
		boops++;
		reactor.boop();
		clearTimeout(boopTimer);
		boopTimer = setTimeout(() => (booping = false), 900);
		onboop?.();
	}

	// Pointer reactions: gestures are detected in interaction.ts, this only feeds it.
	const reactor = new ReactionController({
		show: (state) => (reaction = state),
		lean: (deg) => (reactionLean = deg),
		look: (x, y) => (gaze.target = { x, y }),
		jump: (height, up) => jump(height, up),
		wobble: (deg) => kickWobble(deg),
		emit: (event) => onreaction?.(event),
		idle: idleCue
	});
	const reactionFlags = $derived(resolveReactions(reactions));
	// Reactions need `interactive`; without it nothing could wake a dozing figure.
	const NO_REACTIONS = resolveReactions(false);
	$effect(() => {
		reactor.configure(interactive ? reactionFlags : NO_REACTIONS, reduced, mood, {
			viewHeight: viewH,
			head
		});
	});
	$effect(() => {
		reactor.setRunning(onscreen);
	});
	$effect(() => () => reactor.destroy());
	$effect(() => {
		const el = root;
		if (!el || !interactive || !onscreen || !Object.values(reactionFlags).some(Boolean)) return;
		const viewHeight = viewH;
		let rect: DOMRect | null = null;
		const forget = () => (rect = null);
		const sample: PointerSample = { x: 0, y: 0, scale: 1, t: 0, hovering: false, pressed: false };
		const move = (e: PointerEvent) => {
			rect ??= el.getBoundingClientRect();
			if (!rect.width) return;
			sample.scale = rect.width / 200;
			sample.x = (e.clientX - rect.left) / sample.scale;
			sample.y = ((e.clientY - rect.top) / rect.height) * viewHeight;
			sample.t = e.timeStamp;
			sample.hovering = e.pointerType !== 'touch';
			sample.pressed = pressed;
			reactor.pointer(sample);
		};
		const leave = () => reactor.leave();
		const opts = { passive: true } as const;
		window.addEventListener('pointermove', move, opts);
		window.addEventListener('scroll', forget, { passive: true, capture: true });
		window.addEventListener('resize', forget, opts);
		document.documentElement.addEventListener('pointerleave', leave, opts);
		return () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('scroll', forget, { capture: true });
			window.removeEventListener('resize', forget);
			document.documentElement.removeEventListener('pointerleave', leave);
			reactor.reset();
		};
	});

	const f = $derived(face.current);
	const gx = $derived(clamp(gaze.current.x + f.gazeX, -1, 1));
	const gy = $derived(clamp(gaze.current.y + f.gazeY, -1, 1));
	const mouthLevel = $derived(
		activeMood !== 'talking' ? yawnMouth.current : level !== undefined ? clamp(level, 0, 1) : talk
	);
	const sx = $derived(squish.current.x * (1 - f.stretch * 0.6));
	const sy = $derived(squish.current.y * (1 + f.stretch));
	const t = $derived(head.top);
	const hw = $derived(head.halfWidth);
	const cssSize = $derived(typeof size === 'number' ? `${size}px` : size);
	const fig = $derived(buildDef(build));
	// Legless builds bob like the bare head instead of standing.
	const standing = $derived(body && fig.motion === 'stand');
	const legs = $derived(body && fig.legs);
	const viewH = $derived(body ? fig.viewHeight : 200);
	const groundY = $derived(body ? fig.groundY + 1 : head.bottom + 14);
	// With a body, the whole figure leans around its hips instead of the head's center.
	const tiltPivot = $derived(body ? `100 ${fig.hipY}` : '100 110');
	// Lean and wobble rock from the base (the soles with a body), like something standing.
	const rockPivot = $derived(body ? `100 ${fig.groundY}` : `100 ${head.bottom}`);
	const rock = $derived(wobble.current);
	// With a body the head trails the figure; a lone head is the whole figure.
	const headDrag = $derived(body ? clamp(headLag.current - rock, -6, 6) : 0);
	const headDrop = $derived(
		(body ? clamp(headBob.current - hop.current, -5, 5) * 0.5 : 0) + sag.current * 2.5
	);
	// Builds resize the head around its bottom, where it meets the collar.
	const headScale = $derived(body ? fig.headScale : 1);
	const headY = $derived(body ? fig.headY : 0);
	const neckY = $derived(head.bottom + headY - 6);
	// The ground reacts to the hop and the squash: smaller and fainter while airborne.
	const air = $derived(clamp(-hop.current / 24, 0, 1));
	const groundScale = $derived((1 - air * 0.35) * (1 + (squish.current.x - 1) * 0.8));
	// Feet point outward, so the shoes reach past the head's shadow; body.ts draws them in local foot units.
	const sole = $derived(SOLES[shoes] ?? SOLES.none);
	const footSpan = $derived(fig.legX + sole.toe * fig.footScale);
	// A legless body rests on its own base, so that is what the shadow has to cover.
	const baseHw = $derived(torsoHalfWidth(hw, fig) * fig.torso.hip);
	const shadowRx = $derived(
		legs ? Math.max(hw * 0.72, footSpan + 4) : body ? Math.max(hw * 0.72, baseHw + 4) : hw * 0.72
	);
	const contactRx = $derived(body ? baseHw * 0.7 : hw * 0.36);
	const footContact = $derived({
		x: fig.legX + ((sole.toe + sole.heel) / 2) * fig.footScale,
		rx: ((sole.toe - sole.heel) / 2) * fig.footScale * 0.85
	});
	// Feet squash with the figure (see figureSquash) and lift off entirely on a hop.
	const footContactScale = $derived(1 + (sx - 1) * 0.35);
	// With a body the neck pivot gets a bit less, since the whole figure squashes too.
	const hsx = $derived(headSquish.current.x * (1 - f.stretch * 0.6));
	const hsy = $derived(headSquish.current.y * (1 + f.stretch));
	const headSx = $derived(body ? 1 + (hsx - 1) * 0.7 : hsx);
	const headSy = $derived(body ? 1 + (hsy - 1) * 0.7 : hsy);
	// In full-body mode the legs take some of the squash so the head doesn't sink into the torso.
	const figureSquash = $derived(
		body
			? `translate(100 ${fig.groundY}) scale(${1 + (sx - 1) * 0.35} ${1 + (sy - 1) * 0.35}) translate(-100 ${-fig.groundY})`
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
			return Math.max(blink.current, lids.current);
		},
		get gazeX() {
			return gx;
		},
		get focus() {
			return focus.current;
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
		get build() {
			return fig;
		},
		get lean() {
			return rock + headTurn.current + headDrag;
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
		},
		get reaction() {
			return reaction?.name ?? null;
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
			<ellipse class="shadow" rx={shadowRx} ry="6.5" fill={ref('ground-shadow')} />
			{#if !legs}
				<ellipse class="contact" rx={contactRx} ry="2.6" fill={ref('ground-shadow')} />
			{/if}
		</g>
		{#if legs}
			<g
				transform="translate(100 {groundY}) scale({footContactScale} 1)"
				opacity={clamp(1 - air * 2.5, 0, 1)}
			>
				{#each [-1, 1] as side (side)}
					<ellipse
						class="foot-contact"
						cx={side * footContact.x}
						rx={footContact.rx}
						ry="2.2"
						fill={ref('ground-shadow')}
					/>
				{/each}
			</g>
		{/if}

		<g class="pop">
			<!-- Standing figures shift their weight instead of floating. -->
			<g
				class={standing ? 'stand' : 'float'}
				style:transform-origin={standing ? `100px ${fig.groundY}px` : undefined}
			>
				<g transform="translate(0 {hop.current}) rotate({rock} {rockPivot})">
					<g transform={figureSquash}>
						<!-- Feet stay planted while the upper body tilts with the mood. -->
						{#if body}
							<Body layer="feet" />
						{/if}
						<g transform="rotate({f.tilt} {tiltPivot})">
							{#if body}
								<!-- The torso turns a little with the head so no torso corner peeks out behind it. -->
								<g transform="rotate({headTurn.current * 0.45} 100 {fig.hipY})">
									<Body layer="back" />
								</g>
							{/if}
							<g
								transform="rotate({headTurn.current +
									headDrag} 100 {neckY}) translate(0 {headDrop})"
							>
								<g
									class="head"
									transform="translate(100 {head.bottom + headY}) scale({headSx *
										headScale} {headSy * headScale}) translate(-100 {-head.bottom})"
								>
									<g class="blast" class:blasting={reaction?.name === 'explode'}>
										<g class="breathe" class:lift={body}>
											<Accessories layer="back" />
											<Shell />
											<Face />
											<Accessories layer="front" />
											{@render accessory?.({ top: t, halfWidth: hw })}
										</g>
									</g>
								</g>
							</g>
							{#if body}
								<g transform="rotate({headTurn.current * 0.45} 100 {fig.hipY})">
									<Body layer="front" />
								</g>
							{:else if hands}
								<Hands />
							{/if}
							{#if effects}
								<Effects />
							{/if}
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
		class="mascbob {className}"
		class:still={reduced}
		class:paused={!onscreen}
		class:no-float={!float || standing}
		aria-label={label}
		data-mood={activeMood}
		{style}
		style:width={cssSize}
		style:aspect-ratio="200 / {viewH}"
		onclick={boop}
		onpointerenter={(e) => {
			hovered = true;
			reactor.activity();
			trackPointer(e);
		}}
		onpointermove={trackPointer}
		onpointerleave={() => {
			hovered = pressed = false;
			pointerX = 0;
		}}
		onpointerdown={() => {
			pressed = true;
			reactor.activity();
		}}
		onpointerup={() => (pressed = false)}
		onpointercancel={() => (pressed = false)}
	>
		{@render art()}
	</button>
{:else}
	<div
		bind:this={root}
		role="img"
		class="mascbob {className}"
		class:still={reduced}
		class:paused={!onscreen}
		class:no-float={!float || standing}
		aria-label={label}
		data-mood={activeMood}
		{style}
		style:width={cssSize}
		style:aspect-ratio="200 / {viewH}"
	>
		{@render art()}
	</div>
{/if}

<style>
	.mascbob {
		--c-body-light: var(--mascbob-body-light, var(--_mascbob-body-light));
		--c-body-mid: var(--mascbob-body-mid, var(--_mascbob-body-mid));
		--c-body-dark: var(--mascbob-body-dark, var(--_mascbob-body-dark));
		--c-visor: var(--mascbob-visor, var(--_mascbob-visor));
		--c-eye: var(--mascbob-eye, var(--_mascbob-eye));
		--c-cheek: var(--mascbob-cheek, var(--_mascbob-cheek));
		--c-accent: var(--mascbob-accent, var(--_mascbob-accent));
		--c-sprout: var(--mascbob-sprout, #6fdc8c);

		--float-speed: 3.2s;

		display: inline-block;
		padding: 0;
		border: 0;
		background: none;
		line-height: 0;
		-webkit-tap-highlight-color: transparent;
	}
	button.mascbob {
		cursor: pointer;
		border-radius: 50%;
	}
	button.mascbob:focus-visible {
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
	.blast,
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
	/* Off-beat with the float so the two never sync. A standing figure's head rides up on the
	   breath; a lone head swells a little instead. */
	.breathe {
		transform-origin: 50% 100%;
		animation: breathe calc(var(--float-speed) * 1.37) ease-in-out infinite;
	}
	.breathe.lift {
		animation-name: breathe-lift;
	}
	/* Trembles and swells while the fuse burns (the first 25%, REACTION_TIMING.explodeFuse), bursts
	   (Burst.svelte takes over with the debris), then pops back in; the length is
	   REACTION_TIMING.explode. */
	.blasting {
		animation: blast 2.8s linear both;
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
	@keyframes blast {
		0% {
			transform: scale(1) rotate(0deg);
			filter: brightness(1);
		}
		3% {
			transform: scale(1.02) rotate(-2deg);
		}
		6% {
			transform: scale(1.03) rotate(2deg);
		}
		9% {
			transform: scale(1.05) rotate(-3deg);
		}
		12% {
			transform: scale(1.07) rotate(3deg);
		}
		15% {
			transform: scale(1.1) rotate(-4deg);
		}
		18% {
			transform: scale(1.13) rotate(4deg);
		}
		21% {
			transform: scale(1.17, 1.12) rotate(-5deg);
		}
		23.5% {
			transform: scale(1.24, 1.18) rotate(0deg);
			opacity: 1;
			filter: brightness(1.35) saturate(1.4);
			animation-timing-function: cubic-bezier(0.6, 0, 1, 0.6);
		}
		25.5% {
			transform: scale(1.55);
			opacity: 0;
			filter: brightness(2);
		}
		68% {
			transform: scale(0.1);
			opacity: 0;
			filter: brightness(1);
			animation-timing-function: cubic-bezier(0.3, 0, 0.5, 1.4);
		}
		78% {
			transform: scale(1.15, 0.88);
			opacity: 1;
		}
		84% {
			transform: scale(0.93, 1.07);
		}
		90% {
			transform: scale(1.03, 0.98);
		}
		100% {
			transform: scale(1);
			opacity: 1;
			filter: brightness(1);
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
	/* Quick inhale, long exhale, then a pause before the next breath. */
	@keyframes breathe {
		0% {
			transform: scale(1, 1);
			animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
		}
		28% {
			transform: scale(1.01, 1.018);
			animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
		}
		78%,
		100% {
			transform: scale(1, 1);
		}
	}
	@keyframes breathe-lift {
		0% {
			transform: translateY(0);
			animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
		}
		28% {
			transform: translateY(-1.5px);
			animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
		}
		78%,
		100% {
			transform: translateY(0);
		}
	}
</style>

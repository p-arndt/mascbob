<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { DEFAULT_REACTIONS, Mascot, type Mood } from '$lib/index.js';
	import { savedDesign } from './design.js';
	import { themeProp, type StudioConfig } from './studio.js';
	import {
		absence,
		approach,
		arc,
		blocksHeadroom,
		dangle,
		entryStart,
		fly,
		HEADROOM_PROBES,
		hopDuration,
		letGo,
		offScreen,
		onScreen,
		pickEntrance,
		pickEntryTarget,
		pickHop,
		rotate,
		standX,
		stretch,
		throwVelocity,
		unwind,
		type AwayCause,
		type Box,
		type Exit,
		type Flight,
		type Point,
		type Span,
		type Swing,
		type View
	} from './buddy.js';

	// A small bob that lives on the page: it walks along headings, buttons, cards and the other
	// mascots, hops between them, wanders off edges and falls, and follows the reader down. Grab it
	// to carry it around; let go mid-swing to throw it.
	const small = new MediaQuery('(max-width: 640px)');
	const size = $derived(small.current ? 60 : 84);
	/** The figure's feet sit a little above the bottom of its box, over the ground shadow. */
	const FEET = 0.05;
	const NAV_HEIGHT = 68;
	const speed = 80;
	/** Long strolls at that pace drag on; it walks a stretch at a time instead. */
	const STROLL = 220;
	/** A falling buddy only catches surfaces on screen; below that it climbs back in instead. */
	const FLOOR_MARGIN = 60;
	/** Peeking up from the bottom edge: how long the head takes to rise, then how long it looks. */
	const PEEK_RISE = 450;
	const PEEK_LOOK = 550;
	/**
	 * The leap out of a peek climbs most of the screen; at the usual hop pace it would shoot up far
	 * faster than anything falls.
	 */
	const PEEK_LEAP = 1.6;
	/** The highest above the bottom edge a peek leaps; anything higher it comes in from the side. */
	const PEEK_REACH = 360;
	/** Scrolling has to stop for this long before it follows; mid-scroll the page is still moving. */
	const SCROLL_REST = 260;
	/** Anything with a top edge worth standing on. */
	const SURFACES = 'h1, h2, h3, p, li, a, button, pre, figure, article, input, [data-perch]';
	const TEXT = 'h1, h2, h3, p, li, a, button';
	const MEDIA = 'img, svg, video, canvas, picture, .mascbob';
	/** Dragging is the page's job here; the mascot's own limb grab would fight it. */
	const reactions = DEFAULT_REACTIONS.filter((r) => r !== 'grab' && r !== 'follow');
	const POSES: Mood[] = ['curious', 'thinking', 'happy', 'waving', 'wink', 'listening', 'laughing'];

	type Surface = { el: Element; box: Box };
	// `away` is out of sight, waiting to come back; `enter` is the scripted peek up from below.
	type Mode = 'stand' | 'walk' | 'hop' | 'held' | 'fly' | 'away' | 'enter';
	let mode: Mode = 'away';
	let surface: Element | null = null;
	/** Where the surface it is on was last frame, so it rides along when the surface moves. */
	let surfaceLeft: number | null = null;
	let x = 0;
	let y = 0;
	let walkTo = 0;
	let walkOff = false;
	let jump: { from: Point; el: Element; dx: number; t0: number; duration: number } | null = null;
	let flight: Flight = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 };
	/** The velocity the flight stretch follows, eased so a bounce squeezes it instead of flipping it. */
	let streak: Point = { x: 0, y: 0 };
	let flyFloor: Surface[] = [];
	/** The surface a thrown buddy slides along before it comes to rest, or null in the air. */
	let skid: Element | null = null;
	let flyRefresh = 0;
	let fastest = 0;
	/**
	 * Dropping back in from above, the view top it was last kept above. Until it shows, it keeps
	 * its place on screen, so a reader scrolling up meanwhile doesn't find it hanging up there.
	 */
	let dropView: number | null = null;
	let thinkAt = 0;
	let poseUntil = 0;
	let lastScroll = 0;
	let returnAt = Infinity;
	/** How it left, which decides how it comes back; null before its first appearance. */
	let exit: Exit | null = null;
	let awayCause: AwayCause = 'scrolled';
	let peek: { el: Element; t0: number } | null = null;
	let settledAt = 0;
	/** After a tumble it lies where it landed for a moment before it gets back up. */
	let riseAt = 0;

	let root = $state<HTMLElement>();
	let body = $state<HTMLElement>();
	let pos = $state<Point | null>(null);
	let mood = $state<Mood>('idle');
	let rotation = $state(0);
	let walking = $state(false);
	let held = $state(false);
	/** Held or tumbling: the rotation follows every frame instead of easing. */
	let free = $state(false);
	let rising = $state(false);
	let shape = $state('none');
	/**
	 * Lying on its side, the figure's center sits lower than standing; this keeps it on the surface.
	 * Held or in the air it turns around its center instead, so there is nothing to lift. Free, it
	 * follows every frame with no transition, so it eases there itself rather than jumping.
	 */
	let lift = $state(0);
	let enabled = $state(false);

	/** The buddy is positioned inside its offset parent, so everything is measured from there. */
	function origin(): Point {
		const r = root?.offsetParent?.getBoundingClientRect();
		return r ? { x: r.left + scrollX, y: r.top + scrollY } : { x: 0, y: 0 };
	}
	function view(): View {
		return { top: scrollY - origin().y, height: innerHeight, inset: NAV_HEIGHT };
	}
	function span(): Span {
		const left = scrollX - origin().x;
		return { left, right: left + document.documentElement.clientWidth };
	}
	function painted(cs: CSSStyleDeclaration): boolean {
		return (
			cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
			cs.backgroundImage !== 'none' ||
			cs.boxShadow !== 'none' ||
			parseFloat(cs.borderTopWidth) > 0
		);
	}
	const insets = new WeakMap<Element, number>();
	/**
	 * How far below its box the visible top of an element is. A painted box shows its own edge; bare
	 * text only starts at its cap height, below the padding and half the line's leading.
	 */
	function topInset(el: Element): number {
		let inset = insets.get(el);
		if (inset !== undefined) return inset;
		const cs = getComputedStyle(el);
		inset = 0;
		if (!painted(cs) && el.matches(TEXT)) {
			const font = parseFloat(cs.fontSize);
			const line = cs.lineHeight === 'normal' ? font * 1.2 : parseFloat(cs.lineHeight);
			inset = parseFloat(cs.paddingTop) + Math.max(0, (line - font) / 2) + font * 0.2;
		}
		insets.set(el, inset);
		return inset;
	}
	function boxOf(el: Element, o = origin()): Box | null {
		if (!el.isConnected) return null;
		const r = el.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) return null;
		const inset = topInset(el);
		return {
			left: r.left + scrollX - o.x,
			top: r.top + scrollY - o.y + inset,
			width: r.width,
			height: r.height - inset
		};
	}
	/** Whether there is room above `box` at page column `px` for it to stand without covering anything. */
	function clearAbove(el: Element, box: Box, px: number, o = origin()): boolean {
		const tall = size * 1.6;
		const cx = Math.min(innerWidth - 1, Math.max(1, px + o.x - scrollX));
		for (const k of HEADROOM_PROBES) {
			const cy = box.top + o.y - scrollY - k * tall;
			if (cy < 0 || cy >= innerHeight) continue;
			const hit = document.elementFromPoint(cx, cy);
			if (!hit) continue;
			const own = hit === el || el.contains(hit);
			const words = [...hit.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
			const reads = hit.closest(TEXT);
			const blocked = blocksHeadroom({
				own,
				ancestor: hit.contains(el),
				ignored: !!hit.closest('.buddy, nav'),
				text: words || (!!reads && !reads.contains(el)),
				media: !!hit.closest(MEDIA),
				painted: !own && painted(getComputedStyle(hit))
			});
			if (blocked) return false;
		}
		return true;
	}
	/** Surfaces near the screen whose top edge is really there to stand on, not under something. */
	function surfaces(margin = 0): Surface[] {
		const o = origin();
		const v = view();
		const found: Surface[] = [];
		for (const el of document.querySelectorAll(SURFACES)) {
			// Not yet faded in: standing on it would look like standing on air.
			if (el.closest('.buddy, nav, .reveal:not(.in)')) continue;
			const box = boxOf(el, o);
			if (!box || box.width < 28 || box.height < 10) continue;
			if (box.top < v.top + v.inset + 60 - margin || box.top > v.top + v.height - 30 + margin)
				continue;
			const cx = box.left + box.width / 2 + o.x - scrollX;
			const cy = box.top + o.y - scrollY + 2;
			const hit = cy >= 0 && cy < innerHeight ? document.elementFromPoint(cx, cy) : el;
			if (hit && hit !== el && !el.contains(hit) && !hit.closest('.buddy')) continue;
			// Standing there would put it over the line above, or a picture, or another card.
			const across = [0.5, 0.25, 0.75].map((f) => box.left + box.width * f);
			if (!across.every((px) => clearAbove(el, box, px, o))) continue;
			found.push({ el, box });
		}
		return found;
	}

	/**
	 * Squashes start from wherever the last one left off and end at rest, so none of them snap.
	 * They animate `scale`, which composes with the flight stretch on `transform` instead of
	 * replacing it.
	 */
	function squash(keyframes: Keyframe[], duration: number) {
		if (!body) return;
		const from = getComputedStyle(body).scale;
		for (const a of body.getAnimations()) a.cancel();
		// Eased per step rather than overall: one overshooting curve across all of them crams the
		// first beats into a frame or two.
		const steps = [{ scale: from === 'none' ? '1 1' : from }, ...keyframes];
		body.animate(
			steps.map((k) => ({ easing: 'ease-in-out', ...k })),
			duration
		);
	}
	const takeOff = () =>
		squash(
			[{ scale: '1.14 0.8', offset: 0.3 }, { scale: '0.92 1.1', offset: 0.65 }, { scale: '1 1' }],
			300
		);
	const touchDown = () =>
		squash(
			[{ scale: '1.2 0.76', offset: 0.12 }, { scale: '0.96 1.05', offset: 0.6 }, { scale: '1 1' }],
			380
		);

	function stand(el: Element, now: number) {
		if (el !== surface) surfaceLeft = null;
		surface = el;
		mode = 'stand';
		walking = false;
		free = false;
		rotation = 0;
		settledAt = now;
		// Long enough for the landing squash to finish before it is off again.
		thinkAt = now + 700 + Math.random() * 1300;
	}

	function hopTo(target: Surface, now: number, from: Point = { x, y }, pace = 1) {
		const dx = standX(target.box, x + (Math.random() - 0.5) * 160, 12) - target.box.left;
		const to = { x: target.box.left + dx, y: target.box.top };
		const duration = hopDuration(from, to) * pace;
		jump = { from, el: target.el, dx, t0: now, duration };
		mode = 'hop';
		walking = false;
		surface = null;
		free = false;
		// Straighten up from any tilt while in the air instead of keeping it all the way.
		rotation = 0;
		mood = 'happy';
		takeOff();
	}

	function startFall(vx: number, vy: number, now: number, spin = vx * 0.6) {
		mode = 'fly';
		walking = false;
		free = true;
		surface = null;
		dropView = null;
		flight = { x, y, vx, vy, angle: rotation, spin };
		skid = null;
		streak = { x: vx, y: vy };
		fastest = Math.hypot(vx, vy);
		flyFloor = surfaces(FLOOR_MARGIN);
		flyRefresh = now;
	}

	/** Out of sight for a while; every position jump happens in here, where nobody sees it. */
	function goAway(side: Exit, cause: AwayCause, now: number) {
		mode = 'away';
		exit = side;
		awayCause = cause;
		returnAt = now + absence(cause);
		pos = null;
		surface = null;
		surfaceLeft = null;
		jump = null;
		peek = null;
		dropView = null;
		walking = false;
		free = false;
		rising = false;
		riseAt = 0;
		poseUntil = 0;
		rotation = 0;
		streak = { x: 0, y: 0 };
		shape = 'none';
		mood = 'idle';
	}

	/** Back onto a surface on screen, starting from just past the edge it comes in over. */
	function enter(now: number) {
		const v = view();
		const s = span();
		const options = surfaces().filter((o) => onScreen(o.box, v));
		let entrance = pickEntrance(exit, Math.random, awayCause === 'scrolled');
		const i = pickEntryTarget(
			entrance,
			options.map((o) => o.box),
			v,
			s
		);
		if (i < 0) {
			returnAt = now + 800;
			return;
		}
		// Nothing low enough to leap onto from the bottom edge: a leap up most of the screen looks
		// like a rocket, so it hops in over the nearer side instead.
		const box = options[i].box;
		if (entrance === 'below' && box.top < v.top + v.height - PEEK_REACH) {
			entrance =
				box.left + box.width / 2 - s.left < s.right - box.left - box.width / 2 ? 'left' : 'right';
		}
		const start = entryStart(entrance, box, v, s, figure().height);
		x = start.x;
		y = start.y;
		rotation = 0;
		free = false;
		if (entrance === 'left' || entrance === 'right') return hopTo(options[i], now, start);
		if (entrance === 'above') {
			// A real fall, so it lands on whatever is under it first and bounces like any other.
			startFall(0, 0, now, 0);
			dropView = v.top;
			mood = 'surprised';
			return;
		}
		mood = 'curious';
		peek = { el: options[i].el, t0: now };
		mode = 'enter';
	}

	/** The reader scrolled its surface away: hop after them if it is still in sight, else catch up. */
	function followReader(now: number) {
		const v = view();
		const gone = offScreen({ x, y }, v, figure().height);
		if (gone) return goAway(gone, 'scrolled', now);
		const options = surfaces().filter((s) => onScreen(s.box, v));
		if (!options.length) return;
		const near = (b: Box) => Math.hypot(standX(b, x) - x, b.top - y);
		options.sort((a, b) => near(a.box) - near(b.box));
		hopTo(options[Math.floor(Math.random() * Math.min(2, options.length))], now);
	}

	/** A peek up from the bottom edge, then a leap onto its surface. */
	function peeking(now: number) {
		if (!peek) return;
		const box = boxOf(peek.el);
		if (!box) return startFall(0, 0, now);
		const t = now - peek.t0;
		// The peek follows the bottom edge, so a reader scrolling meanwhile does not shake it loose.
		const v = view();
		const hidden = v.top + v.height + figure().height + 10;
		const shown = v.top + v.height + size * 0.5;
		const k = Math.min(1, t / PEEK_RISE);
		y = hidden + (shown - hidden) * (1 - (1 - k) ** 3);
		if (t < PEEK_RISE + PEEK_LOOK) return;
		const el = peek.el;
		peek = null;
		hopTo({ el, box }, now, { x, y }, PEEK_LEAP);
	}

	function think(now: number) {
		const box = surface && boxOf(surface);
		if (!box) return startFall(0, 0, now);
		const roll = Math.random();
		if (roll < 0.5) {
			// A stroll, sometimes right off the edge to see what is below.
			walkOff = Math.random() < 0.18;
			if (walkOff) {
				const right = x - box.left > box.width / 2 ? Math.random() < 0.7 : Math.random() < 0.3;
				walkTo = right ? box.left + box.width + 6 : box.left - 6;
			} else {
				walkTo = standX(box, x + (Math.random() * 2 - 1) * STROLL, 12);
				if (Math.abs(walkTo - x) < 30) walkTo = standX(box, x + (walkTo < x ? -90 : 90), 12);
			}
			// Something hanging over part of the surface, like a heading: it stops short of it.
			const dir = Math.sign(walkTo - x);
			const o = origin();
			for (let px = x + dir * 24; dir && dir * (walkTo - px) > -24; px += dir * 24) {
				const at = dir > 0 ? Math.min(px, walkTo) : Math.max(px, walkTo);
				const column = Math.min(box.left + box.width, Math.max(box.left, at));
				if (clearAbove(surface!, box, column, o)) continue;
				walkTo = px - dir * 30;
				walkOff = false;
				break;
			}
			if (Math.abs(walkTo - x) < 30) return pose(now);
			// No mood change here: entering one hops or wobbles the whole figure, which on top of
			// the leg cycle reads as tripping.
			mode = 'walk';
			walking = true;
			return;
		}
		if (roll < 0.82) {
			const options = surfaces();
			const i = pickHop(
				{ x, y },
				options.map((s) => s.box)
			);
			if (i >= 0) return hopTo(options[i], now);
		}
		pose(now);
	}

	/** Stop for a moment: look around, wave, wonder. */
	function pose(now: number) {
		mood = POSES[Math.floor(Math.random() * POSES.length)];
		poseUntil = now + 1400 + Math.random() * 1800;
		thinkAt = poseUntil + 200;
	}

	let frame = 0;
	let last = 0;
	function tick(now: number) {
		// Physics runs in fixed substeps, so only a stalled tab needs capping, not a slow frame.
		const dt = Math.min(0.1, (now - last) / 1000 || 0);
		last = now;
		frame = requestAnimationFrame(tick);
		if (mode === 'away') {
			if (now > returnAt && now - lastScroll > SCROLL_REST) enter(now);
			if (mode !== 'away') pos = { x, y };
			return;
		}
		if (!pos && mode !== 'hop' && mode !== 'fly') return;
		const v = view();
		if (mode === 'stand' || mode === 'walk') {
			const box = surface && boxOf(surface);
			if (!box) return startFall(0, 0, now);
			y = box.top;
			// Moved by a resize or a layout shift: carry it along instead of leaving it behind.
			if (surfaceLeft !== null) {
				x += box.left - surfaceLeft;
				walkTo += box.left - surfaceLeft;
			}
			surfaceLeft = box.left;
			// Only a reader who scrolled on, or a long stay out of sight, sends it after them.
			const left = !onScreen(box, v, 0) && now - lastScroll > SCROLL_REST;
			const follow = left && (lastScroll > settledAt || now - settledAt > 3000);
			if (follow && mode === 'walk') {
				followReader(now);
			} else if (mode === 'walk') {
				const dir = Math.sign(walkTo - x);
				x += dir * Math.min(Math.abs(walkTo - x), speed * dt);
				rotation = dir * 5;
				if (walkOff && (x < box.left || x > box.left + box.width)) {
					startFall(dir * 130, -320, now);
				} else if (Math.abs(walkTo - x) < 0.5) {
					stand(surface!, now);
				}
			} else {
				// At rest it stands upright: only a tumble it is still getting up from may tilt it.
				if (!riseAt) rotation = 0;
				// A landing near the edge or a shrinking surface pulls it back on, gently.
				x = approach(x, standX(box, x), dt, 12);
				if (riseAt && now > riseAt) {
					riseAt = 0;
					free = false;
					rising = true;
					rotation = 0;
					setTimeout(() => (rising = false), 800);
				}
				if (poseUntil && now > poseUntil) {
					poseUntil = 0;
					mood = 'idle';
				}
				if (follow) followReader(now);
				else if (!riseAt && now > thinkAt) think(now);
			}
		} else if (mode === 'hop' && jump) {
			const box = boxOf(jump.el);
			if (!box) {
				startFall(0, 0, now);
			} else {
				const to = { x: box.left + jump.dx, y: box.top };
				const t = (now - jump.t0) / jump.duration;
				({ x, y } = arc(jump.from, to, t));
				if (t >= 1) {
					touchDown();
					mood = Math.random() < 0.2 ? 'waving' : 'idle';
					stand(jump.el, now);
					jump = null;
				}
			}
		} else if (mode === 'enter') {
			peeking(now);
		} else if (mode === 'fly') {
			if (dropView !== null) {
				if (offScreen(flight, v, figure().height) === 'top')
					flight = { ...flight, y: flight.y + v.top - dropView };
				else dropView = null;
				if (dropView !== null) dropView = v.top;
			}
			if (now - flyRefresh > 200) {
				flyFloor = surfaces(FLOOR_MARGIN);
				flyRefresh = now;
			}
			const width = (root?.offsetParent as HTMLElement | null)?.clientWidth ?? innerWidth;
			const o = origin();
			// Like a ball in a box: the screen's sides and its top, under the nav, all bounce. A
			// buddy already above that line (let go up there, or the page scrolled) is never pulled
			// down to it, only kept from rising further.
			const ceiling = Math.min(v.top + v.inset + figure().height, flight.y);
			// The surface it slides along stays underfoot even once the refresh no longer lists it.
			const floor = [...flyFloor];
			const skidBox = skid && !floor.some((s) => s.el === skid) ? boxOf(skid, o) : null;
			if (skidBox) floor.push({ el: skid!, box: skidBox });
			const next = fly(
				flight,
				dt,
				// Live boxes: a surface sliding in would otherwise be caught where it was a moment ago.
				floor.map((s) => boxOf(s.el, o) ?? s.box),
				{ left: size / 2, right: width - size / 2, top: ceiling },
				skid ? floor.findIndex((s) => s.el === skid) : -1
			);
			if (next.impact) touchDown();
			skid = next.ground >= 0 ? floor[next.ground].el : null;
			flight = next.flight;
			fastest = Math.max(fastest, Math.hypot(flight.vx, flight.vy));
			rotation = flight.angle;
			x = flight.x;
			y = flight.y;
			if (next.landed >= 0) {
				mood = fastest > 2600 ? 'grumpy' : fastest > 900 ? 'laughing' : 'surprised';
				const tumble = unwind(rotation);
				stand(floor[next.landed].el, now);
				// It lands with whatever tilt it had, without easing, then gets up from there: lying
				// down for a while after a real tumble, straight away from a slight lean.
				rotation = tumble;
				free = true;
				riseAt = now + (Math.abs(tumble) > 20 ? 1100 + Math.random() * 600 : 120);
				poseUntil = Math.max(now + 1600, riseAt + 500);
				thinkAt = poseUntil + 400;
			} else if (y > v.top + v.height + 150) {
				goAway('bottom', 'fell', now);
				return;
			}
		} else if (mode === 'held' && grip) {
			// The hand's acceleration from the smoothed velocity: raw pointer steps would kick the
			// swing at every uneven event.
			const hand = throwVelocity(samples, now);
			const accel = dt > 0 ? { x: (hand.x - handV.x) / dt, y: (hand.y - handV.y) / dt } : hand;
			handV = hand;
			const a = Math.hypot(accel.x, accel.y);
			const k = a > 40000 ? 40000 / a : 1;
			swing = dangle(swing, grab, { x: accel.x * k, y: accel.y * k }, dt, figure().gyration);
			hang();
		}
		// Out of the air the stretch relaxes over the landing squash instead of vanishing in a frame.
		const ease = 1 - Math.exp(-dt / 0.06);
		const aim = mode === 'fly' ? flight : { vx: 0, vy: 0 };
		// A stroll is too slow to stretch; only the bob and lean show it walking.
		if (mode === 'walk') streak = { x: 0, y: 0 };
		streak.x += (aim.vx - streak.x) * ease;
		streak.y += (aim.vy - streak.y) * ease;
		shape = stretch(streak.x, streak.y, { x: 0, y: -figure().center });
		const lying = size * 0.27 * Math.abs(Math.sin((rotation * Math.PI) / 180));
		// Sliding on its side it lies on the surface; only in the air does it turn around its center.
		const target = mode === 'held' || (mode === 'fly' && !skid) ? 0 : lying;
		lift = free ? lift + (target - lift) * (1 - Math.exp(-dt / 0.08)) : target;
		if (mode !== 'held') pos = { x, y };
	}
	// Grab and throw. The drag only starts after a few pixels, so a plain tap still boops.
	let press: { id: number; x: number; y: number; grab: Point } | null = null;
	let samples: (Point & { t: number })[] = [];
	/** Where the pointer holds it now, and the grab point seen from its center, upright. */
	let grip: Point | null = null;
	let grab: Point = { x: 0, y: 0 };
	let swing: Swing = { angle: 0, spin: 0 };
	let handV: Point = { x: 0, y: 0 };

	/** The figure's size: how far its center sits above its feet, and its radius of gyration. */
	function figure() {
		const w = body?.offsetWidth ?? size;
		const h = body?.offsetHeight ?? size * 1.5;
		return { height: h, center: h * (0.5 - FEET), gyration: Math.sqrt((w * w + h * h) / 12) };
	}
	function pointerAt(e: PointerEvent): Point {
		const o = origin();
		return { x: e.pageX - o.x, y: e.pageY - o.y };
	}
	/** Keeps the grab point under the pointer while the body turns around its center. */
	function hang() {
		if (!grip) return;
		rotation = swing.angle;
		const r = rotate(grab, swing.angle);
		x = grip.x - r.x;
		y = grip.y - r.y + figure().center;
		pos = { x, y };
	}
	function onPress(e: PointerEvent) {
		if (!pos || e.button > 0) return;
		const p = pointerAt(e);
		// Measured on the figure as drawn, tilt and lift included, so picking it up doesn't jump.
		const center = { x, y: y - figure().center + lift };
		const grab = rotate({ x: p.x - center.x, y: p.y - center.y }, -rotation);
		press = { id: e.pointerId, x: e.clientX, y: e.clientY, grab };
		addEventListener('pointermove', onDrag);
		addEventListener('pointerup', onRelease);
		addEventListener('pointercancel', onRelease);
	}
	function sample(e: PointerEvent) {
		// Coalesced events carry the moves between frames, which the velocity fit is glad of.
		const events = e.getCoalescedEvents?.() ?? [];
		for (const c of events.length ? events : [e]) {
			samples.push({ ...pointerAt(c), t: c.timeStamp });
		}
		const t = e.timeStamp;
		samples = samples.filter((s) => t - s.t < 150);
		grip = pointerAt(e);
	}
	function onDrag(e: PointerEvent) {
		if (!press || e.pointerId !== press.id) return;
		if (!held) {
			if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return;
			mode = 'held';
			held = true;
			free = true;
			riseAt = 0;
			walking = false;
			surface = null;
			jump = null;
			peek = null;
			dropView = null;
			mood = 'surprised';
			poseUntil = 0;
			samples = [];
			grab = press.grab;
			swing = { angle: rotation, spin: 0 };
			handV = { x: 0, y: 0 };
		}
		e.preventDefault();
		sample(e);
		hang();
	}
	function onRelease(e: PointerEvent) {
		if (!press || e.pointerId !== press.id) return;
		press = null;
		removeEventListener('pointermove', onDrag);
		removeEventListener('pointerup', onRelease);
		removeEventListener('pointercancel', onRelease);
		if (!held) return;
		held = false;
		riseAt = 0;
		// The release would also land as a click, and a throw isn't a boop.
		addEventListener('click', swallowClick, { capture: true, once: true });
		setTimeout(() => removeEventListener('click', swallowClick, true), 100);
		if (e.type === 'pointerup') sample(e);
		hang();
		grip = null;
		const out = letGo(swing, grab, throwVelocity(samples, e.timeStamp));
		startFall(out.vx, out.vy, performance.now(), out.spin);
	}
	function swallowClick(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
	}
	function onBoop() {
		if ((mode !== 'stand' && mode !== 'walk') || riseAt) return;
		const options = surfaces();
		const i = pickHop(
			{ x, y },
			options.map((s) => s.box)
		);
		if (i < 0) return;
		// Its own next idea would otherwise cut in before the hop.
		thinkAt = Math.max(thinkAt, performance.now() + 600);
		setTimeout(() => {
			if (mode === 'stand' || mode === 'walk') hopTo(options[i], performance.now());
		}, 250);
	}

	// The visitor's own studio design lives on the page instead of the stock bob, once there is one.
	let design = $state<StudioConfig | null>(null);
	const dressed = $derived(
		design
			? {
					species: design.species,
					proportions: design.proportions,
					theme: themeProp(design),
					shape: design.shape,
					eyes: design.eyes,
					accessories: design.accessories,
					outfit: design.outfit,
					shoes: design.shoes,
					heldItem: design.heldItem
				}
			: {}
	);

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		design = savedDesign();
		enabled = true;
		const onScroll = () => (lastScroll = performance.now());
		addEventListener('scroll', onScroll, { passive: true });
		// Give the page a moment to settle before it shows up.
		returnAt = performance.now() + 1200;
		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			removeEventListener('scroll', onScroll);
			removeEventListener('pointermove', onDrag);
			removeEventListener('pointerup', onRelease);
			removeEventListener('pointercancel', onRelease);
		};
	});
</script>

{#if enabled}
	<div
		class="buddy"
		class:hidden={!pos}
		bind:this={root}
		style:transform={pos ? `translate(${pos.x}px, ${pos.y}px)` : undefined}
	>
		<!-- Dragging is a pointer extra; keyboard users boop the mascot's own button instead. -->
		<div
			class="body"
			role="presentation"
			class:held
			bind:this={body}
			style:transform={shape}
			style:--feet="{FEET * 100}%"
			onpointerdown={onPress}
		>
			<div
				class="gait"
				class:walking
				class:free
				class:rising
				style:rotate="{rotation}deg"
				style:translate="0 {lift}px"
			>
				<Mascot
					{...dressed}
					{mood}
					{size}
					{reactions}
					float={false}
					effects={false}
					lookAt="pointer"
					label="bob living on the page, drag to throw"
					onboop={onBoop}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.buddy {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 45;
		pointer-events: none;
	}
	.buddy.hidden {
		visibility: hidden;
	}
	/* Squashes pivot on the feet, which sit on the point the outer box is moved to. */
	.body {
		translate: -50% calc(-100% + var(--feet));
		transform-origin: 50% calc(100% - var(--feet));
		pointer-events: auto;
		touch-action: none;
		cursor: grab;
	}
	.body.held {
		cursor: grabbing;
	}
	.gait {
		transition:
			rotate 0.25s,
			translate 0.25s;
	}
	.gait.free {
		transition: none;
	}
	.gait.walking {
		animation: step 0.3s ease-in-out infinite alternate;
	}
	@keyframes step {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-3px);
		}
	}
	/* Getting back up after a tumble is slow, with a little wobble at the end. */
	.gait.rising {
		transition:
			rotate 0.75s cubic-bezier(0.3, 1.3, 0.5, 1),
			translate 0.75s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
</style>

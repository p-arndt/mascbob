import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CircleDetector,
	DEFAULT_REACTIONS,
	FOLLOW_TILT,
	FlickDetector,
	IDLE_TIMING,
	PetDetector,
	REACTIONS,
	REACTION_TIMING,
	ReactionController,
	TickleCounter,
	glanceInterval,
	pickFidget,
	resolveReactions,
	type IdleCue,
	type PointerSample,
	type ReactionEvent,
	type ReactionHost,
	type ReactionState
} from './interaction.js';

describe('resolveReactions', () => {
	const enabled = (flags: Record<string, boolean>) => REACTIONS.filter((r) => flags[r]);

	it('enables the defaults for true or undefined', () => {
		expect(enabled(resolveReactions(true))).toEqual([...DEFAULT_REACTIONS]);
		expect(enabled(resolveReactions(undefined))).toEqual([...DEFAULT_REACTIONS]);
	});

	it('disables everything for false', () => {
		expect(enabled(resolveReactions(false))).toEqual([]);
	});

	it('enables exactly the listed reactions', () => {
		expect(enabled(resolveReactions(['shy', 'pet']))).toEqual(['pet', 'shy']);
	});

	it('toggles individual reactions on top of the defaults', () => {
		const flags = resolveReactions({ shy: true, bored: false });
		expect(flags.shy).toBe(true);
		expect(flags.bored).toBe(false);
		expect(flags.pet).toBe(true);
	});
});

/** Moves back and forth between `from` and `to`, one sample every 16 ms at `speed` units/ms. */
function strokes(detector: PetDetector, from: number, to: number, count: number, speed = 0.15) {
	let t = 0;
	let x = from;
	let completed = 0;
	detector.move(x, t);
	for (let i = 0; i < count; i++) {
		const target = i % 2 === 0 ? to : from;
		const step = Math.sign(target - x) * speed * 16;
		while (Math.abs(target - x) > Math.abs(step)) {
			x += step;
			t += 16;
			if (detector.move(x, t)) completed++;
		}
		x = target;
		t += 16;
		if (detector.move(x, t)) completed++;
	}
	return { completed, t, x };
}

describe('PetDetector', () => {
	it('counts one stroke per direction change', () => {
		const pet = new PetDetector();
		// The last sweep has no reversal after it yet.
		expect(strokes(pet, 70, 130, 5).completed).toBe(4);
		expect(pet.strokes).toBe(4);
	});

	it('ignores wiggles shorter than a stroke', () => {
		const pet = new PetDetector();
		expect(strokes(pet, 100, 108, 8).completed).toBe(0);
	});

	it('ignores jitter against the stroke direction', () => {
		const pet = new PetDetector();
		let t = 0;
		const xs = [60, 70, 80, 78, 90, 100, 110, 99, 90, 80, 70];
		let completed = 0;
		for (const x of xs) if (pet.move(x, (t += 16))) completed++;
		expect(completed).toBe(1);
	});

	it('treats a fast swipe as no petting', () => {
		const pet = new PetDetector();
		expect(strokes(pet, 60, 140, 6, 2).completed).toBe(0);
	});

	it('starts over after a pause between strokes', () => {
		const pet = new PetDetector();
		const { t, x } = strokes(pet, 70, 130, 3);
		expect(pet.strokes).toBe(2);
		pet.move(x + 1, t + pet.options.gap + 100);
		expect(pet.strokes).toBe(0);
	});
});

/** Circles around the origin in `steps` samples per turn. */
function circle(detector: CircleDetector, turns: number, radius = 100, dir = 1, steps = 24) {
	let result: number = 0;
	for (let i = 0; i <= turns * steps; i++) {
		const a = (i / steps) * Math.PI * 2 * dir;
		const hit = detector.move(Math.cos(a) * radius, Math.sin(a) * radius, i * 16);
		if (hit) result = hit;
	}
	return result;
}

describe('CircleDetector', () => {
	it('fires after two full turns in either direction', () => {
		expect(circle(new CircleDetector(), 2.05)).toBe(1);
		expect(circle(new CircleDetector(), 2.05, 100, -1)).toBe(-1);
	});

	it('does not fire short of two turns', () => {
		const detector = new CircleDetector();
		expect(circle(detector, 1.8)).toBe(0);
		expect(detector.swept).toBeGreaterThan(1.7 * Math.PI * 2);
	});

	it('does not count circles too close to the center', () => {
		expect(circle(new CircleDetector(), 3, 10)).toBe(0);
	});

	it('does not accumulate back-and-forth arcs', () => {
		const detector = new CircleDetector();
		for (let i = 0; i < 200; i++) {
			const a = Math.sin(i / 5) * 2;
			detector.move(Math.cos(a) * 100, Math.sin(a) * 100, i * 16);
		}
		expect(Math.abs(detector.swept)).toBeLessThan(Math.PI * 2);
	});

	it('starts over after a pause', () => {
		const detector = new CircleDetector();
		circle(detector, 1.5);
		detector.move(100, 0, 10_000);
		expect(detector.swept).toBe(0);
	});
});

describe('FlickDetector', () => {
	const run = (detector: FlickDetector, pxPerMs: number, from = 0) => {
		let fired = 0;
		for (let i = 0; i < 6; i++) {
			const speed = detector.move(i * 16 * pxPerMs, 0, from + i * 16);
			if (speed) fired = speed;
		}
		return fired;
	};

	it('ignores ordinary pointer movement', () => {
		expect(run(new FlickDetector(), 1)).toBe(0);
	});

	it('fires on a fast flick and reports the speed', () => {
		expect(run(new FlickDetector(), 6)).toBeGreaterThan(4);
	});

	it('waits for the cooldown before firing again', () => {
		const detector = new FlickDetector();
		expect(run(detector, 6)).toBeGreaterThan(0);
		expect(run(detector, 6, 500)).toBe(0);
		expect(run(detector, 6, 3000)).toBeGreaterThan(0);
	});

	it('does not fire on one jumpy sample', () => {
		const detector = new FlickDetector();
		detector.move(0, 0, 0);
		detector.move(1, 0, 16);
		expect(detector.move(80, 0, 32)).toBe(0);
	});
});

describe('TickleCounter', () => {
	it('giggles after a few rapid boops and turns grumpy after a barrage', () => {
		const tickle = new TickleCounter();
		const levels = Array.from({ length: 9 }, (_, i) => tickle.boop(i * 150)?.level ?? null);
		expect(levels).toEqual([null, null, null, 'giggle', null, null, null, null, 'grumpy']);
	});

	it('forgets slow boops', () => {
		const tickle = new TickleCounter();
		const levels = Array.from({ length: 10 }, (_, i) => tickle.boop(i * 1000));
		expect(levels.every((l) => l === null)).toBe(true);
	});
});

describe('ReactionController', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function setup(
		input: Parameters<typeof resolveReactions>[0] = true,
		mood = 'idle' as const,
		reduced = false
	) {
		const shown: (ReactionState | null)[] = [];
		const events: ReactionEvent[] = [];
		const cues: IdleCue[] = [];
		const host: ReactionHost = {
			show: (s) => shown.push(s),
			lean: vi.fn(),
			look: vi.fn(),
			jump: vi.fn(),
			wobble: vi.fn(),
			emit: (e) => events.push(e),
			idle: (c) => cues.push(c),
			now: () => Date.now(),
			random: () => 0.5
		};
		const controller = new ReactionController(host);
		controller.configure(resolveReactions(input), reduced, mood, {
			viewHeight: 300,
			head: { top: 36, bottom: 172, halfWidth: 48 }
		});
		controller.setRunning(true);
		const sample: PointerSample = { x: 0, y: 0, scale: 0.8, t: 0, hovering: true, pressed: false };
		const at = (x: number, y: number) => {
			sample.x = x;
			sample.y = y;
			sample.t = Date.now();
			controller.pointer(sample);
			vi.advanceTimersByTime(16);
		};
		return { controller, host, shown, events, cues, at };
	}

	const pet = (at: (x: number, y: number) => void, sweeps: number) => {
		for (let i = 0; i < sweeps; i++) {
			for (let k = 0; k <= 10; k++) at(i % 2 ? 130 - k * 6 : 70 + k * 6, 80);
		}
	};

	it('gets content while petted and shows hearts after enough strokes', () => {
		const { shown, events, at } = setup();
		pet(at, 4);
		expect(shown.at(-1)).toEqual({ name: 'pet', mood: 'happy' });
		pet(at, 4);
		expect(shown.at(-1)).toEqual({ name: 'pet', mood: 'love' });
		expect(events).toContainEqual({ type: 'pet', strokes: REACTION_TIMING.strokesPerHearts });
		vi.advanceTimersByTime(REACTION_TIMING.hearts + 1000);
		expect(shown.at(-1)).toBeNull();
	});

	it('ignores petting when the reaction is disabled', () => {
		const { shown, at } = setup({ pet: false });
		pet(at, 8);
		expect(shown).toEqual([]);
	});

	it('gets dizzy when circled and rolls its eyes', () => {
		const { shown, events, host, at } = setup();
		for (let i = 0; i <= 2.1 * 24; i++) {
			const a = (i / 24) * Math.PI * 2;
			at(100 + Math.cos(a) * 120, 150 + Math.sin(a) * 120);
		}
		expect(events).toContainEqual({ type: 'dizzy', direction: 1 });
		expect(shown.at(-1)).toEqual({ name: 'dizzy', mood: 'surprised' });
		vi.advanceTimersByTime(200);
		expect(host.look).toHaveBeenCalled();
	});

	it('dozes off after resting while idle and wakes on movement', () => {
		const { shown, events, at } = setup();
		at(300, 300);
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter + 100);
		expect(shown.at(-1)).toEqual({ name: 'bored', mood: 'sleepy' });
		at(310, 300);
		expect(events.map((e) => e.type)).toEqual(['bored', 'wake']);
		vi.advanceTimersByTime(REACTION_TIMING.wake + 50);
		expect(shown.at(-1)).toBeNull();
	});

	it('stays awake when the mood is not idle', () => {
		const { shown, at } = setup(true, 'talking' as 'idle');
		at(300, 300);
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter * 2);
		expect(shown).toEqual([]);
	});

	it('startles only when opted in', () => {
		const flick = (at: (x: number, y: number) => void) => {
			for (let i = 0; i < 6; i++) at(-100 + i * 100, 150);
		};
		const off = setup();
		flick(off.at);
		expect(off.events).toEqual([]);
		const on = setup({ startle: true });
		flick(on.at);
		expect(on.events[0]?.type).toBe('startle');
		expect(on.host.jump).toHaveBeenCalled();
	});

	it('leans away when shy and toward the pointer otherwise', () => {
		const { host, events, at, shown } = setup({ shy: true });
		at(400, 150);
		expect(host.lean).toHaveBeenLastCalledWith(expect.closeTo(FOLLOW_TILT * (300 / 450), 1));
		at(110, 100);
		expect(events).toContainEqual({ type: 'shy' });
		expect(host.lean).toHaveBeenLastCalledWith(-7);
		expect(shown.at(-1)).toEqual({ name: 'shy', mood: 'shy' });
	});

	it('giggles and then sulks under rapid boops', () => {
		const { controller, shown, events } = setup();
		for (let i = 0; i < 4; i++) controller.boop(Date.now() + i * 100);
		expect(shown.at(-1)).toEqual({ name: 'tickle', mood: 'happy' });
		for (let i = 4; i < 9; i++) controller.boop(Date.now() + i * 100);
		expect(shown.at(-1)).toEqual({ name: 'tickle', mood: 'grumpy' });
		expect(events.map((e) => e.type)).toEqual(['tickle', 'tickle']);
	});

	it('drops everything on destroy', () => {
		const { controller, shown, at } = setup();
		pet(at, 4);
		controller.destroy();
		expect(shown.at(-1)).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('climbs the idle ladder from glances to fidgets, a yawn, a droop and a doze', () => {
		const { controller, cues, shown, events } = setup();
		const types = () => cues.map((c) => c.type);
		expect(controller.idleStage).toBe('attentive');
		vi.advanceTimersByTime(IDLE_TIMING.glanceAfter - 100);
		expect(cues).toEqual([]);
		vi.advanceTimersByTime(200);
		expect(types()).toEqual(['glance']);
		expect(controller.idleStage).toBe('glancing');
		vi.advanceTimersByTime(IDLE_TIMING.fidgetAfter);
		expect(types()).toContain('fidget');
		expect(types()).not.toContain('yawn');
		vi.advanceTimersByTime(IDLE_TIMING.yawnAt - IDLE_TIMING.fidgetAfter - IDLE_TIMING.glanceAfter);
		expect(types().at(-1)).toBe('yawn');
		expect(controller.idleStage).toBe('yawning');
		vi.advanceTimersByTime(IDLE_TIMING.droopAt - IDLE_TIMING.yawnAt);
		expect(types()).toContain('droop');
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter - IDLE_TIMING.droopAt);
		expect(controller.idleStage).toBe('dozing');
		expect(shown.at(-1)).toEqual({ name: 'bored', mood: 'sleepy' });
		const before = cues.length;
		vi.advanceTimersByTime(60000);
		expect(cues.length).toBe(before);
		expect(events).toEqual([{ type: 'bored' }]);
	});

	it('starts the ladder over on any interaction', () => {
		const { controller, cues, events, shown } = setup();
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter + 100);
		controller.activity();
		expect(cues.at(-1)).toEqual({ type: 'rouse' });
		expect(controller.idleStage).toBe('attentive');
		expect(events.at(-1)).toEqual({ type: 'wake' });
		expect(shown.at(-1)).toEqual({ name: 'bored', mood: 'surprised' });
		const count = cues.length;
		vi.advanceTimersByTime(IDLE_TIMING.glanceAfter - 100);
		expect(cues.length).toBe(count);
		vi.advanceTimersByTime(IDLE_TIMING.yawnAt);
		controller.boop();
		expect(cues.at(-1)).toEqual({ type: 'rouse' });
		expect(controller.idleStage).toBe('attentive');
	});

	it('keeps glancing and fidgeting but never dozes when the mood is not idle', () => {
		const { controller, cues } = setup(true, 'talking' as 'idle');
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter * 3);
		const types = new Set(cues.map((c) => c.type));
		expect(types).toEqual(new Set(['glance', 'fidget']));
		expect(controller.idleStage).not.toBe('dozing');
	});

	it('undoes a droop when the mood changes away from idle', () => {
		const { controller, cues } = setup();
		vi.advanceTimersByTime(IDLE_TIMING.droopAt + 100);
		expect(controller.idleStage).toBe('drooping');
		controller.configure(resolveReactions(true), false, 'happy', {
			viewHeight: 300,
			head: { top: 36, bottom: 172, halfWidth: 48 }
		});
		expect(cues.at(-1)).toEqual({ type: 'rouse' });
		const from = cues.length;
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter * 2);
		const after = cues.slice(from).map((c) => c.type);
		expect(after).toContain('glance');
		expect(after).not.toContain('yawn');
		expect(after).not.toContain('droop');
		expect(controller.idleStage).not.toBe('dozing');
	});

	it('schedules nothing under reduced motion', () => {
		const { cues } = setup({ bored: false }, 'idle', true);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(60000);
		expect(cues).toEqual([]);
	});

	it('still dozes under reduced motion, without the motion rungs', () => {
		const { cues, shown } = setup(true, 'idle', true);
		vi.advanceTimersByTime(REACTION_TIMING.boredAfter + 100);
		expect(cues).toEqual([]);
		expect(shown.at(-1)).toEqual({ name: 'bored', mood: 'sleepy' });
	});

	it('stops the ladder while not running', () => {
		const { controller, cues } = setup(false);
		controller.setRunning(false);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(30000);
		expect(cues).toEqual([]);
		controller.setRunning(true);
		vi.advanceTimersByTime(IDLE_TIMING.glanceAfter + 10);
		expect(cues.map((c) => c.type)).toEqual(['glance']);
	});
});

describe('pickFidget', () => {
	const sweep = (mood: string) =>
		new Set(Array.from({ length: 100 }, (_, i) => pickFidget(mood, i / 100)));

	it('keeps sad and sleepy figures on the ground', () => {
		expect(sweep('sad').has('hop')).toBe(false);
		expect(sweep('sleepy').has('hop')).toBe(false);
		expect(sweep('happy').has('hop')).toBe(true);
	});

	it('falls back to the default mix for moods it does not know', () => {
		expect(sweep('no-such-mood')).toEqual(sweep('idle'));
		expect(sweep('idle').size).toBe(6);
	});

	it('handles the ends of the random range', () => {
		expect(pickFidget('idle', 0)).toBe('shift');
		expect(pickFidget('idle', 1)).toBe('hop');
	});
});

describe('glanceInterval', () => {
	it('grows with idle time and levels off', () => {
		expect(glanceInterval(20000, 0.5)).toBeGreaterThan(glanceInterval(3000, 0.5));
		expect(glanceInterval(60000, 0.5)).toBe(glanceInterval(30000, 0.5));
	});
});

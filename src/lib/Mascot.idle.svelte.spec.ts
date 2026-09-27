import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import { REACTION_TIMING } from './interaction.js';
import type { Mood } from './types.js';

const frame = () => new Promise((r) => requestAnimationFrame(r));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The group that carries the hop and the rock of the whole figure. */
const rockGroup = (container: HTMLElement) =>
	container.querySelector('.pop g[transform^="translate(0 "]') as SVGGElement;

function hopOf(container: HTMLElement) {
	const transform = rockGroup(container).getAttribute('transform') ?? '';
	return Number(/translate\(0 (-?[\d.e-]+)\)/.exec(transform)![1]);
}

/** Vertical scale of the full figure's squash, around its soles. */
function figureSquashY(container: HTMLElement) {
	const transform =
		container.querySelector('.pop g[transform^="translate(100 "]')?.getAttribute('transform') ?? '';
	return Number(/scale\([\d.]+ ([\d.]+)\)/.exec(transform)![1]);
}

async function advance(ms: number) {
	for (let left = ms; left > 0; left -= 500) {
		vi.advanceTimersByTime(Math.min(left, 500));
		await tick();
	}
}

describe('Mascot idle ladder', () => {
	afterEach(() => vi.useRealTimers());

	const fake = () =>
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
		});

	it('dozes off without any pointer and wakes on a press', async () => {
		fake();
		const onreaction = vi.fn();
		const { container } = render(Mascot, { label: 'Buddy', motion: 'full', onreaction });
		const el = container.querySelector('.mascbob') as HTMLElement;
		await advance(REACTION_TIMING.boredAfter - 1000);
		expect(el.getAttribute('data-mood')).toBe('idle');
		await advance(1500);
		expect(onreaction).toHaveBeenCalledWith({ type: 'bored' });
		expect(el.getAttribute('data-mood')).toBe('sleepy');
		el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		await tick();
		expect(onreaction).toHaveBeenLastCalledWith({ type: 'wake' });
		expect(el.getAttribute('data-mood')).toBe('surprised');
		await advance(REACTION_TIMING.wake + 100);
		expect(el.getAttribute('data-mood')).toBe('idle');
		// Pressing counted as interaction, so the ladder starts over instead of dozing right away.
		await advance(REACTION_TIMING.boredAfter - 2000);
		expect(el.getAttribute('data-mood')).toBe('idle');
	});

	it('stays awake when not interactive, since nothing could wake it', async () => {
		fake();
		const { container } = render(Mascot, { interactive: false, motion: 'full' });
		await advance(REACTION_TIMING.boredAfter * 2);
		expect(container.querySelector('.mascbob')?.getAttribute('data-mood')).toBe('idle');
	});

	it('moves nothing under reduced motion', async () => {
		fake();
		const { container } = render(Mascot, { interactive: false, motion: 'reduced' });
		const head = container.querySelector('g.head') as SVGGElement;
		const rock = rockGroup(container).getAttribute('transform');
		const scale = head.getAttribute('transform');
		for (let i = 0; i < 12; i++) {
			await advance(5000);
			await frame();
			expect(rockGroup(container).getAttribute('transform')).toBe(rock);
			expect(head.getAttribute('transform')).toBe(scale);
		}
	});
});

describe('Mascot gestures', () => {
	it('crouches before it jumps', async () => {
		const { container, rerender } = render(Mascot, { interactive: false, motion: 'full' });
		await wait(700);
		await rerender({ mood: 'surprised' });
		const samples: { hop: number; squash: number }[] = [];
		const until = performance.now() + 400;
		while (performance.now() < until) {
			samples.push({ hop: hopOf(container), squash: figureSquashY(container) });
			await frame();
		}
		const liftoff = samples.findIndex((s) => s.hop < -0.5);
		expect(liftoff).toBeGreaterThan(0);
		const crouch = Math.min(...samples.slice(0, liftoff).map((s) => s.squash));
		expect(crouch).toBeLessThan(0.985);
		expect(samples.slice(0, liftoff).every((s) => Math.abs(s.hop) < 0.01)).toBe(true);
	});

	it('falls back to a default entry for moods without their own gesture', async () => {
		const errors: unknown[] = [];
		const onerror = (e: ErrorEvent) => errors.push(e.error);
		window.addEventListener('error', onerror);
		const { container, rerender } = render(Mascot, { motion: 'full' });
		await wait(700);
		for (const mood of ['waving', 'no-such-mood', 'laughing', 'nervous', 'sad', 'grumpy']) {
			await rerender({ mood: mood as Mood });
			await wait(120);
			expect(container.querySelector('.mascbob')?.getAttribute('data-mood')).toBe(mood);
		}
		await wait(400);
		window.removeEventListener('error', onerror);
		expect(errors).toEqual([]);
	});
});

describe('Mascot breathing', () => {
	it('lifts the head of a standing figure and swells a lone head', async () => {
		const standing = render(Mascot, { motion: 'full' });
		const lift = standing.container.querySelector('.breathe') as SVGGElement;
		expect(getComputedStyle(lift).animationName).toMatch(/breathe-lift$/);
		const alone = render(Mascot, { body: false, motion: 'full' });
		const swell = alone.container.querySelector('.breathe') as SVGGElement;
		expect(getComputedStyle(swell).animationName).toMatch(/breathe$/);
		expect(getComputedStyle(swell).animationName).not.toMatch(/lift/);
	});

	it('stops breathing under reduced motion', async () => {
		const { container } = render(Mascot, { motion: 'reduced' });
		const breathe = container.querySelector('.breathe') as SVGGElement;
		expect(getComputedStyle(breathe).animationName).toBe('none');
	});
});

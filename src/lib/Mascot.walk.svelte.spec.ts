import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const contacts = (container: HTMLElement) =>
	[...container.querySelectorAll('.foot-contact')].map((e) => ({
		cx: Number(e.getAttribute('cx')),
		opacity: Number(e.getAttribute('opacity'))
	}));

/** The leg wrappers, which swing around the hips. */
const legSwings = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-grab^="leg-"]')].map((g) => g.getAttribute('transform'));

/** Samples the foot shadows every frame for `ms`. */
async function sample(container: HTMLElement, ms: number) {
	const seen: ReturnType<typeof contacts>[] = [];
	const end = performance.now() + ms;
	while (performance.now() < end) {
		await new Promise((r) => requestAnimationFrame(r));
		seen.push(contacts(container));
	}
	return seen;
}

describe('walking', () => {
	it('lifts one foot at a time and sidesteps in the walking direction', async () => {
		const { container } = render(Mascot, { walking: 1, motion: 'full', interactive: false });
		const rest = contacts(container);
		const seen = await sample(container, 700);
		// Lifted feet fade their contact shadow; never both at once.
		expect(seen.some(([l]) => l.opacity < 0.5)).toBe(true);
		expect(seen.some(([, r]) => r.opacity < 0.5)).toBe(true);
		expect(seen.every(([l, r]) => Math.max(l.opacity, r.opacity) > 0.99)).toBe(true);
		// The planted feet hold still on the ground, so relative to the body they drift backwards.
		expect(seen.some(([l]) => l.cx < rest[0].cx - 5)).toBe(true);
	});

	it('marches on the spot with `true`', async () => {
		const { container } = render(Mascot, { walking: true, motion: 'full', interactive: false });
		const rest = contacts(container);
		const seen = await sample(container, 500);
		expect(seen.some(([l, r]) => l.opacity < 0.5 || r.opacity < 0.5)).toBe(true);
		for (const [l, r] of seen) {
			expect(l.cx).toBeCloseTo(rest[0].cx);
			expect(r.cx).toBeCloseTo(rest[1].cx);
		}
	});

	it('settles back onto both feet after it stops', async () => {
		const { container, rerender } = render(Mascot, {
			walking: -1,
			motion: 'full',
			interactive: false
		});
		const rest = contacts(container);
		const legs = legSwings(container);
		await wait(450);
		expect(legSwings(container)).not.toEqual(legs);
		await rerender({ walking: false });
		await wait(900);
		const end = contacts(container);
		expect(end[0].cx).toBeCloseTo(rest[0].cx);
		expect(end[1].cx).toBeCloseTo(rest[1].cx);
		expect(end.every((c) => c.opacity === 1)).toBe(true);
	});

	it('stays still under reduced motion', async () => {
		const { container } = render(Mascot, { walking: 1, motion: 'reduced', interactive: false });
		const legs = legSwings(container);
		const rest = contacts(container);
		await wait(400);
		expect(legSwings(container)).toEqual(legs);
		expect(contacts(container)).toEqual(rest);
	});

	it('waddles when it has no legs', async () => {
		const { container } = render(Mascot, {
			build: 'blob',
			walking: true,
			motion: 'full',
			interactive: false
		});
		// Hopping and rocking at once; the figure's own hop and wobble are idle without input.
		let rocked = false;
		const end = performance.now() + 500;
		while (performance.now() < end && !rocked) {
			await new Promise((r) => requestAnimationFrame(r));
			rocked = [...container.querySelectorAll('g[transform]')].some((g) =>
				/^translate\(0 -[1-9][\d.]*\) rotate\(-?[1-9]/.test(g.getAttribute('transform')!)
			);
		}
		expect(rocked).toBe(true);
	});
});

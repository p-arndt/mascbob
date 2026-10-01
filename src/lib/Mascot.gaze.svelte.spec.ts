import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import { SPECIES } from './species.js';

it.each(SPECIES.filter((species) => species !== 'snail'))(
	'%s leans toward a diagonal pointer outside its bounds',
	async (species) => {
		const { container } = render(Mascot, {
			species,
			size: 200,
			motion: 'full',
			float: false,
			reactions: ['follow']
		});
		const root = container.querySelector('.mascbob')!;
		const aim = container.querySelector<SVGGElement>('.head-aim')!;
		const rect = root.getBoundingClientRect();
		const move = (x: number, y: number) =>
			window.dispatchEvent(
				new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse' })
			);
		move(rect.right + 300, rect.bottom + 200);
		await expect.poll(() => aim.transform.baseVal.getItem(0).angle).toBeGreaterThan(4);
		await expect.poll(() => aim.transform.baseVal.getItem(3).matrix.d).toBeLessThan(0.99);
		expect(root.classList.contains('hovered')).toBe(false);
		move(rect.left - 300, rect.bottom + 200);
		await expect.poll(() => aim.transform.baseVal.getItem(0).angle).toBeLessThan(-4);
	}
);

it('keeps snail body and house steady while its stalks aim toward the pointer', async () => {
	const { container, rerender } = render(Mascot, {
		species: 'snail',
		lookAt: { x: 1, y: 1 },
		motion: 'full',
		float: false,
		reactions: ['follow']
	});
	const aim = container.querySelector<SVGGElement>('.head-aim')!;
	const bulb = container.querySelector<SVGEllipseElement>('.eye-bulb')!;
	await expect.poll(() => bulb.cx.baseVal.value).toBeGreaterThan(102);
	expect(aim.transform.baseVal.getItem(0).angle).toBe(0);
	expect(aim.transform.baseVal.getItem(3).matrix.d).toBe(1);
	await rerender({ lookAt: { x: -1, y: -1 } });
	await expect.poll(() => bulb.cx.baseVal.value).toBeLessThan(58);
	expect(aim.transform.baseVal.getItem(0).angle).toBe(0);
	expect(aim.transform.baseVal.getItem(3).matrix.d).toBe(1);
});

it('honours fixed gaze, none and reduced motion without requiring hover', async () => {
	const { container, rerender } = render(Mascot, {
		lookAt: { x: 1, y: 1 },
		motion: 'full',
		float: false,
		reactions: ['follow']
	});
	const aim = container.querySelector<SVGGElement>('.head-aim')!;
	await expect.poll(() => aim.transform.baseVal.getItem(0).angle).toBeGreaterThan(8);
	await rerender({ lookAt: 'none' });
	await expect.poll(() => Math.abs(aim.transform.baseVal.getItem(0).angle)).toBeLessThan(0.1);
	expect(aim.transform.baseVal.getItem(3).matrix.d).toBe(1);
	await rerender({ lookAt: { x: 1, y: 1 }, motion: 'reduced' });
	expect(aim.transform.baseVal.getItem(0).angle).toBe(0);
	expect(aim.transform.baseVal.getItem(3).matrix.d).toBe(1);
});

it('moves Critter’s whole head, not only its printed eyes', async () => {
	const { container, rerender } = render(Mascot, {
		species: 'critter',
		lookAt: { x: 1, y: 1 },
		motion: 'full',
		float: false,
		reactions: ['follow']
	});
	const aim = container.querySelector<SVGGElement>('.head-aim')!;
	await expect.poll(() => aim.transform.baseVal.getItem(0).angle).toBeGreaterThan(14);
	await expect.poll(() => aim.transform.baseVal.getItem(1).matrix.e).toBeGreaterThan(4);
	await expect.poll(() => aim.transform.baseVal.getItem(3).matrix.d).toBeLessThan(0.95);
	await rerender({ lookAt: { x: -1, y: 1 } });
	await expect.poll(() => aim.transform.baseVal.getItem(0).angle).toBeLessThan(-14);
	await expect.poll(() => aim.transform.baseVal.getItem(1).matrix.e).toBeLessThan(-4);
});

it('does not follow an outside pointer when the follow reaction is disabled', async () => {
	const { container } = render(Mascot, { motion: 'full', float: false, reactions: false });
	const aim = container.querySelector<SVGGElement>('.head-aim')!;
	// The runner's real cursor may rest over the fresh mascot, and hovering may still steer the head.
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	container.querySelector('.mascbob')!.dispatchEvent(new PointerEvent('pointerleave'));
	window.dispatchEvent(
		new PointerEvent('pointermove', { clientX: 1000, clientY: 1000, pointerType: 'mouse' })
	);
	await new Promise((resolve) => setTimeout(resolve, 250));
	expect(aim.transform.baseVal.getItem(0).angle).toBe(0);
	expect(aim.transform.baseVal.getItem(3).matrix.d).toBe(1);
});

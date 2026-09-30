import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import type { ReactionsInput } from './interaction.js';

const frame = () => new Promise((r) => setTimeout(r, 16));

function setup(reactions?: ReactionsInput) {
	const onreaction = vi.fn();
	const onboop = vi.fn();
	const { container } = render(Mascot, {
		label: 'Buddy',
		size: 200,
		motion: 'full',
		onreaction,
		onboop,
		...(reactions === undefined ? {} : { reactions })
	});
	const el = container.querySelector('.mascbob') as HTMLElement;
	const head = el.querySelector('[data-grab="head"]') as SVGGElement;
	const svg = el.querySelector('svg') as SVGSVGElement;
	/** Fires a pointer event on the head at viewBox coordinates of the full figure. */
	const at = (type: string, x: number, y: number) => {
		const rect = svg.getBoundingClientRect();
		head.dispatchEvent(
			new PointerEvent(type, {
				pointerId: 1,
				pointerType: 'mouse',
				bubbles: true,
				clientX: rect.left + (x / 200) * rect.width,
				clientY: rect.top + (y / 300) * rect.height
			})
		);
	};
	/** The head's warp around the neck, as `matrix(a b c d)` entries. */
	const warp = () => {
		const t = head.parentElement!.parentElement!.getAttribute('transform') ?? '';
		return (/matrix\(([^)]*)\)/.exec(t)?.[1] ?? '').split(' ').map(Number);
	};
	/** How far the warp shifts a spot 100 units above the neck sideways (positive: right). */
	const angle = () => -warp()[2] * 100;
	/** How much the warp stretches the head upward from the neck. */
	const stretch = () => warp()[3];
	return { el, head, at, angle, stretch, onreaction, onboop };
}

/** Grabs the top of the head and pulls it to the right. */
async function pullRight(at: (type: string, x: number, y: number) => void) {
	at('pointerdown', 100, 60);
	for (let k = 1; k <= 6; k++) {
		at('pointermove', 100 + k * 10, 60 + k * 3);
		await frame();
	}
}

describe('Mascot grab', () => {
	it('stretches the head like taffy when pulled far away from the neck', async () => {
		const { at, stretch: scaleY } = setup();
		expect(scaleY()).toBeCloseTo(1, 1);
		// The pop-in scales the whole figure, which would skew where the grab lands.
		await new Promise((r) => setTimeout(r, 700));
		at('pointerdown', 100, 60);
		for (let k = 1; k <= 8; k++) {
			at('pointermove', 100, 60 - k * 15);
			await frame();
		}
		await expect.poll(scaleY).toBeGreaterThan(1.5);
		at('pointerup', 100, -60);
		await expect.poll(scaleY, { timeout: 4000 }).toBeCloseTo(1, 1);
	});

	it('bends the head toward the pointer and springs back when let go', async () => {
		const { at, angle, stretch, onreaction } = setup();
		// The pop-in scales the whole figure, which would skew where the grab lands.
		await new Promise((r) => setTimeout(r, 700));
		await pullRight(at);
		expect(onreaction).toHaveBeenCalledWith({ type: 'grab', part: 'head' });
		await expect.poll(angle).toBeGreaterThan(30);
		// Pulled sideways, it leans sideways rather than stretching upward.
		expect(stretch()).toBeLessThan(1.1);
		at('pointerup', 160, 78);
		await expect.poll(() => Math.abs(angle()), { timeout: 4000 }).toBeLessThan(0.5);
	});

	it('does not boop on the click that ends a drag, but on the next one', async () => {
		const { el, at, onboop } = setup();
		await pullRight(at);
		at('pointerup', 160, 78);
		el.click();
		expect(onboop).not.toHaveBeenCalled();
		el.click();
		expect(onboop).toHaveBeenCalledTimes(1);
	});

	it('still boops on a press that barely moves', async () => {
		const { el, at, angle, onreaction, onboop } = setup();
		at('pointerdown', 100, 60);
		at('pointermove', 102, 61);
		await frame();
		at('pointerup', 102, 61);
		el.click();
		expect(onboop).toHaveBeenCalledTimes(1);
		expect(onreaction).not.toHaveBeenCalledWith({ type: 'grab', part: 'head' });
		expect(Math.abs(angle())).toBeLessThan(0.5);
	});

	it('leaves the head alone when grabbing is off', async () => {
		const { at, angle, onreaction } = setup({ grab: false });
		await pullRight(at);
		expect(Math.abs(angle())).toBeLessThan(0.5);
		expect(onreaction).not.toHaveBeenCalledWith({ type: 'grab', part: 'head' });
		at('pointerup', 160, 78);
	});
});

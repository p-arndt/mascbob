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
	/** Degrees the head currently bends on its neck. */
	const angle = () => {
		const turn = head.parentElement!.getAttribute('transform') ?? '';
		return Number(/rotate\(([-\d.e]+)/.exec(turn)?.[1] ?? NaN);
	};
	return { el, head, at, angle, onreaction, onboop };
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
	it('bends the head toward the pointer and springs back when let go', async () => {
		const { at, angle, onreaction } = setup();
		await pullRight(at);
		expect(onreaction).toHaveBeenCalledWith({ type: 'grab', part: 'head' });
		expect(angle()).toBeGreaterThan(15);
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

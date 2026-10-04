import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import type { GrabOptions } from './grab.js';
import type { ReactionsInput } from './interaction.js';

const frame = () => new Promise((r) => setTimeout(r, 16));

it.each(['left', 'right'])(
	'keeps an off-center %s hand grip under the pointer and springs back',
	async (side) => {
		const { container } = render(Mascot, {
			size: 200,
			motion: 'full',
			float: false,
			lookAt: 'none',
			reactions: { grab: true }
		});
		await new Promise((r) => setTimeout(r, 700));
		const arm = container.querySelector(`[data-grab="arm-${side}"]`) as SVGGElement;
		const hand = arm.querySelector('.hand') as SVGCircleElement;
		const center = () =>
			new DOMPoint(0, hand.cy.baseVal.value).matrixTransform(hand.getScreenCTM()!);
		const from = center();
		const dx = side === 'left' ? -20 : 20;
		const emit = (type: string, x: number, y: number) =>
			arm.dispatchEvent(
				new PointerEvent(type, {
					bubbles: true,
					pointerId: 9,
					pointerType: 'mouse',
					clientX: x,
					clientY: y
				})
			);
		emit('pointerdown', from.x + 3, from.y + 2);
		await new Promise((r) => setTimeout(r, 180));
		emit('pointermove', from.x + 3 + dx, from.y + 8);
		await expect
			.poll(() => Math.hypot(center().x - from.x - dx, center().y - from.y - 6))
			.toBeLessThan(2);
		emit('pointerup', from.x + 3 + dx, from.y + 8);
		await expect.poll(() => Math.abs(center().x - from.x), { timeout: 4000 }).toBeLessThan(2);
	}
);

function setup(reactions?: ReactionsInput, grab?: GrabOptions, outfit?: 'hoodie') {
	const onreaction = vi.fn();
	const onboop = vi.fn();
	const { container } = render(Mascot, {
		label: 'Buddy',
		size: 200,
		motion: 'full',
		onreaction,
		onboop,
		...(reactions === undefined ? {} : { reactions }),
		...(grab === undefined ? {} : { grab }),
		...(outfit === undefined ? {} : { outfit })
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
	/** The pulled head's pose: moved by (x, y) on its neck, tilted and scaled from its base. */
	const pose = () => {
		const t = head.parentElement!.parentElement!.getAttribute('transform') ?? '';
		const num = (re: RegExp) => (re.exec(t)?.slice(1) ?? []).map(Number);
		const [x, y] = num(/^translate\(([-\d.e]+) ([-\d.e]+)\)/);
		const [tilt] = num(/rotate\(([-\d.e]+)/);
		const [, sy] = num(/scale\(([-\d.e]+) ([-\d.e]+)\)/);
		return { x, y, tilt, sy };
	};
	/** The upper body's bend at the hips: rotation and scale of everything above the legs. */
	const bend = () => {
		const t = head.parentElement!.parentElement!.parentElement!.getAttribute('transform') ?? '';
		const [angle] = (/rotate\(([-\d.e]+)/.exec(t)?.slice(1) ?? []).map(Number);
		const [sx, sy] = (/scale\(([-\d.e]+) ([-\d.e]+)\)/.exec(t)?.slice(1) ?? []).map(Number);
		return { angle, sx, sy };
	};
	/** Degrees the whole figure, legs included, rocks on its feet. */
	const rock = () => {
		const g = el.querySelector('.stand > g');
		return Number(/rotate\(([-\d.e]+)/.exec(g?.getAttribute('transform') ?? '')?.[1] ?? NaN);
	};
	/** Degrees the head tilts into a pull (positive: right). */
	const angle = () => pose().tilt;
	const stretch = () => pose().sy;
	return { el, head, at, pose, angle, stretch, bend, rock, onreaction, onboop };
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
	it('lifts the head onto a stretching neck when pulled up, keeping its shape', async () => {
		const { el, at, pose, stretch: scaleY } = setup();
		const neck = () => el.querySelector('.neck');
		expect(scaleY()).toBeCloseTo(1, 1);
		expect(neck()).toBeNull();
		// The pop-in scales the whole figure, which would skew where the grab lands.
		await new Promise((r) => setTimeout(r, 700));
		at('pointerdown', 100, 60);
		for (let k = 1; k <= 8; k++) {
			at('pointermove', 100, 60 - k * 15);
			await frame();
		}
		await expect.poll(() => pose().y).toBeLessThan(-30);
		expect(neck()).not.toBeNull();
		// No shadow of the head is left behind on the torso once it is lifted off.
		expect(Number(el.querySelector('.head-shadow')?.getAttribute('opacity'))).toBeLessThan(0.1);
		// Only a hint of stretch: the neck takes the pull, the face keeps its shape.
		expect(scaleY()).toBeGreaterThan(1.1);
		expect(scaleY()).toBeLessThan(1.3);
		at('pointerup', 100, -60);
		await expect.poll(scaleY, { timeout: 4000 }).toBeCloseTo(1, 1);
		await expect.poll(neck, { timeout: 4000 }).toBeNull();
	});

	it('grows the neck out of the turned torso, behind it', async () => {
		const { el, at, angle } = setup();
		await new Promise((r) => setTimeout(r, 700));
		await pullRight(at);
		await expect.poll(angle).toBeGreaterThan(10);
		const neck = el.querySelector('.neck') as SVGPathElement;
		const torso = el.querySelector('clipPath[id$="-torso"]') as SVGElement;
		expect(neck.compareDocumentPosition(torso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		// The torso turns toward the pull, so the neck's root leaves the center line with it.
		const [rootX] = (/^M([-\d.e]+)/.exec(neck.getAttribute('d') ?? '')?.slice(1) ?? []).map(Number);
		expect(rootX).toBeGreaterThan(100.5);
		at('pointerup', 160, 78);
	});

	it("puts the neck through a hoodie's neck hole, in front of the torso", async () => {
		const { el, at, angle } = setup(undefined, undefined, 'hoodie');
		await new Promise((r) => setTimeout(r, 700));
		await pullRight(at);
		await expect.poll(angle).toBeGreaterThan(10);
		const neck = el.querySelector('.neck') as SVGPathElement;
		const hole = el.querySelector('.neck-hole') as SVGElement;
		const torso = el.querySelector('clipPath[id$="-torso"]') as SVGElement;
		expect(neck.compareDocumentPosition(torso) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
		expect(neck.compareDocumentPosition(hole) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
		// The yoke in front hides where the neck ends, so it can't stop short of the neckline.
		const yoke = [...el.querySelectorAll('path.hoodie')].at(-1)!;
		expect(neck.compareDocumentPosition(yoke) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		at('pointerup', 160, 78);
	});

	it('bends the head toward the pointer and springs back when let go', async () => {
		const { at, angle, stretch, pose, onreaction } = setup();
		// The pop-in scales the whole figure, which would skew where the grab lands.
		await new Promise((r) => setTimeout(r, 700));
		await pullRight(at);
		expect(onreaction).toHaveBeenCalledWith({ type: 'grab', part: 'head' });
		await expect.poll(angle).toBeGreaterThan(10);
		expect(pose().x).toBeGreaterThan(5);
		// Pulled sideways, it leans sideways rather than stretching upward.
		expect(stretch()).toBeLessThan(1.1);
		at('pointerup', 160, 78);
		await expect.poll(() => Math.abs(angle()), { timeout: 4000 }).toBeLessThan(0.5);
	});

	it('bends the upper body after a pull and rights it again on release', async () => {
		const { el, at, bend, rock } = setup();
		const lean = () => bend().angle;
		const squash = () =>
			/scale\(([-\d.e]+) ([-\d.e]+)\)/
				.exec(el.querySelector('.stand > g')?.firstElementChild?.getAttribute('transform') ?? '')
				?.slice(1)
				.map(Number) ?? [NaN, NaN];
		await new Promise((r) => setTimeout(r, 700));
		at('pointerdown', 100, 60);
		// A hand presses for a moment before it starts pulling, long enough to squash the figure.
		await new Promise((r) => setTimeout(r, 200));
		for (let k = 1; k <= 6; k++) {
			at('pointermove', 100 + k * 10, 60);
			// The lean follows the pointer across the page, as the window sees it.
			window.dispatchEvent(
				new PointerEvent('pointermove', {
					pointerId: 1,
					pointerType: 'mouse',
					clientX: el.getBoundingClientRect().left + ((100 + k * 10) / 200) * 200,
					clientY: 60
				})
			);
			await frame();
		}
		// Being held is not being pressed: the figure eases out of the press squash without
		// bouncing past its rest shape, so it doesn't jiggle just as it gets pulled.
		const widths: number[] = [];
		for (let k = 0; k < 40; k++) {
			widths.push(squash()[0]);
			await frame();
		}
		expect(Math.min(...widths)).toBeGreaterThan(0.998);
		expect(squash()[0]).toBeCloseTo(1, 2);
		await expect.poll(lean).toBeGreaterThan(1);
		// Only the upper body goes along; the legs stay planted.
		expect(Math.abs(rock())).toBeLessThan(0.5);
		at('pointerup', 160, 60);
		await expect.poll(() => Math.abs(lean()), { timeout: 4000 }).toBeLessThan(0.3);
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

	it('tunes how far the head follows and the figure leans with the grab prop', async () => {
		const stiff = setup(undefined, { follow: 0, lean: 0 });
		const lean = () => stiff.bend().angle;
		await new Promise((r) => setTimeout(r, 700));
		await pullRight(stiff.at);
		window.dispatchEvent(
			new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: 500 })
		);
		await frame();
		await frame();
		expect(stiff.onreaction).toHaveBeenCalledWith({ type: 'grab', part: 'head' });
		expect(Math.abs(stiff.pose().x)).toBeLessThan(0.5);
		expect(Math.abs(stiff.angle())).toBeLessThan(0.5);
		expect(Math.abs(lean())).toBeLessThan(0.5);
	});

	it('pulls the upper body along after the head, leaving the legs planted', async () => {
		const { el, at, bend, rock } = setup();
		await new Promise((r) => setTimeout(r, 700));
		const rect = el.getBoundingClientRect();
		const toWindow = (x: number, y: number) =>
			window.dispatchEvent(
				new PointerEvent('pointermove', {
					pointerId: 1,
					pointerType: 'mouse',
					clientX: rect.left + (x / 200) * rect.width,
					clientY: rect.top + (y / 300) * rect.height
				})
			);
		at('pointerdown', 100, 60);
		for (let k = 1; k <= 10; k++) {
			at('pointermove', 100 + k * 10, 60 - k * 10);
			toWindow(100 + k * 10, 60 - k * 10);
			await frame();
		}
		// The torso bends at the hips toward the pointer and stretches up with the head.
		await expect.poll(() => bend().angle).toBeGreaterThan(7);
		await expect.poll(() => bend().sy).toBeGreaterThan(1.05);
		expect(bend().sx).toBeLessThan(1);
		expect(Math.abs(rock())).toBeLessThan(0.5);
		at('pointerup', 200, -40);
		await expect.poll(() => Math.abs(bend().angle), { timeout: 4000 }).toBeLessThan(0.3);
		await expect.poll(() => bend().sy, { timeout: 4000 }).toBeCloseTo(1, 2);
	});
});

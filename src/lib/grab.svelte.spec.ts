import { afterEach, describe, expect, it, vi } from 'vitest';
import { drag } from './grab.js';

const NS = 'http://www.w3.org/2000/svg';
const frames = (n: number) =>
	new Promise<void>((resolve) => {
		const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
		step(n);
	});

function setup() {
	const svg = document.createElementNS(NS, 'svg');
	svg.setAttribute('viewBox', '0 0 200 200');
	svg.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px';
	const frame = document.createElementNS(NS, 'g');
	const part = document.createElementNS(NS, 'rect');
	part.setAttribute('width', '200');
	part.setAttribute('height', '200');
	frame.append(part);
	svg.append(frame);
	document.body.append(svg);
	const fire = (type: string, x: number, y: number) =>
		part.dispatchEvent(
			new PointerEvent(type, {
				pointerId: 1,
				bubbles: true,
				button: 0,
				pointerType: 'mouse',
				clientX: x,
				clientY: y
			})
		);
	const handlers = {
		frame: () => frame,
		start: vi.fn(),
		move: vi.fn(),
		end: vi.fn()
	};
	part.addEventListener('pointerdown', (e) => drag(e, handlers));
	return { svg, frame, fire, handlers };
}

describe('drag', () => {
	afterEach(() => document.querySelectorAll('svg').forEach((s) => s.remove()));

	it('treats a short press as a click, not a drag', async () => {
		const { fire, handlers } = setup();
		fire('pointerdown', 50, 50);
		fire('pointermove', 52, 51);
		fire('pointerup', 52, 51);
		await frames(2);
		expect(handlers.start).not.toHaveBeenCalled();
		expect(handlers.end).not.toHaveBeenCalled();
	});

	it('reports points in the frame and keeps re-aiming while the frame moves under a still pointer', async () => {
		const { frame, fire, handlers } = setup();
		fire('pointerdown', 50, 50);
		fire('pointermove', 80, 50);
		await frames(2);
		expect(handlers.start).toHaveBeenCalledWith({ x: 50, y: 50 });
		expect(handlers.move).toHaveBeenLastCalledWith({ x: 80, y: 50 }, { x: 50, y: 50 });
		frame.setAttribute('transform', 'translate(10 0)');
		await frames(2);
		expect(handlers.move).toHaveBeenLastCalledWith({ x: 70, y: 50 }, { x: 50, y: 50 });
		fire('pointerup', 80, 50);
		expect(handlers.end).toHaveBeenCalledOnce();
		const calls = handlers.move.mock.calls.length;
		await frames(3);
		expect(handlers.move.mock.calls.length).toBe(calls);
	});

	it('stops following when the part is removed mid-drag', async () => {
		const { svg, fire, handlers } = setup();
		fire('pointerdown', 50, 50);
		fire('pointermove', 80, 50);
		await frames(2);
		svg.remove();
		await frames(2);
		expect(handlers.end).toHaveBeenCalledOnce();
	});
});

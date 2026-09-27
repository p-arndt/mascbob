import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import { moodConfig } from './moods.js';
import { BODY_GROUND_Y, FOOT_SCALE, LEG_X } from './parts/body.js';

describe('Mascot', () => {
	it('renders as a labelled button by default', async () => {
		render(Mascot, { label: 'Buddy' });
		await expect.element(page.getByRole('button', { name: 'Buddy' })).toBeInTheDocument();
	});

	it('renders as an image when not interactive', async () => {
		render(Mascot, { label: 'Buddy', interactive: false });
		await expect.element(page.getByRole('img', { name: 'Buddy' })).toBeInTheDocument();
	});

	it('exposes the current mood', async () => {
		const { container } = render(Mascot, { mood: 'thinking' });
		expect(container.querySelector('[data-mood]')?.getAttribute('data-mood')).toBe('thinking');
	});

	it('cheers up and fires onboop when clicked', async () => {
		const onboop = vi.fn();
		render(Mascot, { mood: 'sad', onboop, label: 'Buddy' });
		const button = page.getByRole('button', { name: 'Buddy' });
		await button.click();
		expect(onboop).toHaveBeenCalledOnce();
		await expect.element(button).toHaveAttribute('data-mood', 'happy');
		await expect.element(button, { timeout: 2000 }).toHaveAttribute('data-mood', 'sad');
	});

	it('draws only the requested accessories', async () => {
		const { container } = render(Mascot, { accessories: ['antenna'] });
		expect(container.querySelector('.antenna-tip')).not.toBeNull();
		expect(container.querySelector('.halo-core')).toBeNull();
	});

	it('applies the theme as overridable custom properties', async () => {
		const { container } = render(Mascot, { theme: { base: 'ice', eye: '#123456' } });
		const style = (container.querySelector('.mascott') as HTMLElement).getAttribute('style') ?? '';
		expect(style).toContain('--_mascott-eye: #123456');
		expect(style).toContain('--_mascott-visor: #0f1b2d');
	});

	it('hides the floating hands of a head-only mascot when disabled', async () => {
		const { container } = render(Mascot, { body: false, hands: false });
		expect(container.querySelector('.skin')).toBeNull();
	});

	it('drops the mood effects when disabled', async () => {
		const on = render(Mascot, { mood: 'happy' });
		expect(on.container.querySelector('.twinkle')).not.toBeNull();
		const off = render(Mascot, { mood: 'happy', effects: false });
		expect(off.container.querySelector('.twinkle')).toBeNull();
	});

	it('sets the size', async () => {
		const { container } = render(Mascot, { size: 90 });
		expect((container.querySelector('.mascott') as HTMLElement).style.width).toBe('90px');
	});
});

function headScale(container: HTMLElement) {
	const transform = container.querySelector('g.head')?.getAttribute('transform') ?? '';
	const [x, y] = /scale\(([\d.]+) ([\d.]+)\)/.exec(transform)!.slice(1).map(Number);
	return { x, y };
}

describe('Mascot motion', () => {
	it('squashes while pressed and springs back on release', async () => {
		const { container } = render(Mascot, { label: 'Buddy', motion: 'full' });
		const button = container.querySelector('button')!;
		button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		await expect.poll(() => headScale(container).x, { timeout: 2000 }).toBeGreaterThan(1.05);
		expect(headScale(container).y).toBeLessThan(0.95);
		button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
		// The test runner's real cursor may rest on the button, which would perk it up.
		button.dispatchEvent(new PointerEvent('pointerleave'));
		await expect
			.poll(() => Math.abs(headScale(container).x - 1), { timeout: 4000 })
			.toBeLessThan(0.01);
	});

	it('keeps still under reduced motion', async () => {
		const { container } = render(Mascot, { label: 'Buddy', motion: 'reduced' });
		const button = page.getByRole('button', { name: 'Buddy' });
		button.element().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 200));
		expect(headScale(container)).toEqual({ x: 1, y: 1 });
		expect(container.querySelector('.mascott')?.classList.contains('still')).toBe(true);
	});

	it('pops in once on mount', async () => {
		const { container } = render(Mascot, { motion: 'full' });
		const pop = container.querySelector('.pop') as SVGGElement;
		expect(getComputedStyle(pop).animationName).toMatch(/pop-in$/);
		expect(getComputedStyle(pop).animationIterationCount).toBe('1');
	});

	it('paces the idle loops by playback rate so a mood change keeps their phase', async () => {
		const { container, rerender } = render(Mascot, { body: false, motion: 'full' });
		const float = container.querySelector('.float') as SVGGElement;
		const duration = getComputedStyle(float).animationDuration;
		const rate = () => float.getAnimations()[0]?.playbackRate;
		await expect.poll(rate).toBe(1);
		await rerender({ mood: 'happy' });
		await expect.poll(rate).toBeCloseTo(3.2 / moodConfig('happy').floatSpeed);
		expect(getComputedStyle(float).animationDuration).toBe(duration);
	});

	it('blinks when the mood changes', async () => {
		const { container, rerender } = render(Mascot, { body: false, motion: 'full' });
		const eye = () => container.querySelector('clipPath[id$="-eye-clip-0"] path') as SVGPathElement;
		await new Promise((r) => setTimeout(r, 700));
		await rerender({ mood: 'surprised' });
		let least = Infinity;
		const until = performance.now() + 200;
		while (performance.now() < until) {
			least = Math.min(least, eye().getBBox().height);
			await new Promise((r) => requestAnimationFrame(r));
		}
		await new Promise((r) => setTimeout(r, 600));
		expect(least).toBeLessThan(eye().getBBox().height * 0.5);
	});
});

describe('Mascot ground', () => {
	it('sizes the shadow to reach past the toes with a body', async () => {
		const { container } = render(Mascot, { shoes: 'boots' });
		const shadow = container.querySelector('ellipse.shadow') as SVGEllipseElement;
		expect(Number(shadow.getAttribute('rx'))).toBeGreaterThan(LEG_X + 33 * FOOT_SCALE);
		const contacts = [...container.querySelectorAll('ellipse.foot-contact')];
		expect(contacts).toHaveLength(2);
		const [l, r] = contacts.map((c) => Number(c.getAttribute('cx')));
		expect(l).toBeCloseTo(-r);
		expect(r).toBeGreaterThan(LEG_X);
		const ground = contacts[0].parentElement!.getAttribute('transform') ?? '';
		expect(ground).toContain(`translate(100 ${BODY_GROUND_Y + 1})`);
	});

	it('keeps the head-only shadow and its single contact', async () => {
		const { container } = render(Mascot, { body: false });
		expect(container.querySelector('ellipse.foot-contact')).toBeNull();
		expect(container.querySelector('ellipse.contact')).not.toBeNull();
		const rx = Number(container.querySelector('ellipse.shadow')!.getAttribute('rx'));
		expect(rx).toBeLessThan(LEG_X + 25 * FOOT_SCALE);
	});
});

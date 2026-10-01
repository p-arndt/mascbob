import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import { SPECIES, PROPORTION_KEYS } from './species.js';
import { MOODS } from './types.js';

describe('species', () => {
	it('includes oversized critter ears in the SVG frame', () => {
		const { container } = render(Mascot, {
			species: 'critter',
			proportions: { head: 1.8, ears: 1.8 },
			motion: 'reduced'
		});
		const svg = container.querySelector('svg')!.getBoundingClientRect();
		for (const ear of container.querySelectorAll('.ear')) {
			expect(ear.getBoundingClientRect().top).toBeGreaterThan(svg.top);
		}
	});
	it('keeps SVG dimensions finite at the enlarged proportion limits, including short legs in tall shoes', () => {
		for (const species of SPECIES)
			for (const value of [0.4, 1.8]) {
				const proportions = Object.fromEntries(PROPORTION_KEYS.map((key) => [key, value]));
				const { container } = render(Mascot, {
					species,
					proportions,
					shoes: 'rainboots',
					outfit: 'overalls',
					motion: 'reduced'
				});
				expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
				for (const rect of container.querySelectorAll('rect')) {
					expect(Number(rect.getAttribute('height'))).toBeGreaterThanOrEqual(0);
					expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(0);
				}
			}
	});
	it('keeps the critter nose clear of the mouth in every mood, including speech', async () => {
		for (const mood of MOODS) {
			const { container } = render(Mascot, {
				species: 'critter',
				mood,
				level: 1,
				motion: 'reduced',
				lookAt: { x: 1, y: -1 }
			});
			await expect
				.poll(() => {
					const nose = (container.querySelector('.ink .nose') as SVGGraphicsElement).getBBox();
					const mouth = (container.querySelector('.ink .mouth') as SVGGraphicsElement).getBBox();
					return mouth.y - (nose.y + nose.height);
				})
				.toBeGreaterThan(3);
			const muzzle = container.querySelector('.muzzle')!.getBoundingClientRect();
			const mouth = container.querySelector('.ink .mouth')!.getBoundingClientRect();
			expect(mouth.top).toBeGreaterThan(muzzle.top);
			expect(mouth.bottom).toBeLessThan(muzzle.bottom);
		}
	});
	for (const species of ['moss', 'wisp'] as const) {
		it(`${species} lets a hand be pulled independently of its silhouette`, async () => {
			const onreaction = vi.fn();
			const { container } = render(Mascot, {
				species,
				motion: 'reduced',
				onreaction,
				reactions: ['grab']
			});
			const hand = container.querySelector('[data-grab="arm-left"]') as SVGGElement;
			const before = hand.getAttribute('transform');
			const rect = hand.getBoundingClientRect();
			const send = (type: string, delta: number) =>
				hand.dispatchEvent(
					new PointerEvent(type, {
						pointerId: 1,
						pointerType: 'mouse',
						bubbles: true,
						clientX: rect.x + rect.width / 2 + delta,
						clientY: rect.y + rect.height / 2
					})
				);
			send('pointerdown', 0);
			send('pointermove', 40);
			await expect.poll(() => hand.getAttribute('transform')).not.toBe(before);
			expect(onreaction).toHaveBeenCalledWith({ type: 'grab', part: 'arm-left' });
			expect(onreaction).not.toHaveBeenCalledWith({ type: 'grab', part: 'head' });
			send('pointerup', 40);
			await expect.poll(() => hand.getAttribute('transform')).toBe(before);
		});
	}
	for (const species of SPECIES) {
		it(`${species} shares moods, boops and reduced motion`, async () => {
			const onboop = vi.fn();
			const { container } = render(Mascot, {
				species,
				motion: 'reduced',
				mood: 'curious',
				onboop,
				label: species
			});
			await expect
				.element(page.getByRole('button', { name: species }))
				.toHaveAttribute('data-species', species);
			await page.getByRole('button', { name: species }).click();
			expect(onboop).toHaveBeenCalledOnce();
			const animations = [...container.querySelectorAll('svg *')].map(
				(el) => getComputedStyle(el).animationName
			);
			expect(animations.every((name) => name === 'none')).toBe(true);
		});
	}
	it('gives octo four independent tentacles and no Bob torso', async () => {
		const { container, rerender } = render(Mascot, {
			species: 'octo',
			motion: 'reduced',
			reactions: ['grab']
		});
		expect(container.querySelectorAll('.tentacle')).toHaveLength(4);
		expect(container.querySelector('.neck')).toBeNull();
		expect(container.querySelector('.status')).toBeNull();
		const path = container.querySelector('.tentacle-skin')!;
		const resting = path.getAttribute('d');
		await rerender({ mood: 'sleepy' });
		await expect.poll(() => path.getAttribute('d')).not.toBe(resting);
	});
	for (const part of ['arm-left', 'arm-right', 'leg-left', 'leg-right'] as const) {
		it(`pulls octo's ${part} tentacle without moving its neighbours`, async () => {
			const onreaction = vi.fn();
			const { container } = render(Mascot, {
				species: 'octo',
				motion: 'reduced',
				reactions: ['grab'],
				onreaction
			});
			const limb = container.querySelector(`[data-grab="${part}"]`)!;
			const path = limb.querySelector('path')!;
			const neighbour = container.querySelector(
				`[data-grab="${part === 'arm-left' ? 'arm-right' : 'arm-left'}"] path`
			)!;
			const before = path.getAttribute('d');
			const other = neighbour.getAttribute('d');
			const rect = limb.getBoundingClientRect();
			const send = (type: string, dx: number) =>
				limb.dispatchEvent(
					new PointerEvent(type, {
						pointerId: 1,
						pointerType: 'mouse',
						bubbles: true,
						clientX: rect.x + rect.width / 2 + dx,
						clientY: rect.y + rect.height / 2
					})
				);
			send('pointerdown', 0);
			send('pointermove', 30);
			await expect.poll(() => path.getAttribute('d')).not.toBe(before);
			expect(neighbour.getAttribute('d')).toBe(other);
			expect(onreaction).toHaveBeenCalledWith({ type: 'grab', part });
			expect(onreaction).not.toHaveBeenCalledWith({ type: 'grab', part: 'head' });
			send('pointerup', 30);
			await expect.poll(() => path.getAttribute('d')).toBe(before);
		});
	}
	it('renders the species anatomy rather than a Bob torso for moss and wisp', () => {
		for (const species of ['moss', 'wisp'] as const) {
			const { container } = render(Mascot, { species, motion: 'reduced' });
			expect(container.querySelector('.neck')).toBeNull();
			expect(container.querySelector('.status')).toBeNull();
			expect(container.querySelector('[data-grab="arm-left"]')).not.toBeNull();
			expect(container.querySelector('[data-grab="leg-left"]')).toBeNull();
		}
	});
	it('keeps critter ears in avatar mode but hides tail and legs', () => {
		const { container } = render(Mascot, {
			species: 'critter',
			body: false,
			hands: false,
			motion: 'reduced'
		});
		expect(container.querySelectorAll('.ear')).toHaveLength(2);
		expect(container.querySelector('.critter-tail')).toBeNull();
		expect(container.querySelector('[data-grab="leg-left"]')).toBeNull();
	});
	it('keeps snail eyes on stalks and retracts its face independently of the house', async () => {
		const { container, rerender } = render(Mascot, {
			species: 'snail',
			motion: 'reduced',
			eyes: 'puppy'
		});
		expect(container.querySelectorAll('.eye-stalk')).toHaveLength(2);
		expect(container.querySelector('.snail-house')).not.toBeNull();
		expect(container.querySelector('.snail-foot')).not.toBeNull();
		expect(container.querySelectorAll('.stalk-grip')).toHaveLength(2);
		expect(container.querySelector('.neck')).toBeNull();
		const house = container.querySelector('.snail-house')!.getAttribute('transform');
		await rerender({ mood: 'shy' });
		await expect
			.poll(() => container.querySelector('.face-body')!.getAttribute('transform'))
			.toContain('scale(1 0.75)');
		expect(container.querySelector('.snail-house')!.getAttribute('transform')).toBe(house);
		await rerender({ body: false, mood: 'idle' });
		expect(container.querySelector('.snail-house')).toBeNull();
		expect(container.querySelector('.snail-foot')).toBeNull();
		expect(container.querySelectorAll('.eye-stalk')).toHaveLength(2);
	});
	it('adjusts snail house and eye stalks without scaling the face', async () => {
		const { container, rerender } = render(Mascot, {
			species: 'snail',
			motion: 'reduced',
			lookAt: 'none'
		});
		const bulbY = Number(container.querySelector('.eye-bulb')!.getAttribute('cy'));
		const mouth = container.querySelector('.ink .mouth')!.getAttribute('d');
		await rerender({ proportions: { body: 1.8, arms: 1.8 } });
		expect(Number(container.querySelector('.eye-bulb')!.getAttribute('cy'))).toBeLessThan(bulbY);
		expect(
			(container.querySelector('.snail-house') as SVGGElement).transform.baseVal.getItem(1).matrix.a
		).toBeCloseTo(1.15 * 1.224);
		expect(container.querySelector('.ink .mouth')!.getAttribute('d')).toBe(mouth);
	});
	it('leans snail stalks toward the gaze while their roots stay planted', async () => {
		const { container, rerender } = render(Mascot, {
			species: 'snail',
			motion: 'reduced',
			lookAt: { x: 1, y: -1 }
		});
		const bulb = container.querySelector<SVGEllipseElement>('.eye-bulb')!;
		await expect.poll(() => bulb.cx.baseVal.value).toBeGreaterThan(102);
		await expect.poll(() => bulb.cy.baseVal.value).toBeLessThan(42);
		const root = container.querySelector('.stalk-skin')!.getAttribute('d')!.split('Q')[0];
		await rerender({ lookAt: { x: -1, y: 1 } });
		await expect.poll(() => bulb.cx.baseVal.value).toBeLessThan(58);
		await expect.poll(() => bulb.cy.baseVal.value).toBeGreaterThan(78);
		expect(container.querySelector('.stalk-skin')!.getAttribute('d')!.split('Q')[0]).toBe(root);
	});
	for (const index of [0, 1]) {
		it(`pulls snail eye ${index + 1} independently, keeping ink and bulb together`, async () => {
			const onreaction = vi.fn();
			const { container } = render(Mascot, {
				species: 'snail',
				motion: 'reduced',
				lookAt: 'none',
				reactions: ['grab'],
				onreaction
			});
			const grips = container.querySelectorAll<SVGEllipseElement>('.stalk-grip');
			const grip = grips[index];
			const bulb = container.querySelectorAll<SVGEllipseElement>('.eye-bulb')[index];
			const initial = { x: grip.cx.baseVal.value, y: grip.cy.baseVal.value };
			const other = grips[1 - index].cx.baseVal.value;
			const screen = new DOMPoint(initial.x + 3, initial.y + 2).matrixTransform(
				grip.getScreenCTM()!
			);
			const send = (type: string, dx: number, dy: number) =>
				grip.dispatchEvent(
					new PointerEvent(type, {
						pointerId: 1,
						pointerType: 'mouse',
						bubbles: true,
						clientX: screen.x + dx,
						clientY: screen.y + dy
					})
				);
			send('pointerdown', 0, 0);
			send('pointermove', 20, -15);
			await expect.poll(() => grip.cx.baseVal.value).toBeGreaterThan(initial.x + 10);
			expect(grips[1 - index].cx.baseVal.value).toBe(other);
			expect(bulb.cx.baseVal.value).toBe(grip.cx.baseVal.value);
			expect(bulb.cy.baseVal.value).toBe(grip.cy.baseVal.value);
			expect(onreaction).toHaveBeenCalledWith({
				type: 'grab',
				part: index === 0 ? 'arm-left' : 'arm-right'
			});
			expect(onreaction).not.toHaveBeenCalledWith({ type: 'grab', part: 'head' });
			send('pointercancel', 20, -15);
			await expect.poll(() => grip.cx.baseVal.value).toBe(initial.x);
			expect(grip.cy.baseVal.value).toBe(initial.y);
		});
	}
});

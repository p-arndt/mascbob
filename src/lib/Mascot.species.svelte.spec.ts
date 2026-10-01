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
});

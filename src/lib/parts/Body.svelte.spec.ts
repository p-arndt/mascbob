import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';
import { BODY_VIEWBOX_HEIGHT, BUILDS, BUILD_DEFS, OUTFITS } from './body.js';
import { SHAPE_DEFS } from '../geometry.js';

describe('Body', () => {
	it('stands on plain feet by default', async () => {
		const { container } = render(Mascot);
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('viewBox')).toBe(`0 0 200 ${BODY_VIEWBOX_HEIGHT}`);
		expect(container.querySelectorAll('.leg')).toHaveLength(2);
		expect(container.querySelectorAll('.foot-plain')).toHaveLength(2);
		expect(container.querySelector('.outsole')).toBeNull();
		expect(container.querySelectorAll('.hand')).toHaveLength(2);
		expect(container.querySelector('.stand')).not.toBeNull();
		expect(container.querySelector('.float')).toBeNull();
	});

	it('wears no outfit unless one is chosen', async () => {
		const bare = render(Mascot).container;
		for (const part of [
			'.puffer',
			'.scarf',
			'.bow',
			'.hoodie',
			'.hood',
			'.rib',
			'.denim',
			'.shorts',
			'.jersey',
			'.tie',
			'.cape'
		]) {
			expect(bare.querySelector(part)).toBeNull();
		}
		const { container } = render(Mascot, { outfit: 'scarf' });
		expect(container.querySelector('.scarf')).not.toBeNull();
		expect(container.querySelector('.puffer')).toBeNull();
	});

	it.each([
		['overalls', ['.denim', '.strap', '.button']],
		['jersey', ['.jersey', '.jersey-number', '.neck-band']],
		['tie', ['.tie', '.tie-knot', '.shirt-collar']],
		['cape', ['.cape', '.clasp']]
	] as const)('dresses in %s', async (outfit, parts) => {
		const { container } = render(Mascot, { outfit });
		for (const part of parts) expect(container.querySelector(part)).not.toBeNull();
		expect(container.querySelector('.puffer')).toBeNull();
	});

	it('gives the overalls shorts on both legs and the jersey short sleeves', async () => {
		const overalls = render(Mascot, { outfit: 'overalls' }).container;
		expect(overalls.querySelectorAll('.shorts')).toHaveLength(2);
		const jersey = render(Mascot, { outfit: 'jersey' }).container;
		expect(jersey.querySelector('.arms.short')).not.toBeNull();
		expect(jersey.querySelectorAll('.sleeve-band')).toHaveLength(2);
	});

	it.each(OUTFITS)('lets the head shade the torso in %s', async (outfit) => {
		const { container } = render(Mascot, { outfit });
		const shadow = container.querySelector('.head-shadow');
		expect(shadow).not.toBeNull();
		expect(shadow?.getAttribute('clip-path')).toMatch(/-torso\)$/);
		// Painted after the outfit fabric but under the torso outline, so it falls on clothes too.
		expect(shadow?.nextElementSibling?.classList.contains('edge')).toBe(true);
		expect(container.querySelectorAll('.leg-ao')).toHaveLength(2);
	});

	it('casts the head shadow in the shape of the head', async () => {
		const { container } = render(Mascot, { shape: 'capsule' });
		const outlines = container.querySelectorAll('.head-shadow path');
		expect(outlines.length).toBeGreaterThan(1);
		for (const path of outlines) expect(path.getAttribute('d')).toBe(SHAPE_DEFS.capsule.d);
	});

	it('draws the shoulder joint under the forearm', async () => {
		const { container } = render(Mascot, { mood: 'thinking' });
		const joint = container.querySelector('.arm .joint');
		const fore = container.querySelector('.arm .fore');
		expect(joint && fore).toBeTruthy();
		expect(joint!.compareDocumentPosition(fore!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('drops the head shadow without a body', async () => {
		const { container } = render(Mascot, { body: false });
		expect(container.querySelector('.head-shadow')).toBeNull();
		expect(container.querySelector('.leg-ao')).toBeNull();
	});

	it('uses floating hands and floats without a body', async () => {
		const { container } = render(Mascot, { body: false });
		expect(container.querySelector('.leg')).toBeNull();
		expect(container.querySelectorAll('.skin')).toHaveLength(2);
		expect(container.querySelector('.float')).not.toBeNull();
	});

	it('swings the waving forearm', async () => {
		const { container } = render(Mascot, { mood: 'waving' });
		expect(container.querySelector('.fore.swing.wave')).not.toBeNull();
	});

	it.each([
		['sneakers', '.shoe-sneakers'],
		['hightops', '.shoe-hightops'],
		['boots', '.shoe-boots'],
		['slippers', '.shoe-slippers'],
		['rainboots', '.shoe-rainboots'],
		['skates', '.shoe-skates']
	] as const)('wears %s when asked', async (shoes, marker) => {
		const { container } = render(Mascot, { shoes });
		expect(container.querySelectorAll(`.foot ${marker}`)).toHaveLength(2);
		expect(container.querySelector('.foot-plain')).toBeNull();
		for (const other of [
			'.shoe-sneakers',
			'.shoe-hightops',
			'.shoe-boots',
			'.shoe-slippers',
			'.shoe-rainboots',
			'.shoe-skates'
		]) {
			if (other !== marker) expect(container.querySelector(other)).toBeNull();
		}
	});

	it('rolls the skates on two wheels each', async () => {
		const { container } = render(Mascot, { shoes: 'skates' });
		expect(container.querySelectorAll('.shoe-skates .wheel')).toHaveLength(4);
	});

	it.each(BUILDS.flatMap((build) => OUTFITS.map((outfit) => [build, outfit] as const)))(
		'dresses the %s build in %s',
		async (build, outfit) => {
			const { container } = render(Mascot, { build, outfit, shoes: 'sneakers' });
			const b = BUILD_DEFS[build];
			expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
				`0 0 200 ${b.viewHeight}`
			);
			expect(container.querySelector('.edge')).not.toBeNull();
			expect(container.querySelectorAll('.hand')).toHaveLength(2);
			expect(container.querySelectorAll('.leg')).toHaveLength(b.legs ? 2 : 0);
			if (outfit !== 'none') {
				const cls = outfit === 'overalls' ? '.denim' : outfit === 'bowtie' ? '.bow' : `.${outfit}`;
				expect(container.querySelector(cls)).not.toBeNull();
			}
		}
	);

	it('rests the blob on its base without legs or shoes and lets it bob', async () => {
		const { container } = render(Mascot, { build: 'blob', shoes: 'boots', outfit: 'overalls' });
		expect(container.querySelector('.leg')).toBeNull();
		expect(container.querySelector('.foot')).toBeNull();
		expect(container.querySelector('.shorts')).toBeNull();
		expect(container.querySelector('.foot-contact')).toBeNull();
		expect(container.querySelector('ellipse.contact')).not.toBeNull();
		expect(container.querySelector('.float')).not.toBeNull();
		expect(container.querySelector('.stand')).toBeNull();
	});

	it('plants the other builds on their own ground line', async () => {
		for (const build of ['chubby', 'lanky', 'chibi'] as const) {
			const { container } = render(Mascot, { build });
			const stand = container.querySelector('.stand') as SVGGElement;
			expect(stand.style.transformOrigin).toBe(`100px ${BUILD_DEFS[build].groundY}px`);
			const contact = container.querySelector('ellipse.foot-contact')!.parentElement!;
			expect(contact.getAttribute('transform')).toContain(
				`translate(100 ${BUILD_DEFS[build].groundY + 1})`
			);
		}
	});

	it('scales the head per build', async () => {
		const head = (build: 'standard' | 'chibi' | 'lanky') =>
			render(Mascot, { build, motion: 'reduced' })
				.container.querySelector('.head')!
				.getBoundingClientRect();
		const standard = head('standard');
		expect(head('chibi').height).toBeGreaterThan(standard.height);
		expect(head('lanky').height).toBeLessThan(standard.height);
	});

	it('taps a foot only in idle moods', async () => {
		expect(render(Mascot, { mood: 'idle' }).container.querySelector('.foot.tap')).not.toBeNull();
		expect(render(Mascot, { mood: 'sad' }).container.querySelector('.foot.tap')).toBeNull();
		for (const shoes of ['none', 'boots', 'skates'] as const) {
			const { container } = render(Mascot, { mood: 'idle', shoes });
			// The tapping foot is drawn in two passes (collar rim, then shoe) that move together.
			expect(container.querySelectorAll('.foot.tap')).toHaveLength(2);
		}
	});

	describe('grab', () => {
		const pointer = (el: Element, type: string, x: number, y: number) =>
			el.dispatchEvent(
				new PointerEvent(type, {
					pointerId: 1,
					bubbles: true,
					clientX: x,
					clientY: y,
					button: 0,
					pointerType: 'mouse'
				})
			);
		/** Presses at the center of `target` and drags `el` by (dx, dy) client pixels. */
		const pull = (el: Element, target: Element, dx: number, dy: number) => {
			const r = target.getBoundingClientRect();
			const x = r.left + r.width / 2;
			const y = r.top + r.height / 2;
			pointer(el, 'pointerdown', x, y);
			pointer(el, 'pointermove', x + dx / 2, y + dy / 2);
			pointer(el, 'pointermove', x + dx, y + dy);
			return () => pointer(el, 'pointerup', x + dx, y + dy);
		};
		const rotation = (el: Element | null | undefined) =>
			Number(/rotate\((-?[\d.e-]+)/.exec(el?.getAttribute('transform') ?? '')?.[1] ?? NaN);
		const shoulderAngle = (container: HTMLElement, part: string) =>
			rotation(container.querySelector(`[data-grab="${part}"] > g`));
		const legAngle = (container: HTMLElement, part: string) =>
			rotation(container.querySelector(`[data-grab="${part}"]`));

		it('pulls an arm to the pointer and lets it spring back', async () => {
			const { container } = render(Mascot, { motion: 'full', size: 200 });
			const arm = container.querySelector('[data-grab="arm-left"]')!;
			expect(arm.classList.contains('grabbable')).toBe(true);
			// The pose spring starts at 16 and settles on the resting pose's 20.
			await expect.poll(() => shoulderAngle(container, 'arm-left')).toBeCloseTo(20, 0);
			const rest = shoulderAngle(container, 'arm-left');
			const right = shoulderAngle(container, 'arm-right');
			const release = pull(arm, arm.querySelector('.hand')!, -60, -70);
			await expect.poll(() => shoulderAngle(container, 'arm-left')).toBeGreaterThan(rest + 40);
			expect(arm.classList.contains('held')).toBe(true);
			expect(shoulderAngle(container, 'arm-right')).toBeCloseTo(right, 0);
			release();
			await expect.poll(() => arm.classList.contains('held')).toBe(false);
			await expect
				.poll(() => shoulderAngle(container, 'arm-left'), { timeout: 5000 })
				.toBeCloseTo(rest, 0);
		});

		it('pulls the mirrored right arm in its own frame', async () => {
			const { container } = render(Mascot, { motion: 'full', size: 200 });
			const arm = container.querySelector('[data-grab="arm-right"]')!;
			await expect.poll(() => shoulderAngle(container, 'arm-right')).toBeCloseTo(20, 0);
			const release = pull(arm, arm.querySelector('.hand')!, 60, -70);
			// Outward is +x on screen for the right arm, which is a raised angle in left-arm math.
			await expect.poll(() => shoulderAngle(container, 'arm-right')).toBeGreaterThan(56);
			release();
		});

		it('swings a leg with its foot around the hip and lets it spring back', async () => {
			const { container } = render(Mascot, { motion: 'full', size: 200 });
			const legs = container.querySelectorAll('[data-grab="leg-left"]');
			// Collar rim, leg and shoe all swing together.
			expect(legs).toHaveLength(3);
			const leg = legs[1];
			const release = pull(leg, leg.querySelector('.leg')!, -50, 0);
			await expect.poll(() => legAngle(container, 'leg-left')).toBeGreaterThan(10);
			for (const el of legs) expect(rotation(el)).toBe(legAngle(container, 'leg-left'));
			expect(legAngle(container, 'leg-right')).toBe(0);
			release();
			await expect
				.poll(() => Math.abs(legAngle(container, 'leg-left')), { timeout: 5000 })
				.toBeLessThan(0.5);
		});

		it('stretches an arm and thins it out when pulled past its reach', async () => {
			const { container } = render(Mascot, { motion: 'full', size: 200 });
			const arm = container.querySelector('[data-grab="arm-left"]')!;
			const upper = () => {
				const d = arm.querySelector('.upper-arm')!.getAttribute('d') ?? '';
				return Number(/V([-\d.e]+)/.exec(d)?.[1]);
			};
			const rest = upper();
			const release = pull(arm, arm.querySelector('.hand')!, -120, 0);
			await expect.poll(upper).toBeGreaterThan(rest * 1.5);
			const width = (arm.querySelector(':scope > g') as SVGGElement).style.getPropertyValue(
				'--arm'
			);
			expect(parseFloat(width)).toBeLessThan(14);
			release();
			await expect.poll(upper, { timeout: 5000 }).toBeCloseTo(rest, 0);
		});

		it('stretches a leg when its foot is pulled away from the hip', async () => {
			const { container } = render(Mascot, { motion: 'full', size: 200 });
			const leg = container.querySelectorAll('[data-grab="leg-left"]')[1];
			const length = () => Number(leg.querySelector('.leg')!.getAttribute('height'));
			const rest = length();
			const release = pull(leg, leg.querySelector('.leg')!, 0, 60);
			await expect.poll(length).toBeGreaterThan(rest + 20);
			release();
			await expect.poll(length, { timeout: 5000 }).toBeCloseTo(rest, 0);
		});

		it('stops the foot tap while its leg is held', async () => {
			const { container } = render(Mascot, { motion: 'full', size: 200, mood: 'idle' });
			expect(container.querySelectorAll('.foot.tap')).toHaveLength(2);
			const leg = container.querySelectorAll('[data-grab="leg-right"]')[1];
			const release = pull(leg, leg.querySelector('.leg')!, 50, 0);
			await expect.poll(() => container.querySelectorAll('.foot.tap')).toHaveLength(0);
			release();
			await expect.poll(() => container.querySelectorAll('.foot.tap')).toHaveLength(2);
		});

		it('leaves arms and legs alone when grabbing is off', async () => {
			const { container } = render(Mascot, {
				motion: 'full',
				size: 200,
				reactions: { grab: false }
			});
			const arm = container.querySelector('[data-grab="arm-left"]')!;
			expect(arm.classList.contains('grabbable')).toBe(false);
			await expect.poll(() => shoulderAngle(container, 'arm-left')).toBeCloseTo(16, 0);
			const releaseArm = pull(arm, arm.querySelector('.hand')!, -60, -70);
			await new Promise((r) => setTimeout(r, 300));
			// Only the press lift raises the arm; a grab would swing it far past that.
			expect(shoulderAngle(container, 'arm-left')).toBeLessThan(16 + 25);
			expect(arm.classList.contains('held')).toBe(false);
			releaseArm();
			const leg = container.querySelectorAll('[data-grab="leg-left"]')[1];
			const releaseLeg = pull(leg, leg.querySelector('.leg')!, -50, 0);
			await new Promise((r) => setTimeout(r, 200));
			releaseLeg();
			expect(legAngle(container, 'leg-left')).toBe(0);
		});
	});
});

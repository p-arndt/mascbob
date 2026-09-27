import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';
import { BODY_VIEWBOX_HEIGHT, BUILDS, BUILD_DEFS, OUTFITS } from './body.js';

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
});

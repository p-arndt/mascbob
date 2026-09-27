import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';
import { BODY_VIEWBOX_HEIGHT } from './body.js';

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
		for (const part of ['.puffer', '.scarf', '.bow', '.hoodie', '.rib']) {
			expect(bare.querySelector(part)).toBeNull();
		}
		const { container } = render(Mascot, { outfit: 'scarf' });
		expect(container.querySelector('.scarf')).not.toBeNull();
		expect(container.querySelector('.puffer')).toBeNull();
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
		['boots', '.shoe-boots']
	] as const)('wears %s when asked', async (shoes, marker) => {
		const { container } = render(Mascot, { shoes });
		expect(container.querySelectorAll(`.foot ${marker}`)).toHaveLength(2);
		expect(container.querySelector('.foot-plain')).toBeNull();
		for (const other of ['.shoe-sneakers', '.shoe-hightops', '.shoe-boots']) {
			if (other !== marker) expect(container.querySelector(other)).toBeNull();
		}
	});

	it('taps a foot only in idle moods', async () => {
		expect(render(Mascot, { mood: 'idle' }).container.querySelector('.foot.tap')).not.toBeNull();
		expect(render(Mascot, { mood: 'sad' }).container.querySelector('.foot.tap')).toBeNull();
		for (const shoes of ['none', 'boots'] as const) {
			const { container } = render(Mascot, { mood: 'idle', shoes });
			// The tapping foot is drawn in two passes (collar rim, then shoe) that move together.
			expect(container.querySelectorAll('.foot.tap')).toHaveLength(2);
		}
	});
});

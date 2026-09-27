import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';
import { BODY_VIEWBOX_HEIGHT } from './body.js';

describe('Body', () => {
	it('stands on legs and sneakers by default', async () => {
		const { container } = render(Mascot);
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('viewBox')).toBe(`0 0 200 ${BODY_VIEWBOX_HEIGHT}`);
		expect(container.querySelectorAll('.leg')).toHaveLength(2);
		expect(container.querySelectorAll('.sole')).toHaveLength(2);
		expect(container.querySelectorAll('.hand')).toHaveLength(2);
		expect(container.querySelector('.stand')).not.toBeNull();
		expect(container.querySelector('.float')).toBeNull();
	});

	it('wears the puffer collar unless another outfit is chosen', async () => {
		expect(render(Mascot).container.querySelector('.puffer')).not.toBeNull();
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
		const { container } = render(Mascot, { mood: 'wink' });
		expect(container.querySelector('.fore.swing.wave')).not.toBeNull();
	});

	it('taps a foot only in idle moods', async () => {
		expect(render(Mascot, { mood: 'idle' }).container.querySelector('.foot.tap')).not.toBeNull();
		expect(render(Mascot, { mood: 'sad' }).container.querySelector('.foot.tap')).toBeNull();
	});
});

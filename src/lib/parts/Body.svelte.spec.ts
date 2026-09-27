import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from '../Mascot.svelte';
import { BODY_VIEWBOX_HEIGHT } from './body.js';

describe('Body', () => {
	it('draws the torso, chest core and two arms in body mode', async () => {
		const { container } = render(Mascot, { body: true });
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('viewBox')).toBe(`0 0 200 ${BODY_VIEWBOX_HEIGHT}`);
		expect(container.querySelector('.core-heart')).not.toBeNull();
		expect(container.querySelectorAll('.mitten-skin')).toHaveLength(2);
	});

	it('draws only the chosen outfit', async () => {
		const { container } = render(Mascot, { body: true, outfit: 'scarf' });
		expect(container.querySelector('.scarf')).not.toBeNull();
		expect(container.querySelector('.bowtie')).toBeNull();
	});

	it('uses the floating hands without a body', async () => {
		const { container } = render(Mascot, { body: false });
		expect(container.querySelector('.core-heart')).toBeNull();
		expect(container.querySelectorAll('.skin')).toHaveLength(2);
	});

	it('swings the waving forearm', async () => {
		const { container } = render(Mascot, { body: true, mood: 'wink' });
		expect(container.querySelector('.fore.swing.wave')).not.toBeNull();
	});
});

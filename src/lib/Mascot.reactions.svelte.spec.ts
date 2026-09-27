import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Mascot from './Mascot.svelte';
import type { ReactionsInput } from './interaction.js';

const frame = () => new Promise((r) => setTimeout(r, 16));

/** Strokes the pointer back and forth over the head, in viewBox units of the full figure. */
async function petHead(el: HTMLElement, sweeps: number) {
	const rect = el.getBoundingClientRect();
	const at = (x: number, y: number) =>
		window.dispatchEvent(
			new PointerEvent('pointermove', {
				clientX: rect.left + (x / 200) * rect.width,
				clientY: rect.top + (y / 300) * rect.height,
				pointerType: 'mouse'
			})
		);
	for (let i = 0; i < sweeps; i++) {
		for (let k = 0; k <= 10; k++) {
			at(i % 2 ? 130 - k * 6 : 70 + k * 6, 80);
			await frame();
		}
	}
}

function setup(reactions?: ReactionsInput) {
	const onreaction = vi.fn();
	const { container } = render(Mascot, {
		label: 'Buddy',
		size: 200,
		motion: 'full',
		onreaction,
		...(reactions === undefined ? {} : { reactions })
	});
	const el = container.querySelector('.mascott') as HTMLElement;
	return { el, onreaction };
}

describe('Mascot reactions', () => {
	it('gets content when petted and shows hearts after enough strokes', async () => {
		const { el, onreaction } = setup();
		await petHead(el, 4);
		await expect.element(el).toHaveAttribute('data-mood', 'happy');
		await petHead(el, 4);
		await expect.element(el).toHaveAttribute('data-mood', 'love');
		expect(onreaction).toHaveBeenCalledWith({ type: 'pet', strokes: 6 });
		await expect.element(el, { timeout: 4000 }).toHaveAttribute('data-mood', 'idle');
	});

	it('ignores petting when that reaction is disabled', async () => {
		const { el, onreaction } = setup({ pet: false });
		await petHead(el, 8);
		expect(el.getAttribute('data-mood')).toBe('idle');
		expect(onreaction).not.toHaveBeenCalled();
	});

	it('turns all reactions off with false', async () => {
		const { el, onreaction } = setup(false);
		await petHead(el, 8);
		expect(el.getAttribute('data-mood')).toBe('idle');
		expect(onreaction).not.toHaveBeenCalled();
	});
});

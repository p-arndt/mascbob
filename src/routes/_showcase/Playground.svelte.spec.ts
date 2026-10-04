import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Playground from './Playground.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('https://example.com/') } }));

async function openProportions() {
	await page.getByRole('tab', { name: 'Body', exact: true }).click();
	await page.getByRole('button', { name: 'Proportions', exact: true }).click();
}

describe('Studio controls', () => {
	it('offers Snailbob with anatomy-specific controls', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Snailbob preset' }).click();
		await openProportions();
		for (const name of ['Shell size percent', 'Foot length percent', 'Eye stalk length percent']) {
			await expect.element(page.getByRole('spinbutton', { name })).toHaveValue(100);
		}
		await expect
			.element(page.getByRole('button', { name: 'Head', exact: true }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('spinbutton', { name: 'Legs percent' }))
			.not.toBeInTheDocument();
	});
	it('offers Octobob with tentacle proportions and only full anatomy', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Octobob preset' }).click();
		await openProportions();
		await expect
			.element(page.getByRole('spinbutton', { name: 'Tentacle length percent' }))
			.toHaveValue(100);
		await expect
			.element(page.getByRole('button', { name: 'Head', exact: true }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('spinbutton', { name: 'Legs percent' }))
			.not.toBeInTheDocument();
	});
	it('keeps percentage inputs and sliders in sync, with individual resets', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Mossbob preset' }).click();
		await expect
			.element(page.getByRole('button', { name: 'Head', exact: true }))
			.not.toBeInTheDocument();
		await openProportions();
		const percent = page.getByRole('spinbutton', { name: 'Body width percent' });
		await percent.fill('156');
		await page.getByRole('button', { name: 'Proportions', exact: true }).click();
		await expect
			.element(page.getByRole('slider', { name: 'Body width', exact: true }))
			.toHaveValue('1.56');
		await percent.fill('999');
		await page.getByRole('button', { name: 'Proportions', exact: true }).click();
		await expect.element(percent).toHaveValue(180);
		await percent.fill('');
		await page.getByRole('button', { name: 'Proportions', exact: true }).click();
		await expect.element(percent).toHaveValue(180);
		await page.getByRole('button', { name: 'Reset Body width', exact: true }).click();
		await expect.element(percent).toHaveValue(100);
		await page.getByRole('tab', { name: 'Species', exact: true }).click();
		await page.getByRole('button', { name: 'Restore Mossbob starting look' }).click();
		await openProportions();
		await expect.element(percent).toHaveValue(110);
	});

	it('keeps the first tab to species and puts head shape, eyes and proportions in Body', async () => {
		render(Playground);
		await expect
			.element(page.getByRole('button', { name: 'Eyes', exact: true }))
			.not.toBeInTheDocument();
		await page.getByRole('tab', { name: 'Body', exact: true }).click();
		for (const part of ['Head shape', 'Eyes', 'Proportions']) {
			await expect
				.element(page.getByRole('button', { name: part, exact: true }))
				.toBeInTheDocument();
		}
		await page.getByRole('tab', { name: 'Species', exact: true }).click();
		await page.getByRole('button', { name: 'Use Wispbob preset' }).click();
		await page.getByRole('tab', { name: 'Body', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'Head shape', exact: true }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Eyes', exact: true }))
			.toHaveAttribute('aria-pressed', 'true');
	});

	it('restores Bob’s head shape and hides unused avatar proportions', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Bob preset' }).click();
		await page.getByRole('tab', { name: 'Body', exact: true }).click();
		await page.getByRole('button', { name: 'orb', exact: true }).click();
		await page.getByRole('tab', { name: 'Species', exact: true }).click();
		await page.getByRole('button', { name: 'Restore Bob starting look' }).click();
		await page.getByRole('tab', { name: 'Body', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'capsule', exact: true }))
			.toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Head', exact: true }).click();
		await page.getByRole('button', { name: 'Proportions', exact: true }).click();
		await expect
			.element(page.getByRole('spinbutton', { name: 'Body width percent' }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: /Switch to full body/ }))
			.toBeInTheDocument();
	});

	it('separates colors from anatomy and offers a quick accessory clear', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Critterbob preset' }).click();
		await page.getByRole('tab', { name: 'Colors', exact: true }).click();
		await expect
			.element(page.getByRole('slider', { name: 'Body width', exact: true }))
			.not.toBeInTheDocument();
		await page.getByRole('tab', { name: 'Outfit', exact: true }).click();
		await page.getByRole('button', { name: 'Remove all accessories' }).click();
		await expect
			.element(page.getByRole('button', { name: 'Remove all accessories' }))
			.not.toBeInTheDocument();
	});

	it('picks gear from preview tiles of the current mascot', async () => {
		render(Playground);
		await page.getByRole('button', { name: 'Use Bob preset' }).click();
		await page.getByRole('tab', { name: 'Outfit', exact: true }).click();
		const hat = page.getByRole('button', { name: 'party hat', exact: true });
		await expect.element(hat).toBeInTheDocument();
		expect(hat.element().querySelector('svg')).not.toBeNull();
		await hat.click();
		await expect.element(hat).toHaveAttribute('aria-pressed', 'true');
		await hat.click();
		await expect.element(hat).toHaveAttribute('aria-pressed', 'false');
		await expect.element(page.getByText(/Picked for/)).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Shoes', exact: true }).click();
		await expect.element(hat).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Head', exact: true }).click();
		await expect.element(page.getByRole('button', { name: 'boots', exact: true })).toBeDisabled();
	});
});

/** Opens every tab and part and returns the ones whose controls would need scrolling. */
async function overflowingParts(container: HTMLElement) {
	const body = container.querySelector<HTMLElement>('.panel-body')!;
	const over: string[] = [];
	const check = (name: string) => {
		if (body.scrollHeight > body.clientHeight + 1) over.push(name);
	};
	for (const tab of ['Species', 'Body', 'Colors', 'Outfit', 'Motion', 'Export']) {
		await page.getByRole('tab', { name: tab, exact: true }).click();
		const parts = [...container.querySelectorAll<HTMLButtonElement>('.parts button')];
		if (!parts.length) check(tab);
		for (const part of parts) {
			part.click();
			await new Promise((r) => requestAnimationFrame(r));
			check(`${tab} / ${part.textContent}`);
		}
	}
	return over;
}

describe('Studio layout', () => {
	it('fits every tab next to the preview on a desktop, so nothing scrolls inside the card', async () => {
		await page.viewport(1440, 900);
		const { container } = render(Playground);
		expect(await overflowingParts(container)).toEqual([]);
	});

	it('fits every tab under the preview on a phone', async () => {
		await page.viewport(390, 844);
		const { container } = render(Playground);
		expect(await overflowingParts(container)).toEqual([]);
	});

	it('brings the active tab into view and opens export from the stage', async () => {
		await page.viewport(390, 844);
		const { container } = render(Playground);
		const tabs = container.querySelector<HTMLElement>('.tabs')!;
		await page.getByRole('button', { name: 'Export', exact: true }).click();
		const tab = page.getByRole('tab', { name: 'Export', exact: true });
		await expect.element(tab).toHaveAttribute('aria-selected', 'true');
		expect(tab.element().getBoundingClientRect().right).toBeLessThanOrEqual(
			tabs.getBoundingClientRect().right + 1
		);
		await expect.element(page.getByRole('slider', { name: 'Size' })).toBeInTheDocument();
	});
});

describe('Studio page on a phone', () => {
	it('pins the stage, docks the tabs at the bottom and lets the page scroll the controls', async () => {
		await page.viewport(390, 844);
		const { container } = render(Playground, { standalone: true });
		const stage = container.querySelector<HTMLElement>('.stage')!;
		const tabs = container.querySelector<HTMLElement>('.tabs')!;
		const body = container.querySelector<HTMLElement>('.panel-body')!;
		expect(getComputedStyle(stage).position).toBe('sticky');
		expect(tabs.getBoundingClientRect().bottom).toBeCloseTo(innerHeight, 0);
		expect(getComputedStyle(body).overflowY).toBe('visible');
	});

	it('resizes the preview from its grab bar', async () => {
		await page.viewport(390, 844);
		const { container } = render(Playground, { standalone: true });
		const stage = container.querySelector<HTMLElement>('.stage')!;
		const handle = page.getByRole('button', { name: /^Preview size/ });
		await expect.element(handle).toHaveAccessibleName('Preview size: balanced');
		const balanced = stage.offsetHeight;

		handle
			.element()
			.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		await expect.element(handle).toHaveAccessibleName('Preview size: big preview');
		await expect.poll(() => stage.offsetHeight).toBeGreaterThan(balanced + 100);

		const up = () => new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
		handle.element().dispatchEvent(up());
		handle.element().dispatchEvent(up());
		await expect.element(handle).toHaveAccessibleName('Preview size: small preview, big controls');
		await expect.poll(() => stage.offsetHeight).toBeLessThan(balanced);
	});

	it('shares links that open the studio page', async () => {
		render(Playground, { standalone: true });
		await page.getByRole('button', { name: 'Export', exact: true }).click();
		await page.getByRole('button', { name: 'Share link', exact: true }).click();
		const link = page.getByRole('textbox', { name: 'Share link' }).element() as HTMLInputElement;
		expect(link.value).toMatch(/^https:\/\/example\.com\/studio(\?|$)/);
	});

	it('swaps the mood strip for a switcher with a sheet of faces', async () => {
		await page.viewport(390, 844);
		const { container } = render(Playground, { standalone: true });
		const dock = container.querySelector<HTMLElement>('.dock')!;
		expect(getComputedStyle(dock).display).toBe('none');
		const current = page.getByRole('button', { name: /^Mood: / });
		const start = current.element().getAttribute('aria-label')!;

		await page.getByRole('button', { name: 'Next mood' }).click();
		await expect.element(current).not.toHaveAccessibleName(start);
		await page.getByRole('button', { name: 'Previous mood' }).click();
		await expect.element(current).toHaveAccessibleName(start);

		await current.click();
		const sheet = container.querySelector<HTMLElement>('.mood-sheet')!;
		expect(sheet.matches(':popover-open')).toBe(true);
		await page.getByRole('button', { name: 'sleepy', exact: true }).click();
		await expect.element(current).toHaveAccessibleName('Mood: sleepy. Choose a mood');
		expect(sheet.matches(':popover-open')).toBe(false);
	});
});

describe('Studio export', () => {
	it('exports the mascot looking ahead, not at the pointer on the button', async () => {
		const blobs: Blob[] = [];
		const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
			blobs.push(b as Blob);
			return 'blob:test';
		});
		const { container } = render(Playground);
		const stage = container.querySelector<HTMLElement>('.mascbob')!;
		const aim = stage.querySelector<SVGGElement>('.head-aim')!;
		const svg = stage.querySelector('svg')!;
		const index = [...svg.querySelectorAll('*')].indexOf(aim);
		const rect = stage.getBoundingClientRect();
		window.dispatchEvent(
			new PointerEvent('pointermove', {
				clientX: rect.right + 300,
				clientY: rect.bottom + 200,
				pointerType: 'mouse'
			})
		);
		await expect.poll(() => aim.transform.baseVal.getItem(0).angle).toBeGreaterThan(4);

		await page.getByRole('button', { name: 'Export', exact: true }).click();
		await page.getByRole('button', { name: 'Files', exact: true }).click();
		await page.getByRole('button', { name: /SVG\s*Vector/ }).click();
		await expect.poll(() => blobs.length, { timeout: 3000 }).toBe(1);
		create.mockRestore();

		const doc = new DOMParser().parseFromString(await blobs[0].text(), 'image/svg+xml');
		const exported = [...doc.documentElement.querySelectorAll('*')][index] as SVGGElement;
		expect(Math.abs(exported.transform.baseVal.getItem(0).angle)).toBeLessThan(0.5);
	});
});

import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { Mascot } from '$lib/index.js';
import type { ComponentProps } from 'svelte';
import { snapshotSvg, svgToPng } from '../../src/routes/_showcase/exporter.js';

const cases: Record<string, ComponentProps<typeof Mascot>> = {
	custom_color: { theme: '#123456' },
	prop_narrow_tall: { proportions: { head: 0.4, body: 0.4, height: 1.8, arms: 0.4, legs: 0.4 } },
	prop_wide_short: {
		build: 'chubby',
		proportions: { head: 0.4, body: 1.8, height: 0.4, arms: 0.4, legs: 0.4 }
	},
	prop_narrow_lanky: { build: 'lanky', proportions: { body: 0.4, height: 1.8, legs: 1.8 } }
};
it('exports Bobiverse anatomy and color regression references', async () => {
	for (const [name, props] of Object.entries(cases)) {
		const { container, unmount } = render(Mascot, {
			size: 160,
			mood: 'idle',
			theme: 'og',
			lookAt: 'none',
			effects: false,
			interactive: false,
			motion: 'reduced',
			...props
		});
		await new Promise((resolve) => setTimeout(resolve, 900));
		const svg = snapshotSvg(container.querySelector('svg')!, { width: 160, height: 240 });
		const png = await svgToPng(svg, 160, 240, 4);
		const data = await new Promise<string>((resolve) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.readAsDataURL(png);
		});
		await commands.writeFile(`tests/widget-art/output/${name}.png`, data.split(',')[1], 'base64');
		unmount();
	}
	expect(Object.keys(cases)).toHaveLength(4);
}, 30000);

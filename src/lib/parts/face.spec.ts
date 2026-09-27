import { describe, expect, it } from 'vitest';
import {
	LED_ROWS,
	LED_STEP,
	LED_TOP,
	ledGrid,
	lightAt,
	type EyeShape,
	type FaceScene
} from './face.js';

const eye = (p: Partial<EyeShape> = {}): EyeShape => ({
	cx: 80,
	cy: 97,
	w: 16,
	h: 20,
	lift: 0,
	lidLeft: 0,
	lidRight: 0,
	heart: 0,
	squeeze: 0,
	side: 'left',
	shine: 0,
	...p
});

const scene = (p: Partial<FaceScene> = {}): FaceScene => ({
	eyes: [eye()],
	brows: [],
	mouth: { cx: 100, y: 116, width: 12, curve: 3, open: 0, round: 0, cat: 0, tongue: 0 },
	blush: [],
	blushLines: 0,
	...p
});

describe('ledGrid', () => {
	const dots = ledGrid(90);

	it('stays centered and inside the face area', () => {
		const xs = dots.map((d) => d.x);
		expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(200, 5);
		for (const d of dots) {
			expect(d.y).toBeGreaterThanOrEqual(LED_TOP);
			expect(d.y).toBeLessThanOrEqual(LED_TOP + (LED_ROWS - 1) * LED_STEP + 1e-9);
		}
	});

	it('rounds off the corners', () => {
		const top = Math.min(...dots.map((d) => d.y));
		const middle = LED_TOP + ((LED_ROWS - 1) / 2) * LED_STEP;
		const width = (y: number) => dots.filter((d) => Math.abs(d.y - y) < 0.01).length;
		expect(width(top)).toBeLessThan(width(middle));
	});

	it('shrinks for narrow heads', () => {
		expect(ledGrid(70).length).toBeLessThan(dots.length);
	});
});

describe('lightAt', () => {
	it('lights the eye center and leaves far dots dark', () => {
		expect(lightAt(80, 97, scene()).main).toBe(1);
		expect(lightAt(140, 80, scene()).main).toBe(0);
	});

	it('keeps a closed eye as a lit line', () => {
		const closed = scene({ eyes: [eye({ h: 0 })] });
		const row = LED_TOP + Math.round((97 - LED_TOP) / LED_STEP) * LED_STEP;
		expect(lightAt(80, row, closed).main).toBeGreaterThan(0.8);
		expect(lightAt(80, row - LED_STEP * 2, closed).main).toBe(0);
	});

	it('turns a happy crescent into an arch: the top lights, the center does not', () => {
		const happy = scene({ eyes: [eye({ lift: 0.8 })] });
		expect(lightAt(80, 97 + LED_STEP, happy).main).toBe(0);
		expect(lightAt(80, 88, happy).main).toBeGreaterThan(0.5);
	});

	it('draws hearts and chevrons', () => {
		expect(lightAt(80, 97, scene({ eyes: [eye({ heart: 1 })] })).main).toBe(1);
		const squeezed = scene({ eyes: [eye({ squeeze: 1 })] });
		// "<"-free center: the chevron's open side has no light.
		expect(lightAt(80 - 16 * 0.3, 97, squeezed).main).toBeLessThan(0.3);
	});

	it('lights a smile lower in the middle than at the corners', () => {
		const s = scene({ eyes: [] });
		const rowOf = (x: number) => {
			let best = 0;
			let bestY = 0;
			for (let r = 0; r < LED_ROWS; r++) {
				const y = LED_TOP + r * LED_STEP;
				const l = lightAt(x, y, s).main;
				if (l > best) [best, bestY] = [l, y];
			}
			return bestY;
		};
		expect(rowOf(100)).toBeGreaterThan(rowOf(95));
	});

	it('shows brows only when visible', () => {
		const brow = { x0: 74, y0: 82, x1: 86, y1: 82, alpha: 1 };
		expect(lightAt(80, 82, scene({ eyes: [], brows: [brow] })).main).toBeGreaterThan(0.9);
		expect(lightAt(80, 82, scene({ eyes: [], brows: [{ ...brow, alpha: 0 }] })).main).toBe(0);
	});

	it('uses the cheek channel for blush and tongue', () => {
		const blush = scene({ eyes: [], blush: [{ x: 60, y: 113, alpha: 0.8 }] });
		expect(lightAt(60, 113, blush).pink).toBeCloseTo(0.8);
		const tongue = scene({
			eyes: [],
			mouth: { cx: 100, y: 112, width: 16, curve: 2, open: 8, round: 0, cat: 0, tongue: 1 }
		});
		expect(lightAt(100, 112 + 2 + 8 * 0.8, tongue).pink).toBe(1);
	});

	it('puts a white catchlight in open eyes', () => {
		const shiny = scene({ eyes: [eye({ shine: 1 })] });
		expect(lightAt(80 + 16 * 0.22, 97 - 20 * 0.22, shiny).white).toBeGreaterThan(0.5);
	});
});

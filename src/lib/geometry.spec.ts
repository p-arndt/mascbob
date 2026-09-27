import { describe, expect, it } from 'vitest';
import { SHAPE_DEFS } from './geometry.js';

describe('shapes', () => {
	it.each(Object.entries(SHAPE_DEFS))('%s fits the viewBox', (_, s) => {
		expect(s.top).toBeGreaterThan(20);
		expect(s.bottom + 14).toBeLessThan(200);
		expect(100 + s.halfWidth + 22).toBeLessThanOrEqual(200);
	});
});

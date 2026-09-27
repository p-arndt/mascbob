import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REACTIONS } from '$lib/index.js';
import { EXAMPLES, PROPS, REACTION_DOCS, highlight } from './docs.js';

describe('docs', () => {
	it('documents exactly the props the component declares', () => {
		const source = readFileSync(new URL('../../lib/Mascot.svelte', import.meta.url), 'utf8');
		const body = source.match(/interface Props \{([\s\S]*?)\n\t\}/)![1];
		const declared = [...body.matchAll(/^\t\t(\w+)\??:/gm)].map((m) => m[1]);
		expect(PROPS.map((p) => p.name).sort()).toEqual(declared.sort());
	});

	it('indents examples with two spaces from a flush left edge', () => {
		for (const code of Object.values(EXAMPLES)) {
			expect(code).not.toMatch(/^\t/m);
			expect(code).not.toMatch(/^ /);
		}
	});

	it('describes every reaction', () => {
		expect(Object.keys(REACTION_DOCS).sort()).toEqual([...REACTIONS].sort());
	});
});

describe('highlight', () => {
	const classes = (line: string) =>
		highlight(line)[0]
			.filter(([c]) => c)
			.map(([c, t]) => `${c}:${t}`);

	it('colors tags, attributes and strings', () => {
		expect(classes('<Mascot mood="happy" />')).toEqual([
			't-tag:<Mascot',
			't-attr:mood',
			't-str:"happy"',
			't-tag:/>'
		]);
	});

	it('keeps every character of the source', () => {
		const code = "import { Mascot } from 'mascbob'; // hi";
		expect(
			highlight(code)[0]
				.map(([, t]) => t)
				.join('')
		).toBe(code);
		expect(classes(code)).toContain('t-c:// hi');
	});
});

import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { MOODS, Mascot, THEMES } from '$lib/index.js';
import type { ComponentProps } from 'svelte';
import { snapshotSvg } from '../../src/routes/_showcase/exporter.js';

type Props = ComponentProps<typeof Mascot>;
type Frame = { props: Props; width: number; height: number; svg: string };

const OUT = '.github/assets';
const FIGURE = { width: 160, height: 240 };
const HEAD = { width: 120, height: 120 };

async function frame(props: Props, size = props.body === false ? HEAD : FIGURE): Promise<Frame> {
	const { container, unmount } = render(Mascot, {
		size: size.width,
		lookAt: 'none',
		effects: false,
		interactive: false,
		motion: 'reduced',
		...props
	});
	// Face values tween between moods; the snapshot should catch the settled pose.
	await new Promise((resolve) => setTimeout(resolve, 900));
	const svg = snapshotSvg(container.querySelector('svg')!, size);
	unmount();
	return { props, ...size, svg };
}

/** Lays frames out in one row, nesting each snapshot as its own positioned `<svg>`. */
function row(frames: Frame[], gap: number, inner: (f: Frame, x: number) => string) {
	const width = frames.reduce((sum, f) => sum + f.width, 0) + gap * (frames.length - 1);
	const height = Math.max(...frames.map((f) => f.height));
	let x = 0;
	const body = frames
		.map((f) => {
			const out = inner(f, x);
			x += f.width + gap;
			return out;
		})
		.join('');
	return { width, height, body };
}

function nest(f: Frame, x: number, y = 0) {
	return f.svg.replace('<svg ', `<svg x="${x}" y="${y}" `);
}

const PAD = 24;
const PAPER = '#f4f1ea';

/**
 * Every image sits on a paper card: a transparent background would lose the dark
 * colorways against GitHub's dark theme.
 */
function file(width: number, height: number, body: string, style = '') {
	const w = width + PAD * 2;
	const h = height + PAD * 2;
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
		(style ? `<style>${style}</style>` : '') +
		`<rect width="${w}" height="${h}" rx="24" fill="${PAPER}"/>` +
		`<g transform="translate(${PAD} ${PAD})">${body}</g></svg>\n`
	);
}

it('renders the README art', async () => {
	// Hero: one figure that cycles through moods and outfits, hopping between frames.
	const hero = await Promise.all(
		(
			[
				{ mood: 'waving', theme: 'og' },
				{ mood: 'happy', theme: 'volt', outfit: 'hoodie', shoes: 'hightops' },
				{ mood: 'love', theme: 'lilac', accessories: ['bow'], outfit: 'scarf' },
				{ mood: 'thinking', theme: 'ice', accessories: ['headphones'], outfit: 'puffer' },
				{ mood: 'laughing', theme: 'bred', accessories: ['cap'], shoes: 'sneakers' },
				{ mood: 'sleepy', theme: 'midnight', accessories: ['nightcap'], outfit: 'overalls' }
			] satisfies Props[]
		).map((p) => frame(p))
	);
	const step = 1.6;
	const total = step * hero.length;
	const heroStyle =
		`.f{opacity:0;animation:show ${total}s steps(1,end) infinite}` +
		`@keyframes show{0%{opacity:1}${(100 / hero.length).toFixed(3)}%,100%{opacity:0}}` +
		`.hop{animation:hop ${step}s cubic-bezier(.3,0,.3,1) infinite;transform-box:fill-box;transform-origin:50% 100%}` +
		`@keyframes hop{0%{transform:translateY(0) scale(1.06,.94)}12%{transform:translateY(-10px) scale(.97,1.03)}28%,100%{transform:translateY(0) scale(1)}}` +
		`@media (prefers-reduced-motion:reduce){.f,.hop{animation:none}.f:first-child{opacity:1}}`;
	const banner = { width: 620, height: FIGURE.height };
	const figureX = banner.width - FIGURE.width - 24;
	const text =
		`<g font-family="ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, 'Segoe UI', sans-serif" fill="#1d1d1f">` +
		`<text x="8" y="112" font-size="72" font-weight="800" letter-spacing="-3">mascott</text>` +
		`<text x="10" y="148" font-size="19" fill="#57534e">An animated SVG mascot for Svelte 5</text>` +
		`<rect x="10" y="172" width="118" height="30" rx="15" fill="#ff5a1f"/>` +
		`<text x="69" y="192" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${MOODS.length} moods</text>` +
		`<rect x="136" y="172" width="136" height="30" rx="15" fill="#1d1d1f"/>` +
		`<text x="204" y="192" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${Object.keys(THEMES).length} colorways</text>` +
		`<rect x="280" y="172" width="118" height="30" rx="15" fill="none" stroke="#1d1d1f" stroke-width="2"/>` +
		`<text x="339" y="192" font-size="13" font-weight="700" text-anchor="middle">0 deps</text>` +
		`</g>`;
	await commands.writeFile(
		`${OUT}/hero.svg`,
		file(
			banner.width,
			banner.height,
			text +
				`<g transform="translate(${figureX} 0)"><g class="hop">${hero
					.map(
						(f, i) => `<g class="f" style="animation-delay:${(i * step).toFixed(2)}s">${f.svg}</g>`
					)
					.join('')}</g></g>`,
			heroStyle
		)
	);

	const moods = await Promise.all(
		(
			[
				'idle',
				'happy',
				'love',
				'surprised',
				'thinking',
				'wink',
				'sleepy',
				'grumpy',
				'sad',
				'laughing'
			] as const
		).map((mood) => frame({ mood, body: false }))
	);
	const m = row(moods, 8, nest);
	await commands.writeFile(`${OUT}/moods.svg`, file(m.width, m.height, m.body));

	const themes = await Promise.all(
		(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((theme) =>
			frame({ theme, mood: 'happy' }, { width: 96, height: 144 })
		)
	);
	const t = row(themes, 6, nest);
	await commands.writeFile(`${OUT}/themes.svg`, file(t.width, t.height, t.body));

	const wardrobe = await Promise.all(
		(
			[
				{
					theme: 'mocha',
					outfit: 'overalls',
					shoes: 'boots',
					accessories: ['sprout'],
					build: 'chubby'
				},
				{
					theme: 'volt',
					outfit: 'jersey',
					shoes: 'sneakers',
					accessories: ['headband'],
					build: 'lanky'
				},
				{ theme: 'sunset', outfit: 'cape', shoes: 'skates', accessories: ['crown'] },
				{
					theme: 'mint',
					outfit: 'bowtie',
					shoes: 'slippers',
					accessories: ['party-hat'],
					build: 'chibi'
				},
				{ theme: 'noir', outfit: 'tie', shoes: 'hightops', accessories: ['shades'] },
				{ theme: 'bubblegum', accessories: ['halo'], build: 'blob', mood: 'love' }
			] satisfies Props[]
		).map((p) => frame({ mood: 'happy', ...p }))
	);
	const w = row(wardrobe, 12, nest);
	await commands.writeFile(`${OUT}/wardrobe.svg`, file(w.width, w.height, w.body));

	expect(hero).toHaveLength(6);
});

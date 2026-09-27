import type { Token } from './Code.svelte';

export interface PropDoc {
	name: string;
	type: string;
	default: string;
	description: string;
}

/** Every public `<Mascot>` prop. docs.spec.ts checks this against the component's Props interface. */
export const PROPS: PropDoc[] = [
	{
		name: 'mood',
		type: 'Mood',
		default: "'idle'",
		description: 'Facial expression, effect, hand pose and float speed. Changes morph smoothly.'
	},
	{
		name: 'theme',
		type: 'ThemeName | { base?, ...colors }',
		default: "'og'",
		description: 'A colorway preset, or a preset with individual colors overridden.'
	},
	{ name: 'shape', type: 'Shape', default: "'capsule'", description: 'Head silhouette.' },
	{
		name: 'eyes',
		type: 'EyeStyle',
		default: "'round'",
		description: 'Eye shape. Every style morphs through all moods.'
	},
	{
		name: 'accessories',
		type: 'Accessory[]',
		default: '[]',
		description: 'Any combination of the built-in accessories.'
	},
	{
		name: 'body',
		type: 'boolean',
		default: 'true',
		description: 'Full 2:3 figure with arms and legs. `false` draws a square head for avatars.'
	},
	{
		name: 'outfit',
		type: 'Outfit',
		default: "'none'",
		description: 'Clothing, only visible with `body`.'
	},
	{
		name: 'shoes',
		type: 'Shoes',
		default: "'none'",
		description: 'Footwear, only visible with `body`.'
	},
	{
		name: 'hands',
		type: 'boolean',
		default: 'true',
		description: 'Hands that gesture with the mood.'
	},
	{
		name: 'lookAt',
		type: "'pointer' | 'wander' | 'none' | { x, y }",
		default: "'pointer'",
		description: 'Where the eyes go. `{ x, y }` is a fixed direction in -1..1.'
	},
	{
		name: 'level',
		type: 'number',
		default: '–',
		description:
			'Mouth opening 0..1 while `mood` is `talking`, e.g. mic amplitude. Omit to animate on its own.'
	},
	{
		name: 'size',
		type: 'number | string',
		default: '160',
		description: 'Width in pixels, or any CSS length.'
	},
	{ name: 'float', type: 'boolean', default: 'true', description: 'Idle hover animation.' },
	{
		name: 'effects',
		type: 'boolean',
		default: 'true',
		description: 'Particles around the head: mood effects (sparkles, hearts, zzz) and boop bursts.'
	},
	{
		name: 'motion',
		type: "'auto' | 'full' | 'reduced'",
		default: "'auto'",
		description: '`auto` follows `prefers-reduced-motion`.'
	},
	{
		name: 'interactive',
		type: 'boolean',
		default: 'true',
		description: 'Renders a real `<button>` that squishes and fires `onboop`.'
	},
	{ name: 'label', type: 'string', default: "'Mascott'", description: 'Accessible name.' },
	{
		name: 'onboop',
		type: '() => void',
		default: '–',
		description: 'Click, tap or keyboard press.'
	},
	{
		name: 'reactions',
		type: 'boolean | Reaction[] | { [reaction]: boolean }',
		default: 'true',
		description:
			'Pointer reactions. `true` enables the defaults, a list enables exactly those, an object toggles single ones.'
	},
	{
		name: 'onreaction',
		type: '(event: ReactionEvent) => void',
		default: '–',
		description: 'Fires when a reaction triggers.'
	},
	{
		name: 'accessory',
		type: 'Snippet<[{ top, halfWidth }]>',
		default: '–',
		description: "Custom SVG on top of the head, in the head's 200×200 coordinates."
	},
	{ name: 'class', type: 'string', default: "''", description: 'Class on the root element.' }
];

/** What each pointer reaction needs from the visitor; startle and shy are opt-in. */
export const REACTION_DOCS: Record<string, string> = {
	follow: 'Leans toward the cursor.',
	pet: 'Stroke back and forth over its head. Emits `{ type: "pet", strokes }`.',
	startle: 'Flick the cursor past it, fast. Emits `{ type: "startle", speed }`.',
	dizzy: 'Circle around it twice. Emits `{ type: "dizzy", direction }`.',
	shy: 'Get really close. Emits `{ type: "shy" }`.',
	tickle: 'Boop it again and again. Emits `{ type: "tickle", level, boops }`.',
	bored: 'Leave the mouse alone for 20 s. Emits `bored`, then `wake` when you come back.'
};

export const CSS_VARS = [
	['--mascott-body-light', 'Body highlight'],
	['--mascott-body-mid', 'Body base color'],
	['--mascott-body-dark', 'Body shade'],
	['--mascott-visor', 'Ink: soles, outlines'],
	['--mascott-eye', 'Face print'],
	['--mascott-cheek', 'Blush'],
	['--mascott-accent', 'Accent plate and gear'],
	['--mascott-sprout', 'Sprout accessory']
] as const;

/** Code shown on the docs page; kept out of the .svelte file because it contains <script> tags. */
export const EXAMPLES = {
	QUICK_START: `<script>
  import { Mascot } from 'mascott';
  let mood = $state('idle');
</script>

<Mascot {mood} theme="og" onboop={() => (mood = 'love')} />`,

	THEME_OVERRIDE: `<Mascot theme={{ base: 'noir', accent: '#ff4fd8', eye: '#00ffc6' }} />`,

	REACTIONS_CODE: `<!-- defaults plus shy, without bored -->
<Mascot reactions={{ shy: true, bored: false }} />

<!-- exactly these, and listen for them -->
<Mascot
  reactions={['pet', 'startle']}
  onreaction={(e) => console.log(e.type)}
/>`,

	VOICE_CODE: `<script>
  import { Mascot } from 'mascott';
  let level = $state(0);

  async function listen() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
      const target = Math.min(1, Math.max(0, (rms - 0.01) * 7));
      // open fast, close slower, so the mouth doesn't flicker
      level += (target - level) * (target > level ? 0.5 : 0.2);
      requestAnimationFrame(tick);
    };
    tick();
  }
</script>

<button onclick={listen}>Talk</button>
<Mascot mood="talking" {level} />`,

	CSS_CODE: `.brand {
${CSS_VARS.map(([v]) => `  ${v}: …;`).join('\n')}
}`,

	CUSTOM_CODE: `<Mascot>
  {#snippet accessory({ top })}
    <circle cx="100" cy={top - 10} r="8" fill="gold" />
  {/snippet}
</Mascot>`,

	LISTS_CODE: `import { MOODS, SHAPES, EYE_STYLES, ACCESSORIES, OUTFITS, SHOES, THEMES, REACTIONS } from 'mascott';`
};

const PATTERN =
	/(\/\/.*$|<!--.*?-->)|('[^']*'|"[^"]*"|`[^`]*`)|(<\/?[A-Za-z][\w.]*|\/?>)|\b(import|from|let|const|function|async|await|return|export|new|true|false)\b|([\w-]+)(?==)|(#[0-9a-fA-F]{3,8}\b)|(\{#?\/?|\})/g;
const CLASSES = ['t-c', 't-str', 't-tag', 't-kw', 't-attr', 't-str', 't-p'];

/**
 * A deliberately small highlighter for the Svelte, TS and CSS snippets on the docs page; it only has
 * to color our own examples, so a real grammar would be dead weight in the showcase.
 */
export function highlight(source: string): Token[][] {
	return source.split('\n').map((line) => {
		const out: Token[] = [];
		let last = 0;
		for (const m of line.matchAll(PATTERN)) {
			const group = m.slice(1).findIndex((g) => g !== undefined);
			if (m.index > last) out.push(['', line.slice(last, m.index)]);
			out.push([CLASSES[group], m[0]]);
			last = m.index + m[0].length;
		}
		if (last < line.length) out.push(['', line.slice(last)]);
		return out;
	});
}

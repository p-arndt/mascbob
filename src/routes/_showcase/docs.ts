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
		name: 'species',
		type: 'Species',
		default: "'bob'",
		description:
			'Anatomy: bob, critter (ears, paws and tail), moss (leaf arms and roots), wisp (floating spirit), octo (four curled tentacles), or snail (eye stalks, spiral house and foot).'
	},
	{
		name: 'proportions',
		type: 'Proportions',
		default: '{}',
		description:
			'Multipliers from 0.4 to 1.8: head, body (width), height (body length), arms, legs, ears and tail. Ears apply to critter; tail to critter and wisp; legs to bob and critter. Head sizes the crown of moss, wisp and octo without scaling the face. Arms sizes all four octo tentacles. For snail: body sizes its house, height its foot length and arms its eye stalks.'
	},
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
	{
		name: 'shape',
		type: 'Shape',
		default: "'capsule'",
		description: 'Head silhouette for species="bob". Other species have their own silhouette.'
	},
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
		description: 'Clothing for bob and critter, only visible with `body`.'
	},
	{
		name: 'shoes',
		type: 'Shoes',
		default: "'none'",
		description: 'Footwear for bob and critter, only visible with `body`.'
	},
	{
		name: 'heldItem',
		type: 'HeldItem',
		default: "'none'",
		description:
			'An object in the right hand: sword (swings), microphone (gestures while talking), or phone (checks messages). Full-body bob and critter only. Respects reduced motion.'
	},
	{
		name: 'build',
		type: 'Build',
		default: 'species default',
		description:
			'Body proportions with `body`: `chubby`, `lanky`, `chibi`, or `blob` (no legs, bobs in place).'
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
		description:
			'Where the eyes and gentle head lean aim, including outside the figure. Snail aims its stalks without turning its body. `{ x, y }` is a fixed direction in -1..1; none disables gaze-driven movement.'
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
	{
		name: 'walking',
		type: 'boolean | -1 | 0 | 1',
		default: 'false',
		description:
			'Walk cycle: true marches on the spot, -1 / 1 sidestep left / right. Move the mascot at walkSpeed(size) px/s so its feet don’t skate. Legless figures waddle; the snail ignores it.'
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
	{ name: 'label', type: 'string', default: "'Mascbob'", description: 'Accessible name.' },
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
			'Pointer reactions. `true` enables the defaults, a list enables exactly those, an object toggles single ones, e.g. `{ grab: false }`.'
	},
	{
		name: 'grab',
		type: '{ follow?: number; lean?: number }',
		default: '{ follow: 1, lean: 1 }',
		description:
			'How the `grab` reaction feels: `follow` (0..1) is how far a grabbed head follows the pointer, `lean` (0..3) how far the figure leans into a pull.'
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
	explode:
		'Keep booping once it is grumpy and its head bursts into confetti. Needs `tickle`. Emits `explode`.',
	grab: 'Drag its head, an arm or a leg and it bends like a puppet, stretching like rubber the further you pull, then snaps back when you let go. A plain click is still a boop. Arms and legs need `body`. Emits `{ type: "grab", part }`.',
	bored: 'Leave the mouse alone for 20 s. Emits `bored`, then `wake` when you come back.'
};

export const CSS_VARS = [
	['--mascbob-body-light', 'Body highlight'],
	['--mascbob-body-mid', 'Body base color'],
	['--mascbob-body-dark', 'Body shade'],
	['--mascbob-visor', 'Ink: soles, outlines'],
	['--mascbob-eye', 'Face print'],
	['--mascbob-cheek', 'Blush'],
	['--mascbob-accent', 'Accent plate and gear'],
	['--mascbob-sprout', 'Sprout accessory']
] as const;

/** Code shown on the docs page; kept out of the .svelte file because it contains <script> tags. */
export const EXAMPLES = {
	QUICK_START: `<script>
  import { Mascot } from 'mascbob';
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
  import { Mascot } from 'mascbob';
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

	LISTS_CODE: `import { MOODS, SHAPES, EYE_STYLES, ACCESSORIES, OUTFITS, SHOES, THEMES, REACTIONS } from 'mascbob';`
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

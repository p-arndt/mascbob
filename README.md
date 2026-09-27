# mascott

A friendly, animated and highly customizable SVG mascot for Svelte 5: a matte,
streetwear-styled capsule bot whose face is screen-printed onto its shell, with an accent plate that never quite lines up and halftone cheeks. It blinks, breathes, follows the
cursor, reacts to boops, switches moods and lip-syncs to your voice. Show the full figure or just the head.

## Install

```sh
pnpm add mascott
```

## Quick start

```svelte
<script>
	import { Mascot } from 'mascott';
	let mood = $state('idle');
</script>

<Mascot {mood} theme="og" onboop={() => (mood = 'love')} />
```

It reacts to the pointer: its head tilts toward the cursor, stroke over its head to pet it, circle around it to make it dizzy,
boop it over and over to tickle it, or leave it alone until it gets bored. `follow`, `pet`,
`dizzy`, `tickle` and `bored` are on by default; `startle` and `shy` are opt-in:

```svelte
<Mascot reactions={['pet', 'shy', 'startle']} onreaction={(e) => console.log(e.type)} />
```

The full figure is 2:3 (`size` is the width). Dress it with `outfit` and `shoes`, or use `body={false}` for a square head-only avatar:

```svelte
<Mascot outfit="hoodie" shoes="hightops" theme="bred" mood="happy" size={220} />
<Mascot body={false} size={64} />
```

### Props

The value lists grow over time, so the library exports them. Import `MOODS`, `SHAPES`,
`EYE_STYLES`, `ACCESSORIES`, `OUTFITS`, `SHOES` and `THEMES` (an object keyed by theme name) to see
every option or to build your own pickers:

```ts
import { MOODS, SHAPES, EYE_STYLES, ACCESSORIES, OUTFITS, SHOES, THEMES } from 'mascott';
```

| Prop          | Type                                                                                                   | Default   |
| ------------- | ------------------------------------------------------------------------------------------------------ | --------- |
| `mood`        | one of `MOODS`                                                                                         | `idle`    |
| `theme`       | a key of `THEMES`, or `{ base?, bodyLight, bodyMid, bodyDark, visor, eye, cheek, accent }`             | `og`      |
| `shape`       | one of `SHAPES` (head silhouette)                                                                      | `pebble`  |
| `eyes`        | one of `EYE_STYLES`                                                                                    | `round`   |
| `accessories` | array of `ACCESSORIES`                                                                                 | `[]`      |
| `body`        | full figure with arms and legs, 2:3 (`size` is the width); `false` shows just the head                 | `true`    |
| `outfit`      | one of `OUTFITS`; only visible with `body`                                                             | `none`    |
| `shoes`       | one of `SHOES`; only visible with `body`                                                               | `none`    |
| `hands`       | floating hands that gesture with the mood (head-only mode)                                             | `true`    |
| `lookAt`      | `pointer` `wander` `none` or `{ x, y }` in -1..1                                                       | `pointer` |
| `level`       | mouth opening 0..1 while `talking` (e.g. mic amplitude); omit for automatic lip movement               | –         |
| `size`        | px number or any CSS length                                                                            | `160`     |
| `float`       | idle hover animation (head-only mode; the full figure stands)                                          | `true`    |
| `motion`      | `auto` (respects `prefers-reduced-motion`), `full`, `reduced`                                          | `auto`    |
| `interactive` | render as a button that reacts to clicks                                                               | `true`    |
| `reactions`   | pointer reactions: `true` (defaults), `false`, a list of `REACTIONS`, or `{ shy: true, bored: false }` | `true`    |
| `label`       | accessible name                                                                                        | `Mascott` |
| `onboop`      | click/tap handler                                                                                      | –         |
| `onreaction`  | called with a `ReactionEvent` (`pet`, `startle`, `dizzy`, `shy`, `tickle`, `bored`, `wake`)            | –         |
| `accessory`   | snippet `({ top, halfWidth })` drawing custom SVG in the head's 200×200 viewBox                        | –         |

### Styling with CSS

Every color is also a CSS variable, which wins over the `theme` prop:

```css
.brand {
	--mascott-body-light: #fff;
	--mascott-body-mid: #ffe1f0;
	--mascott-body-dark: #ffb3d9;
	--mascott-visor: #1b1030;
	--mascott-eye: #00ffc6;
	--mascott-cheek: #ff7ab8;
	--mascott-accent: #ff4fd8;
	--mascott-sprout: #6fdc8c;
}
```

### Custom accessories

```svelte
<Mascot>
	{#snippet accessory({ top })}
		<circle cx="100" cy={top - 10} r="8" fill="gold" />
	{/snippet}
</Mascot>
```

### Voice / lip-sync

Set `mood="talking"` and feed an amplitude in 0..1 into `level`. With the Web Audio API
that is a few lines:

```svelte
<script>
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
			// Open fast, close slower, so the mouth doesn't flicker between syllables.
			level += (target - level) * (target > level ? 0.5 : 0.2);
			requestAnimationFrame(tick);
		};
		tick();
	}
</script>

<button onclick={listen}>Talk</button>
<Mascot mood="talking" {level} />
```

Stop the stream's tracks and close the `AudioContext` when you are done. Without `level`,
`talking` animates the mouth on its own.

## Development

- `just` lists all recipes
- `just dev` starts the showcase at http://localhost:5173
- `just ci` runs type check, lint, tests and the package build
- `just release` cuts a release

## License

MIT

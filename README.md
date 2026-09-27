# mascott

A friendly, animated and highly customizable SVG mascot for Svelte 5: a floating,
pearly companion whose face is a matrix of tiny LEDs under its shell. It blinks, breathes, follows the
cursor, reacts to boops, switches moods and lip-syncs to your voice. Show just the head or the full body.

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

<Mascot {mood} theme="aurora" accessories={['ring']} onboop={() => (mood = 'love')} />
```

Add `body` for the full figure (it is then 2:3 instead of square) and dress it with `outfit`:

```svelte
<Mascot body outfit="scarf" mood="happy" size={220} />
```

### Props

The value lists grow over time, so the library exports them. Import `MOODS`, `SHAPES`,
`EYE_STYLES`, `ACCESSORIES`, `OUTFITS` and `THEMES` (an object keyed by theme name) to see
every option or to build your own pickers:

```ts
import { MOODS, SHAPES, EYE_STYLES, ACCESSORIES, OUTFITS, THEMES } from 'mascott';
```

| Prop          | Type                                                                                       | Default   |
| ------------- | ------------------------------------------------------------------------------------------ | --------- |
| `mood`        | one of `MOODS`                                                                             | `idle`    |
| `theme`       | a key of `THEMES`, or `{ base?, bodyLight, bodyMid, bodyDark, visor, eye, cheek, accent }` | `aurora`  |
| `shape`       | one of `SHAPES` (head silhouette)                                                          | `pebble`  |
| `eyes`        | one of `EYE_STYLES`                                                                        | `round`   |
| `accessories` | array of `ACCESSORIES`                                                                     | `[]`      |
| `body`        | draw a full body below the head; the mascot becomes 2:3 (`size` is the width)              | `false`   |
| `outfit`      | one of `OUTFITS`; only visible with `body`                                                 | `none`    |
| `hands`       | floating hands that gesture with the mood                                                  | `true`    |
| `lookAt`      | `pointer` `wander` `none` or `{ x, y }` in -1..1                                           | `pointer` |
| `level`       | mouth opening 0..1 while `talking` (e.g. mic amplitude); omit for automatic lip movement   | –         |
| `size`        | px number or any CSS length                                                                | `160`     |
| `float`       | idle hover animation                                                                       | `true`    |
| `motion`      | `auto` (respects `prefers-reduced-motion`), `full`, `reduced`                              | `auto`    |
| `interactive` | render as a button that reacts to clicks                                                   | `true`    |
| `label`       | accessible name                                                                            | `Mascott` |
| `onboop`      | click/tap handler                                                                          | –         |
| `accessory`   | snippet `({ top, halfWidth })` drawing custom SVG in the head's 200×200 viewBox            | –         |

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

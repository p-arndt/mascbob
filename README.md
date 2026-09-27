# mascott

A friendly, animated and highly customizable SVG mascot for Svelte 5: a floating,
pearly companion with a glowing face screen that blinks, breathes, follows the
cursor, reacts to boops and switches between 11 moods.

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

### Props

| Prop          | Type                                                                                                                            | Default   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `mood`        | `idle` `happy` `listening` `thinking` `talking` `surprised` `sleepy` `sad` `love` `wink` `grumpy`                               | `idle`    |
| `theme`       | `aurora` `peach` `mint` `bubblegum` `sunny` `midnight`, or `{ base?, bodyLight, bodyMid, bodyDark, visor, eye, cheek, accent }` | `aurora`  |
| `shape`       | `pebble` `orb` `squircle` `bean` `ghost`                                                                                        | `pebble`  |
| `eyes`        | `round` `pill` `wide` `dot`                                                                                                     | `round`   |
| `accessories` | array of `ring` `halo` `antenna` `ears` `sprout` `headphones`                                                                   | `[]`      |
| `hands`       | floating hands that gesture with the mood                                                                                       | `true`    |
| `lookAt`      | `pointer` `wander` `none` or `{ x, y }` in -1..1                                                                                | `pointer` |
| `level`       | mouth opening 0..1 while `talking` (e.g. mic amplitude); omit for automatic lip movement                                        | –         |
| `size`        | px number or any CSS length                                                                                                     | `160`     |
| `float`       | idle hover animation                                                                                                            | `true`    |
| `motion`      | `auto` (respects `prefers-reduced-motion`), `full`, `reduced`                                                                   | `auto`    |
| `interactive` | render as a button that reacts to clicks                                                                                        | `true`    |
| `label`       | accessible name                                                                                                                 | `Mascott` |
| `onboop`      | click/tap handler                                                                                                               | –         |
| `accessory`   | snippet `({ top, halfWidth })` drawing custom SVG in the 200×200 viewBox                                                        | –         |

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

## Development

- `just` lists all recipes
- `just dev` starts the showcase at http://localhost:5173
- `just ci` runs type check, lint, tests and the package build
- `just release` cuts a release

## License

MIT

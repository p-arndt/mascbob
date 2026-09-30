<div align="center">

<img src=".github/assets/hero.svg" alt="mascbob, a capsule-shaped robot mascot that hops through moods and outfits" width="720">

<br>

**A friendly, animated and highly customizable SVG mascot for Svelte 5.**

A matte, streetwear-styled capsule bot whose face is screen-printed onto its shell, with an
accent plate that never quite lines up and halftone cheeks. It blinks, breathes, follows the
cursor, reacts to boops, switches moods and lip-syncs to your voice.

<br>

![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00?style=flat-square&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-1d1d1f?style=flat-square)
![Pure SVG](https://img.shields.io/badge/pure-SVG-86bc00?style=flat-square)
![License: MIT](https://img.shields.io/badge/license-MIT-f4f1ea?style=flat-square)

[Install](#install) · [Quick start](#quick-start) · [Gallery](#gallery) · [Props](#props) · [Voice](#voice--lip-sync) · [Development](#development)

</div>

---

## Why mascbob?

|                         |                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| 🎭 **Moods that morph** | Every mood is one outline that tweens into the next, so faces morph instead of crossfading.  |
| 👀 **Alive by default** | Blinks, breathes, glances around, follows the cursor and gets bored when you leave it alone. |
| 🫳 **Reacts to you**    | Pet it, boop it, tickle it, pull its limbs like a puppet. Every reaction fires an event.     |
| 🎙️ **Lip-sync**         | Feed it a mic level and it talks along, or let it babble on its own.                         |
| 👟 **Dress it up**      | Sneaker-drop colorways, head shapes, eye styles, builds, outfits, shoes and accessories.     |
| 🪶 **Tiny footprint**   | Pure SVG + CSS. No runtime dependencies besides `svelte`. Respects `prefers-reduced-motion`. |

## Install

```sh
pnpm add mascbob
```

## Quick start

```svelte
<script>
	import { Mascot } from 'mascbob';
	let mood = $state('idle');
</script>

<Mascot {mood} theme="og" onboop={() => (mood = 'love')} />
```

It reacts to the pointer: its head tilts toward the cursor, stroke over its head to pet it, circle around it to make it dizzy,
boop it over and over to tickle it (keep going once it's grumpy and its head bursts into confetti),
grab its head, an arm or a leg and pull it around like a puppet (it stretches like rubber the further you pull and snaps back with a wobble when you let go),
or leave it alone until it gets bored. `follow`, `pet`, `dizzy`, `tickle`, `explode`, `grab` and `bored` are on by
default; `startle` and `shy` are opt-in. A plain click is still a boop; dragging only starts after a few pixels.
The `grab` event carries the `part` (one of `GRAB_PARTS`); in head-only mode (`body={false}`) only the head can be grabbed:

```svelte
<Mascot reactions={['pet', 'shy', 'startle']} onreaction={(e) => console.log(e.type)} />
```

The full figure is 2:3 (`size` is the width). Dress it with `outfit`, `shoes` and `build`, or use `body={false}` for a square head-only avatar:

```svelte
<Mascot outfit="hoodie" shoes="hightops" theme="bred" mood="happy" size={220} />
<Mascot body={false} size={64} />
```

## Gallery

### Moods

<img src=".github/assets/moods.svg" alt="Head-only mascots showing the idle, happy, love, surprised, thinking, wink, sleepy, grumpy, sad and laughing moods" width="100%">

`idle` `happy` `love` `surprised` `thinking` `wink` `sleepy` `grumpy` `sad` `laughing`, plus
`listening`, `talking`, `shy`, `waving`, `focused`, `curious` and `nervous`.

### Colorways

<img src=".github/assets/themes.svg" alt="The same mascot in every built-in colorway" width="100%">

`og` `volt` `ice` `lilac` `mocha` `bred` `noir` `mint` `sunset` `bubblegum` `forest` `midnight` `shadow`,
or bring your own palette through `theme` or CSS variables.

### Wardrobe

<img src=".github/assets/wardrobe.svg" alt="Mascots in overalls, a jersey, a cape, a bowtie, a tie and as a blob, with matching shoes and accessories" width="100%">

```svelte
<Mascot theme="mocha" build="chubby" outfit="overalls" shoes="boots" accessories={['sprout']} />
<Mascot theme="noir" outfit="tie" shoes="hightops" accessories={['shades']} />
<Mascot theme="bubblegum" build="blob" mood="love" accessories={['halo']} />
```

## Props

The value lists grow over time, so the library exports them. Import `MOODS`, `SHAPES`,
`EYE_STYLES`, `ACCESSORIES`, `OUTFITS`, `SHOES`, `BUILDS` and `THEMES` (an object keyed by theme name) to see
every option or to build your own pickers:

```ts
import { MOODS, SHAPES, EYE_STYLES, ACCESSORIES, OUTFITS, SHOES, BUILDS, THEMES } from 'mascbob';
```

| Prop          | Type                                                                                                           | Default    |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| `mood`        | one of `MOODS`                                                                                                 | `idle`     |
| `theme`       | a key of `THEMES`, or `{ base?, bodyLight, bodyMid, bodyDark, visor, eye, cheek, accent }`                     | `og`       |
| `shape`       | one of `SHAPES` (head silhouette)                                                                              | `capsule`  |
| `eyes`        | one of `EYE_STYLES`                                                                                            | `round`    |
| `accessories` | array of `ACCESSORIES`                                                                                         | `[]`       |
| `body`        | full figure with arms and legs, 2:3 (`size` is the width); `false` shows just the head                         | `true`     |
| `outfit`      | one of `OUTFITS`; only visible with `body`                                                                     | `none`     |
| `shoes`       | one of `SHOES`; only visible with `body`                                                                       | `none`     |
| `build`       | one of `BUILDS` (`standard`, `chubby`, `lanky`, `chibi`, `blob`); only visible with `body`                     | `standard` |
| `hands`       | floating hands that gesture with the mood (head-only mode)                                                     | `true`     |
| `lookAt`      | `pointer` `wander` `none` or `{ x, y }` in -1..1                                                               | `pointer`  |
| `level`       | mouth opening 0..1 while `talking` (e.g. mic amplitude); omit for automatic lip movement                       | –          |
| `size`        | px number or any CSS length                                                                                    | `160`      |
| `float`       | idle hover animation (head-only mode; the full figure stands)                                                  | `true`     |
| `effects`     | particles around the head: mood effects (sparkles, hearts, zzz) and boop bursts                                | `true`     |
| `motion`      | `auto` (respects `prefers-reduced-motion`), `full`, `reduced`                                                  | `auto`     |
| `interactive` | render as a button that reacts to clicks                                                                       | `true`     |
| `reactions`   | pointer reactions: `true` (defaults), `false`, a list of `REACTIONS`, or `{ shy: true, bored: false }`         | `true`     |
| `label`       | accessible name                                                                                                | `Mascbob`  |
| `onboop`      | click/tap handler                                                                                              | –          |
| `onreaction`  | called with a `ReactionEvent` (`pet`, `startle`, `dizzy`, `shy`, `tickle`, `explode`, `grab`, `bored`, `wake`) | –          |
| `accessory`   | snippet `({ top, halfWidth })` drawing custom SVG in the head's 200×200 viewBox                                | –          |

## Styling with CSS

Every color is also a CSS variable, which wins over the `theme` prop:

```css
.brand {
	--mascbob-body-light: #fff;
	--mascbob-body-mid: #ffe1f0;
	--mascbob-body-dark: #ffb3d9;
	--mascbob-visor: #1b1030;
	--mascbob-eye: #00ffc6;
	--mascbob-cheek: #ff7ab8;
	--mascbob-accent: #ff4fd8;
	--mascbob-sprout: #6fdc8c;
}
```

## Custom accessories

```svelte
<Mascot>
	{#snippet accessory({ top })}
		<circle cx="100" cy={top - 10} r="8" fill="gold" />
	{/snippet}
</Mascot>
```

## Voice / lip-sync

Set `mood="talking"` and feed an amplitude in 0..1 into `level`. With the Web Audio API
that is a few lines:

```svelte
<script>
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
- `just readme-art` re-renders the images in this README from the real component
- `just release` cuts a release

## License

MIT

<div align="center">
<sub>Made with 🧡 and a slightly misaligned print plate.</sub>
</div>

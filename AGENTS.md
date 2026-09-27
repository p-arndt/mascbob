# mascott

Svelte 5 component library that ships `<Mascot>`, an animated SVG mascot with
moods, themes, shapes, eye styles and accessories. The SvelteKit app in
`src/routes` is the showcase and playground; only `src/lib` is published (via
`svelte-package` into `dist/`).

## Layout

- `src/lib/Mascot.svelte`: the component. The head is drawn in 200×200 coordinates; the
  full figure (default) extends the viewBox to 200×300 with legs and sneakers below.
  Face values are tweened (`Tween.of`), gaze/hands/squish use `Spring`, and loops
  (blink, float, effects) are CSS animations or timers.
- `src/lib/parts/Face.svelte` + `face.ts`: the face is an LED matrix. Expressions are
  modelled as smooth shapes (eyes, brows, mouth, blush), then rasterized: `lightAt`
  returns how strongly each LED is covered. Keep new face features in that model.
- `src/lib/moods.ts`: one `MoodConfig` per mood (face parameters, effect, hand pose, float speed).
  Add a mood here and in `MOODS` in `types.ts`.
- `src/lib/geometry.ts`: body silhouettes, eye/mouth path builders, shared paths.
- `src/lib/parts/Body.svelte` + `body.ts`: torso, collar/outfits, arms (`front`), legs and
  sneakers (`feet`, kept outside the mood tilt so they stay planted).
- `src/lib/themes.ts`: sneaker-style colorways (matte neutral body + one loud accent). Colors reach the SVG through CSS variables
  (`--_mascott-*` from the prop, overridable by public `--mascott-*`).
- `*.spec.ts` run in node; `*.svelte.spec.ts` run in Chromium via vitest browser mode.

## Rules

- Keep the library dependency-free (only the `svelte` peer).
- In SVG, never combine a `transform` attribute and a CSS transform animation on
  the same element: CSS wins. Wrap animated elements in a positioned `<g>`.
- Any new looping animation must stop under `.still` (reduced motion).

## Checks and releases

- `just ci` is the check command (svelte-check, prettier + eslint, tests, package build with publint).
- `just release` (stamp) owns the version in `package.json`; never edit it by hand.

export { default as Mascot } from './Mascot.svelte';
export { MOOD_CONFIGS, moodConfig } from './moods.js';
export { THEMES, resolveTheme, themeStyle } from './themes.js';
export type { ThemeInput, ThemeName } from './themes.js';
export { SHAPE_DEFS } from './geometry.js';
export { BUILD_DEFS } from './parts/body.js';
export type { BuildDef } from './parts/body.js';
export { REACTIONS, DEFAULT_REACTIONS, resolveReactions } from './interaction.js';
export type { Reaction, ReactionEvent, ReactionsInput } from './interaction.js';
export { GRAB_PARTS, DEFAULT_GRAB, resolveGrab } from './grab.js';
export type { GrabOptions, GrabPart } from './grab.js';
export { MOODS, SHAPES, EYE_STYLES, ACCESSORIES, OUTFITS, SHOES, BUILDS } from './types.js';
export type {
	Accessory,
	Build,
	Effect,
	EyeParams,
	EyeStyle,
	FaceParams,
	HandPose,
	LookAt,
	Mood,
	MoodConfig,
	Outfit,
	Motion,
	Shape,
	Shoes,
	ThemeColors
} from './types.js';

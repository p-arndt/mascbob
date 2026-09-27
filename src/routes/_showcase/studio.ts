import {
	ACCESSORIES,
	DEFAULT_REACTIONS,
	REACTIONS,
	type Reaction,
	EYE_STYLES,
	MOODS,
	OUTFITS,
	SHAPES,
	SHOES,
	THEMES,
	type Accessory,
	type EyeStyle,
	type Mood,
	type Motion,
	type Outfit,
	type Shape,
	type Shoes,
	type ThemeColors,
	type ThemeName
} from '$lib/index.js';

export const GAZES = ['pointer', 'wander', 'none'] as const;
export type Gaze = (typeof GAZES)[number];

export const MOTIONS = ['auto', 'full', 'reduced'] as const satisfies readonly Motion[];

/** The colors a user can override in the studio; the body shades are derived from `body`. */
export const COLOR_KEYS = ['bodyMid', 'eye', 'cheek', 'accent'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

/**
 * Stage backdrop presets; any `#rrggbb` works too. `tint` derives a wash from the accent; `paper`
 * is a lit, grainy surface, because shadows read differently on texture than on a flat fill.
 */
export const STAGES = ['tint', 'neutral', 'light', 'dark', 'paper'] as const;
export type StagePreset = (typeof STAGES)[number];
export type Stage = StagePreset | `#${string}`;

export interface StudioConfig {
	mood: Mood;
	theme: ThemeName;
	colors: Partial<Record<ColorKey, string>>;
	shape: Shape;
	eyes: EyeStyle;
	accessories: Accessory[];
	body: boolean;
	outfit: Outfit;
	shoes: Shoes;
	hands: boolean;
	float: boolean;
	effects: boolean;
	lookAt: Gaze;
	reactions: Reaction[];
	motion: Motion;
	interactive: boolean;
	/** Mouth opening while talking; null lets the component babble on its own. */
	level: number | null;
	size: number;
	/** Studio-only: the backdrop behind the preview. Not a component prop, so never in the code. */
	stage: Stage;
}

/** The library's own defaults: generated code and share links only spell out what differs. */
export const LIBRARY_DEFAULTS: StudioConfig = {
	mood: 'idle',
	theme: 'og',
	colors: {},
	shape: 'capsule',
	eyes: 'round',
	accessories: [],
	body: true,
	outfit: 'none',
	shoes: 'none',
	hands: true,
	float: true,
	effects: true,
	lookAt: 'pointer',
	reactions: [...DEFAULT_REACTIONS],
	motion: 'auto',
	interactive: true,
	level: null,
	size: 160,
	stage: 'tint'
};

/** What the studio shows before anyone touches it: dressed up, so the options are discoverable. */
export const STUDIO_START: StudioConfig = {
	...LIBRARY_DEFAULTS,
	mood: 'happy',
	accessories: [],
	outfit: 'puffer',
	shoes: 'sneakers',
	size: 240
};

const HEX = /^#[0-9a-f]{6}$/i;
const oneOf = <T extends string>(list: readonly T[], v: string | null): T | undefined =>
	list.includes(v as T) ? (v as T) : undefined;

export function toQuery(c: StudioConfig): string {
	const q = new URLSearchParams();
	const d = LIBRARY_DEFAULTS;
	for (const key of [
		'mood',
		'theme',
		'shape',
		'eyes',
		'outfit',
		'shoes',
		'lookAt',
		'motion'
	] as const) {
		if (c[key] !== d[key]) q.set(key, c[key]);
	}
	if (c.accessories.length) q.set('acc', c.accessories.join(','));
	for (const key of ['body', 'hands', 'float', 'effects', 'interactive'] as const) {
		if (c[key] !== d[key]) q.set(key, c[key] ? '1' : '0');
	}
	if (!sameSet(c.reactions, d.reactions)) q.set('react', c.reactions.join(',') || 'none');
	if (c.level !== null) q.set('level', String(c.level));
	if (c.size !== d.size) q.set('size', String(c.size));
	if (c.stage !== d.stage) q.set('stage', c.stage.replace('#', ''));
	for (const key of COLOR_KEYS) {
		const v = c.colors[key];
		if (v) q.set(key, v.slice(1).toLowerCase());
	}
	return q.toString();
}

/** Parses a share link; anything missing or invalid falls back to the library default. */
export function fromQuery(q: URLSearchParams): StudioConfig {
	const d = LIBRARY_DEFAULTS;
	const flag = (key: string, fallback: boolean) => (q.has(key) ? q.get(key) === '1' : fallback);
	const size = Number(q.get('size'));
	const level = q.has('level') ? Number(q.get('level')) : NaN;
	const colors: StudioConfig['colors'] = {};
	for (const key of COLOR_KEYS) {
		const v = `#${q.get(key) ?? ''}`;
		if (HEX.test(v)) colors[key] = v.toLowerCase();
	}
	return {
		mood: oneOf(MOODS, q.get('mood')) ?? d.mood,
		theme: oneOf(Object.keys(THEMES) as ThemeName[], q.get('theme')) ?? d.theme,
		colors,
		shape: oneOf(SHAPES, q.get('shape')) ?? d.shape,
		eyes: oneOf(EYE_STYLES, q.get('eyes')) ?? d.eyes,
		accessories: (q.get('acc') ?? '')
			.split(',')
			.filter((a): a is Accessory => ACCESSORIES.includes(a as Accessory)),
		body: flag('body', d.body),
		outfit: oneOf(OUTFITS, q.get('outfit')) ?? d.outfit,
		shoes: oneOf(SHOES, q.get('shoes')) ?? d.shoes,
		hands: flag('hands', d.hands),
		float: flag('float', d.float),
		effects: flag('effects', d.effects),
		lookAt: oneOf(GAZES, q.get('lookAt')) ?? d.lookAt,
		reactions: q.has('react')
			? REACTIONS.filter((r) => (q.get('react') ?? '').split(',').includes(r))
			: [...d.reactions],
		motion: oneOf(MOTIONS, q.get('motion')) ?? d.motion,
		interactive: flag('interactive', d.interactive),
		level: Number.isFinite(level) && level >= 0 && level <= 1 ? level : d.level,
		size: Number.isFinite(size) && size >= 40 && size <= 640 ? Math.round(size) : d.size,
		stage: parseStage(q.get('stage')) ?? d.stage
	};
}

function parseStage(v: string | null): Stage | undefined {
	const preset = oneOf(STAGES, v);
	if (preset) return preset;
	const hex = `#${v ?? ''}`;
	return HEX.test(hex) ? (hex.toLowerCase() as Stage) : undefined;
}

/** Relative luminance of a `#rrggbb` color, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * CSS for the stage. `scheme` pins light or dark on the stage when its backdrop is fixed, so the
 * page's light-dark() tokens (labels, pills, the mood dock) stay readable on top of it; null means
 * the backdrop follows the page scheme.
 */
export function stageStyle(
	stage: Stage,
	accent: string
): { background: string; scheme: 'light' | 'dark' | null } {
	switch (stage) {
		case 'tint':
			return { background: `color-mix(in srgb, ${accent} 14%, var(--bg))`, scheme: null };
		case 'neutral':
			return { background: 'var(--surface)', scheme: null };
		case 'light':
			return { background: '#f5f4f1', scheme: 'light' };
		case 'dark':
			return { background: '#161616', scheme: 'dark' };
		case 'paper':
			return {
				background: [
					'repeating-linear-gradient(0deg, rgb(60 40 10 / 0.03) 0 1px, transparent 1px 3px)',
					'repeating-linear-gradient(90deg, rgb(60 40 10 / 0.02) 0 1px, transparent 1px 4px)',
					'radial-gradient(130% 90% at 40% 20%, #fbf8f1, #efe8d9 60%, #ddd3bf)'
				].join(', '),
				scheme: 'light'
			};
		default:
			// 0.18 is roughly where dark text and light text have equal contrast.
			return { background: stage, scheme: luminance(stage) > 0.18 ? 'light' : 'dark' };
	}
}

function mix(a: string, b: string, t: number): string {
	const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
	return (
		'#' +
		[0, 1, 2]
			.map((i) =>
				Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

/** Theme overrides for the component; one picked body color becomes the three body shades. */
export function themeOverrides(c: StudioConfig): Partial<ThemeColors> {
	const out: Partial<ThemeColors> = {};
	const { bodyMid, ...rest } = c.colors;
	if (bodyMid) {
		out.bodyLight = mix(bodyMid, '#ffffff', 0.55);
		out.bodyMid = bodyMid;
		out.bodyDark = mix(bodyMid, '#000000', 0.18);
	}
	return { ...out, ...rest };
}

export function themeProp(c: StudioConfig) {
	const overrides = themeOverrides(c);
	return Object.keys(overrides).length ? { base: c.theme, ...overrides } : c.theme;
}

export interface Attr {
	name: string;
	value: string;
	/** Rendered as `{value}` rather than a string literal. */
	expr?: boolean;
}

export function mascotAttrs(c: StudioConfig): Attr[] {
	const d = LIBRARY_DEFAULTS;
	const attrs: (Attr | false)[] = [
		c.mood !== d.mood && { name: 'mood', value: c.mood },
		themeAttr(c),
		c.shape !== d.shape && { name: 'shape', value: c.shape },
		c.eyes !== d.eyes && { name: 'eyes', value: c.eyes },
		c.accessories.length > 0 && {
			name: 'accessories',
			value: `[${c.accessories.map((a) => `'${a}'`).join(', ')}]`,
			expr: true
		},
		c.body !== d.body && { name: 'body', value: String(c.body), expr: true },
		c.body && c.outfit !== d.outfit && { name: 'outfit', value: c.outfit },
		c.body && c.shoes !== d.shoes && { name: 'shoes', value: c.shoes },
		c.hands !== d.hands && { name: 'hands', value: String(c.hands), expr: true },
		c.float !== d.float && { name: 'float', value: String(c.float), expr: true },
		c.effects !== d.effects && { name: 'effects', value: String(c.effects), expr: true },
		c.lookAt !== d.lookAt && { name: 'lookAt', value: c.lookAt },
		c.mood === 'talking' &&
			c.level !== null && { name: 'level', value: String(c.level), expr: true },
		c.motion !== d.motion && { name: 'motion', value: c.motion },
		c.interactive !== d.interactive && {
			name: 'interactive',
			value: String(c.interactive),
			expr: true
		},
		c.interactive && reactionsAttr(c),
		c.size !== d.size && { name: 'size', value: String(c.size), expr: true }
	];
	return attrs.filter((a): a is Attr => !!a);
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((x) => b.includes(x));

function reactionsAttr(c: StudioConfig): Attr | false {
	if (sameSet(c.reactions, LIBRARY_DEFAULTS.reactions)) return false;
	if (!c.reactions.length) return { name: 'reactions', value: 'false', expr: true };
	const list = REACTIONS.filter((r) => c.reactions.includes(r));
	return { name: 'reactions', value: `[${list.map((r) => `'${r}'`).join(', ')}]`, expr: true };
}

function themeAttr(c: StudioConfig): Attr | false {
	const theme = themeProp(c);
	if (typeof theme === 'string')
		return theme !== LIBRARY_DEFAULTS.theme && { name: 'theme', value: theme };
	const body = Object.entries(theme)
		.map(([k, v]) => `${k}: '${v}'`)
		.join(', ');
	return { name: 'theme', value: `{ ${body} }`, expr: true };
}

export function attrText(a: Attr): string {
	if (a.value === '') return a.name;
	return a.expr ? `${a.name}={${a.value}}` : `${a.name}="${a.value}"`;
}

/** A complete, paste-ready Svelte component. */
export function svelteFile(c: StudioConfig): string {
	const attrs = mascotAttrs(c);
	const tag = attrs.length
		? `<Mascot\n${attrs.map((a) => `\t${attrText(a)}`).join('\n')}\n/>`
		: '<Mascot />';
	return `<script>\n\timport { Mascot } from 'mascott';\n</script>\n\n${tag}\n`;
}

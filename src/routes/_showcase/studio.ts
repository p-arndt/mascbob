import {
	ACCESSORIES,
	EYE_STYLES,
	MOODS,
	OUTFITS,
	SHAPES,
	SHOES,
	THEMES,
	type Accessory,
	type EyeStyle,
	type Mood,
	type Outfit,
	type Shape,
	type Shoes,
	type ThemeColors,
	type ThemeName
} from '$lib/index.js';

export const GAZES = ['pointer', 'wander', 'none'] as const;
export type Gaze = (typeof GAZES)[number];

/** The colors a user can override in the studio; the body shades are derived from `body`. */
export const COLOR_KEYS = ['bodyMid', 'eye', 'cheek', 'accent'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

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
	lookAt: Gaze;
	size: number;
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
	lookAt: 'pointer',
	size: 160
};

/** What the studio shows before anyone touches it: dressed up, so the options are discoverable. */
export const STUDIO_START: StudioConfig = {
	...LIBRARY_DEFAULTS,
	mood: 'happy',
	accessories: ['ring'],
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
	for (const key of ['mood', 'theme', 'shape', 'eyes', 'outfit', 'shoes', 'lookAt'] as const) {
		if (c[key] !== d[key]) q.set(key, c[key]);
	}
	if (c.accessories.length) q.set('acc', c.accessories.join(','));
	for (const key of ['body', 'hands', 'float'] as const) {
		if (c[key] !== d[key]) q.set(key, c[key] ? '1' : '0');
	}
	if (c.size !== d.size) q.set('size', String(c.size));
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
		lookAt: oneOf(GAZES, q.get('lookAt')) ?? d.lookAt,
		size: Number.isFinite(size) && size >= 40 && size <= 640 ? Math.round(size) : d.size
	};
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
		c.lookAt !== d.lookAt && { name: 'lookAt', value: c.lookAt },
		c.size !== d.size && { name: 'size', value: String(c.size), expr: true }
	];
	return attrs.filter((a): a is Attr => !!a);
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

import type { ThemeColors } from './types.js';

/**
 * Colorways in the spirit of sneaker drops: a matte neutral body and one loud
 * accent. `visor` is the ink tone (soles, outlines), `eye` the LED color.
 */
export const THEMES = {
	og: {
		bodyLight: '#fdfcf8',
		bodyMid: '#eeebe3',
		bodyDark: '#d3cec2',
		visor: '#1d1d1f',
		eye: '#1d1d1f',
		cheek: '#ff7a59',
		accent: '#ff5a1f'
	},
	volt: {
		bodyLight: '#f7f8f5',
		bodyMid: '#e4e7e1',
		bodyDark: '#c6cbc2',
		visor: '#17181a',
		eye: '#17181a',
		cheek: '#ff8a80',
		accent: '#86bc00'
	},
	ice: {
		bodyLight: '#f8fbff',
		bodyMid: '#e5edf7',
		bodyDark: '#c7d5e6',
		visor: '#0f1b2d',
		eye: '#1b5ed6',
		cheek: '#ff8fb1',
		accent: '#2eb0f5'
	},
	lilac: {
		bodyLight: '#faf7ff',
		bodyMid: '#e9e1ff',
		bodyDark: '#cbbcf3',
		visor: '#231638',
		eye: '#5b3fd9',
		cheek: '#ff7ab8',
		accent: '#ff4fa3'
	},
	mocha: {
		bodyLight: '#f7ede1',
		bodyMid: '#e6d3bd',
		bodyDark: '#c9ab8a',
		visor: '#33241a',
		eye: '#33241a',
		cheek: '#ff8f70',
		accent: '#2f6b4f'
	},
	bred: {
		bodyLight: '#3a3a40',
		bodyMid: '#26262b',
		bodyDark: '#141417',
		visor: '#08080a',
		eye: '#ff5a4e',
		cheek: '#ff6b6b',
		accent: '#c00600'
	},
	noir: {
		bodyLight: '#3b3d45',
		bodyMid: '#282a30',
		bodyDark: '#17181c',
		visor: '#050506',
		eye: '#7dffd4',
		cheek: '#ff6fa5',
		accent: '#ff3d8b'
	},
	mint: {
		bodyLight: '#f4fcf8',
		bodyMid: '#dcf3e8',
		bodyDark: '#b1dcc7',
		visor: '#0f2f28',
		eye: '#0f2f28',
		cheek: '#ff8f8f',
		accent: '#ff6f61'
	},
	sunset: {
		bodyLight: '#fff5ec',
		bodyMid: '#ffe0c8',
		bodyDark: '#f3b58c',
		visor: '#3a1630',
		eye: '#3a1630',
		cheek: '#ff6f7d',
		accent: '#ff2e88'
	},
	bubblegum: {
		bodyLight: '#fff6fa',
		bodyMid: '#ffdcea',
		bodyDark: '#f4b2cc',
		visor: '#1e1650',
		eye: '#2b1f7a',
		cheek: '#ff5c9a',
		accent: '#009fdb'
	},
	forest: {
		bodyLight: '#415c4a',
		bodyMid: '#2c4234',
		bodyDark: '#1a2a20',
		visor: '#0a120d',
		eye: '#f4ecd0',
		cheek: '#ff8a65',
		accent: '#f58200'
	},
	midnight: {
		bodyLight: '#34406e',
		bodyMid: '#1f2850',
		bodyDark: '#10152e',
		visor: '#060816',
		eye: '#ffe066',
		cheek: '#ff8fb1',
		accent: '#7a98ff'
	},
	shadow: {
		bodyLight: '#2b2b2e',
		bodyMid: '#18181a',
		bodyDark: '#0a0a0b',
		visor: '#000000',
		eye: '#00e5ff',
		cheek: '#ff4fd8',
		accent: '#ff2bd6'
	}
} satisfies Record<string, ThemeColors>;

export type ThemeName = keyof typeof THEMES;

/** A preset name, a full RGB body color, or a preset extended with color overrides. */
export type ThemeInput = ThemeName | `#${string}` | (Partial<ThemeColors> & { base?: ThemeName });

export function resolveTheme(input: ThemeInput = 'og'): ThemeColors {
	if (typeof input === 'string') {
		if (/^#[0-9a-f]{6}$/i.test(input)) return customTheme(input);
		return THEMES[input as ThemeName] ?? THEMES.og;
	}
	const { base = 'og', ...overrides } = input;
	const defined = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined));
	return { ...(THEMES[base] ?? THEMES.og), ...defined };
}

/** Keep the requested body color exact; derive shading and readable face ink. */
function customTheme(hex: string): ThemeColors {
	const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const mix = (target: number[], amount: number) =>
		'#' +
		rgb
			.map((c, i) =>
				Math.round(c + (target[i] - c) * amount)
					.toString(16)
					.padStart(2, '0')
			)
			.join('');
	const linear = rgb.map((c) => {
		const value = c / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	const lightInk = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] < 0.179;
	const ink = lightInk ? [253, 252, 248] : [29, 29, 31];
	return {
		bodyLight: mix([255, 255, 255], 0.18),
		bodyMid: hex.toLowerCase(),
		bodyDark: mix([0, 0, 0], 0.22),
		visor: '#1d1d1f',
		eye: lightInk ? '#fdfcf8' : '#1d1d1f',
		cheek: '#ff7a59',
		accent: mix(ink, 0.45)
	};
}

const CSS_VARS: Record<keyof ThemeColors, string> = {
	bodyLight: '--_mascbob-body-light',
	bodyMid: '--_mascbob-body-mid',
	bodyDark: '--_mascbob-body-dark',
	visor: '--_mascbob-visor',
	eye: '--_mascbob-eye',
	cheek: '--_mascbob-cheek',
	accent: '--_mascbob-accent'
};

/**
 * Theme as inline custom properties. They are private fallbacks: the component
 * reads `var(--mascbob-eye, var(--_mascbob-eye))`, so a consumer's own
 * `--mascbob-*` variables (set on the mascot or any ancestor) win over the prop.
 */
export function themeStyle(theme: ThemeColors): string {
	return (Object.keys(CSS_VARS) as (keyof ThemeColors)[])
		.map((key) => `${CSS_VARS[key]}: ${theme[key]}`)
		.join('; ');
}

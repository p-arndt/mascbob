import type { ThemeColors } from './types.js';

export const THEMES = {
	aurora: {
		bodyLight: '#ffffff',
		bodyMid: '#dcd6ff',
		bodyDark: '#a9c4ff',
		visor: '#17173a',
		eye: '#7cf3ff',
		cheek: '#ff8fc0',
		accent: '#b69cff'
	},
	peach: {
		bodyLight: '#fff8f2',
		bodyMid: '#ffd6bf',
		bodyDark: '#ffab9c',
		visor: '#2b1a24',
		eye: '#ffe7a3',
		cheek: '#ff7a95',
		accent: '#ffb38a'
	},
	mint: {
		bodyLight: '#f6fffb',
		bodyMid: '#c4f5df',
		bodyDark: '#8fdcc6',
		visor: '#0f2e2a',
		eye: '#b6ffe0',
		cheek: '#ff9bb4',
		accent: '#5eead4'
	},
	bubblegum: {
		bodyLight: '#fff5fc',
		bodyMid: '#ffcdec',
		bodyDark: '#d5b6ff',
		visor: '#2a1036',
		eye: '#ffffff',
		cheek: '#ff5fa2',
		accent: '#f472b6'
	},
	sunny: {
		bodyLight: '#fffdf0',
		bodyMid: '#fff0a8',
		bodyDark: '#ffcf7a',
		visor: '#2a2210',
		eye: '#ffd76a',
		cheek: '#ff9e7a',
		accent: '#facc15'
	},
	midnight: {
		bodyLight: '#7c80c9',
		bodyMid: '#3d4080',
		bodyDark: '#24214f',
		visor: '#07081a',
		eye: '#ffd76e',
		cheek: '#ff6fa5',
		accent: '#f0abfc'
	},
	holo: {
		bodyLight: '#ffffff',
		bodyMid: '#d9f4ff',
		bodyDark: '#c2b6ff',
		visor: '#0f1533',
		eye: '#9dfcff',
		cheek: '#ff9ad5',
		accent: '#6ee7f9'
	},
	lavender: {
		bodyLight: '#fdfaff',
		bodyMid: '#eadfff',
		bodyDark: '#c4a9f4',
		visor: '#231638',
		eye: '#ead2ff',
		cheek: '#ff9cc9',
		accent: '#a78bfa'
	},
	noir: {
		bodyLight: '#6a6d80',
		bodyMid: '#2e3040',
		bodyDark: '#16171f',
		visor: '#050508',
		eye: '#7dffd4',
		cheek: '#ff6b9a',
		accent: '#8b7bff'
	}
} satisfies Record<string, ThemeColors>;

export type ThemeName = keyof typeof THEMES;

/** A preset name, or a preset extended with color overrides. */
export type ThemeInput = ThemeName | (Partial<ThemeColors> & { base?: ThemeName });

export function resolveTheme(input: ThemeInput = 'aurora'): ThemeColors {
	if (typeof input === 'string') return THEMES[input] ?? THEMES.aurora;
	const { base = 'aurora', ...overrides } = input;
	const defined = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined));
	return { ...(THEMES[base] ?? THEMES.aurora), ...defined };
}

const CSS_VARS: Record<keyof ThemeColors, string> = {
	bodyLight: '--_mascott-body-light',
	bodyMid: '--_mascott-body-mid',
	bodyDark: '--_mascott-body-dark',
	visor: '--_mascott-visor',
	eye: '--_mascott-eye',
	cheek: '--_mascott-cheek',
	accent: '--_mascott-accent'
};

/**
 * Theme as inline custom properties. They are private fallbacks: the component
 * reads `var(--mascott-eye, var(--_mascott-eye))`, so a consumer's own
 * `--mascott-*` variables (set on the mascot or any ancestor) win over the prop.
 */
export function themeStyle(theme: ThemeColors): string {
	return (Object.keys(CSS_VARS) as (keyof ThemeColors)[])
		.map((key) => `${CSS_VARS[key]}: ${theme[key]}`)
		.join('; ');
}

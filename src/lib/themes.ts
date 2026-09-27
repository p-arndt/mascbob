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
		eye: '#fffbe6',
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

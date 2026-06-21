// AtlaasGo 3.0 — design tokens (RN port of app2.css :root / [data-theme]).
// Warm-Atlas terracotta + amber on cream/ink, light + dark variants.
//
// The existing mobile app has no React ThemeProvider — lib/theme.ts is a static
// brand-token object and the root <StatusBar style="dark" />. So useAg3Theme()
// derives light/dark from RN's useColorScheme(); screens can also force a scheme.
// Brand constants (primary/amber/coral) are re-exported from lib/theme.ts so the
// 3.0 palette stays in lock-step with the existing one.
import { useColorScheme } from 'react-native';
import { theme as baseTheme } from '../../lib/theme';

/* ── brand constants (shared by light + dark) ─────────────────────────────── */
const BRAND = {
  primary: baseTheme.colors.primary, // #FF5722
  primary2: '#FF7849',
  coral: baseTheme.colors.coral, // #FF8A65
  amber: baseTheme.colors.amber, // #FFB74D
  ok: '#2FA36B',
  warn: '#E8A93B',
  snow: '#3E86C7', // light-mode snow accent
  snowDark: '#8FBDEC', // dark-mode snow accent
} as const;

export interface Ag3Palette {
  // brand
  primary: string;
  primary2: string;
  coral: string;
  amber: string;
  // neutrals
  bg: string;
  bg2: string;
  surface: string;
  surface2: string;
  sand: string;
  // text
  fg: string;
  ink: string; // alias of fg (the prototype uses --ink for darkest text)
  fgSoft: string;
  muted: string;
  // lines
  line: string;
  line2: string;
  // status
  ok: string;
  warn: string;
  snow: string;
  // on-gradient / on-primary text
  onPrimary: string;
}

/* ── light ────────────────────────────────────────────────────────────────── */
export const lightPalette: Ag3Palette = {
  primary: BRAND.primary,
  primary2: BRAND.primary2,
  coral: BRAND.coral,
  amber: BRAND.amber,
  bg: '#FBF6EF',
  bg2: '#F3E9DC',
  surface: '#FFFFFF',
  surface2: '#FBF4EA',
  sand: '#F5E6D3',
  fg: '#1A1410',
  ink: '#1A1410',
  fgSoft: '#5A4F46',
  muted: '#8C7C6E',
  line: 'rgba(26,20,16,0.09)',
  line2: 'rgba(26,20,16,0.055)',
  ok: BRAND.ok,
  warn: BRAND.warn,
  snow: BRAND.snow,
  onPrimary: '#FFFFFF',
};

/* ── dark ─────────────────────────────────────────────────────────────────── */
export const darkPalette: Ag3Palette = {
  primary: BRAND.primary,
  primary2: BRAND.primary2,
  coral: BRAND.coral,
  amber: BRAND.amber,
  bg: '#100B07',
  bg2: '#19120C',
  surface: '#1C150E',
  surface2: '#231910',
  sand: '#2A2017',
  fg: '#F6EFE7',
  ink: '#F6EFE7',
  fgSoft: '#C8B9AA',
  muted: '#8C7C6E',
  line: 'rgba(246,239,231,0.11)',
  line2: 'rgba(246,239,231,0.06)',
  ok: BRAND.ok,
  warn: BRAND.warn,
  snow: BRAND.snowDark,
  onPrimary: '#FFFFFF',
};

/* ── gradients (sunset canopy + tile palette) ─────────────────────────────── */
// Use with expo-linear-gradient: <LinearGradient colors={gradients.warm} .../>.
export const gradients = {
  // --grad: 135deg primary → amber
  sunset: [BRAND.primary, BRAND.amber] as const,
  // --grad-warm: 150deg primary → mid → amber
  warm: ['#FF5722', '#FF7E54', '#FFB74D'] as const,
  // --grad-soft: faint brand wash (use over surfaces)
  soft: ['rgba(255,87,34,0.14)', 'rgba(255,183,77,0.14)'] as const,
  // photo-tile gradients (tile-a..f from app2.css)
  tileA: ['#FF8A65', '#C2185B'] as const,
  tileB: ['#FFB74D', '#FF7043'] as const,
  tileC: ['#E0945C', '#7B4A2E'] as const,
  tileD: ['#7FB069', '#3E6B4A'] as const,
  tileE: ['#9C6ADE', '#5A3A8E'] as const,
  tileF: ['#5AA9E6', '#2A5C8E'] as const,
  // standard LinearGradient start/end for the 135–150deg look
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

export type TileKey = 'tile-a' | 'tile-b' | 'tile-c' | 'tile-d' | 'tile-e' | 'tile-f';
export const tileGradients: Record<TileKey, readonly [string, string]> = {
  'tile-a': gradients.tileA,
  'tile-b': gradients.tileB,
  'tile-c': gradients.tileC,
  'tile-d': gradients.tileD,
  'tile-e': gradients.tileE,
  'tile-f': gradients.tileF,
};

/* ── radii (--r-sm/--r/--r-lg/--r-xl) ─────────────────────────────────────── */
export const radii = {
  sm: 14,
  md: 20,
  lg: 26,
  xl: 34,
  pill: 999,
} as const;

/* ── shadows (RN shadow props; --sh-1/--sh-2/--sh-glow) ───────────────────── */
export const shadows = {
  // --sh-1: soft card lift
  card: {
    shadowColor: '#1A1410',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  // --sh-2: pronounced lift (sheets / featured)
  lift: {
    shadowColor: '#1A1410',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    elevation: 10,
  },
  // --sh-glow: brand glow under primary buttons / active tokens
  glow: {
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 38,
    elevation: 12,
  },
} as const;

export type Scheme = 'light' | 'dark';

export interface Ag3Theme {
  scheme: Scheme;
  isDark: boolean;
  colors: Ag3Palette;
  gradients: typeof gradients;
  tileGradients: typeof tileGradients;
  radii: typeof radii;
  shadows: typeof shadows;
}

export function paletteFor(scheme: Scheme): Ag3Palette {
  return scheme === 'dark' ? darkPalette : lightPalette;
}

/**
 * useAg3Theme — the 3.0 theme hook every screen/primitive consumes.
 * Reads RN's color scheme (light/dark). Pass `force` to pin a scheme (e.g. a
 * screen that follows the user's saved profile.theme via agApi.me).
 */
export function useAg3Theme(force?: Scheme): Ag3Theme {
  const system = useColorScheme();
  const scheme: Scheme = force ?? (system === 'dark' ? 'dark' : 'light');
  const isDark = scheme === 'dark';
  return {
    scheme,
    isDark,
    colors: paletteFor(scheme),
    gradients,
    tileGradients,
    radii,
    shadows,
  };
}

// Static default (light) for non-hook contexts (StyleSheet factories, etc.).
export const ag3Theme: Ag3Theme = {
  scheme: 'light',
  isDark: false,
  colors: lightPalette,
  gradients,
  tileGradients,
  radii,
  shadows,
};

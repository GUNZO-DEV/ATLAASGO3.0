// AtlaasGo ADMIN — design tokens layered ON the ag3 customer design system.
//
// This does NOT re-derive the ag3 palette. It pulls the live Ag3Theme (warm-Atlas
// terracotta on cream/ink, light + dark) and adds only the few admin-console extras
// the contract asks for: a coral primary (#FF5722), the four status hues
// (live=ok / pending=warn / paused=muted / off=red), the three storefront verticals,
// and a shared "ink gradient" + card base used across the admin primitives.
//
// Import the ag3 theme via useAg3Theme() in components; use admStatus()/admVertical()
// here to resolve a status/vertical → color + label off that live theme so dark mode
// keeps working for free.
import type { Ag3Theme } from '../ag3/theme';
import type { ViewStyle } from 'react-native';

/* ── admin brand constants ────────────────────────────────────────────────── */
export const ADM = {
  // Coral primary (matches ag3 BRAND.primary / lib/theme primary).
  coral: '#FF5722',
  coral2: '#FF7849',
  // Status red is not in the ag3 palette — admin needs a true "off/failed" red.
  red: '#E5484D',
  redDark: '#FF6369',
} as const;

/* ── statuses — live / pending / paused / off ─────────────────────────────── */
// The console maps many domain states onto these four buckets:
//   live    → ok    (restaurant 'live', rider 'online', payout 'paid', promo active)
//   pending → warn  (applications pending, payout 'pending'/'processing', draft)
//   paused  → muted (restaurant 'paused', promo inactive)
//   off     → red   (rejected, payout 'failed', rider 'offline')
export type AdmStatus = 'live' | 'pending' | 'paused' | 'off';

export interface StatusStyle {
  fg: string;
  bg: string;
  label: string;
}

const STATUS_ALPHA = '22'; // ~0.13 fill behind the pill

export function admStatus(t: Ag3Theme, status: AdmStatus): StatusStyle {
  const red = t.isDark ? ADM.redDark : ADM.red;
  const map: Record<AdmStatus, { fg: string; label: string }> = {
    live: { fg: t.colors.ok, label: 'Live' },
    pending: { fg: t.colors.warn, label: 'Pending' },
    paused: { fg: t.colors.muted, label: 'Paused' },
    off: { fg: red, label: 'Off' },
  };
  const { fg, label } = map[status];
  return { fg, bg: fg + STATUS_ALPHA, label };
}

/* ── verticals — food / grocery / pharmacy ────────────────────────────────── */
export type AdmVertical = 'food' | 'grocery' | 'pharmacy';

export interface VerticalStyle {
  fg: string;
  bg: string;
  label: string;
  emoji: string;
}

export function admVertical(t: Ag3Theme, vertical: AdmVertical): VerticalStyle {
  const map: Record<AdmVertical, { fg: string; label: string; emoji: string }> = {
    food: { fg: t.colors.primary, label: 'Food', emoji: '🍽' },
    grocery: { fg: t.colors.ok, label: 'Grocery', emoji: '🛒' },
    pharmacy: { fg: t.colors.snow, label: 'Pharmacy', emoji: '💊' },
  };
  const { fg, label, emoji } = map[vertical];
  return { fg, bg: fg + STATUS_ALPHA, label, emoji };
}

/* ── ink gradient — the dark LiveOps hero panel ───────────────────────────── */
// A deep ink → warm-ink ramp the LiveOpsCard sits on (always dark regardless of
// scheme, like a "command bar"). Use with expo-linear-gradient.
export const inkGradient = ['#1A1410', '#2A2017'] as const;
export const inkGradientWarm = ['#221813', '#3A2415'] as const;

/* ── shared admin card base ───────────────────────────────────────────────── */
// Mirrors ag3's local cardBase() (not exported there). Surface + hairline + soft
// lift, themed off the live Ag3Theme.
export function admCard(t: Ag3Theme): ViewStyle {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  };
}

/* ── money formatting — admin reads dh amounts everywhere ─────────────────── */
// Grouped thousands, no decimals for whole dirhams (12 500 dh), 2dp otherwise.
export function fmtDh(v: number): string {
  const whole = Number.isInteger(v);
  const n = whole ? v : Math.round(v * 100) / 100;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

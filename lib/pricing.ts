const ZONE_FEES: Record<string, number> = {
  ifrane: 15,
  oujda:  10,
};

const DEFAULT_FEE          = 15;
const LATE_NIGHT_MULTIPLIER = 1.5;
const LATE_NIGHT_START      = 23; // 11 PM
const LATE_NIGHT_END        =  5; //  5 AM (exclusive)

/** Base fee for a zone — used when displaying fees on already-placed orders. */
export function getDeliveryFee(zone: string): number {
  return ZONE_FEES[zone.toLowerCase()] ?? DEFAULT_FEE;
}

/** Returns true when the given date falls in late-night hours (23:00 – 04:59). */
export function isLateNight(at: Date = new Date()): boolean {
  const h = at.getHours();
  return h >= LATE_NIGHT_START || h < LATE_NIGHT_END;
}

/**
 * Full fee calculation for a new order.
 * Applies the late-night multiplier (1.5×) for orders placed 11 PM – 5 AM.
 * Result is rounded to the nearest 0.5 MAD.
 */
export function calculateFee(zone: string, at: Date = new Date()): number {
  const base = getDeliveryFee(zone);
  const raw  = isLateNight(at) ? base * LATE_NIGHT_MULTIPLIER : base;
  return Math.round(raw * 2) / 2; // round to nearest 0.5
}

export function formatMAD(amount: number): string {
  return `${amount} MAD`;
}

// ─── Surge pricing ────────────────────────────────────────────────────────────
import { getZoneConfig } from "@/constants/zones";

const SURGE_RATIO_THRESHOLD = 2.0;

export function isSurge(pendingOrders: number, onlineDrivers: number): boolean {
  if (onlineDrivers === 0) return false;
  return pendingOrders / onlineDrivers > SURGE_RATIO_THRESHOLD;
}

export function calculateSurgeFee(
  zone: string,
  pendingOrders: number,
  onlineDrivers: number,
  at: Date = new Date()
): number {
  const config = getZoneConfig(zone);
  const base = config.baseFee;
  const multiplier = isSurge(pendingOrders, onlineDrivers)
    ? config.surgeMultiplier
    : 1;
  return Math.round(base * multiplier * 2) / 2;
}

import { useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

/**
 * Broadcasts the rider's GPS to rider_locations so the customer can track them
 * live AND so dispatch can pick the nearest online rider. RLS "rider_locations:
 * self write".
 *
 * Two screens mount this hook (the home tab while online, and the active
 * delivery screen). Running an expo-location watcher in each would spawn
 * duplicate watchers and double-write every fix. So a single module-level
 * watcher is shared via a tiny ref-counted registry:
 *  - the watcher starts on the first subscriber and stops when the last leaves;
 *  - it broadcasts the WHOLE time the rider is online — even when idle — at a
 *    relaxed cadence, so the dispatcher always has a fresh location;
 *  - `highCadence` (an active delivery in progress) tightens the cadence for
 *    smooth live tracking; the watcher uses the tightest cadence any current
 *    subscriber asks for.
 *
 * @param riderId  auth user id (rider_locations.rider_id); undefined = signed out
 * @param highCadence  true while an active delivery is in flight (tight cadence)
 */

type Cadence = { timeInterval: number; distanceInterval: number };
const IDLE_CADENCE: Cadence = { timeInterval: 30_000, distanceInterval: 60 };
const ACTIVE_CADENCE: Cadence = { timeInterval: 6_000, distanceInterval: 15 };

type Registry = {
  riderId: string;
  subscribers: Set<symbol>;
  highCadence: Set<symbol>;
  sub: Location.LocationSubscription | null;
  starting: boolean;
};

// One registry per riderId (in practice always a single rider per app instance).
const registries = new Map<string, Registry>();

function desiredCadence(reg: Registry): Cadence {
  return reg.highCadence.size > 0 ? ACTIVE_CADENCE : IDLE_CADENCE;
}

async function startWatcher(reg: Registry): Promise<void> {
  if (reg.sub || reg.starting) return;
  reg.starting = true;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    // If everyone unsubscribed while we awaited permission, bail out.
    if (status !== 'granted' || reg.subscribers.size === 0) {
      reg.starting = false;
      return;
    }
    const cadence = desiredCadence(reg);
    reg.sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, ...cadence },
      (pos) => {
        void supabase.from('rider_locations').insert({
          rider_id: reg.riderId,
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy ?? undefined },
          speed_mps: pos.coords.speed ?? null,
          heading_deg: pos.coords.heading ?? null,
        });
      },
    );
  } catch {
    // location unavailable / permission denied — silent (polling covers tracking)
  } finally {
    reg.starting = false;
  }
}

function stopWatcher(reg: Registry): void {
  if (reg.sub) {
    reg.sub.remove();
    reg.sub = null;
  }
}

/** Restart the watcher when the effective cadence changes (idle ⇄ active). */
async function retune(reg: Registry): Promise<void> {
  if (reg.subscribers.size === 0) {
    stopWatcher(reg);
    return;
  }
  stopWatcher(reg);
  await startWatcher(reg);
}

export function useBroadcastLocation(riderId: string | undefined, highCadence: boolean): void {
  useEffect(() => {
    if (!riderId) return;
    const token = Symbol('broadcast');

    let reg = registries.get(riderId);
    if (!reg) {
      reg = { riderId, subscribers: new Set(), highCadence: new Set(), sub: null, starting: false };
      registries.set(riderId, reg);
    }
    const wasHigh = reg.highCadence.size > 0;
    reg.subscribers.add(token);
    if (highCadence) reg.highCadence.add(token);

    if (!reg.sub && !reg.starting) {
      void startWatcher(reg);
    } else if (highCadence && !wasHigh) {
      void retune(reg); // tighten cadence now that a delivery is active
    }

    return () => {
      const r = registries.get(riderId);
      if (!r) return;
      const wasHighCadence = r.highCadence.size > 0;
      r.subscribers.delete(token);
      r.highCadence.delete(token);
      if (r.subscribers.size === 0) {
        stopWatcher(r);
        registries.delete(riderId);
      } else if (wasHighCadence && r.highCadence.size === 0) {
        void retune(r); // last active delivery ended → relax cadence
      }
    };
  }, [riderId, highCadence]);
}

import { useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

/**
 * While a delivery is active, broadcasts the rider's GPS to rider_locations so
 * the customer can track them live on a map. Watches position (throttled) and
 * inserts points; stops when inactive or unmounted. RLS "rider_locations: self
 * write" scopes inserts to the signed-in rider.
 */
export function useBroadcastLocation(riderId: string | undefined, active: boolean): void {
  useEffect(() => {
    if (!riderId || !active) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 6000, distanceInterval: 15 },
          (pos) => {
            void supabase.from('rider_locations').insert({
              rider_id: riderId,
              coords: {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracyM: pos.coords.accuracy ?? undefined,
              },
              speed_mps: pos.coords.speed ?? null,
              heading_deg: pos.coords.heading ?? null,
            });
          },
        );
      } catch {
        // location unavailable / permission denied — tracking just won't broadcast
      }
    })();

    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [riderId, active]);
}

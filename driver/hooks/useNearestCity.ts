import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

/**
 * Resolves the rider's nearest SERVED city for the weather/boost banner and the
 * pool default. Takes one foreground GPS fix, then picks the closest row in
 * public.cities (served=true) by haversine. The last good result is persisted in
 * AsyncStorage so the banner has a city instantly on cold start and survives a
 * permission denial.
 *
 * Graceful fallbacks, in order:
 *   1. fresh GPS fix → nearest served city
 *   2. last persisted result
 *   3. the first served city (alphabetical by sort) — the order-pool modal's
 *      default city — so the UI never sits empty.
 */
export type NearestCity = { city: string; cityId: string; locating: boolean };

type CityRow = { id: string; name: string; lat: number | null; lng: number | null };

const STORAGE_KEY = 'driver:nearestCity:v1';

const EARTH_KM = 6371;
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function fetchServedCities(): Promise<CityRow[]> {
  const { data } = await supabase
    .from('cities')
    .select('id, name, lat, lng')
    .eq('served', true)
    .order('sort_order', { ascending: true });
  return ((data ?? []) as CityRow[]).filter((c) => c.lat != null && c.lng != null);
}

export function useNearestCity(): NearestCity {
  const [city, setCity] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);
  const settledFromGps = useRef(false);

  const persist = useCallback(async (id: string, name: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ cityId: id, city: name }));
    } catch {
      // best-effort cache
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Seed instantly from the persisted result while we locate.
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached) as { cityId?: string; city?: string };
          if (parsed.cityId && parsed.city) {
            setCityId(parsed.cityId);
            setCity(parsed.city);
          }
        }
      } catch {
        // ignore — fall through to GPS / default
      }

      const served = await fetchServedCities();
      if (cancelled) return;
      if (served.length === 0) {
        setLocating(false);
        return;
      }

      // 2. Try a fresh GPS fix → nearest served city.
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled) return;
          let best: CityRow | null = null;
          let bestKm = Infinity;
          for (const c of served) {
            const km = haversineKm(pos.coords.latitude, pos.coords.longitude, c.lat as number, c.lng as number);
            if (km < bestKm) {
              bestKm = km;
              best = c;
            }
          }
          if (best) {
            settledFromGps.current = true;
            setCityId(best.id);
            setCity(best.name);
            void persist(best.id, best.name);
            setLocating(false);
            return;
          }
        }
      } catch {
        // location unavailable / permission denied — fall through
      }

      if (cancelled || settledFromGps.current) return;

      // 3. No GPS and no cache → default to the first served city.
      setCityId((prev) => prev ?? served[0].id);
      setCity((prev) => prev ?? served[0].name);
      setLocating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [persist]);

  return { city: city ?? '', cityId: cityId ?? '', locating };
}

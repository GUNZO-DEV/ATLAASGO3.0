import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Admin city management — the served-city roster, each city's delivery-fee
 * schedule (from `city_fees`, keyed by cities.id), and how many merchants sit
 * in it. Writes (add city, flip served, save fee) hit `cities` / `city_fees`
 * and rely on their admin-write RLS.
 *
 * Merchant count: restaurants store the city *name* in `restaurants.city`
 * (e.g. "Ifrane"), while cities.id is the lowercase slug ("ifrane") — so we
 * bucket restaurants by a case-insensitive match against both id and name.
 * (riders has no city column, so there is intentionally no driver count.)
 */

export type CityFee = {
  base: number;
  perKm: number;
  freeOver: number;
  priority: number;
  smallCart: number;
  weather: number;
};

export type AdminCity = {
  id: string;
  name: string;
  campus: boolean;
  weather: boolean;
  served: boolean;
  merchantCount: number;
  fee: CityFee;
};

export type NewCity = {
  id: string;
  name: string;
  campus?: boolean;
  weather?: boolean;
  served?: boolean;
};

type MutationResult = { ok: boolean; error?: string };

const ZERO_FEE: CityFee = {
  base: 0,
  perKm: 0,
  freeOver: 0,
  priority: 0,
  smallCart: 0,
  weather: 0,
};

type CityRow = {
  id: string;
  name: string;
  campus: boolean | null;
  weather: boolean | null;
  served: boolean | null;
};

type CityFeeRow = {
  city_id: string;
  base_dh: number | null;
  per_km_dh: number | null;
  free_over_dh: number | null;
  priority_dh: number | null;
  small_cart_dh: number | null;
  weather_dh: number | null;
};

type RestaurantCityRow = { city: string | null };

function feeFromRow(r: CityFeeRow | undefined): CityFee {
  if (!r) return { ...ZERO_FEE };
  return {
    base: r.base_dh ?? 0,
    perKm: r.per_km_dh ?? 0,
    freeOver: r.free_over_dh ?? 0,
    priority: r.priority_dh ?? 0,
    smallCart: r.small_cart_dh ?? 0,
    weather: r.weather_dh ?? 0,
  };
}

export function useCities() {
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: cityRows }, { data: feeRows }, { data: restRows }] = await Promise.all([
      supabase
        .from('cities')
        .select('id,name,campus,weather,served')
        .order('sort_order', { ascending: true }),
      supabase
        .from('city_fees')
        .select('city_id,base_dh,per_km_dh,free_over_dh,priority_dh,small_cart_dh,weather_dh'),
      supabase.from('restaurants').select('city'),
    ]);

    const feeMap = new Map<string, CityFeeRow>();
    ((feeRows ?? []) as CityFeeRow[]).forEach((f) => feeMap.set(f.city_id, f));

    // Bucket merchants by a case-insensitive key so "Ifrane" (restaurants.city)
    // lands on "ifrane" (cities.id).
    const countMap = new Map<string, number>();
    ((restRows ?? []) as RestaurantCityRow[]).forEach((r) => {
      if (!r.city) return;
      const key = r.city.trim().toLowerCase();
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    });

    setCities(
      ((cityRows ?? []) as CityRow[]).map((c) => {
        const idKey = c.id.trim().toLowerCase();
        const nameKey = c.name.trim().toLowerCase();
        const merchantCount = (countMap.get(idKey) ?? 0) + (idKey === nameKey ? 0 : countMap.get(nameKey) ?? 0);
        return {
          id: c.id,
          name: c.name,
          campus: c.campus ?? false,
          weather: c.weather ?? false,
          served: c.served ?? false,
          merchantCount,
          fee: feeFromRow(feeMap.get(c.id)),
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCity = useCallback(
    async (d: NewCity): Promise<MutationResult> => {
      const { error } = await supabase.from('cities').insert({
        id: d.id,
        name: d.name,
        campus: d.campus ?? false,
        weather: d.weather ?? false,
        served: d.served ?? false,
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const toggleServed = useCallback(
    async (id: string, served: boolean): Promise<MutationResult> => {
      const { error } = await supabase.from('cities').update({ served }).eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const saveFee = useCallback(
    async (cityId: string, fee: CityFee): Promise<MutationResult> => {
      const { error } = await supabase.from('city_fees').upsert(
        {
          city_id: cityId,
          base_dh: fee.base,
          per_km_dh: fee.perKm,
          free_over_dh: fee.freeOver,
          priority_dh: fee.priority,
          small_cart_dh: fee.smallCart,
          weather_dh: fee.weather,
        },
        { onConflict: 'city_id' },
      );
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { cities, loading, refresh, addCity, toggleServed, saveFee };
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Live weather + surge for a served city (public.city_weather, refreshed by a
 * pg_cron job from Open-Meteo). Drives the driver's "snow boost" banner: a boost
 * is on when the city carries a surcharge OR the condition reads as snow.
 * Realtime-subscribed so the banner flips the moment the cron updates the row.
 *
 * Degrades to nulls / isBoost=false when there's no row or no cityId.
 */
export type CityWeather = {
  condition: string | null;
  tempC: number | null;
  surchargeDh: number;
  note: string | null;
  isBoost: boolean;
};

type WeatherRow = {
  condition: string | null;
  temp_c: number | null;
  surcharge_dh: number | null;
  note: string | null;
};

const EMPTY: CityWeather = { condition: null, tempC: null, surchargeDh: 0, note: null, isBoost: false };

function shape(row: WeatherRow | null): CityWeather {
  if (!row) return EMPTY;
  const surchargeDh = row.surcharge_dh ?? 0;
  const condition = row.condition ?? null;
  return {
    condition,
    tempC: row.temp_c ?? null,
    surchargeDh,
    note: row.note ?? null,
    isBoost: surchargeDh > 0 || (!!condition && /snow/i.test(condition)),
  };
}

export function useCityWeather(cityId: string | null | undefined): CityWeather {
  const [weather, setWeather] = useState<CityWeather>(EMPTY);

  const refresh = useCallback(async () => {
    if (!cityId) {
      setWeather(EMPTY);
      return;
    }
    const { data } = await supabase
      .from('city_weather')
      .select('condition, temp_c, surcharge_dh, note')
      .eq('city_id', cityId)
      .maybeSingle();
    setWeather(shape((data as WeatherRow | null) ?? null));
  }, [cityId]);

  useEffect(() => {
    if (!cityId) {
      setWeather(EMPTY);
      return;
    }
    void refresh();

    const channel = supabase
      .channel(`city-weather-${cityId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'city_weather', filter: `city_id=eq.${cityId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cityId, refresh]);

  return weather;
}

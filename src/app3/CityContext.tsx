// AtlaasGo 3.0 — selected-city context.
// Loads cities via agApi.cities.list(); defaults to 'ifrane' (or first);
// persists the chosen id to localStorage 'ag3-city'. City carries
// campus / weather / defaultAddress used for home gating + the deliver-to pill.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { agApi, type City } from '../lib/agApi';

const STORAGE_KEY = 'ag3-city';

type CityCtx = {
  city: City | null;
  cities: City[];
  setCity: (c: City) => void;
  loading: boolean;
};

const Ctx = createContext<CityCtx | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    agApi.cities
      .list()
      .then((list) => {
        if (cancelled) return;
        setCities(list);
        setCityId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          const preferred = list.find((c) => c.id === 'ifrane') ?? list[0] ?? null;
          return preferred?.id ?? null;
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCity = (c: City) => {
    setCityId(c.id);
    try {
      localStorage.setItem(STORAGE_KEY, c.id);
    } catch {
      /* ignore */
    }
  };

  const city = useMemo(() => cities.find((c) => c.id === cityId) ?? null, [cities, cityId]);

  const value = useMemo<CityCtx>(() => ({ city, cities, setCity, loading }), [city, cities, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCity must be used inside CityProvider');
  return ctx;
}

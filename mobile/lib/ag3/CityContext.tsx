// AtlaasGo 3.0 — selected-city context (RN port of src/app3/CityContext.tsx).
// Loads cities via agApi.cities.list(); defaults to 'ifrane' (or first);
// persists the chosen id to AsyncStorage 'ag3-city'. City carries
// campus / weather / defaultAddress used for home gating + the deliver-to pill.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { agApi, type City } from './agApi';

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
  const [cityId, setCityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate the persisted city id once (AsyncStorage is async, unlike web's
  // synchronous localStorage). Runs before/alongside the cities fetch; whichever
  // resolves first, the cities effect reconciles against the stored id.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && stored) setCityId((prev) => prev ?? stored);
      })
      .catch(() => {
        /* ignore — fall through to ifrane default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    agApi.cities
      .list()
      .then((list) => {
        if (cancelled) return;
        setCities(list);
        setCityId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          const preferred = list.find((c) => c.served) ?? list.find((c) => c.id === 'ifrane') ?? list[0] ?? null;
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
    void AsyncStorage.setItem(STORAGE_KEY, c.id).catch(() => {
      /* ignore */
    });
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

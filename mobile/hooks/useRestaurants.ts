import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Live restaurants from the SAME Supabase backend as the web app.
 * Anon-readable (RLS policy "restaurants: public read live"), so this works
 * before mobile auth is wired. This hook is the first proof that the mobile
 * app talks to the real production backend.
 */
export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  cuisine: string | null;
  emoji: string | null;
  rating: number | null;
  time_min: number | null;
  fee_dh: number | null;
  coords: { lat: number; lng: number } | null;
};

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('restaurants')
        .select('id, slug, name, cuisine, emoji, rating, time_min, fee_dh, coords')
        .eq('status', 'live')
        .order('name');
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else {
        setRestaurants((data ?? []) as Restaurant[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { restaurants, loading, error };
}

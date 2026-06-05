import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Restaurant favorites for the signed-in user. favorites has an ALL RLS policy
 * scoped to the user; rows are (user_id, kind, target_id). We use
 * kind='restaurant' and join restaurants for the favorites list.
 */
export type FavoriteRestaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  emoji: string | null;
  rating: number | null;
};

export function useFavorites() {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [restaurants, setRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      setRestaurants([]);
      setLoading(false);
      return;
    }
    const { data: favs } = await supabase
      .from('favorites')
      .select('target_id')
      .eq('kind', 'restaurant');
    const targetIds = ((favs ?? []) as { target_id: string }[]).map((f) => f.target_id);
    setIds(new Set(targetIds));

    if (targetIds.length === 0) {
      setRestaurants([]);
      setLoading(false);
      return;
    }
    const { data: rs } = await supabase
      .from('restaurants')
      .select('id, name, cuisine, emoji, rating')
      .in('id', targetIds);
    setRestaurants((rs ?? []) as FavoriteRestaurant[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isFavorite = (restaurantId: string) => ids.has(restaurantId);

  async function toggle(restaurantId: string): Promise<void> {
    if (!user) return;
    if (ids.has(restaurantId)) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('kind', 'restaurant')
        .eq('target_id', restaurantId);
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, kind: 'restaurant', target_id: restaurantId });
    }
    await load();
  }

  return { ids, restaurants, loading, isFavorite, toggle };
}

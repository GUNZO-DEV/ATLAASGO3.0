import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { MenuCategoryRow, MenuItemRow, RestaurantRow } from './database.types';

export type RestaurantWithMenu = RestaurantRow & {
  categories: (MenuCategoryRow & { items: MenuItemRow[] })[];
};

const RESTAURANT_COLS =
  'id,slug,name,cuisine,cuisine_tags,description,emoji,img_variant,rating,time_min,fee_dh,tag,status,owner_id,coords,is_campus_partner,is_local_legend,whatsapp_phone,created_at,updated_at';

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('restaurants')
      .select(RESTAURANT_COLS)
      .eq('status', 'live')
      .order('is_local_legend', { ascending: false })
      .order('rating', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        setRestaurants((data ?? []) as unknown as RestaurantRow[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { restaurants, loading, error };
}

export function useRestaurant(slug: string | undefined) {
  const [restaurant, setRestaurant] = useState<RestaurantWithMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data: r, error: err1 } = await supabase
        .from('restaurants')
        .select(RESTAURANT_COLS)
        .eq('slug', slug)
        .maybeSingle();
      if (cancelled) return;
      if (err1 || !r) {
        if (err1) setError(err1.message);
        setLoading(false);
        return;
      }
      const restaurantRow = r as unknown as RestaurantRow;
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurantRow.id)
          .order('sort_order'),
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantRow.id)
          .eq('available', true)
          .order('sort_order'),
      ]);
      if (cancelled) return;
      const categories = (cats ?? []).map((c: MenuCategoryRow) => ({
        ...c,
        items: (items ?? []).filter((i: MenuItemRow) => i.category_id === c.id),
      }));
      setRestaurant({ ...restaurantRow, categories });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { restaurant, loading, error };
}

export const CUISINES = [
  'All',
  'Moroccan',
  'Italian',
  'Cafés',
  'Grill',
  'Pizza',
  'Pastries',
  'Healthy',
] as const;

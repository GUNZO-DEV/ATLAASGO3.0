import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * A restaurant's menu from Supabase, grouped by category. menu_items is
 * anon-readable ("menu_items: public read available"), so browsing works
 * before sign-in. 272 items are seeded across the 24 live restaurants.
 */
export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  priceDh: number;
  categoryId: string | null;
  available: boolean;
};

export type MenuSection = {
  categoryId: string;
  categoryName: string;
  items: MenuItem[];
};

export function useMenu(restaurantId: string | undefined) {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const [{ data: items, error: iErr }, { data: cats }] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, name, description, price_dh, category_id, available, sort_order')
          .eq('restaurant_id', restaurantId)
          .eq('available', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('menu_categories')
          .select('id, name, sort_order')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true }),
      ]);

      if (cancelled) return;
      if (iErr) {
        setError(iErr.message);
        setLoading(false);
        return;
      }

      const catName = new Map<string, string>(
        ((cats ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
      );

      // Group items by category, preserving category sort order.
      const byCat = new Map<string, MenuItem[]>();
      for (const raw of (items ?? []) as {
        id: string;
        name: string;
        description: string | null;
        price_dh: number;
        category_id: string | null;
        available: boolean;
      }[]) {
        const key = raw.category_id ?? 'other';
        const item: MenuItem = {
          id: raw.id,
          name: raw.name,
          description: raw.description,
          priceDh: raw.price_dh,
          categoryId: raw.category_id,
          available: raw.available,
        };
        const arr = byCat.get(key);
        if (arr) arr.push(item);
        else byCat.set(key, [item]);
      }

      const ordered: MenuSection[] = [];
      for (const c of (cats ?? []) as { id: string; name: string }[]) {
        const arr = byCat.get(c.id);
        if (arr && arr.length) ordered.push({ categoryId: c.id, categoryName: c.name, items: arr });
      }
      // Any items without a known category go under "More".
      const orphan = byCat.get('other');
      if (orphan && orphan.length) {
        ordered.push({ categoryId: 'other', categoryName: 'More', items: orphan });
      }

      setSections(ordered);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  return { sections, loading, error };
}

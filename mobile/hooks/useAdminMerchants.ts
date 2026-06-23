import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Admin merchant management — list every restaurant with its vertical, city,
 * status and lifetime order count, plus create / edit / pause-resume / remove.
 *
 * Order counts come from the admin-gated admin_restaurant_order_counts() RPC
 * (one COUNT per restaurant in Postgres) rather than N client round-trips.
 * Writes go straight to `restaurants` and rely on the table's admin-write RLS.
 */

export type MerchantVertical = 'food' | 'grocery' | 'pharmacy';

export type AdminMerchant = {
  id: string;
  name: string;
  vertical: MerchantVertical;
  city: string | null;
  status: string;
  rating: number;
  emoji: string;
  feeDh: number;
  orderCount: number;
};

export type NewMerchant = {
  name: string;
  vertical?: MerchantVertical;
  city?: string | null;
  emoji?: string;
  feeDh?: number;
  status?: string;
};

export type MerchantPatch = Partial<{
  name: string;
  vertical: MerchantVertical;
  city: string | null;
  status: string;
  rating: number;
  emoji: string;
  feeDh: number;
}>;

type MutationResult = { ok: boolean; error?: string };

type RestaurantRow = {
  id: string;
  name: string;
  vertical: string | null;
  city: string | null;
  status: string;
  rating: number | null;
  emoji: string | null;
  fee_dh: number | null;
};

type OrderCountRow = { restaurant_id: string; order_count: number | null };

const COLS = 'id,name,vertical,city,status,rating,emoji,fee_dh';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) +
    '-' +
    Date.now().toString(36)
  );
}

function mapMerchant(r: RestaurantRow, counts: Map<string, number>): AdminMerchant {
  const v = r.vertical;
  const vertical: MerchantVertical =
    v === 'grocery' || v === 'pharmacy' ? v : 'food';
  return {
    id: r.id,
    name: r.name,
    vertical,
    city: r.city,
    status: r.status,
    rating: r.rating ?? 0,
    emoji: r.emoji ?? '🍽️',
    feeDh: r.fee_dh ?? 0,
    orderCount: counts.get(r.id) ?? 0,
  };
}

export function useAdminMerchants() {
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: rows }, { data: countRows }] = await Promise.all([
      supabase.from('restaurants').select(COLS).order('created_at', { ascending: false }),
      supabase.rpc('admin_restaurant_order_counts'),
    ]);

    const counts = new Map<string, number>();
    ((countRows ?? []) as OrderCountRow[]).forEach((c) => {
      counts.set(c.restaurant_id, c.order_count ?? 0);
    });

    setMerchants(((rows ?? []) as RestaurantRow[]).map((r) => mapMerchant(r, counts)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`admin-merchants-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () =>
        void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const createMerchant = useCallback(
    async (d: NewMerchant): Promise<MutationResult> => {
      const { error } = await supabase.from('restaurants').insert({
        slug: slugify(d.name),
        name: d.name,
        cuisine: 'General',
        cuisine_tags: [],
        emoji: d.emoji ?? '🍽️',
        vertical: d.vertical ?? 'food',
        city: d.city ?? null,
        fee_dh: d.feeDh ?? 0,
        status: d.status ?? 'draft',
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const updateMerchant = useCallback(
    async (id: string, patch: MerchantPatch): Promise<MutationResult> => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.vertical !== undefined) row.vertical = patch.vertical;
      if (patch.city !== undefined) row.city = patch.city;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.rating !== undefined) row.rating = patch.rating;
      if (patch.emoji !== undefined) row.emoji = patch.emoji;
      if (patch.feeDh !== undefined) row.fee_dh = patch.feeDh;
      const { error } = await supabase.from('restaurants').update(row).eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const removeMerchant = useCallback(
    async (id: string): Promise<MutationResult> => {
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { merchants, loading, refresh, createMerchant, updateMerchant, removeMerchant };
}

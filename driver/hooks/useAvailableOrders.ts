import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Orders in the dispatch pool — placed but not yet claimed. A pure rider can't
 * read the pool (RLS); non-empty for admins / dispatch who assign orders. Joins
 * the order's restaurant (via restaurant_id) for the pickup name and computes
 * the rider payout (delivery_fee_dh + tip_dh) so a pool card reads like a real
 * offer.
 */
export type PoolOrder = {
  id: string;
  status: string;
  landmark: string;
  city: string;
  totalDh: number;
  createdAt: string;
  // Additive — richer pool card fields.
  restaurantName: string;
  payoutDh: number;
};

type PoolRow = {
  id: string;
  status: string;
  landmark: string | null;
  city: string | null;
  driver_payload: { headerLandmark?: string } | null;
  total_dh: number | null;
  delivery_fee_dh: number | null;
  tip_dh: number | null;
  created_at: string;
  restaurants: { name: string | null } | null;
};

export function useAvailableOrders() {
  const [orders, setOrders] = useState<PoolOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: ordered } = await supabase
      .from('orders')
      .select(
        'id, status, landmark, city, driver_payload, total_dh, delivery_fee_dh, tip_dh, created_at, restaurants(name)',
      )
      .in('status', ['ordered', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(20);

    const { data: assignments } = await supabase
      .from('order_assignments')
      .select('order_id')
      .eq('is_active', true);

    const claimed = new Set(((assignments ?? []) as { order_id: string }[]).map((a) => a.order_id));

    const rows = (ordered ?? []) as unknown as PoolRow[];

    setOrders(
      rows
        .filter((o) => !claimed.has(o.id))
        .map((o) => ({
          id: o.id,
          status: o.status,
          landmark: o.driver_payload?.headerLandmark || o.landmark || 'Delivery',
          city: o.city || 'Ifrane',
          totalDh: o.total_dh ?? 0,
          createdAt: o.created_at,
          restaurantName: o.restaurants?.name || 'Pickup',
          payoutDh: (o.delivery_fee_dh ?? 0) + (o.tip_dh ?? 0),
        })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh();
    const channel = supabase
      .channel(`available-orders-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => !cancelled && void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_assignments' }, () => !cancelled && void refresh())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { orders, loading, refresh };
}

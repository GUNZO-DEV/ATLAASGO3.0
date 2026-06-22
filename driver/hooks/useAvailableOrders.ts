import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Orders in the dispatch pool — placed but not yet claimed. A pure rider can't
 * read the pool (RLS); non-empty for admins / dispatch who assign orders.
 */
export type PoolOrder = {
  id: string;
  status: string;
  landmark: string;
  city: string;
  totalDh: number;
  createdAt: string;
};

export function useAvailableOrders() {
  const [orders, setOrders] = useState<PoolOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: ordered } = await supabase
      .from('orders')
      .select('id, status, landmark, city, driver_payload, total_dh, created_at')
      .in('status', ['ordered', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(20);

    const { data: assignments } = await supabase
      .from('order_assignments')
      .select('order_id')
      .eq('is_active', true);

    const claimed = new Set(((assignments ?? []) as { order_id: string }[]).map((a) => a.order_id));

    const rows = (ordered ?? []) as Array<{
      id: string;
      status: string;
      landmark: string | null;
      city: string | null;
      driver_payload: { headerLandmark?: string } | null;
      total_dh: number | null;
      created_at: string;
    }>;

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
        })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh();
    const channel = supabase
      .channel(`available-orders-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => !cancelled && refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_assignments' }, () => !cancelled && refresh())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { orders, loading, refresh };
}

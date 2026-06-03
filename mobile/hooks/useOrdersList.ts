import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { mapOrderRow, type Order, type OrderRow } from '../lib/types';

const SELECT = 'id, customer_id, status, created_at, coords, landmark, driver_payload, total_dh';

/**
 * Live list of the most recent orders, from Supabase. Subscribes to realtime
 * INSERT/UPDATE on `orders` so the list stays current. RLS scopes the rows to
 * the signed-in user (a customer sees only their own orders).
 */
export function useOrdersList(max = 20) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: err } = await supabase
        .from('orders')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .limit(max);
      if (cancelled) return;
      if (err) setError(new Error(err.message));
      else setOrders(((data ?? []) as OrderRow[]).map(mapOrderRow));
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('orders-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [max]);

  return { orders, loading, error };
}

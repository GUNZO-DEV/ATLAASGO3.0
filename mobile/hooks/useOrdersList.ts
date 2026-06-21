import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { mapOrderRow, type Order, type OrderRow } from '../lib/types';

const SELECT = 'id, customer_id, status, created_at, coords, landmark, driver_payload, total_dh';

/**
 * Live list of the most recent orders, from Supabase. Subscribes to realtime
 * INSERT/UPDATE on `orders` so the list stays current. RLS scopes the rows to
 * the signed-in user (a customer sees only their own orders).
 *
 * The realtime socket can go quiet (app backgrounded, token rotation), so the
 * inner loader is returned as `refresh` to power pull-to-refresh and focus
 * polling on the screens — a guaranteed way to see new orders without
 * restarting the app.
 */
export function useOrdersList(max = 20) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep a live ref so the realtime callback always calls the latest loader
  // without re-subscribing the channel on every render.
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('orders')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(max);
    if (err) setError(new Error(err.message));
    else {
      setError(null);
      setOrders(((data ?? []) as OrderRow[]).map(mapOrderRow));
    }
    setLoading(false);
  }, [max]);

  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await load();
      if (cancelled) return;
    })();

    const channel = supabase
      .channel(`orders-list-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadRef.current();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { orders, loading, error, refresh: load };
}

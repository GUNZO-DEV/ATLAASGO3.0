import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { mapOrderRow, ORDER_STAGES, type Order, type OrderRow, type OrderStage } from '../lib/types';

const SELECT = 'id, customer_id, status, created_at, coords, landmark, driver_payload, total_dh';

/**
 * Real-time status for one order, from Supabase. Loads the row then subscribes
 * to UPDATE events on that specific order id so the timeline animates live
 * (replaces the Firestore onSnapshot path).
 */
export function useOrderStatus(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [stage, setStage] = useState<OrderStage>('ordered');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const { data, error: err } = await supabase
        .from('orders')
        .select(SELECT)
        .eq('id', orderId)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        setError(new Error(err.message));
      } else if (data) {
        const mapped = mapOrderRow(data as OrderRow);
        setOrder(mapped);
        // Only drive the timeline for stages it knows about.
        if ((ORDER_STAGES as readonly string[]).includes(mapped.status)) {
          setStage(mapped.status as OrderStage);
        }
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      // Unique topic per mount — a fixed name collides with an already-
      // subscribed channel on re-mount/Fast Refresh, throwing "cannot add
      // postgres_changes callbacks after subscribe()".
      .channel(`order-${orderId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const row = payload.new as OrderRow;
          const mapped = mapOrderRow(row);
          setOrder(mapped);
          if ((ORDER_STAGES as readonly string[]).includes(mapped.status)) {
            setStage(mapped.status as OrderStage);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, stage, setStage, loading, error };
}

/** Demo driver — advances through the stages on a timer when no real order is wired up. */
export function useDemoOrderProgress(initial: OrderStage = 'ordered') {
  const [stage, setStage] = useState<OrderStage>(initial);

  useEffect(() => {
    const idx = ORDER_STAGES.indexOf(stage);
    if (idx === -1 || idx >= ORDER_STAGES.length - 1) return;
    const ms = 5000 + idx * 800;
    const t = setTimeout(() => setStage(ORDER_STAGES[idx + 1]), ms);
    return () => clearTimeout(t);
  }, [stage]);

  return { stage, setStage };
}

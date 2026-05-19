import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { orderDoc } from '../lib/firestore';
import type { Order, OrderStage } from '../lib/types';
import { ORDER_STAGES } from '../lib/types';

/**
 * Real-time order status. When Firestore isn't configured we fall back to a
 * driven local demo so the timeline component is reviewable without backend.
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
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        orderDoc(orderId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setOrder(data);
            setStage(data.status);
          }
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        },
      );
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
    return () => unsub?.();
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

import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { ordersCol } from '../lib/firestore';
import type { Order } from '../lib/types';

/**
 * Live list of the most recent orders. Used by the dev orders index to
 * navigate between customer and driver perspectives without auth wiring.
 */
export function useOrdersList(max = 20) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        query(ordersCol(), orderBy('createdAt', 'desc'), limit(max)),
        (snap) => {
          setOrders(snap.docs.map((d) => d.data()));
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        },
      );
    } catch (e) {
      setError(e as Error);
      setLoading(false);
    }
    return () => unsub?.();
  }, [max]);

  return { orders, loading, error };
}

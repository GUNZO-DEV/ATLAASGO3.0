import { useCallback, useState } from 'react';
import { updateDoc } from 'firebase/firestore';
import { orderDoc } from '../lib/firestore';
import { ORDER_STAGES, type OrderStage } from '../lib/types';

/**
 * Driver-side mutation. Advances the order to the next stage in ORDER_STAGES,
 * or to a specific stage. The customer screen's onSnapshot picks up the change
 * and animates its timeline accordingly.
 */
export function useAdvanceOrder(orderId: string | undefined) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const advanceTo = useCallback(
    async (next: OrderStage): Promise<boolean> => {
      if (!orderId) return false;
      setPending(true);
      setError(null);
      try {
        await updateDoc(orderDoc(orderId), { status: next });
        return true;
      } catch (e) {
        setError(e as Error);
        return false;
      } finally {
        setPending(false);
      }
    },
    [orderId],
  );

  const advanceFrom = useCallback(
    async (current: OrderStage): Promise<boolean> => {
      const idx = ORDER_STAGES.indexOf(current);
      if (idx === -1 || idx >= ORDER_STAGES.length - 1) return false;
      return advanceTo(ORDER_STAGES[idx + 1]);
    },
    [advanceTo],
  );

  return { advanceTo, advanceFrom, pending, error };
}

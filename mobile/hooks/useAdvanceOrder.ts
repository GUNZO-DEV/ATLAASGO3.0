import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ORDER_STAGES, type OrderStage } from '../lib/types';

/**
 * Driver-side mutation, on Supabase. Advances the order to the next stage (or a
 * specific one). The customer screen's realtime subscription picks up the
 * UPDATE and animates the timeline. RLS enforces that only an assigned rider /
 * admin can actually perform the update.
 */
export function useAdvanceOrder(orderId: string | undefined) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const advanceTo = useCallback(
    async (next: OrderStage): Promise<boolean> => {
      if (!orderId) return false;
      setPending(true);
      setError(null);
      const { error: err } = await supabase
        .from('orders')
        .update({ status: next })
        .eq('id', orderId);
      setPending(false);
      if (err) {
        setError(new Error(err.message));
        return false;
      }
      return true;
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

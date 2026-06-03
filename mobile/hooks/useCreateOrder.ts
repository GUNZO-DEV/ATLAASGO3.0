import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { NewOrderInput } from '../lib/types';

/**
 * Creates an order in Supabase (replaces the Firestore addDoc path).
 *
 * Must satisfy the DB CHECK constraints on `orders`:
 *   - landmark length >= 3
 *   - driver_payload has headerLandmark (>=3 chars) + coords
 *   - coords has lat/lng in range
 * RLS ("orders: self insert") requires auth.uid() = customer_id, so this only
 * succeeds once mobile auth is wired (Chunk 4). Until then it returns the RLS
 * error, which the caller surfaces.
 */
export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (input: NewOrderInput): Promise<string | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const landmark = (input.landmark ?? '').trim();
      if (landmark.length < 3) {
        throw new Error('Please enter a landmark (at least 3 characters).');
      }

      const coords = { lat: input.coords.lat, lng: input.coords.lng };

      const { data, error: err } = await supabase
        .from('orders')
        .insert({
          customer_id: input.customerId,
          status: 'ordered',
          landmark,
          coords,
          driver_payload: {
            headerLandmark: landmark,
            coords,
            deliveryNotes: input.deliveryNotes ?? null,
          },
          subtotal_dh: input.totalDh,
          total_dh: input.totalDh,
          delivery_notes: input.deliveryNotes ?? null,
        })
        .select('id')
        .single();

      if (err) {
        setError(new Error(err.message));
        return null;
      }
      return data.id as string;
    } catch (e) {
      setError(e as Error);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { create, submitting, error };
}

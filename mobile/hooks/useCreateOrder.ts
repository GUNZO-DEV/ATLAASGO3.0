import { useCallback, useState } from 'react';
import { addDoc, GeoPoint, serverTimestamp } from 'firebase/firestore';
import { ordersCol } from '../lib/firestore';
import type { NewOrderInput } from '../lib/types';

export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (input: NewOrderInput): Promise<string | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const doc = {
        ...input,
        status: 'ordered' as const,
        createdAt: serverTimestamp() as unknown as never,
        /**
         * Mirror landmark + coords into driverPayload so the driver app's
         * assignment header reads the order doc directly, no join.
         */
        driverPayload: {
          headerLandmark: input.landmark,
          coords: new GeoPoint(input.coords.lat, input.coords.lng),
          deliveryNotes: input.deliveryNotes,
        },
      };
      const ref = await addDoc(ordersCol(), doc as never);
      return ref.id;
    } catch (e) {
      const err = e as Error;
      setError(err);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { create, submitting, error };
}

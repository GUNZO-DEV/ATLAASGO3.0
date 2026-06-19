import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CategoryKey, Coords } from '../lib/types';

/**
 * Creates an order in Supabase — full parity with the web cart's insert
 * (src/lib/orders.ts useCreateOrder): persists the items snapshot, the fee
 * breakdown, payment method, promo code, delivery notes, saved-address link
 * and the campus flag.
 *
 * Must satisfy the DB CHECK constraints on `orders`:
 *   - landmark length >= 3
 *   - driver_payload has headerLandmark (>=3 chars) + coords
 *   - coords has lat/lng in range
 * RLS ("orders: self insert") requires auth.uid() = customer_id.
 */
export type OrderItemSnapshot = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  priceDh: number;
  qty: number;
};

export type PaymentMethod = 'cash' | 'wallet' | 'card';

export type CreateOrderInput = {
  customerId: string;
  category?: CategoryKey;
  coords: Coords;
  landmark: string;
  /** Cart line items, snapshotted onto the order row. */
  items?: OrderItemSnapshot[];
  /** Money is integer dirhams everywhere. */
  subtotalDh: number;
  deliveryFeeDh?: number;
  serviceFeeDh?: number;
  /** Final amount due (after promo discount and wallet credit). */
  totalDh: number;
  deliveryNotes?: string;
  paymentMethod?: PaymentMethod;
  promotionCode?: string | null;
  /** Saved-address id when the customer picked one. */
  addressId?: string | null;
  isCampus?: boolean;
};

export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (input: CreateOrderInput): Promise<string | null> => {
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
          items: input.items ?? [],
          subtotal_dh: input.subtotalDh,
          delivery_fee_dh: input.deliveryFeeDh ?? 0,
          service_fee_dh: input.serviceFeeDh ?? 0,
          total_dh: input.totalDh,
          delivery_notes: input.deliveryNotes ?? null,
          payment_method: input.paymentMethod ?? 'cash',
          promotion_code: input.promotionCode ?? null,
          address_id: input.addressId ?? null,
          is_campus: input.isCampus ?? false,
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

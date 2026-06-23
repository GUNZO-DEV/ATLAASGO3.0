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
  /** Courier tip (integer dh), already included in totalDh. */
  tipDh?: number;
  /** Delivery speed chosen on the 3.0 cart screen. */
  deliverySpeed?: 'standard' | 'priority';
  /** Handoff preference: door / hand / lounge. */
  handoff?: 'door' | 'hand' | 'lounge';
  /**
   * City the order belongs to (powers the city filter on the lists). When
   * omitted we resolve it from the chosen restaurant's `city`, falling back to
   * 'Ifrane' — the DB column default — so every order carries a city.
   */
  city?: string | null;
};

const DEFAULT_CITY = 'Ifrane';

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

      // Resolve the order's city. Prefer an explicit value; otherwise look it
      // up from the chosen restaurant (the cart's first line carries its id).
      // Always fall back to 'Ifrane' so the city filter never sees a null.
      let city = (input.city ?? '').trim() || null;
      if (!city) {
        const restaurantId = input.items?.[0]?.restaurantId;
        if (restaurantId) {
          const { data: resto } = await supabase
            .from('restaurants')
            .select('city')
            .eq('id', restaurantId)
            .maybeSingle();
          city = ((resto?.city as string | null) ?? '').trim() || null;
        }
      }
      if (!city) city = DEFAULT_CITY;

      // The pickup restaurant — the cart's first line carries its id. Populating
      // orders.restaurant_id is what lets auto-dispatch resolve pickup coords and
      // reach the nearest rider (and powers the driver pickup pin).
      const restaurantId = input.items?.[0]?.restaurantId ?? null;

      const { data, error: err } = await supabase
        .from('orders')
        .insert({
          customer_id: input.customerId,
          status: 'ordered',
          restaurant_id: restaurantId,
          landmark,
          coords,
          city,
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
          tip_dh: input.tipDh ?? 0,
          delivery_speed: input.deliverySpeed ?? 'standard',
          handoff: input.handoff ?? 'door',
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

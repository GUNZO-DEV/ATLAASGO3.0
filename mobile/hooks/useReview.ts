import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * One customer review per order — mobile port of the web's useOrderReview
 * (src/lib/customer.ts). Loads any existing review to prefill the form and
 * UPSERTs on submit (onConflict order_id,customer_id) so the customer can
 * update their review anytime.
 */

export type ReviewRow = {
  id: string;
  order_id: string;
  customer_id: string;
  restaurant_id: string | null;
  rider_id: string | null;
  rating_restaurant: number | null;
  rating_rider: number | null;
  comment: string | null;
  created_at: string;
};

export function useReview(orderId: string | undefined) {
  const { user } = useAuth();
  const [review, setReview] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('reviews')
      .select('*')
      .eq('order_id', orderId)
      .eq('customer_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setReview((data as ReviewRow | null) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, user?.id]);

  const submit = useCallback(
    async (input: {
      restaurantId: string | null;
      ratingRestaurant: number;
      ratingRider?: number;
      comment?: string;
    }): Promise<boolean> => {
      if (!orderId || !user) return false;
      setSubmitting(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('reviews')
        .upsert(
          {
            order_id: orderId,
            customer_id: user.id,
            restaurant_id: input.restaurantId,
            rating_restaurant: input.ratingRestaurant,
            rating_rider: input.ratingRider ?? null,
            comment: input.comment ?? null,
          },
          { onConflict: 'order_id,customer_id' },
        )
        .select('*')
        .single();
      setSubmitting(false);
      if (err) {
        setError(err.message);
        return false;
      }
      setReview(data as ReviewRow);
      return true;
    },
    [orderId, user?.id],
  );

  return { review, loading, submitting, error, submit };
}

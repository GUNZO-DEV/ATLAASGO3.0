import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Coords, OrderRow, OrderStatus, CartItemSnapshot } from './database.types';
import type { CartItem } from './cart';

export type CreateOrderInput = {
  items: CartItem[];
  landmark: string;
  coords: Coords;
  deliveryNotes?: string;
  subtotalDh: number;
  deliveryFeeDh: number;
  serviceFeeDh: number;
  totalDh: number;
};

function snapshotItems(items: CartItem[]): CartItemSnapshot[] {
  return items.map((i) => ({
    id: i.id,
    restaurantSlug: i.restaurantSlug,
    restaurantName: i.restaurantName,
    name: i.name,
    priceDh: i.priceDh,
    qty: i.qty,
  }));
}

export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (input: CreateOrderInput): Promise<string | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('You need to be signed in to place an order.');
        return null;
      }
      const { data, error: err } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          items: snapshotItems(input.items),
          landmark: input.landmark.trim(),
          coords: input.coords,
          driver_payload: {
            headerLandmark: input.landmark.trim(),
            coords: input.coords,
            deliveryNotes: input.deliveryNotes ?? null,
          },
          subtotal_dh: input.subtotalDh,
          delivery_fee_dh: input.deliveryFeeDh,
          service_fee_dh: input.serviceFeeDh,
          total_dh: input.totalDh,
          delivery_notes: input.deliveryNotes ?? null,
        })
        .select('id')
        .single();
      if (err) {
        setError(err.message);
        return null;
      }
      return data.id;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { create, submitting, error };
}

/** Subscribes to live updates of one order. */
export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        if (data) setOrder(data as OrderRow);
        setLoading(false);
      });

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          if (!cancelled && payload.new) setOrder(payload.new as OrderRow);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, loading, error, stage: order?.status as OrderStatus | undefined };
}

/** Live list of the current user's recent orders. */
export function useOrdersList(limit = 20) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setOrders([]);
          setLoading(false);
        }
        return;
      }
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (cancelled) return;
      if (err) setError(err.message);
      setOrders((data ?? []) as OrderRow[]);
      setLoading(false);

      channel = supabase
        .channel(`orders:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
          () => {
            // Re-fetch on any change to keep ordering & projections simple.
            void load();
          },
        )
        .subscribe();
    }

    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [limit]);

  return { orders, loading, error };
}

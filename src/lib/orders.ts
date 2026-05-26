import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * Subscribes to one order. Returns:
 *  - order:    current row
 *  - mutate:   optimistically patch the row in local state (instant)
 *  - refresh:  re-fetch from the DB (use after mutations to confirm)
 *
 * Refreshes on:
 *  - mount
 *  - postgres_changes realtime event (if publication includes `orders`)
 *  - tab focus (catches missed events)
 */
export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    const { data, error: err } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (cancelledRef.current) return;
    if (err) setError(err.message);
    if (data) setOrder(data as OrderRow);
    setLoading(false);
  }, [orderId]);

  const mutate = useCallback((patch: Partial<OrderRow>) => {
    setOrder((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    if (!orderId) {
      setLoading(false);
      return;
    }

    void refresh();

    const channel = supabase
      .channel(`order:${orderId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          if (!cancelledRef.current && payload.new) setOrder(payload.new as OrderRow);
        },
      )
      .subscribe();

    // Tab-focus safety net (in case realtime missed an event)
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelledRef.current = true;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [orderId, refresh]);

  return { order, loading, error, stage: order?.status as OrderStatus | undefined, mutate, refresh };
}

/** Live list of the current user's recent orders. */
export function useOrdersList(limit = 20) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (!cancelledRef.current) {
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
    if (cancelledRef.current) return;
    if (err) setError(err.message);
    setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }, [limit]);

  const mutate = useCallback((id: string, patch: Partial<OrderRow>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await refresh();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelledRef.current) return;
      channel = supabase
        .channel(`orders:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
          () => void refresh(),
        )
        .subscribe();
    })();

    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelledRef.current = true;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { orders, loading, error, mutate, refresh };
}

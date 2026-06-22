import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * The single active delivery a rider is working on, resolved from an order id.
 * Joins the order's first item back to its restaurant for the pickup pin, and
 * maps the order's drop coords/landmark for the dropoff pin. Defensive: never
 * throws on missing rows or columns, returns null when the order can't be read.
 */
export type LatLng = { latitude: number; longitude: number };

export type ActiveDelivery = {
  orderId: string;
  status: string;
  payoutDh: number;
  pickup: {
    name: string;
    coords: LatLng | null;
  };
  dropoff: {
    label: string;
    sub: string;
    note: string;
    coords: LatLng | null;
  };
  items: { qty: number; name: string }[];
};

type OrderItem = {
  restaurantSlug?: string | null;
  restaurantName?: string | null;
  name?: string | null;
  qty?: number | null;
};

type OrderRow = {
  id: string;
  status: string | null;
  total_dh: number | null;
  coords: { lat?: number | null; lng?: number | null } | null;
  landmark: string | null;
  campus_building: string | null;
  delivery_notes: string | null;
  city: string | null;
  items: OrderItem[] | null;
};

function toLatLng(c: { lat?: number | null; lng?: number | null } | null): LatLng | null {
  if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return null;
  return { latitude: c.lat, longitude: c.lng };
}

export function useActiveDelivery(orderId: string | null) {
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!orderId) {
      setDelivery(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total_dh, coords, landmark, campus_building, delivery_notes, city, items')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      setDelivery(null);
      setLoading(false);
      return;
    }

    const order = data as unknown as OrderRow;
    const items = Array.isArray(order.items) ? order.items : [];
    const first = items[0];

    let pickupName = first?.restaurantName || 'Pickup';
    let pickupCoords: LatLng | null = null;

    if (first?.restaurantSlug) {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('name, coords')
        .eq('slug', first.restaurantSlug)
        .maybeSingle();

      const restRow = rest as { name?: string | null; coords?: { lat?: number | null; lng?: number | null } | null } | null;
      if (restRow?.name) pickupName = restRow.name;
      pickupCoords = toLatLng(restRow?.coords ?? null);
    }

    const dropLabel = order.campus_building || order.landmark || 'Drop-off';
    const dropNote = order.delivery_notes || order.landmark || '';

    setDelivery({
      orderId: order.id,
      status: order.status ?? 'ordered',
      payoutDh: order.total_dh ?? 0,
      pickup: {
        name: pickupName,
        coords: pickupCoords,
      },
      dropoff: {
        label: dropLabel,
        sub: order.city ?? '',
        note: dropNote,
        coords: toLatLng(order.coords),
      },
      items: items.map((it) => ({
        qty: typeof it?.qty === 'number' ? it.qty : 1,
        name: it?.name ?? 'Item',
      })),
    });
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { delivery, loading, refresh };
}

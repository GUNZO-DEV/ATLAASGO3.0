import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * The single active delivery a rider is working on, resolved from an order id.
 * Pickup is resolved the RIGHT way: orders.restaurant_id → restaurants(id) for
 * the merchant name + map coords (NOT the stale items[].restaurantSlug). The
 * drop pin maps the order's coords/landmark. Payout is the rider's real cut
 * (delivery_fee_dh + tip_dh + boost_dh), and counterpartyPhone resolves the
 * customer's number via the SECURITY DEFINER order_contact_phone RPC.
 *
 * Defensive: never throws on missing rows/columns, returns null when the order
 * can't be read. Keeps the existing nested shape (pickup/dropoff/items) and
 * adds the flat fields the v2 delivery screen reads.
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
  // Flat accessors for the v2 design screens (additive over the nested shape).
  pickupName: string;
  pickupCoords: LatLng | null;
  dropCoords: LatLng | null;
  counterpartyPhone: string | null;
  isPickup: boolean;
  stageLabel: string;
};

type OrderItem = {
  name?: string | null;
  qty?: number | null;
};

type OrderRow = {
  id: string;
  status: string | null;
  restaurant_id: string | null;
  delivery_fee_dh: number | null;
  tip_dh: number | null;
  coords: { lat?: number | null; lng?: number | null } | null;
  landmark: string | null;
  campus_building: string | null;
  delivery_notes: string | null;
  city: string | null;
  items: OrderItem[] | null;
};

function toLatLng(c: { lat?: number | null; lng?: number | null } | null | undefined): LatLng | null {
  if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return null;
  return { latitude: c.lat, longitude: c.lng };
}

/** Stages before the rider has the food = pickup side; after = drop side. */
const PICKUP_STAGES = new Set(['ordered', 'preparing', 'enRoute']);

function stageLabelFor(status: string, isPickup: boolean): string {
  switch (status) {
    case 'ordered':
    case 'preparing':
      return 'Heading to pickup';
    case 'enRoute':
      return 'At the merchant';
    case 'outForDelivery':
      return 'On the way to drop';
    case 'arriving':
      return 'Arriving now';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return isPickup ? 'Heading to pickup' : 'On the way to drop';
  }
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
      .select(
        'id, status, restaurant_id, delivery_fee_dh, tip_dh, coords, landmark, campus_building, delivery_notes, city, items',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error || !data) {
      setDelivery(null);
      setLoading(false);
      return;
    }

    const order = data as unknown as OrderRow;
    const items = Array.isArray(order.items) ? order.items : [];

    // Pickup pin: orders.restaurant_id → restaurants(id) for name + coords.
    let pickupName = 'Pickup';
    let pickupCoords: LatLng | null = null;
    if (order.restaurant_id) {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('name, coords')
        .eq('id', order.restaurant_id)
        .maybeSingle();
      const restRow = rest as { name?: string | null; coords?: { lat?: number | null; lng?: number | null } | null } | null;
      if (restRow?.name) pickupName = restRow.name;
      pickupCoords = toLatLng(restRow?.coords ?? null);
    }

    // Rider payout = delivery fee + tip + snow/surge boost (from the active
    // assignment). boost_dh degrades to 0 if the column/row is unavailable.
    let boostDh = 0;
    const { data: asg } = await supabase
      .from('order_assignments')
      .select('boost_dh')
      .eq('order_id', orderId)
      .eq('is_active', true)
      .maybeSingle();
    const asgRow = asg as { boost_dh?: number | null } | null;
    if (asgRow && typeof asgRow.boost_dh === 'number') boostDh = asgRow.boost_dh;
    const payoutDh = (order.delivery_fee_dh ?? 0) + (order.tip_dh ?? 0) + boostDh;

    // Counterparty phone via SECURITY DEFINER RPC (driver → customer number).
    let counterpartyPhone: string | null = null;
    const { data: phone } = await supabase.rpc('order_contact_phone', { p_order_id: orderId });
    if (typeof phone === 'string' && phone.length > 0) counterpartyPhone = phone;

    const status = order.status ?? 'ordered';
    const isPickup = PICKUP_STAGES.has(status);
    const dropLabel = order.campus_building || order.landmark || 'Drop-off';
    const dropNote = order.delivery_notes || order.landmark || '';
    const dropCoords = toLatLng(order.coords);

    setDelivery({
      orderId: order.id,
      status,
      payoutDh,
      pickup: { name: pickupName, coords: pickupCoords },
      dropoff: { label: dropLabel, sub: order.city ?? '', note: dropNote, coords: dropCoords },
      items: items.map((it) => ({
        qty: typeof it?.qty === 'number' ? it.qty : 1,
        name: it?.name ?? 'Item',
      })),
      pickupName,
      pickupCoords,
      dropCoords,
      counterpartyPhone,
      isPickup,
      stageLabel: stageLabelFor(status, isPickup),
    });
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { delivery, loading, refresh };
}

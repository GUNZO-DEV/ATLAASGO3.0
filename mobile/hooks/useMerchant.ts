import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { OrderStatus } from '../lib/types';

/**
 * Merchant POS data — live kitchen tickets + today's KPIs, on Supabase.
 * Mirrors the web app's Merchant.tsx queries:
 *   - live feed: orders still in flight (ordered … arriving), newest first, 20 max
 *   - KPIs: revenue + ticket count since local midnight
 * RLS note: merchants/admins read all orders via the "staff read" policies;
 * a plain customer would only ever see their own rows here.
 */

export type MerchantTicketItem = {
  name: string;
  qty: number;
  priceDh?: number;
};

export type MerchantTicket = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  landmark: string;
  deliveryNotes: string | null;
  items: MerchantTicketItem[];
  totalDh: number;
};

const LIVE_STATUSES = ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'];
const SELECT = 'id, status, created_at, landmark, driver_payload, delivery_notes, items, total_dh';

type TicketRow = {
  id: string;
  status: OrderStatus;
  created_at: string;
  landmark: string | null;
  driver_payload: { headerLandmark?: string } | null;
  delivery_notes: string | null;
  items: MerchantTicketItem[] | null;
  total_dh: number | null;
};

function mapTicketRow(row: TicketRow): MerchantTicket {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    landmark: row.driver_payload?.headerLandmark || row.landmark || 'Delivery',
    deliveryNotes: row.delivery_notes,
    items: row.items ?? [],
    totalDh: row.total_dh ?? 0,
  };
}

export function useMerchant() {
  const [tickets, setTickets] = useState<MerchantTicket[]>([]);
  const [revenueTodayDh, setRevenueTodayDh] = useState(0);
  const [ticketsToday, setTicketsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: liveErr } = await supabase
      .from('orders')
      .select(SELECT)
      .in('status', LIVE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(20);

    if (liveErr) {
      setError(liveErr.message);
      setLoading(false);
      return;
    }
    setError(null);
    setTickets(((data ?? []) as TicketRow[]).map(mapTicketRow));

    // KPIs: every order placed since local midnight (any status).
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { data: today } = await supabase
      .from('orders')
      .select('total_dh')
      .gte('created_at', midnight.toISOString());
    const rows = (today ?? []) as { total_dh: number | null }[];
    setRevenueTodayDh(rows.reduce((acc, o) => acc + (o.total_dh ?? 0), 0));
    setTicketsToday(rows.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh();
    const channel = supabase
      // Unique topic per mount — a fixed name collides with an already-
      // subscribed channel on re-mount/Fast Refresh (see useOrderStatus).
      .channel(`merchant-live-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (!cancelled) refresh();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return {
    tickets,
    liveCount: tickets.length,
    revenueTodayDh,
    ticketsToday,
    loading,
    error,
    refresh,
  };
}

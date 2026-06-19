import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type AdminOrderFilter = 'all' | 'live' | 'ordered' | 'preparing' | 'outForDelivery' | 'arriving' | 'delivered' | 'cancelled';

export type AdminOrder = {
  id: string;
  status: string;
  createdAt: string;
  totalDh: number;
  landmark: string;
  title: string;
  itemCount: number;
};

const LIVE = ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'];

type RawOrder = {
  id: string;
  status: string;
  created_at: string;
  total_dh: number | null;
  landmark: string | null;
  driver_payload: { headerLandmark?: string } | null;
  items: { restaurantName?: string; qty?: number }[] | null;
};

function mapOrder(o: RawOrder): AdminOrder {
  return {
    id: o.id,
    status: o.status,
    createdAt: o.created_at,
    totalDh: o.total_dh ?? 0,
    landmark: o.driver_payload?.headerLandmark || o.landmark || '—',
    title: o.items?.[0]?.restaurantName ?? 'Order',
    itemCount: o.items?.reduce((acc, i) => acc + (i.qty ?? 0), 0) ?? 0,
  };
}

export function useAdminOrders(filter: AdminOrderFilter = 'live') {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let q = supabase
      .from('orders')
      .select('id, status, created_at, total_dh, landmark, driver_payload, items')
      .order('created_at', { ascending: false })
      .limit(80);
    if (filter === 'live') q = q.in('status', LIVE);
    else if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setOrders(((data ?? []) as RawOrder[]).map(mapOrder));
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`admin-orders-${filter}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_assignments' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, refresh]);

  return { orders, loading, refresh };
}

export type AdminApp = {
  id: string;
  primary: string;
  secondary: string;
  contact: string;
  status: string;
};

export function useApplications() {
  const [rider, setRider] = useState<AdminApp[]>([]);
  const [restaurant, setRestaurant] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: r }, { data: rest }] = await Promise.all([
      supabase
        .from('rider_applications')
        .select('id,applicant_id,full_name,contact_phone,email,vehicle,plate,status,created_at')
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('restaurant_applications')
        .select('id,applicant_id,business_name,contact_email,contact_phone,cuisine,status,created_at')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
    setRider(
      ((r ?? []) as any[]).map((a) => ({
        id: a.id,
        primary: a.full_name,
        secondary: `${a.vehicle ?? 'No vehicle'} · ${a.plate ?? '—'}`,
        contact: `${a.email ?? ''} · ${a.contact_phone}`,
        status: a.status,
      })),
    );
    setRestaurant(
      ((rest ?? []) as any[]).map((a) => ({
        id: a.id,
        primary: a.business_name,
        secondary: a.cuisine ?? '—',
        contact: `${a.contact_email} · ${a.contact_phone ?? ''}`,
        status: a.status,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Approve / reject an application. On approval, best-effort grants the role
   *  and bootstraps the rider/restaurant profile (requires super_admin for the
   *  role grant; status update alone works for any admin). */
  const decide = useCallback(
    async (kind: 'rider' | 'restaurant', id: string, next: 'approved' | 'rejected') => {
      const table = kind === 'rider' ? 'rider_applications' : 'restaurant_applications';
      const { error } = await supabase
        .from(table)
        .update({ status: next, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { ok: false as const, error: error.message };

      if (next === 'approved') {
        const { data: app } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        const a = app as any;
        if (a?.applicant_id) {
          const role = kind === 'rider' ? 'rider' : 'merchant';
          await supabase.from('user_roles').upsert({ user_id: a.applicant_id, role }, { onConflict: 'user_id,role' });
          if (kind === 'rider') {
            await supabase.from('riders').upsert(
              {
                user_id: a.applicant_id,
                vehicle: a.vehicle ?? null,
                plate: a.plate ?? null,
                status: 'offline',
                rating: 5.0,
                total_trips: 0,
                total_earnings_dh: 0,
                documents_verified: true,
              },
              { onConflict: 'user_id' },
            );
          } else {
            const slug =
              (a.business_name as string)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .slice(0, 48) +
              '-' +
              Date.now().toString(36);
            await supabase.from('restaurants').insert({
              slug,
              name: a.business_name,
              cuisine: a.cuisine ?? 'General',
              cuisine_tags: a.cuisine ? [a.cuisine] : [],
              emoji: '🍽️',
              owner_id: a.applicant_id,
              status: 'draft',
            });
          }
        }
      }
      await refresh();
      return { ok: true as const };
    },
    [refresh],
  );

  return { rider, restaurant, loading, decide, refresh };
}

export type AvailableRider = {
  userId: string;
  vehicle: string | null;
  plate: string | null;
  rating: number;
  totalTrips: number;
};

export function useAvailableRiders() {
  const [riders, setRiders] = useState<AvailableRider[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('riders')
      .select('user_id,vehicle,plate,rating,total_trips,status')
      .eq('status', 'online')
      .order('rating', { ascending: false });
    setRiders(
      ((data ?? []) as any[]).map((r) => ({
        userId: r.user_id,
        vehicle: r.vehicle,
        plate: r.plate,
        rating: r.rating ?? 5,
        totalTrips: r.total_trips ?? 0,
      })),
    );
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`available-riders-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { riders, refresh };
}

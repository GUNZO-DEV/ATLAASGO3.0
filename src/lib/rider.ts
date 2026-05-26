import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { OrderRow, OrderAssignmentRow, RiderStatus } from './database.types';

export type RiderProfile = {
  user_id: string;
  vehicle: string | null;
  plate: string | null;
  status: RiderStatus;
  rating: number;
  total_trips: number;
  total_earnings_dh: number;
  documents_verified: boolean;
  last_seen_at: string | null;
};

export function useRiderProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('riders')
      .select('user_id,vehicle,plate,status,rating,total_trips,total_earnings_dh,documents_verified,last_seen_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(data as RiderProfile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setStatus = useCallback(
    async (status: RiderStatus) => {
      if (!user) return;
      await supabase
        .from('riders')
        .upsert(
          { user_id: user.id, status, last_seen_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      await refresh();
    },
    [user, refresh],
  );

  return { profile, loading, setStatus, refresh };
}

/** Orders the current rider has been assigned to (active or recent). */
export function useRiderAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<
    (OrderAssignmentRow & { order: OrderRow | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from('order_assignments')
      .select('*')
      .eq('rider_id', user.id)
      .order('assigned_at', { ascending: false })
      .limit(40);
    const ids = (rows ?? []).map((r: OrderAssignmentRow) => r.order_id);
    const { data: ordersData } = ids.length
      ? await supabase.from('orders').select('*').in('id', ids)
      : { data: [] };
    const ordersMap = new Map(
      ((ordersData ?? []) as OrderRow[]).map((o) => [o.id, o]),
    );
    if (cancelledRef.current) return;
    setAssignments(
      (rows ?? []).map((r: OrderAssignmentRow) => ({
        ...r,
        order: ordersMap.get(r.order_id) ?? null,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!user) {
      setLoading(false);
      return;
    }
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void refresh();
    channel = supabase
      .channel(`rider_assignments:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments', filter: `rider_id=eq.${user.id}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => void refresh(),
      )
      .subscribe();

    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelledRef.current = true;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, refresh]);

  return { assignments, loading, refresh };
}

/** Orders sitting in the dispatch pool — no active assignment. */
export function useAvailableOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    const { data: ordered } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['ordered', 'preparing'])
      .order('created_at', { ascending: true })
      .limit(20);
    const { data: assignments } = await supabase
      .from('order_assignments')
      .select('order_id')
      .eq('is_active', true);
    const claimed = new Set(
      ((assignments ?? []) as { order_id: string }[]).map((a) => a.order_id),
    );
    if (cancelledRef.current) return;
    setOrders(
      ((ordered ?? []) as OrderRow[]).filter((o) => !claimed.has(o.id)),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void refresh();
    const channel = supabase
      .channel(`available_orders:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments' },
        () => void refresh(),
      )
      .subscribe();

    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelledRef.current = true;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { orders, loading, refresh };
}

/** Rider earnings rollups — current week + lifetime. */
export function useRiderEarnings() {
  const { user } = useAuth();
  const [today, setToday] = useState(0);
  const [week, setWeek] = useState(0);
  const [tripsToday, setTripsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      // Earnings model (placeholder): 18 dh base per delivered trip.
      // Replace with rider_payouts table once Stripe wires payouts.
      const { data } = await supabase
        .from('order_assignments')
        .select('delivered_at')
        .eq('rider_id', user.id)
        .not('delivered_at', 'is', null);

      if (cancelled) return;
      const rows = (data ?? []) as { delivered_at: string }[];
      const todayCount = rows.filter((r) => new Date(r.delivered_at) >= startOfDay).length;
      const weekCount = rows.filter((r) => new Date(r.delivered_at) >= startOfWeek).length;
      setToday(todayCount * 18);
      setWeek(weekCount * 18);
      setTripsToday(todayCount);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { today, week, tripsToday, loading };
}

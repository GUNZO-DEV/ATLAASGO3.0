import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Rider profile + stats (mirrors the customer app / web src/lib/rider.ts).
 * setStatus() flips online / on_break / offline (upsert). useRiderStats sums
 * earnings from orders.delivery_fee_dh over delivered assignments.
 */
export type RiderStatus = 'offline' | 'online' | 'busy' | 'on_break';

export type RiderProfile = {
  userId: string;
  vehicle: string | null;
  plate: string | null;
  status: RiderStatus;
  rating: number;
  totalTrips: number;
  totalEarningsDh: number;
  documentsVerified: boolean;
};

type RiderRow = {
  user_id: string;
  vehicle: string | null;
  plate: string | null;
  status: RiderStatus;
  rating: number | null;
  total_trips: number | null;
  total_earnings_dh: number | null;
  documents_verified: boolean | null;
};

export function useRiderProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('riders')
      .select('user_id, vehicle, plate, status, rating, total_trips, total_earnings_dh, documents_verified')
      .eq('user_id', user.id)
      .maybeSingle();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const row = data as RiderRow | null;
    setProfile(
      row
        ? {
            userId: row.user_id,
            vehicle: row.vehicle,
            plate: row.plate,
            status: row.status,
            rating: row.rating ?? 5.0,
            totalTrips: row.total_trips ?? 0,
            totalEarningsDh: row.total_earnings_dh ?? 0,
            documentsVerified: row.documents_verified ?? false,
          }
        : null,
    );
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setStatus = useCallback(
    async (status: RiderStatus): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user) return { ok: false, error: 'Not signed in' };
      const { error: err } = await supabase
        .from('riders')
        .upsert({ user_id: user.id, status, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (err) return { ok: false, error: err.message };
      await refresh();
      return { ok: true };
    },
    [user, refresh],
  );

  return { profile, loading, error, setStatus, refresh };
}

export type RiderHistoryEntry = {
  assignmentId: string;
  orderId: string;
  landmark: string;
  feeDh: number;
  deliveredAt: string | null;
  rejectedAt: string | null;
  assignedAt: string;
};

type StatRow = {
  id: string;
  order_id: string;
  delivered_at: string | null;
  rejected_at: string | null;
  assigned_at: string;
  orders: {
    landmark: string | null;
    driver_payload: { headerLandmark?: string } | null;
    delivery_fee_dh: number | null;
  } | null;
};

export function useRiderStats() {
  const { user } = useAuth();
  const [todayDh, setTodayDh] = useState(0);
  const [weekDh, setWeekDh] = useState(0);
  const [tripsToday, setTripsToday] = useState(0);
  const [history, setHistory] = useState<RiderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [{ data: earned, error: e1 }, { data: closed, error: e2 }] = await Promise.all([
      supabase
        .from('order_assignments')
        .select('id, order_id, delivered_at, rejected_at, assigned_at, orders(landmark, driver_payload, delivery_fee_dh)')
        .eq('rider_id', user.id)
        .not('delivered_at', 'is', null)
        .gte('delivered_at', weekAgo.toISOString()),
      supabase
        .from('order_assignments')
        .select('id, order_id, delivered_at, rejected_at, assigned_at, orders(landmark, driver_payload, delivery_fee_dh)')
        .eq('rider_id', user.id)
        .or('delivered_at.not.is.null,rejected_at.not.is.null')
        .order('assigned_at', { ascending: false })
        .limit(20),
    ]);

    if (e1 || e2) {
      setError((e1 ?? e2)!.message);
      setLoading(false);
      return;
    }

    const earnedRows = (earned ?? []) as unknown as StatRow[];
    let today = 0;
    let week = 0;
    let todayCount = 0;
    for (const r of earnedRows) {
      const fee = r.orders?.delivery_fee_dh ?? 0;
      week += fee;
      if (r.delivered_at && new Date(r.delivered_at) >= startOfDay) {
        today += fee;
        todayCount += 1;
      }
    }
    setTodayDh(today);
    setWeekDh(week);
    setTripsToday(todayCount);

    const closedRows = (closed ?? []) as unknown as StatRow[];
    setHistory(
      closedRows.map((r) => ({
        assignmentId: r.id,
        orderId: r.order_id,
        landmark: r.orders?.driver_payload?.headerLandmark || r.orders?.landmark || 'Delivery',
        feeDh: r.orders?.delivery_fee_dh ?? 0,
        deliveredAt: r.delivered_at,
        rejectedAt: r.rejected_at,
        assignedAt: r.assigned_at,
      })),
    );
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void refresh();

    const channel = supabase
      .channel(`rider-stats-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments', filter: `rider_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { todayDh, weekDh, tripsToday, history, loading, error, refresh };
}

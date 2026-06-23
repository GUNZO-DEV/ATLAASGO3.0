import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Rider profile + stats (mirrors the customer app / web src/lib/rider.ts).
 * setStatus() flips online / on_break / offline (upsert). useRiderStats sums the
 * rider's real cut (delivery_fee_dh + tip_dh + boost_dh) over delivered
 * assignments and derives the week breakdown + acceptance rate for the v2
 * earnings screen.
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
  joinedAt: string | null;
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
  created_at: string | null;
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
      .select('user_id, vehicle, plate, status, rating, total_trips, total_earnings_dh, documents_verified, created_at')
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
            joinedAt: row.created_at,
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
    // `city` (the rider's detected zone) is stamped on go-online so dispatch only
    // matches them to orders in that city. Omit it to leave the column untouched.
    async (status: RiderStatus, city?: string | null): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user) return { ok: false, error: 'Not signed in' };
      const row: Record<string, unknown> = { user_id: user.id, status, last_seen_at: new Date().toISOString() };
      if (city != null && city !== '') row.city = city;
      const { error: err } = await supabase.from('riders').upsert(row, { onConflict: 'user_id' });
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

export type WeekDay = { d: string; amt: number; boost: number };

type StatRow = {
  id: string;
  order_id: string;
  delivered_at: string | null;
  rejected_at: string | null;
  accepted_at: string | null;
  assigned_at: string;
  boost_dh: number | null;
  orders: {
    landmark: string | null;
    driver_payload: { headerLandmark?: string } | null;
    delivery_fee_dh: number | null;
    tip_dh: number | null;
  } | null;
};

const STAT_SELECT =
  'id, order_id, delivered_at, rejected_at, accepted_at, assigned_at, boost_dh, ' +
  'orders(landmark, driver_payload, delivery_fee_dh, tip_dh)';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Rider's real cut for a delivered assignment: fee + tip + boost. */
function payoutOf(r: StatRow): number {
  return (r.orders?.delivery_fee_dh ?? 0) + (r.orders?.tip_dh ?? 0) + (r.boost_dh ?? 0);
}

export function useRiderStats() {
  const { user } = useAuth();
  const [todayDh, setTodayDh] = useState(0);
  const [weekDh, setWeekDh] = useState(0);
  const [lastWeekDh, setLastWeekDh] = useState(0);
  const [tripsToday, setTripsToday] = useState(0);
  const [tipsToday, setTipsToday] = useState(0);
  const [weekTipsDh, setWeekTipsDh] = useState(0);
  const [acceptancePct, setAcceptancePct] = useState(0);
  const [week, setWeek] = useState<WeekDay[]>([]);
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
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [{ data: earned, error: e1 }, { data: prevWeek, error: e2 }, { data: closed, error: e3 }, { data: offered, error: e4 }] =
      await Promise.all([
        // This week's delivered (for today/week totals + the week[] breakdown).
        supabase
          .from('order_assignments')
          .select(STAT_SELECT)
          .eq('rider_id', user.id)
          .not('delivered_at', 'is', null)
          .gte('delivered_at', weekAgo.toISOString()),
        // Last week's delivered (14d..7d window) for the trend comparison.
        supabase
          .from('order_assignments')
          .select(STAT_SELECT)
          .eq('rider_id', user.id)
          .not('delivered_at', 'is', null)
          .gte('delivered_at', twoWeeksAgo.toISOString())
          .lt('delivered_at', weekAgo.toISOString()),
        // Recent closed assignments for the history list.
        supabase
          .from('order_assignments')
          .select(STAT_SELECT)
          .eq('rider_id', user.id)
          .or('delivered_at.not.is.null,rejected_at.not.is.null')
          .order('assigned_at', { ascending: false })
          .limit(20),
        // All assignments this week for the acceptance rate (accepted vs offered).
        supabase
          .from('order_assignments')
          .select('id, accepted_at, rejected_at')
          .eq('rider_id', user.id)
          .gte('assigned_at', weekAgo.toISOString()),
      ]);

    if (e1 || e2 || e3 || e4) {
      setError((e1 ?? e2 ?? e3 ?? e4)!.message);
      setLoading(false);
      return;
    }

    const earnedRows = (earned ?? []) as unknown as StatRow[];
    let today = 0;
    let weekTotal = 0;
    let todayCount = 0;
    let todayTips = 0;
    let weekTips = 0;
    // week[] keyed by day index (0=Sun..6=Sat).
    const dayAmt = [0, 0, 0, 0, 0, 0, 0];
    const dayBoost = [0, 0, 0, 0, 0, 0, 0];
    for (const r of earnedRows) {
      const pay = payoutOf(r);
      const tip = r.orders?.tip_dh ?? 0;
      const boost = r.boost_dh ?? 0;
      weekTotal += pay;
      weekTips += tip;
      if (r.delivered_at) {
        const idx = new Date(r.delivered_at).getDay();
        dayAmt[idx] += pay;
        dayBoost[idx] += boost;
        if (new Date(r.delivered_at) >= startOfDay) {
          today += pay;
          todayCount += 1;
          todayTips += tip;
        }
      }
    }

    const prevRows = (prevWeek ?? []) as unknown as StatRow[];
    let prevTotal = 0;
    for (const r of prevRows) prevTotal += payoutOf(r);

    const offeredRows = (offered ?? []) as { id: string; accepted_at: string | null; rejected_at: string | null }[];
    const decided = offeredRows.filter((o) => o.accepted_at || o.rejected_at);
    const accepted = offeredRows.filter((o) => o.accepted_at);
    const acceptance = decided.length > 0 ? Math.round((accepted.length / decided.length) * 100) : 0;

    setTodayDh(today);
    setWeekDh(weekTotal);
    setLastWeekDh(prevTotal);
    setTripsToday(todayCount);
    setTipsToday(todayTips);
    setWeekTipsDh(weekTips);
    setAcceptancePct(acceptance);
    setWeek(DAY_LABELS.map((d, i) => ({ d, amt: dayAmt[i], boost: dayBoost[i] })));

    const closedRows = (closed ?? []) as unknown as StatRow[];
    setHistory(
      closedRows.map((r) => ({
        assignmentId: r.id,
        orderId: r.order_id,
        landmark: r.orders?.driver_payload?.headerLandmark || r.orders?.landmark || 'Delivery',
        feeDh: payoutOf(r),
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

  return {
    todayDh,
    weekDh,
    lastWeekDh,
    tripsToday,
    tipsToday,
    weekTipsDh,
    acceptancePct,
    week,
    history,
    loading,
    error,
    refresh,
  };
}

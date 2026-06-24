import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Admin home dashboard data.
 *
 * KPIs / weekly bars / pending counts all come from the admin-gated
 * SECURITY DEFINER RPCs the backend owns (admin_overview_stats,
 * admin_orders_weekly) so the heavy aggregation + Casablanca-tz "today"
 * logic lives in Postgres, not the client. The activity feed is synthesized
 * from REAL recent rows (rider/restaurant applications + rider last_seen +
 * recent orders) — never from audit logs.
 */

export type OverviewKpis = {
  ordersToday: number;
  gmvTodayDh: number;
  liveDrivers: number;
  openMerchants: number;
  inFlight: number;
  ordersWowPct: number;
  gmvWowPct: number;
};

export type WeekPoint = { d: string; count: number };

export type ActivityKind = 'rider_app' | 'merchant_app' | 'driver_online' | 'order';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  text: string;
  when: string;
};

export type AdminOverview = {
  kpis: OverviewKpis;
  week: WeekPoint[];
  pending: { drivers: number; merchants: number };
  citiesLive: number;
  activity: ActivityItem[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY_KPIS: OverviewKpis = {
  ordersToday: 0,
  gmvTodayDh: 0,
  liveDrivers: 0,
  openMerchants: 0,
  inFlight: 0,
  ordersWowPct: 0,
  gmvWowPct: 0,
};

type StatsRow = {
  orders_today: number | null;
  gmv_today_dh: number | null;
  live_drivers: number | null;
  open_merchants: number | null;
  in_flight: number | null;
  pending_drivers: number | null;
  pending_merchants: number | null;
  cities_live: number | null;
  orders_wow_pct: number | null;
  gmv_wow_pct: number | null;
};

type WeeklyRow = { d: string; count: number | null };

type RiderAppRow = { id: string; full_name: string | null; status: string; created_at: string };
type RestAppRow = { id: string; business_name: string | null; status: string; created_at: string };
type OnlineRiderRow = { user_id: string; last_seen_at: string | null };
type RecentOrderRow = {
  id: string;
  total_dh: number | null;
  status: string;
  created_at: string;
};

function buildActivity(
  riderApps: RiderAppRow[],
  restApps: RestAppRow[],
  onlineRiders: OnlineRiderRow[],
  orders: RecentOrderRow[],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const a of riderApps) {
    items.push({
      id: `rider-app-${a.id}`,
      kind: 'rider_app',
      text: `${a.full_name ?? 'A rider'} applied to drive`,
      when: a.created_at,
    });
  }
  for (const a of restApps) {
    items.push({
      id: `merchant-app-${a.id}`,
      kind: 'merchant_app',
      text: `${a.business_name ?? 'A merchant'} applied to sell`,
      when: a.created_at,
    });
  }
  for (const r of onlineRiders) {
    if (!r.last_seen_at) continue;
    items.push({
      id: `driver-online-${r.user_id}`,
      kind: 'driver_online',
      text: 'A driver came online',
      when: r.last_seen_at,
    });
  }
  for (const o of orders) {
    items.push({
      id: `order-${o.id}`,
      kind: 'order',
      text: `New order · ${o.total_dh ?? 0} dh`,
      when: o.created_at,
    });
  }

  return items
    .filter((i) => !!i.when)
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 20);
}

export function useAdminOverview(): AdminOverview {
  const [kpis, setKpis] = useState<OverviewKpis>(EMPTY_KPIS);
  const [week, setWeek] = useState<WeekPoint[]>([]);
  const [pending, setPending] = useState<{ drivers: number; merchants: number }>({
    drivers: 0,
    merchants: 0,
  });
  const [citiesLive, setCitiesLive] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [statsRes, weekRes, riderAppRes, restAppRes, onlineRes, ordersRes] = await Promise.all([
      supabase.rpc('admin_overview_stats'),
      supabase.rpc('admin_orders_weekly'),
      supabase
        .from('rider_applications')
        .select('id,full_name,status,created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('restaurant_applications')
        .select('id,business_name,status,created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('riders')
        .select('user_id,last_seen_at,status')
        .in('status', ['online', 'busy'])
        .order('last_seen_at', { ascending: false })
        .limit(8),
      supabase
        .from('orders')
        .select('id,total_dh,status,created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    // admin_overview_stats() returns a single row.
    const statsRows = (statsRes.data ?? []) as StatsRow[];
    const s = Array.isArray(statsRows) ? statsRows[0] : (statsRes.data as StatsRow | null);
    if (s) {
      setKpis({
        ordersToday: s.orders_today ?? 0,
        gmvTodayDh: s.gmv_today_dh ?? 0,
        liveDrivers: s.live_drivers ?? 0,
        openMerchants: s.open_merchants ?? 0,
        inFlight: s.in_flight ?? 0,
        ordersWowPct: s.orders_wow_pct ?? 0,
        gmvWowPct: s.gmv_wow_pct ?? 0,
      });
      setPending({ drivers: s.pending_drivers ?? 0, merchants: s.pending_merchants ?? 0 });
      setCitiesLive(s.cities_live ?? 0);
    }

    setWeek(
      ((weekRes.data ?? []) as WeeklyRow[]).map((w) => ({ d: w.d, count: w.count ?? 0 })),
    );

    setActivity(
      buildActivity(
        (riderAppRes.data ?? []) as RiderAppRow[],
        (restAppRes.data ?? []) as RestAppRow[],
        (onlineRes.data ?? []) as OnlineRiderRow[],
        (ordersRes.data ?? []) as RecentOrderRow[],
      ),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`admin-overview-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => void refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { kpis, week, pending, citiesLive, activity, loading, refresh };
}

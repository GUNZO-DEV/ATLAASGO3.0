import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Drives the "online for Xh Ym · Y dh/hr" readout. Opens a shift row
 * (rider_start_shift) when the rider goes online and closes it
 * (rider_end_shift) when they go offline — both RPCs are idempotent, so a
 * double-toggle is harmless. onlineSeconds ticks locally from the open shift's
 * started_at; perHourDh is the rider's real cut earned since the shift began,
 * pro-rated to an hourly rate.
 *
 * Degrades to onlineSeconds=null when there's no shift data (e.g. the RPC/table
 * isn't reachable) so the UI can show a substitute instead of a fake 0.
 */
export type RiderShift = { onlineSeconds: number | null; perHourDh: number | null };

type ShiftRow = { id: string; started_at: string };

export function useRiderShift(isOnline: boolean): RiderShift {
  const { user } = useAuth();
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [onlineSeconds, setOnlineSeconds] = useState<number | null>(null);
  const [earnedDh, setEarnedDh] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sum the rider's real cut (fee + tip + boost) for deliveries since `since`.
  const loadEarned = useCallback(
    async (since: string) => {
      if (!user) return;
      const { data } = await supabase
        .from('order_assignments')
        .select('boost_dh, orders(delivery_fee_dh, tip_dh)')
        .eq('rider_id', user.id)
        .not('delivered_at', 'is', null)
        .gte('delivered_at', since);
      const rows = (data ?? []) as unknown as Array<{
        boost_dh: number | null;
        orders: { delivery_fee_dh: number | null; tip_dh: number | null } | null;
      }>;
      let total = 0;
      for (const r of rows) {
        total += (r.orders?.delivery_fee_dh ?? 0) + (r.orders?.tip_dh ?? 0) + (r.boost_dh ?? 0);
      }
      setEarnedDh(total);
    },
    [user],
  );

  // React to online/offline transitions: open or close the shift.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      if (isOnline) {
        const { data, error } = await supabase.rpc('rider_start_shift');
        if (cancelled) return;
        const row = (Array.isArray(data) ? data[0] : data) as ShiftRow | null;
        if (error || !row?.started_at) {
          // No shift data available — signal a substitute to the UI.
          setHasData(false);
          setStartedAt(null);
          setOnlineSeconds(null);
          return;
        }
        setHasData(true);
        setStartedAt(row.started_at);
        void loadEarned(row.started_at);
      } else {
        void supabase.rpc('rider_end_shift');
        if (cancelled) return;
        setStartedAt(null);
        setHasData(false);
        setOnlineSeconds(null);
        setEarnedDh(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isOnline, loadEarned]);

  // Local 1s ticker for onlineSeconds while a shift is open.
  useEffect(() => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
    if (!startedAt || !hasData) return;

    const start = new Date(startedAt).getTime();
    const update = () => setOnlineSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    tick.current = setInterval(update, 1000);

    return () => {
      if (tick.current) {
        clearInterval(tick.current);
        tick.current = null;
      }
    };
  }, [startedAt, hasData]);

  // Refresh earnings periodically so perHourDh tracks new deliveries.
  useEffect(() => {
    if (!startedAt || !hasData) return;
    const id = setInterval(() => void loadEarned(startedAt), 60_000);
    return () => clearInterval(id);
  }, [startedAt, hasData, loadEarned]);

  const perHourDh =
    hasData && onlineSeconds && onlineSeconds > 0 ? Math.round(earnedDh / (onlineSeconds / 3600)) : hasData ? 0 : null;

  return { onlineSeconds: hasData ? onlineSeconds : null, perHourDh };
}

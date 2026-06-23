import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Admin payouts — driver (rider_payouts) and merchant (merchant_payouts)
 * settlement queues. Status transitions go through the admin-gated
 * process_payout() RPC (pending → processing → paid), and pending rows are
 * generated from REAL delivered data via admin_generate_payouts(). Both RPCs
 * are SECURITY DEFINER and raise if the caller isn't an admin.
 *
 * The two tables differ (riders key on rider_id; merchants carry
 * restaurant_id / owner_id / orders), so each is mapped to a common Payout
 * shape and enriched with a display name from profiles / restaurants.
 */

export type PayoutKind = 'rider' | 'merchant';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

export type Payout = {
  id: string;
  name: string;
  amountDh: number;
  orders: number | null;
  periodStart: string;
  periodEnd: string;
  status: PayoutStatus;
  paidAt: string | null;
  requestedAt: string | null;
};

type MutationResult = { ok: boolean; error?: string };

type RiderPayoutRow = {
  id: string;
  rider_id: string;
  amount_dh: number | null;
  period_start: string;
  period_end: string;
  status: PayoutStatus;
  paid_at: string | null;
  requested_at: string | null;
  created_at: string | null;
};

type MerchantPayoutRow = {
  id: string;
  restaurant_id: string | null;
  owner_id: string | null;
  amount_dh: number | null;
  orders: number | null;
  period_start: string;
  period_end: string;
  status: PayoutStatus;
  paid_at: string | null;
  requested_at: string | null;
};

type ProfileRow = { id: string; display_name: string | null };
type RestaurantNameRow = { id: string; name: string };

const NEXT: Record<PayoutStatus, PayoutStatus | null> = {
  pending: 'processing',
  processing: 'paid',
  paid: null,
  failed: null,
};

export function usePayouts() {
  const [drivers, setDrivers] = useState<Payout[]>([]);
  const [merchants, setMerchants] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: riderRows }, { data: merchantRows }] = await Promise.all([
      supabase
        .from('rider_payouts')
        .select('id,rider_id,amount_dh,period_start,period_end,status,paid_at,requested_at,created_at')
        .order('period_end', { ascending: false }),
      supabase
        .from('merchant_payouts')
        .select('id,restaurant_id,owner_id,amount_dh,orders,period_start,period_end,status,paid_at,requested_at')
        .order('period_end', { ascending: false }),
    ]);

    const riders = (riderRows ?? []) as RiderPayoutRow[];
    const merch = (merchantRows ?? []) as MerchantPayoutRow[];

    // Resolve display names in one round-trip each.
    const riderIds = Array.from(new Set(riders.map((r) => r.rider_id).filter(Boolean)));
    const restIds = Array.from(
      new Set(merch.map((m) => m.restaurant_id).filter((x): x is string => !!x)),
    );

    const [{ data: profiles }, { data: rests }] = await Promise.all([
      riderIds.length
        ? supabase.from('profiles').select('id,display_name').in('id', riderIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
      restIds.length
        ? supabase.from('restaurants').select('id,name').in('id', restIds)
        : Promise.resolve({ data: [] as RestaurantNameRow[] }),
    ]);

    const nameById = new Map<string, string>();
    ((profiles ?? []) as ProfileRow[]).forEach((p) =>
      nameById.set(p.id, p.display_name ?? 'Driver'),
    );
    const restById = new Map<string, string>();
    ((rests ?? []) as RestaurantNameRow[]).forEach((r) => restById.set(r.id, r.name));

    setDrivers(
      riders.map((r) => ({
        id: r.id,
        name: nameById.get(r.rider_id) ?? 'Driver',
        amountDh: Number(r.amount_dh ?? 0),
        orders: null,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        status: r.status,
        paidAt: r.paid_at,
        requestedAt: r.requested_at ?? r.created_at,
      })),
    );

    setMerchants(
      merch.map((m) => ({
        id: m.id,
        name: (m.restaurant_id && restById.get(m.restaurant_id)) || 'Merchant',
        amountDh: Number(m.amount_dh ?? 0),
        orders: m.orders ?? null,
        periodStart: m.period_start,
        periodEnd: m.period_end,
        status: m.status,
        paidAt: m.paid_at,
        requestedAt: m.requested_at,
      })),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sum of everything not yet settled, across both queues.
  const allPending = [...drivers, ...merchants].filter(
    (p) => p.status === 'pending' || p.status === 'processing',
  );
  const summary = {
    pendingDh: allPending.reduce((acc, p) => acc + p.amountDh, 0),
    count: allPending.length,
  };

  /** Advance one payout to `next` (defaults to the next legal state). */
  const pay = useCallback(
    async (kind: PayoutKind, id: string, next?: PayoutStatus): Promise<MutationResult> => {
      const list = kind === 'rider' ? drivers : merchants;
      const current = list.find((p) => p.id === id);
      const target = next ?? (current ? NEXT[current.status] : 'paid');
      if (!target) return { ok: false, error: 'Already settled' };
      const { error } = await supabase.rpc('process_payout', {
        p_id: id,
        p_kind: kind,
        p_next: target,
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [drivers, merchants, refresh],
  );

  /** Settle every pending/processing payout in a queue, straight to 'paid'. */
  const payAll = useCallback(
    async (kind: PayoutKind): Promise<MutationResult> => {
      const list = kind === 'rider' ? drivers : merchants;
      const targets = list.filter((p) => p.status === 'pending' || p.status === 'processing');
      for (const p of targets) {
        const { error } = await supabase.rpc('process_payout', {
          p_id: p.id,
          p_kind: kind,
          p_next: 'paid',
        });
        if (error) {
          await refresh();
          return { ok: false, error: error.message };
        }
      }
      await refresh();
      return { ok: true };
    },
    [drivers, merchants, refresh],
  );

  /** Generate pending payout rows from delivered data for a period. */
  const generate = useCallback(
    async (kind: PayoutKind, start: string, end: string): Promise<MutationResult> => {
      const { error } = await supabase.rpc('admin_generate_payouts', {
        p_kind: kind,
        p_period_start: start,
        p_period_end: end,
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { drivers, merchants, summary, loading, refresh, pay, payAll, generate };
}

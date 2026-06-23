import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Admin promotions management — list every promo with its budget/spend (for the
 * budget bars), create new codes, edit, and flip active. Reads/writes the
 * `promotions` table directly (admin-write RLS); `code` is the primary key.
 *
 * budget_dh / spent_dh / name / scope are the admin-facing columns the backend
 * adds; the discount mechanics (kind / percent_off / flat_off_dh / dates) are
 * the same columns the customer cart already validates against.
 */

export type PromoKind = 'percent_off' | 'flat_off' | 'free_delivery' | 'bogo';

export type AdminPromo = {
  code: string;
  name: string;
  scope: string;
  kind: PromoKind;
  percentOff: number | null;
  flatOffDh: number | null;
  minSubtotalDh: number;
  budgetDh: number;
  spentDh: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
};

export type NewPromo = {
  code: string;
  name?: string;
  scope?: string;
  kind: PromoKind;
  percentOff?: number | null;
  flatOffDh?: number | null;
  minSubtotalDh?: number;
  budgetDh?: number;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
};

export type PromoPatch = Partial<{
  name: string;
  scope: string;
  kind: PromoKind;
  percentOff: number | null;
  flatOffDh: number | null;
  minSubtotalDh: number;
  budgetDh: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
}>;

type MutationResult = { ok: boolean; error?: string };

type PromoRow = {
  code: string;
  name: string | null;
  scope: string | null;
  kind: PromoKind;
  percent_off: number | null;
  flat_off_dh: number | null;
  min_subtotal_dh: number | null;
  budget_dh: number | null;
  spent_dh: number | null;
  is_active: boolean | null;
  valid_from: string | null;
  valid_to: string | null;
};

const COLS =
  'code,name,scope,kind,percent_off,flat_off_dh,min_subtotal_dh,budget_dh,spent_dh,is_active,valid_from,valid_to';

function mapPromo(r: PromoRow): AdminPromo {
  return {
    code: r.code,
    name: r.name ?? r.code,
    scope: r.scope ?? 'all',
    kind: r.kind,
    percentOff: r.percent_off,
    flatOffDh: r.flat_off_dh,
    minSubtotalDh: r.min_subtotal_dh ?? 0,
    budgetDh: r.budget_dh ?? 0,
    spentDh: r.spent_dh ?? 0,
    isActive: r.is_active ?? false,
    validFrom: r.valid_from,
    validTo: r.valid_to,
  };
}

export function usePromotionsAdmin() {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('promotions')
      .select(COLS)
      .order('created_at', { ascending: false });
    setPromos(((data ?? []) as PromoRow[]).map(mapPromo));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createPromo = useCallback(
    async (d: NewPromo): Promise<MutationResult> => {
      const { error } = await supabase.from('promotions').insert({
        code: d.code.trim().toUpperCase(),
        name: d.name ?? d.code,
        scope: d.scope ?? 'all',
        kind: d.kind,
        percent_off: d.percentOff ?? null,
        flat_off_dh: d.flatOffDh ?? null,
        min_subtotal_dh: d.minSubtotalDh ?? 0,
        budget_dh: d.budgetDh ?? 0,
        is_active: d.isActive ?? true,
        valid_from: d.validFrom ?? null,
        valid_to: d.validTo ?? null,
      });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const updatePromo = useCallback(
    async (code: string, patch: PromoPatch): Promise<MutationResult> => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.scope !== undefined) row.scope = patch.scope;
      if (patch.kind !== undefined) row.kind = patch.kind;
      if (patch.percentOff !== undefined) row.percent_off = patch.percentOff;
      if (patch.flatOffDh !== undefined) row.flat_off_dh = patch.flatOffDh;
      if (patch.minSubtotalDh !== undefined) row.min_subtotal_dh = patch.minSubtotalDh;
      if (patch.budgetDh !== undefined) row.budget_dh = patch.budgetDh;
      if (patch.isActive !== undefined) row.is_active = patch.isActive;
      if (patch.validFrom !== undefined) row.valid_from = patch.validFrom;
      if (patch.validTo !== undefined) row.valid_to = patch.validTo;
      const { error } = await supabase.from('promotions').update(row).eq('code', code);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const togglePromo = useCallback(
    async (code: string, isActive: boolean): Promise<MutationResult> => {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: isActive })
        .eq('code', code);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { promos, loading, refresh, createPromo, updatePromo, togglePromo };
}

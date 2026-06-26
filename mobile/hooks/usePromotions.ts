import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Promo-code validation for checkout — mirrors the web cart's rules exactly
 * (src/pages/Cart.tsx applyPromo): the code must be active, not expired,
 * under its redemption cap, and the subtotal must clear its minimum.
 *
 * Discount math (same as web):
 *   percent_off   → Math.round(subtotal * pct / 100)
 *   flat_off      → flat_off_dh
 *   free_delivery → the current delivery fee
 */
export type PromoKind = 'percent_off' | 'flat_off' | 'free_delivery' | 'bogo';

type PromoRow = {
  code: string;
  kind: PromoKind;
  percent_off: number | null;
  flat_off_dh: number | null;
  min_subtotal_dh: number;
  is_active: boolean;
  valid_to: string | null;
  max_redemptions: number | null;
  redemptions: number;
};

export type AppliedPromo = {
  code: string;
  kind: PromoKind;
  discountDh: number;
};

export function usePromotions() {
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate `rawCode` against the live promotions row and, if valid, store it
   * as the applied promo. Returns the applied promo or null (with `error` set).
   */
  const apply = useCallback(
    async (rawCode: string, subtotalDh: number, deliveryFeeDh: number): Promise<AppliedPromo | null> => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return null;
      setChecking(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('promotions')
          .select(
            'code,kind,percent_off,flat_off_dh,min_subtotal_dh,is_active,valid_to,max_redemptions,redemptions',
          )
          .eq('code', code)
          .maybeSingle();
        if (err || !data) {
          setError('Invalid promo code');
          return null;
        }
        const promo = data as PromoRow;
        if (!promo.is_active) {
          setError('This promo code is no longer active');
          return null;
        }
        if (promo.valid_to && new Date(promo.valid_to) < new Date()) {
          setError('This promo code has expired');
          return null;
        }
        if (promo.max_redemptions && promo.redemptions >= promo.max_redemptions) {
          setError('This promo code has reached its limit');
          return null;
        }
        if (subtotalDh < promo.min_subtotal_dh) {
          setError(`Add ${promo.min_subtotal_dh - subtotalDh} dh more to use this code`);
          return null;
        }
        let discountDh = 0;
        if (promo.kind === 'percent_off' && promo.percent_off) {
          discountDh = Math.round((subtotalDh * promo.percent_off) / 100);
        } else if (promo.kind === 'flat_off' && promo.flat_off_dh) {
          discountDh = promo.flat_off_dh;
        } else if (promo.kind === 'free_delivery') {
          discountDh = deliveryFeeDh;
        } else {
          // 'bogo' (and any unsupported/misconfigured kind, e.g. percent_off with
          // a null percentage) has no discount logic — refuse it rather than
          // silently applying 0 dh and burning a redemption on the customer.
          setError('This promo code can’t be applied to your order');
          return null;
        }
        const next: AppliedPromo = { code: promo.code, kind: promo.kind, discountDh };
        setApplied(next);
        return next;
      } finally {
        setChecking(false);
      }
    },
    [],
  );

  const remove = useCallback(() => {
    setApplied(null);
    setError(null);
  }, []);

  return { applied, checking, error, apply, remove };
}

/**
 * Bump the promo's redemption counter after a successful order.
 * Best-effort / fire-and-forget — same as the web cart.
 */
export function redeemPromo(code: string): void {
  void supabase.rpc('increment_promo_redemption', { promo_code: code });
}

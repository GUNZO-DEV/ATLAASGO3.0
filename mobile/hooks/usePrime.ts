import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * The signed-in user's active Prime subscription, if any. prime_subscriptions
 * is RLS-scoped (self read). Payment/subscribe is handled separately.
 */
export type PrimeSub = {
  tier: string;
  isActive: boolean;
  expiresAt: string | null;
};

export const PRIME_TIERS = [
  {
    id: 'student',
    name: 'Prime Student',
    priceDh: 39,
    period: '/mo',
    perks: ['Free delivery on every order', 'AUI student pricing', 'Priority support'],
  },
  {
    id: 'standard',
    name: 'Prime Standard',
    priceDh: 79,
    period: '/mo',
    perks: ['Free delivery on every order', 'Exclusive promos', 'Priority support'],
  },
  {
    id: 'campus_pass',
    name: 'Campus Pass',
    priceDh: 299,
    period: '/semester',
    perks: ['Free delivery all semester', 'Best value for AUI', 'Priority support'],
  },
] as const;

export function usePrime() {
  const { user } = useAuth();
  const [sub, setSub] = useState<PrimeSub | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSub(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('prime_subscriptions')
      .select('tier, is_active, expires_at')
      .eq('is_active', true)
      .maybeSingle();
    const d = data as { tier: string; is_active: boolean; expires_at: string | null } | null;
    setSub(d ? { tier: d.tier, isActive: d.is_active, expiresAt: d.expires_at } : null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sub, loading, refresh };
}

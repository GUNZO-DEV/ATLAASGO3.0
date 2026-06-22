import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/** Signed-in user's app roles. RLS scopes rows to the current user. */
export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles(new Set(((data ?? []) as { role: string }[]).map((r) => r.role)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const has = (role: string) => roles.has(role);
  return { roles, loading, has, isRider: has('rider'), isAdmin: has('admin') || has('super_admin'), isMerchant: has('merchant') };
}

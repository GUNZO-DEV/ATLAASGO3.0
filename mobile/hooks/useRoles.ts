import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * The signed-in user's app roles (customer/rider/merchant/admin/super_admin).
 * RLS ("user_roles: self read") scopes the rows to the current user, so this
 * just reads their own roles. Used to reveal role-gated entries (Driver mode,
 * Admin) in the account hub.
 */
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
  return {
    roles,
    loading,
    has,
    isRider: has('rider'),
    isAdmin: has('admin') || has('super_admin'),
    isMerchant: has('merchant'),
  };
}

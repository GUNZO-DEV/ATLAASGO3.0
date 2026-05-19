import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { AppRole } from './database.types';

type RolesCtx = {
  roles: Set<AppRole>;
  hasRole: (r: AppRole) => boolean;
  isAdmin: boolean;
  isRider: boolean;
  isMerchant: boolean;
  loading: boolean;
};

const Ctx = createContext<RolesCtx | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Set<AppRole>>(new Set());
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
        setRoles(new Set((data ?? []).map((r: { role: AppRole }) => r.role)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo<RolesCtx>(() => {
    return {
      roles,
      hasRole: (r) => roles.has(r),
      isAdmin: roles.has('admin') || roles.has('super_admin'),
      isRider: roles.has('rider'),
      isMerchant: roles.has('merchant'),
      loading,
    };
  }, [roles, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRoles() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRoles must be used inside RolesProvider');
  return ctx;
}

/**
 * Role-aware route guard. Renders children only if user holds one of `any`.
 * Anonymous users → /auth?next=…
 * Wrong-role users → /
 */
export function RoleGate({
  any,
  children,
  redirectTo = '/',
}: {
  any: AppRole[];
  children: ReactNode;
  redirectTo?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();

  if (authLoading || rolesLoading) {
    return (
      <section className="page">
        <div className="container">
          <p style={{ color: 'var(--fg-soft)', marginTop: 40 }}>Loading…</p>
        </div>
      </section>
    );
  }
  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  }
  if (!any.some((r) => roles.has(r))) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}

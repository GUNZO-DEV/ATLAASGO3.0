import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useMyApplications, type ApplicationKind } from './applications';
import { PendingApplication } from '../components/PendingApplication';
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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (cancelled) return;
      setRoles(new Set((data ?? []).map((r: { role: AppRole }) => r.role)));
      setLoading(false);
    }

    void load();

    // Subscribe so admin role-grants reflect live without a refresh
    channel = supabase
      .channel(`my_roles:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
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
 *
 * When `pendingKind` is set, users WITHOUT the role but WITH a submitted
 * application of that kind see the friendly PendingApplication screen
 * instead of being silently bounced back to /.
 */
export function RoleGate({
  any,
  pendingKind,
  children,
  redirectTo = '/',
}: {
  any: AppRole[];
  pendingKind?: ApplicationKind;
  children: ReactNode;
  redirectTo?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const { apps, loading: appsLoading, latestPending, latestRejected, latestNeedsInfo } =
    useMyApplications();

  if (authLoading || rolesLoading || (pendingKind && appsLoading)) {
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
  if (any.some((r) => roles.has(r))) {
    return <>{children}</>;
  }

  // User is signed in but missing the role. If they applied, show the
  // pending screen rather than yanking them back to home.
  if (pendingKind) {
    const pending = latestPending(pendingKind);
    if (pending) return <PendingApplication application={pending} />;
    const needsInfo = latestNeedsInfo(pendingKind);
    if (needsInfo) return <PendingApplication application={needsInfo} />;
    const rejected = latestRejected(pendingKind);
    if (rejected) return <PendingApplication application={rejected} />;
    // No app at all → guide them to apply
    const applyPath = pendingKind === 'rider' ? '/rider/apply' : '/merchant/apply';
    return <Navigate to={applyPath} replace />;
  }

  // Silence unused warning when pendingKind is not provided
  void apps;
  return <Navigate to={redirectTo} replace />;
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Re-apply the realtime auth token so postgres_changes keep flowing. The
 * realtime websocket silently drops its auth when the app backgrounds; without
 * re-applying the access_token the rider stops receiving new orders until a
 * full app restart. Guarded so a failure here never breaks auth.
 */
function applyRealtimeAuth(accessToken: string | null | undefined) {
  try {
    if (accessToken) supabase.realtime.setAuth(accessToken);
  } catch {
    // realtime not ready / transient — polling + pull-to-refresh cover the gap
  }
}

/**
 * Supabase session provider — identical to the customer app. Clerk → Supabase
 * bridge: syncWithClerkToken POSTs the Clerk JWT to the `clerk-sync` edge
 * function → { access_token, refresh_token } → setSession.
 */
type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  syncWithClerkToken: (clerkToken: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      applyRealtimeAuth(data.session?.access_token);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      applyRealtimeAuth(s?.access_token);
      setLoading(false);
    });

    // When the app returns to the foreground the realtime socket may have been
    // torn down with a stale token — re-apply it so live updates resume without
    // a restart. Reads the freshest session each time rather than closing over a
    // stale one.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      supabase.auth
        .getSession()
        .then(({ data }) => applyRealtimeAuth(data.session?.access_token))
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  async function syncWithClerkToken(
    clerkToken: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/clerk-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_token: clerkToken }),
      });
      const body = await res.json();
      if (!res.ok || !body?.access_token || !body?.refresh_token) {
        return { ok: false, error: body?.error ?? 'clerk-sync failed' };
      }
      const { error } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      if (error) return { ok: false, error: error.message };
      applyRealtimeAuth(body.access_token);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'network error' };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  const value = useMemo<AuthCtx>(
    () => ({ user: session?.user ?? null, session, loading, syncWithClerkToken, signOut }),
    [session, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

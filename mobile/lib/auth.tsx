import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Mobile auth — manages the Supabase session, mirroring the web app's model.
 *
 * The session itself is persisted in AsyncStorage by the Supabase client, so
 * `supabase.from(...)` queries are automatically authenticated once a session
 * exists, and RLS (auth.uid() = customer_id, etc.) applies on-device exactly
 * like on the web.
 *
 * Bridging Clerk → Supabase reuses the SAME `clerk-sync` edge function the web
 * app uses: POST { clerk_token } → { access_token, refresh_token }. Wire a
 * Clerk-Expo token provider to `syncWithClerkToken` to complete native login
 * (Chunk 4b — needs the Clerk Expo SDK + a dev client build).
 */
type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Exchange a Clerk session JWT for a Supabase session via clerk-sync. */
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
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      syncWithClerkToken,
      signOut,
    }),
    [session, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

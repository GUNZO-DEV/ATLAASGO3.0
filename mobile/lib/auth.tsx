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
 * Re-apply the realtime auth token. The realtime websocket authenticates with
 * its own copy of the JWT; if it isn't refreshed after a token rotation or an
 * app foreground, `postgres_changes` silently stop arriving (the user's "I have
 * to close and reopen the app to see new orders" complaint). Always guarded —
 * a realtime hiccup must never break auth or crash the provider.
 */
function applyRealtimeAuth(token: string | null | undefined) {
  try {
    void supabase.realtime.setAuth(token ?? null);
  } catch {
    /* realtime not critical — focus-polling + pull-to-refresh still cover us */
  }
}

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
      // Prime the realtime socket with the restored session's token.
      applyRealtimeAuth(data.session?.access_token);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      // Keep the realtime socket's JWT in lock-step with auth (sign-in,
      // sign-out, and silent token refresh all flow through here).
      applyRealtimeAuth(s?.access_token);
      setLoading(false);
    });

    // When the app returns to the foreground the websocket may have been
    // dropped while backgrounded; re-applying the current token forces it to
    // reconnect/re-authenticate so postgres_changes resume immediately.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) applyRealtimeAuth(data.session.access_token);
      });
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
      // Authenticate the realtime socket with the freshly minted token so live
      // subscriptions work the moment the user signs in.
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

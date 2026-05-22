import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase } from './supabase';

type AuthCtx = {
  /** Supabase user — null until Clerk signs in and clerk-sync exchanges tokens. */
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Signs out of both Clerk and Supabase. */
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken: getClerkToken, signOut: clerkSignOut } = useClerkAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);
  const prevClerkIdRef = useRef<string | null>(null);

  // ── Listen to Supabase auth state (session persist + auto-refresh) ──
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session ?? null);
        setLoading(false);
      }
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

  // ── Sync Clerk → Supabase when Clerk user state changes ────────────
  useEffect(() => {
    if (!clerkLoaded) return;

    // User signed out of Clerk → sign out of Supabase too
    if (!clerkUser) {
      if (prevClerkIdRef.current) {
        supabase.auth.signOut();
        prevClerkIdRef.current = null;
      }
      return;
    }

    // Already synced this Clerk user
    if (prevClerkIdRef.current === clerkUser.id) return;

    // Already have a Supabase session (e.g. from a persisted cookie)
    if (session?.user) {
      prevClerkIdRef.current = clerkUser.id;
      return;
    }

    // Prevent concurrent syncs
    if (syncingRef.current) return;
    syncingRef.current = true;

    (async () => {
      try {
        const clerkToken = await getClerkToken();
        if (!clerkToken) return;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clerk-sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ clerk_token: clerkToken }),
          },
        );

        const data = await res.json();
        if (!res.ok) {
          console.error('[auth] clerk-sync failed:', data.error);
          return;
        }

        // Set the Supabase session — this triggers onAuthStateChange above
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        prevClerkIdRef.current = clerkUser.id;
      } catch (err) {
        console.error('[auth] clerk-sync error:', err);
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [clerkLoaded, clerkUser, getClerkToken, session]);

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      loading:
        loading ||
        (!session && clerkLoaded && !!clerkUser && prevClerkIdRef.current !== clerkUser?.id),
      signOut: async () => {
        prevClerkIdRef.current = null;
        await supabase.auth.signOut();
        await clerkSignOut();
      },
    }),
    [session, loading, clerkLoaded, clerkUser, clerkSignOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

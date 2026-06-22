import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useAuth as useSupabaseAuth } from '../lib/auth';

/**
 * Bridges Clerk (identity) → Supabase (data session) — the SAME flow as the
 * customer app, reusing the shared AuthProvider. Mounted inside both providers.
 * When Clerk is signed in, exchanges a Clerk JWT for a Supabase session via the
 * clerk-sync edge function; signs out of Supabase when Clerk signs out.
 */
export function ClerkSupabaseBridge() {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: supabaseUser, syncWithClerkToken, signOut } = useSupabaseAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      if (supabaseUser) void signOut();
      return;
    }
    if (supabaseUser || syncingRef.current) return;

    syncingRef.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (token) await syncWithClerkToken(token);
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, supabaseUser, getToken, syncWithClerkToken, signOut]);

  return null;
}

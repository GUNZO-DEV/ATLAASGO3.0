import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useAuth as useSupabaseAuth } from './auth';

/**
 * Bridges Clerk (identity) → Supabase (data session). Mounted inside both
 * ClerkProvider and AuthProvider. When Clerk has a signed-in session, it
 * fetches a Clerk JWT and exchanges it for a Supabase session via the
 * clerk-sync edge function (the SAME flow the web app uses). When Clerk signs
 * out, it signs out of Supabase too.
 *
 * Renders nothing — pure side-effect glue.
 */
export function ClerkSupabaseBridge() {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: supabaseUser, syncWithClerkToken, signOut } = useSupabaseAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    // Clerk signed out → drop the Supabase session.
    if (!isSignedIn) {
      if (supabaseUser) void signOut();
      return;
    }

    // Already have a Supabase session — nothing to do.
    if (supabaseUser || syncingRef.current) return;

    syncingRef.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          await syncWithClerkToken(token);
        }
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, supabaseUser, getToken, syncWithClerkToken, signOut]);

  return null;
}

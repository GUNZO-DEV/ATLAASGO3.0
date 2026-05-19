import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  /**
   * In dev we want a loud signal; in prod the build pipeline should fail
   * via the CI check before this line ever runs.
   */
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in .env.local before running.',
  );
}

/**
 * We intentionally skip the typed-Database generic — runtime payload
 * shape is enforced by RLS policies + Postgres CHECK constraints in
 * supabase/schema.sql. Results are cast to typed Row shapes from
 * database.types.ts at the call site.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 5 } },
});

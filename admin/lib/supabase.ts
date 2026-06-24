/**
 * Supabase client for the AtlaasGo mobile app.
 *
 * This is the SAME backend the web app and live site use
 * (toywtnupchfywhtdhxvj.supabase.co). Replaces the old Firestore client.
 *
 * Native specifics vs. the web client:
 *   - Session is persisted in AsyncStorage (React Native has no localStorage).
 *   - `detectSessionInUrl: false` — there's no URL to parse on native.
 *   - `react-native-url-polyfill` is imported for URL() support in RN.
 *
 * The anon key is a publishable key — safe to ship in the bundle; row
 * access is enforced by Postgres RLS, not by hiding the key.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — ' +
      'copy mobile/.env.example to mobile/.env and fill them in.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

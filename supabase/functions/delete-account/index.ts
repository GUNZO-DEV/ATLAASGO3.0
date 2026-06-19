/**
 * Supabase Edge Function: delete-account
 *
 * In-app account deletion (Apple App Store Guideline 5.1.1(v)).
 * Authenticated user permanently deletes their own account:
 *   1. Deletes the Clerk user (identity provider) so they can't sign back in.
 *   2. Deletes all of the user's Supabase data via delete_user_data().
 *   3. Deletes the Supabase auth identity.
 *
 * The caller is identified by their own Supabase JWT (forwarded by
 * supabase.functions.invoke) — a user can only ever delete themselves.
 *
 * Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_SECRET_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Best-effort delete of the Clerk user matching this email. */
async function deleteClerkUser(email: string): Promise<void> {
  if (!CLERK_SECRET_KEY || !email) return;
  try {
    const res = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } },
    );
    if (!res.ok) return;
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body?.data ?? []);
    for (const u of list) {
      if (u?.id) {
        await fetch(`https://api.clerk.com/v1/users/${u.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
        });
      }
    }
  } catch (_e) {
    // Non-fatal: Supabase deletion still proceeds.
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Missing authorization' }, 401);

    // Identify the caller from their own JWT — they can only delete themselves.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);
    const userId = userData.user.id;
    const email = userData.user.email ?? '';

    // 1. Remove the Clerk identity first (prevents the Clerk->Supabase bridge
    //    from re-creating data mid-deletion).
    await deleteClerkUser(email);

    // 2. Delete all app data for the user.
    const { error: dataErr } = await admin.rpc('delete_user_data', { p_user_id: userId });
    if (dataErr) return json({ error: `Data deletion failed: ${dataErr.message}` }, 500);

    // 3. Delete the Supabase auth identity (cascades auth sessions/identities).
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) return json({ error: `Identity deletion failed: ${authErr.message}` }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

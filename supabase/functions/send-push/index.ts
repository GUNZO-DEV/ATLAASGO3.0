/**
 * Supabase Edge Function: send-push
 *
 * Sends an Expo push notification to all of a user's registered devices.
 * Called server-to-server (e.g. the notifications-insert DB trigger) with the
 * project's service-role key as a Bearer token. verify_jwt is disabled because
 * the caller is the database/another function, not an end user.
 *
 * POST { userId, title, body, data? }   (Authorization: Bearer <service_role_key>)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Trusted callers only: accept the project service-role key OR the dedicated
  // push relay secret stored in Vault (so the DB push trigger can authenticate
  // without ever holding the service-role key).
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  let relay = '';
  try {
    const { data: relaySecret } = await admin.rpc('current_push_relay_secret');
    relay = (relaySecret as string) ?? '';
  } catch {
    relay = '';
  }
  if (!token || (token !== SERVICE_KEY && (relay === '' || token !== relay))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { userId, title, body, data } = await req.json();
    if (!userId || !title) return json({ error: 'userId and title are required' }, 400);

    const { data: rows, error } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .in('platform', ['ios', 'android']);
    if (error) return json({ error: error.message }, 500);

    const tokens = (rows ?? [])
      .map((r: { token: string | null }) => r.token)
      .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));
    if (tokens.length === 0) return json({ ok: true, sent: 0 });

    const messages = tokens.map((to) => ({
      to,
      title,
      body: body ?? '',
      data: data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    return json({ ok: true, sent: tokens.length, result });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

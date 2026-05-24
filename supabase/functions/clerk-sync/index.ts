/**
 * Supabase Edge Function: clerk-sync
 *
 * Bridges Clerk auth with Supabase Auth. When a user signs in via Clerk,
 * this function verifies the Clerk JWT, finds or creates a matching
 * Supabase auth user, and returns a Supabase session (access + refresh tokens).
 *
 * This keeps the entire existing schema, RLS policies, and FK constraints
 * working — Clerk handles the UI, Supabase handles the database auth.
 *
 * POST { clerk_token: string }
 * → { access_token, refresh_token, user_id }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY')!;
const CLERK_ISSUER = Deno.env.get('CLERK_ISSUER')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const JWKS = createRemoteJWKSet(new URL(`${CLERK_ISSUER}/.well-known/jwks.json`));

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

/** Derive a deterministic password from Clerk user ID + secret. */
async function derivePassword(clerkUserId: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(CLERK_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(clerkUserId));
  const hex = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `ck_${hex.slice(0, 40)}`;
}

/** Try to sign in and return session, or null. */
async function trySignIn(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string; user_id: string } | null> {
  const { data } = await supabase.auth.signInWithPassword({ email, password });
  if (!data?.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { clerk_token } = await req.json();
    if (!clerk_token) return json({ error: 'clerk_token is required' }, 400);

    // ── 1. Verify Clerk JWT ──────────────────────────────────────────
    let payload;
    try {
      const result = await jwtVerify(clerk_token, JWKS, { issuer: CLERK_ISSUER });
      payload = result.payload;
    } catch (err) {
      console.error('JWT verify failed:', err);
      return json({ error: 'Invalid Clerk token' }, 401);
    }

    const clerkUserId = payload.sub as string;
    if (!clerkUserId) return json({ error: 'No sub claim in token' }, 401);

    // ── 2. Fetch user details from Clerk Backend API ─────────────────
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!clerkRes.ok) return json({ error: 'Clerk user not found' }, 401);
    const clerkUser = await clerkRes.json();

    const email = clerkUser.email_addresses?.[0]?.email_address;
    if (!email) return json({ error: 'No email on Clerk account' }, 400);

    const displayName =
      [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || null;
    const password = await derivePassword(clerkUserId);

    // ── 3. Try sign-in (existing synced user) ────────────────────────
    const existing = await trySignIn(email, password);
    if (existing) {
      // Ensure profile + wallet + role exist (idempotent upserts)
      await Promise.allSettled([
        supabase
          .from('profiles')
          .upsert(
            { id: existing.user_id, display_name: displayName },
            { onConflict: 'id' },
          ),
        supabase
          .from('user_roles')
          .upsert(
            { user_id: existing.user_id, role: 'customer' },
            { onConflict: 'user_id,role' },
          ),
        supabase
          .from('wallets')
          .upsert(
            { user_id: existing.user_id, balance_dh: 0, currency: 'MAD' },
            { onConflict: 'user_id' },
          ),
      ]);
      return json(existing);
    }

    // ── 4. Try creating a new Supabase user ──────────────────────────
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, clerk_id: clerkUserId },
    });

    if (created?.user) {
      const session = await trySignIn(email, password);
      if (session) {
        // Bootstrap new user: profile, wallet, customer role
        await Promise.allSettled([
          supabase
            .from('profiles')
            .upsert(
              { id: session.user_id, display_name: displayName, phone: null },
              { onConflict: 'id' },
            ),
          supabase
            .from('user_roles')
            .upsert(
              { user_id: session.user_id, role: 'customer' },
              { onConflict: 'user_id,role' },
            ),
          supabase
            .from('wallets')
            .upsert(
              { user_id: session.user_id, balance_dh: 0, currency: 'MAD' },
              { onConflict: 'user_id' },
            ),
          // Welcome notification
          supabase
            .from('notifications')
            .insert({
              user_id: session.user_id,
              kind: 'system',
              title: 'Welcome to AtlaasGo',
              body: 'Your account is ready. Explore restaurants near AUI and place your first order.',
              payload: {},
            }),
        ]);
        return json(session);
      }
    }

    // ── 5. User exists with old password (pre-Clerk) — update it ─────
    if (createErr?.message?.includes('already been registered')) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const match = users?.find((u: { email?: string }) => u.email === email);
      if (match) {
        await supabase.auth.admin.updateUserById(match.id, { password });
        const session = await trySignIn(email, password);
        if (session) {
          if (displayName) {
            await supabase
              .from('profiles')
              .update({ display_name: displayName })
              .eq('id', session.user_id);
          }
          return json(session);
        }
      }
    }

    return json({ error: createErr?.message ?? 'Failed to sync user' }, 500);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('clerk-sync error:', message);
    return json({ error: message }, 500);
  }
});

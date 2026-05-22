/**
 * Supabase Edge Function: admin-create-user
 *
 * Allows admins to create new users and manage roles.
 * Uses service_role key since auth.admin.* requires elevated privileges.
 *
 * Actions:
 *   POST { action: "create_user", email, password, display_name?, phone?, role? }
 *   POST { action: "grant_role", user_id, role }
 *   POST { action: "revoke_role", user_id, role }
 *   POST { action: "set_approved", user_id, approved: boolean }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

/** Verify the calling user is an admin or super_admin */
async function verifyAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { ok: false, response: json({ error: 'Missing authorization header' }, 401) };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { ok: false, response: json({ error: 'Invalid token' }, 401) };

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'super_admin']);

  if (!roles || roles.length === 0) {
    return { ok: false, response: json({ error: 'Forbidden — admin role required' }, 403) };
  }

  return { ok: true, userId: user.id };
}

async function handleCreateUser(body: {
  email: string;
  password: string;
  display_name?: string;
  phone?: string;
  role?: string;
}) {
  const { email, password, display_name, phone, role } = body;

  if (!email || !password) {
    return json({ error: 'email and password are required' }, 400);
  }

  // Create the auth user
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so they can sign in immediately
    user_metadata: { display_name: display_name ?? null },
  });

  if (createErr) {
    return json({ error: createErr.message }, 400);
  }

  const userId = newUser.user.id;

  // Update profile with display_name and phone
  if (display_name || phone) {
    await supabase
      .from('profiles')
      .update({
        ...(display_name ? { display_name } : {}),
        ...(phone ? { phone } : {}),
      })
      .eq('id', userId);
  }

  // Grant role if specified (beyond default 'customer')
  if (role && role !== 'customer') {
    await supabase.from('user_roles').upsert(
      { user_id: userId, role },
      { onConflict: 'user_id,role' },
    );

    // If rider, bootstrap rider profile
    if (role === 'rider') {
      await supabase.from('riders').upsert(
        {
          user_id: userId,
          status: 'offline',
          rating: 5.0,
          total_trips: 0,
          total_earnings_dh: 0,
          documents_verified: true,
        },
        { onConflict: 'user_id' },
      );
    }
  }

  // Send welcome email via Resend (fire-and-forget)
  if (RESEND_API_KEY) {
    fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'admin_created',
        to: email,
        data: {
          name: display_name ?? email.split('@')[0],
          email,
          temp_password: password,
          role: role ?? 'customer',
        },
      }),
    }).catch(() => { /* best-effort */ });
  }

  return json({
    ok: true,
    user: { id: userId, email, display_name, phone, role: role ?? 'customer' },
  });
}

async function handleGrantRole(body: { user_id: string; role: string }) {
  const { user_id, role } = body;
  if (!user_id || !role) return json({ error: 'user_id and role are required' }, 400);

  const validRoles = ['customer', 'merchant', 'rider', 'admin', 'super_admin'];
  if (!validRoles.includes(role)) {
    return json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 400);
  }

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id, role }, { onConflict: 'user_id,role' });

  if (error) return json({ error: error.message }, 500);

  // Bootstrap rider profile if granting rider role
  if (role === 'rider') {
    await supabase.from('riders').upsert(
      {
        user_id,
        status: 'offline',
        rating: 5.0,
        total_trips: 0,
        total_earnings_dh: 0,
        documents_verified: true,
      },
      { onConflict: 'user_id' },
    );
  }

  return json({ ok: true });
}

async function handleRevokeRole(body: { user_id: string; role: string }) {
  const { user_id, role } = body;
  if (!user_id || !role) return json({ error: 'user_id and role are required' }, 400);

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', user_id)
    .eq('role', role);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Verify caller is admin
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create_user':
        return await handleCreateUser(body);
      case 'grant_role':
        return await handleGrantRole(body);
      case 'revoke_role':
        return await handleRevokeRole(body);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

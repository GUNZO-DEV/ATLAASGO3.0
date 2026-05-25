// supabase/functions/n8n-outbox-relay
//
// Drains the n8n_outbox table and POSTs each row to a single n8n webhook
// endpoint. Designed to be invoked by a Supabase cron job (every minute) OR
// by an n8n "Schedule" node that calls this function.
//
// Rationale: a single relay is way more reliable than many per-table
// Supabase Database Webhooks — easier to retry, audit, and version-control.
//
// ENV (set with `supabase secrets set`):
//   N8N_WEBHOOK_URL     https://<tenant>.app.n8n.cloud/webhook/atlaasgo
//   N8N_WEBHOOK_SECRET  shared secret n8n verifies in the X-Atlaasgo-Secret header
//
// Response: { drained: N, failed: N }

import { createClient } from 'jsr:@supabase/supabase-js@2';

const N8N_URL    = Deno.env.get('N8N_WEBHOOK_URL')    ?? '';
const N8N_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET') ?? '';
const SB_URL     = Deno.env.get('SUPABASE_URL')!;
const SB_SVC     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BATCH      = 25;
const MAX_ATTEMPTS = 5;

const sb = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

Deno.serve(async () => {
  if (!N8N_URL || !N8N_SECRET) {
    return new Response(
      JSON.stringify({ error: 'N8N_WEBHOOK_URL or N8N_WEBHOOK_SECRET not set' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  // Pull a batch of undelivered events oldest-first
  const { data: rows, error } = await sb
    .from('n8n_outbox')
    .select('id,kind,payload,attempts,created_at')
    .is('delivered_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }

  let drained = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      const res = await fetch(N8N_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-atlaasgo-secret': N8N_SECRET,
          'x-atlaasgo-event-id': row.id,
          'x-atlaasgo-event-kind': row.kind,
        },
        body: JSON.stringify({
          id: row.id,
          kind: row.kind,
          payload: row.payload,
          created_at: row.created_at,
        }),
      });
      if (!res.ok) throw new Error(`n8n responded ${res.status}: ${await res.text()}`);

      await sb
        .from('n8n_outbox')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', row.id);
      drained++;
    } catch (e) {
      failed++;
      await sb
        .from('n8n_outbox')
        .update({
          attempts: row.attempts + 1,
          last_error: e instanceof Error ? e.message : String(e),
        })
        .eq('id', row.id);
    }
  }

  return new Response(
    JSON.stringify({ drained, failed, scanned: rows?.length ?? 0 }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
});

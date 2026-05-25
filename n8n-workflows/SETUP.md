# AtlaasGo · n8n Setup

Connects Supabase events → n8n Cloud Enterprise via a **single webhook** (no per-table dashboard wiring needed). Add a new automation by editing a sub-workflow only.

## Architecture

```
   Supabase (orders/assignments/reviews/applications)
         │   AFTER INSERT/UPDATE triggers
         ▼
   public.n8n_outbox  ← single row per event, kind + payload
         │
         ▼ (drained every minute)
   Supabase Edge Function: n8n-outbox-relay
         │   POSTs to N8N_WEBHOOK_URL with X-Atlaasgo-Secret
         ▼
   n8n: "AtlaasGo · Master Event Router" workflow
         │   Switch on payload.kind
         ▼
   Sub-workflows: 01 order placed, 02 rider assigned, 03 review, …
```

Add a new event? Just add a Postgres trigger that inserts a row into `n8n_outbox` with a new `kind`, then add another branch in the Master Router → new sub-workflow.

## Shared secret

Already generated: **`99e4b4de8c5732f0ce7b35bf7cab0dce8ad03ed87f506e5d4163a20ab6e0839f`**

Use this same value in **both** places:
- Supabase: `supabase secrets set N8N_WEBHOOK_SECRET=99e4b4de…`
- n8n: a "Header Auth" credential called *AtlaasGo Webhook Secret* with header `x-atlaasgo-secret` = the value

## One-time setup

### 1. Set the Supabase function secrets

```bash
supabase secrets set N8N_WEBHOOK_URL=https://<YOUR-TENANT>.app.n8n.cloud/webhook/atlaasgo
supabase secrets set N8N_WEBHOOK_SECRET=99e4b4de8c5732f0ce7b35bf7cab0dce8ad03ed87f506e5d4163a20ab6e0839f
```

(or set them in **Supabase Dashboard → Edge Functions → n8n-outbox-relay → Settings → Secrets**)

### 2. Schedule the relay to run every minute

In **Supabase Dashboard → Database → Cron Jobs** (or via SQL with `pg_cron`):

```sql
SELECT cron.schedule(
  'drain-n8n-outbox',
  '* * * * *',  -- every minute
  $$
  SELECT net.http_post(
    url := 'https://toywtnupchfywhtdhxvj.functions.supabase.co/n8n-outbox-relay',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

If you'd rather avoid pg_cron, put a **Schedule** trigger in n8n (every 1 min) → HTTP Request node → call the edge function with your service role key. Same result.

### 3. Import the workflows into n8n

In n8n Cloud:

1. **Settings → API → Create API Key** (only if you want me to deploy them for you).
2. **Workflows → Import from File** for each file in this folder:
   - `00-atlaasgo-master-router.json` — main entry, runs the Switch
   - `01-order-placed-merchant-whatsapp.json`
   - `02-rider-assigned-whatsapp.json`
   - `03-review-request-24h.json`
3. After importing each sub-workflow, copy its ID (in the URL) and paste into the corresponding `{{REPLACE_WITH_..._WF_ID}}` placeholder in `00-atlaasgo-master-router.json`.
4. **Activate** all four workflows.

### 4. Create the n8n credentials

In n8n → **Credentials → New**:

| Credential | Type | Fields |
|---|---|---|
| `AtlaasGo Webhook Secret` | Header Auth | Header: `x-atlaasgo-secret` · Value: `99e4b4de…` |
| `AtlaasGo Supabase (service role)` | Supabase API | Host: `toywtnupchfywhtdhxvj.supabase.co` · Service Role: *(from Supabase Dashboard → Project Settings → API → `service_role`)* |
| `AtlaasGo WhatsApp Business` | WhatsApp Business Cloud | Phone Number ID + Access Token from Meta for Developers |

### 5. Test the pipe

```bash
# Pretend an order was placed
psql "$(supabase db remote-url)" -c "
  INSERT INTO public.n8n_outbox (kind, payload) VALUES
  ('order.placed', '{\"order_id\":\"test-1234\",\"total_dh\":99,\"items\":[],\"landmark\":\"Test\",\"payment_method\":\"cash\"}'::jsonb);
"
```

In n8n, you should see the Master Router execute within a minute, branch to "→ Order placed", and the sub-workflow runs (it will log an error on the Supabase lookup because `test-1234` isn't a real restaurant — that's expected).

## Daily ops

- **n8n → Executions tab** shows every run, success/failure, full payload.
- **Supabase → Table editor → `n8n_outbox`** — rows where `delivered_at IS NULL AND attempts >= 5` are stuck. Inspect `last_error`, fix the cause, then update the row to reset `attempts = 0`.
- The relay function is idempotent — safe to re-run, won't double-deliver.

## Adding a new automation

1. Add a Postgres trigger that drops a row into `n8n_outbox`:
   ```sql
   INSERT INTO public.n8n_outbox (kind, payload) VALUES ('my.new.event', '{...}');
   ```
2. Add a case to the Switch node in `00-atlaasgo-master-router`.
3. Build a new sub-workflow with an Execute Workflow Trigger.
4. Wire the new switch output to the sub-workflow.

That's it — no Supabase Dashboard changes ever again.

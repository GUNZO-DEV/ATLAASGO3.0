-- n8n event fan-out — single outbox table + triggers on key events.
-- Already applied to production via Supabase MCP on 2026-05-25.

CREATE TABLE IF NOT EXISTS public.n8n_outbox (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts     int NOT NULL DEFAULT 0,
  last_error   text
);

CREATE INDEX IF NOT EXISTS n8n_outbox_undelivered_idx
  ON public.n8n_outbox (created_at)
  WHERE delivered_at IS NULL;

ALTER TABLE public.n8n_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS n8n_outbox_service_only ON public.n8n_outbox;
CREATE POLICY n8n_outbox_service_only ON public.n8n_outbox
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_outbox;

-- Triggers omitted here — see the full migration applied via MCP.
-- (orders insert/update, order_assignments insert, applications insert, reviews insert)

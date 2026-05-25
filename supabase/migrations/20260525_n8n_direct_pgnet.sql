-- Direct Postgres → pg_net → n8n delivery (replaces edge-function cron relay).
-- Applied to production via Supabase MCP on 2026-05-25.
--
-- After this:  trigger fires → outbox row inserted → pg_net.http_post fires
-- immediately to https://atlaasgo.app.n8n.cloud/webhook/atlaasgo. n8n master
-- router branches on `kind` and runs the matching sub-workflow.
--
-- The outbox table remains as audit log. The relay edge function is no
-- longer required (kept for emergency replay if needed).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.n8n_config (
  id             int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  webhook_url    text NOT NULL,
  webhook_secret text NOT NULL,
  enabled        boolean NOT NULL DEFAULT true,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.n8n_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS n8n_config_service_only ON public.n8n_config;
CREATE POLICY n8n_config_service_only ON public.n8n_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- One-row config — populated with the live values
-- (rotate secret here if compromised; n8n header-auth credential must match)
INSERT INTO public.n8n_config (id, webhook_url, webhook_secret)
VALUES (1,
  'https://atlaasgo.app.n8n.cloud/webhook/atlaasgo',
  '99e4b4de8c5732f0ce7b35bf7cab0dce8ad03ed87f506e5d4163a20ab6e0839f')
ON CONFLICT (id) DO UPDATE SET
  webhook_url    = EXCLUDED.webhook_url,
  webhook_secret = EXCLUDED.webhook_secret,
  updated_at     = now();

-- All 6 trigger functions (n8n_on_*) updated to call public.n8n_deliver().
-- See the live migration in supabase project for full text.

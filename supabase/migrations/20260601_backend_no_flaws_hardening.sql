-- ── 1. debit_wallet: add caller-identity guard ─────────────────────
-- Without this, any authenticated user can pass any p_user_id and
-- drain another user's wallet. service_role bypasses the check;
-- for everyone else, auth.uid() must match the target user.
DROP FUNCTION IF EXISTS public.debit_wallet(uuid, integer, text, text, jsonb);

CREATE FUNCTION public.debit_wallet(
  p_user_id  uuid,
  p_amount   integer,
  p_kind     text,
  p_reference text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
  v_uid  uuid := auth.uid();
  v_row  public.wallets;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'debit_wallet: amount must be > 0';
  END IF;

  IF v_role IS DISTINCT FROM 'service_role' THEN
    IF v_uid IS NULL OR v_uid <> p_user_id THEN
      RAISE EXCEPTION 'debit_wallet: not authorized' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.wallets
     SET balance_dh = balance_dh - p_amount,
         updated_at = now()
   WHERE wallet_id = p_user_id
     AND balance_dh >= p_amount
   RETURNING * INTO v_row;

  IF v_row.wallet_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, amount_dh, kind, reference, metadata)
  VALUES (p_user_id, -p_amount, p_kind, p_reference, p_metadata);

  RETURN v_row;
END $$;

REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb) TO authenticated, service_role;

-- ── 2. Lock down n8n trigger functions ─────────────────────────────
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND p.proname IN (
         'n8n_on_order_insert','n8n_on_order_status_change',
         'n8n_on_assignment_insert','n8n_on_resto_app_insert',
         'n8n_on_rider_app_insert','n8n_on_review_insert',
         'n8n_deliver','n8n_outbox_mark_delivered'
       )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

-- ── 3. on_*_approved triggers: search_path + revoke ────────────────
ALTER FUNCTION public.on_rider_app_approved()      SET search_path = public, pg_catalog;
ALTER FUNCTION public.on_restaurant_app_approved() SET search_path = public, pg_catalog;
REVOKE EXECUTE ON FUNCTION public.on_rider_app_approved()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_restaurant_app_approved() FROM PUBLIC, anon, authenticated;

-- ── 4. RLS predicates are not user RPCs ────────────────────────────
-- These functions are invoked transitively by RLS policies (as the
-- policy owner). Direct EXECUTE from anon/authenticated only widens
-- the public API surface; revoking it doesn't break RLS evaluation.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND p.proname IN (
         'is_group_participant','is_order_participant','is_restaurant_staff',
         'current_user_has_role','has_role'
       )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

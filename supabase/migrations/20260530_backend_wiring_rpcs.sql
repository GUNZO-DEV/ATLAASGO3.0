-- ════════════════════════════════════════════════════════════════════
--  Backend wiring: wallet RPCs, rider auto-assignment, order timeouts.
--  All functions are SECURITY DEFINER and grant EXECUTE to authenticated
--  or service_role as appropriate. Pure idempotent.
-- ════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname='public' AND r.relname='prime_subscriptions'
      AND c.contype='u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(user_id)%'
  ) THEN
    ALTER TABLE public.prime_subscriptions
      ADD CONSTRAINT prime_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid,
  p_amount  integer,
  p_kind    text DEFAULT 'topup',
  p_reference text DEFAULT NULL,
  p_metadata  jsonb DEFAULT '{}'::jsonb
) RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wallet public.wallets;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_wallet: amount must be > 0';
  END IF;
  INSERT INTO public.wallets (user_id, balance_dh, currency, updated_at)
  VALUES (p_user_id, p_amount, 'MAD', now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance_dh = wallets.balance_dh + EXCLUDED.balance_dh,
        updated_at = now()
  RETURNING * INTO v_wallet;
  INSERT INTO public.wallet_transactions (wallet_id, kind, amount_dh, reference, metadata)
  VALUES (p_user_id, p_kind, p_amount, p_reference, COALESCE(p_metadata, '{}'::jsonb));
  RETURN v_wallet;
END $$;
REVOKE ALL ON FUNCTION public.credit_wallet(uuid, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, integer, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id uuid, p_amount integer, p_kind text DEFAULT 'order',
  p_reference text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wallet public.wallets;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'debit_wallet: amount must be > 0';
  END IF;
  UPDATE public.wallets
     SET balance_dh = balance_dh - p_amount, updated_at = now()
   WHERE user_id = p_user_id AND balance_dh >= p_amount
  RETURNING * INTO v_wallet;
  IF v_wallet.user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.wallet_transactions (wallet_id, kind, amount_dh, reference, metadata)
  VALUES (p_user_id, p_kind, -p_amount, p_reference, COALESCE(p_metadata, '{}'::jsonb));
  RETURN v_wallet;
END $$;
REVOKE ALL ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.haversine_km(a jsonb, b jsonb)
RETURNS double precision LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE lat1 double precision := (a->>'lat')::double precision;
        lng1 double precision := (a->>'lng')::double precision;
        lat2 double precision := (b->>'lat')::double precision;
        lng2 double precision := (b->>'lng')::double precision;
        dlat double precision; dlng double precision; aa double precision;
BEGIN
  IF lat1 IS NULL OR lat2 IS NULL THEN RETURN NULL; END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  aa := sin(dlat/2)^2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlng/2)^2;
  RETURN 6371.0 * 2 * atan2(sqrt(aa), sqrt(1-aa));
END $$;

CREATE OR REPLACE FUNCTION public.assign_nearest_rider(p_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restaurant_coords jsonb; v_rider_id uuid; v_assignment_id uuid;
BEGIN
  SELECT r.coords INTO v_restaurant_coords
  FROM public.orders o JOIN public.restaurants r ON r.id = o.restaurant_id
  WHERE o.id = p_order_id;
  IF v_restaurant_coords IS NULL THEN
    RAISE EXCEPTION 'assign_nearest_rider: restaurant coords missing for order %', p_order_id;
  END IF;
  SELECT id INTO v_assignment_id FROM public.order_assignments
  WHERE order_id = p_order_id AND is_active LIMIT 1;
  IF v_assignment_id IS NOT NULL THEN RETURN v_assignment_id; END IF;
  SELECT r.user_id INTO v_rider_id FROM public.riders r
  WHERE r.status = 'online' AND r.last_location IS NOT NULL
    AND r.last_seen_at > now() - interval '5 minutes'
    AND NOT EXISTS (SELECT 1 FROM public.order_assignments a WHERE a.rider_id = r.user_id AND a.is_active)
  ORDER BY public.haversine_km(r.last_location, v_restaurant_coords) ASC NULLS LAST
  LIMIT 1;
  IF v_rider_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.order_assignments (order_id, rider_id, is_active, assigned_at)
  VALUES (p_order_id, v_rider_id, true, now()) RETURNING id INTO v_assignment_id;
  INSERT INTO public.notifications (user_id, kind, title, body, payload)
  VALUES (v_rider_id, 'order_status', 'New delivery offer',
    'A new order is waiting for you. Tap to accept.',
    jsonb_build_object('orderId', p_order_id, 'assignmentId', v_assignment_id));
  RETURN v_assignment_id;
END $$;
REVOKE ALL ON FUNCTION public.assign_nearest_rider(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_nearest_rider(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; v_id uuid; v_customer uuid;
BEGIN
  FOR v_id, v_customer IN
    SELECT id, customer_id FROM public.orders
    WHERE status = 'ordered'
      AND created_at < now() - interval '20 minutes'
      AND payment_method IS NULL
  LOOP
    UPDATE public.orders SET status='cancelled' WHERE id=v_id;
    INSERT INTO public.notifications (user_id, kind, title, body, payload)
    VALUES (v_customer, 'order_status', 'Order cancelled',
      'We didn''t receive payment in time, so your order was cancelled. Tap to re-order.',
      jsonb_build_object('orderId', v_id, 'reason', 'payment_timeout'));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO service_role;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_owner_read" ON public.wallets;
CREATE POLICY "wallet_owner_read" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_tx_owner_read" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_owner_read" ON public.wallet_transactions FOR SELECT USING (auth.uid() = wallet_id);
ALTER TABLE public.prime_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prime_owner_read" ON public.prime_subscriptions;
CREATE POLICY "prime_owner_read" ON public.prime_subscriptions FOR SELECT USING (auth.uid() = user_id);

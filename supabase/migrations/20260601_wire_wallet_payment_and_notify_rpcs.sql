-- ════════════════════════════════════════════════════════════════════
-- Fix two real frontend→backend gaps found auditing the order flow:
--
-- 1) Cart.tsx / MobileCart.tsx inserted directly into wallet_transactions
--    with columns that don't exist (user_id/order_id/note vs the real
--    wallet_id/reference/metadata) AND the only write policy is
--    admin-only — so paying with wallet credit failed twice over.
--    Replaced with pay_order_with_wallet (SECURITY DEFINER): validates
--    ownership, debits the balance, and writes the ledger row atomically.
--
-- 2) orderActions.ts notifyCustomer() inserted a notification for ANOTHER
--    user (the customer) while running as the rider/merchant. RLS
--    (auth.uid() = user_id OR admin) blocked it, so status notifications
--    silently never arrived. notify_order_participant lets a verified
--    order participant notify another participant, without opening the
--    table to arbitrary cross-user inserts.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. pay_order_with_wallet ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pay_order_with_wallet(
  p_order_id uuid,
  p_amount   integer
) RETURNS integer            -- remaining wallet balance, or NULL if insufficient
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_customer    uuid;
  v_new_balance integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'pay_order_with_wallet: not authenticated' USING ERRCODE='42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'pay_order_with_wallet: amount must be > 0';
  END IF;

  SELECT customer_id INTO v_customer FROM public.orders WHERE id = p_order_id;
  IF v_customer IS NULL THEN
    RAISE EXCEPTION 'pay_order_with_wallet: order not found';
  END IF;
  IF v_customer <> v_uid THEN
    RAISE EXCEPTION 'pay_order_with_wallet: not your order' USING ERRCODE='42501';
  END IF;

  UPDATE public.wallets
     SET balance_dh = balance_dh - p_amount,
         updated_at = now()
   WHERE user_id = v_uid
     AND balance_dh >= p_amount
   RETURNING balance_dh INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN NULL;  -- insufficient funds / no wallet
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, amount_dh, kind, reference, metadata)
  VALUES (v_uid, -p_amount, 'order_payment',
          'order:' || p_order_id::text,
          jsonb_build_object('order_id', p_order_id));

  RETURN v_new_balance;
END $$;

REVOKE EXECUTE ON FUNCTION public.pay_order_with_wallet(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.pay_order_with_wallet(uuid, integer) TO authenticated, service_role;

-- ── 2. notify_order_participant ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_order_participant(
  p_order_id  uuid,
  p_recipient uuid,
  p_kind      public.notification_kind,
  p_title     text,
  p_body      text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'notify_order_participant: not authenticated' USING ERRCODE='42501';
  END IF;

  -- Caller must be a participant (customer, active rider, restaurant staff, admin).
  IF NOT (
    public.is_order_participant(p_order_id, v_uid)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id AND o.restaurant_id IS NOT NULL
        AND public.is_restaurant_staff(o.restaurant_id, v_uid)
    )
    OR public.current_user_has_role('admin')
    OR public.current_user_has_role('super_admin')
  ) THEN
    RAISE EXCEPTION 'notify_order_participant: caller not a participant' USING ERRCODE='42501';
  END IF;

  -- Recipient must also be a participant (no notifying arbitrary users).
  IF NOT (
    public.is_order_participant(p_order_id, p_recipient)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id AND o.restaurant_id IS NOT NULL
        AND public.is_restaurant_staff(o.restaurant_id, p_recipient)
    )
  ) THEN
    RAISE EXCEPTION 'notify_order_participant: recipient not a participant' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, payload)
  VALUES (p_recipient, p_kind, p_title, p_body,
          jsonb_build_object('order_id', p_order_id));
END $$;

REVOKE EXECUTE ON FUNCTION public.notify_order_participant(uuid, uuid, public.notification_kind, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.notify_order_participant(uuid, uuid, public.notification_kind, text, text) TO authenticated, service_role;

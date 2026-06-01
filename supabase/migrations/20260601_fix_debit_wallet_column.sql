-- debit_wallet referenced wallets.wallet_id, but the wallets table
-- keys on user_id (wallet_id only exists on wallet_transactions).
-- plpgsql is late-bound so the prior CREATE succeeded but would throw
-- "column wallet_id does not exist" on every debit. Correct the column.
CREATE OR REPLACE FUNCTION public.debit_wallet(
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
   WHERE user_id = p_user_id
     AND balance_dh >= p_amount
   RETURNING * INTO v_row;

  IF v_row.user_id IS NULL THEN
    RETURN NULL;  -- insufficient funds or no wallet
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, amount_dh, kind, reference, metadata)
  VALUES (p_user_id, -p_amount, p_kind, p_reference, p_metadata);

  RETURN v_row;
END $$;

REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb) TO authenticated, service_role;

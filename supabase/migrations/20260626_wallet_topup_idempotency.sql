-- 2026-06-26 — Make Stripe-sourced wallet credits idempotent.
-- Stripe delivers payment_intent.succeeded at-least-once; the webhook calls
-- credit_wallet with p_reference='stripe:<payment_intent_id>', so a redelivery
-- credited the balance twice. This rewrite short-circuits an already-recorded
-- stripe reference (faithful superset — non-stripe references behave as before),
-- and a partial unique index backstops a concurrent double delivery (the whole
-- function is one atomic tx, so a tripped index rolls back its balance update).
-- APPLIED to prod toywtnupchfywhtdhxvj on 2026-06-26 (migration:
-- wallet_topup_idempotency). wallet_transactions was empty at apply time.

create or replace function public.credit_wallet(
  p_user_id uuid, p_amount integer, p_kind text default 'topup'::text,
  p_reference text default null::text, p_metadata jsonb default '{}'::jsonb
) returns wallets
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_wallet public.wallets;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'credit_wallet: amount must be > 0';
  end if;

  if p_reference is not null and p_reference like 'stripe:%'
     and exists (select 1 from public.wallet_transactions where reference = p_reference) then
    select * into v_wallet from public.wallets where user_id = p_user_id;
    return v_wallet;
  end if;

  insert into public.wallets (user_id, balance_dh, currency, updated_at)
  values (p_user_id, p_amount, 'MAD', now())
  on conflict (user_id) do update
    set balance_dh = wallets.balance_dh + excluded.balance_dh,
        updated_at = now()
  returning * into v_wallet;

  insert into public.wallet_transactions (wallet_id, kind, amount_dh, reference, metadata)
  values (p_user_id, p_kind, p_amount, p_reference, coalesce(p_metadata, '{}'::jsonb));

  return v_wallet;
end $function$;

create unique index if not exists wallet_transactions_stripe_ref_uniq
  on public.wallet_transactions (reference)
  where reference like 'stripe:%';

-- 2026-06-26 — Validate rider cash-out amount server-side.
-- Previously rider_cash_out trusted the client p_amount_dh (only auth + amount>0),
-- so a rider could request an arbitrary sum and the manual admin approval was the
-- only gate. Now we compute the true unpaid balance = (lifetime delivered-assignment
-- earnings: order delivery_fee + tip + assignment boost) minus (already requested/
-- paid payouts) and reject any request beyond it. The insert is unchanged.
-- APPLIED to prod toywtnupchfywhtdhxvj on 2026-06-26 (migration:
-- rider_cash_out_balance_guard).

create or replace function public.rider_cash_out(p_amount_dh numeric)
returns rider_payouts
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid       uuid := auth.uid();
  v_amount    int  := round(p_amount_dh)::int;
  v_earned    int;
  v_out       int;
  v_available int;
  v_payout    public.rider_payouts;
begin
  if v_uid is null then
    raise exception 'rider_cash_out: not authenticated' using errcode = '42501';
  end if;
  if p_amount_dh is null or p_amount_dh <= 0 then
    raise exception 'rider_cash_out: amount must be positive' using errcode = 'P0001';
  end if;

  select coalesce(sum(coalesce(o.delivery_fee_dh, 0) + coalesce(o.tip_dh, 0) + coalesce(a.boost_dh, 0)), 0)
    into v_earned
  from public.order_assignments a
  join public.orders o on o.id = a.order_id
  where a.rider_id = v_uid and a.delivered_at is not null;

  select coalesce(sum(amount_dh), 0) into v_out
  from public.rider_payouts
  where rider_id = v_uid and status in ('requested', 'paid');

  v_available := v_earned - v_out;

  if v_amount > v_available then
    raise exception 'rider_cash_out: requested % dh exceeds available balance % dh', v_amount, v_available
      using errcode = 'P0001';
  end if;

  insert into public.rider_payouts
    (rider_id, amount_dh, period_start, period_end, status, requested_at)
  values
    (v_uid, v_amount, current_date, current_date, 'requested', now())
  returning * into v_payout;

  return v_payout;
end $function$;

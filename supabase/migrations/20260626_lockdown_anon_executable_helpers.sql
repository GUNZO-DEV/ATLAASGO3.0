-- 2026-06-26 — Security: revoke anon/public EXECUTE on SECURITY DEFINER helpers
-- that were reachable over PostgREST. Verified anon-reachable in the audit; an
-- anon POST to expire_abandoned_orders() could mass-cancel active orders.
--
-- Cron helpers (no client caller anywhere) run under pg_cron as the function
-- owner, so removing every REST role is safe; the two client RPCs are only ever
-- called by signed-in users, so only the anon path is removed.
-- APPLIED to prod toywtnupchfywhtdhxvj on 2026-06-26 (migration:
-- lockdown_anon_executable_helpers). This file keeps the repo reproducible.

-- Cron-only helpers: remove all REST roles; keep the trusted backend role.
revoke execute on function public.expire_abandoned_orders() from public, anon, authenticated;
revoke execute on function public.expire_stale_assignments() from public, anon, authenticated;
revoke execute on function public.redispatch_unassigned_orders() from public, anon, authenticated;
grant execute on function public.expire_abandoned_orders() to service_role;
grant execute on function public.expire_stale_assignments() to service_role;
grant execute on function public.redispatch_unassigned_orders() to service_role;

-- Promo redemption + rider cash-out: signed-in callers only. Drop the anon path.
revoke execute on function public.increment_promo_redemption(text) from public, anon;
grant execute on function public.increment_promo_redemption(text) to authenticated, service_role;
revoke execute on function public.rider_cash_out(numeric) from public, anon;
grant execute on function public.rider_cash_out(numeric) to authenticated, service_role;

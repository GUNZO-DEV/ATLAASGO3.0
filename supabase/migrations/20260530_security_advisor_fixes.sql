-- ════════════════════════════════════════════════════════════════════
--  Fixes for security advisor WARN findings introduced by today's work:
--    - haversine_km: pin search_path
--    - new SECURITY DEFINER funcs: explicit REVOKE from anon (& from
--      authenticated where the function is service-role-only).
-- ════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.haversine_km(jsonb, jsonb) SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.assign_nearest_rider(uuid)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_orders()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, integer, text, text, jsonb)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_auto_assign_rider()                 FROM PUBLIC, anon, authenticated;

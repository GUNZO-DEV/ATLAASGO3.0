-- HOTFIX: restore EXECUTE on RLS predicate helpers for anon/authenticated.
--
-- A prior hardening step revoked EXECUTE on these helpers from anon /
-- authenticated, believing RLS calls them as the policy owner. It does
-- NOT — Postgres evaluates RLS USING/WITH CHECK expressions as the
-- querying role, which must therefore hold EXECUTE on any function the
-- policy references. current_user_has_role / has_role appear in 49
-- policies each; the revoke produced "permission denied for function
-- current_user_has_role" for signed-in and anonymous users and broke the
-- catalog, role lookup, and the /auth login redirect on the live site.
--
-- This file is idempotent and also lives (corrected) inside
-- 20260601_backend_no_flaws_hardening.sql; kept here so the fix is
-- explicit in history.
GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_participant(uuid, uuid)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_participant(uuid, uuid)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_restaurant_staff(uuid, uuid)        TO anon, authenticated;

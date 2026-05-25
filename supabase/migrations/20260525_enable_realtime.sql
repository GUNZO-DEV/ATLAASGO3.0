-- Enable Postgres realtime for the tables that frontend hooks subscribe to.
--
-- Without these ADD TABLE statements, supabase.channel(...).on('postgres_changes')
-- silently never fires — so the UI feels broken (every action seems to require
-- a manual reload). Add new tables here when introducing new live-data hooks.
--
-- Safe to re-run: each ADD TABLE is wrapped in DO/EXCEPTION to skip "already in
-- publication" errors.

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'orders',
    'order_assignments',
    'order_messages',
    'notifications',
    'user_roles',
    'profiles',
    'wallets',
    'wallet_transactions',
    'addresses',
    'favorites',
    'reviews',
    'rider_applications',
    'restaurant_applications',
    'riders',
    'restaurants',
    'menu_items',
    'menu_categories',
    'promotions'
  ];
BEGIN
  FOREACH t IN ARRAY tbls
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN
        -- already in publication, ignore
        NULL;
      WHEN undefined_table THEN
        -- table doesn't exist yet, skip
        RAISE NOTICE 'skipping % (does not exist)', t;
    END;
  END LOOP;
END $$;

-- REPLICA IDENTITY FULL ensures the realtime payload includes the OLD row
-- on UPDATEs (needed when RLS uses old.<col> = auth.uid()).
ALTER TABLE IF EXISTS public.orders REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.order_assignments REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.wallets REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.rider_applications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.restaurant_applications REPLICA IDENTITY FULL;

-- Helper used by the cart promo flow: atomically bump a promotion's
-- redemption counter so two simultaneous orders don't both succeed when
-- max_redemptions = 1.
CREATE OR REPLACE FUNCTION public.increment_promo_redemption(promo_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promotions
  SET redemptions = redemptions + 1
  WHERE code = promo_code
    AND (max_redemptions IS NULL OR redemptions < max_redemptions);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_redemption(text) TO anon, authenticated;

-- Driver screen hung on "Loading assignment…" because riders could UPDATE an
-- order they're assigned to ("orders: rider workflow update"), but had no
-- SELECT policy to READ it. The only read policy was "auth.uid() =
-- customer_id" (the customer) or admin — so a rider's order fetch returned
-- nothing under RLS. Same gap for restaurant staff.
--
-- Add SELECT policies mirroring the existing workflow UPDATE policies, so a
-- participant can see exactly the orders they're authorized to act on.
--
-- IMPORTANT: the rider check must NOT inline a subquery on order_assignments
-- inside an orders policy — order_assignments' own SELECT policy queries back
-- into orders, which causes infinite recursion (42P17). Route the cross-table
-- check through a SECURITY DEFINER helper that bypasses RLS on
-- order_assignments, breaking the cycle.

CREATE OR REPLACE FUNCTION public.is_active_rider_for_order(p_order uuid, p_rider uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_assignments a
    WHERE a.order_id = p_order
      AND a.rider_id = p_rider
      AND a.is_active
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_rider_for_order(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_active_rider_for_order(uuid, uuid) TO authenticated, service_role;

-- Rider: read orders they're actively assigned to.
DROP POLICY IF EXISTS "orders: rider assigned read" ON public.orders;
CREATE POLICY "orders: rider assigned read"
  ON public.orders
  FOR SELECT
  USING ( public.is_active_rider_for_order(id, auth.uid()) );

-- Restaurant staff: read orders for their restaurant. is_restaurant_staff is
-- already SECURITY DEFINER, so this path never recurses.
DROP POLICY IF EXISTS "orders: merchant read" ON public.orders;
CREATE POLICY "orders: merchant read"
  ON public.orders
  FOR SELECT
  USING (
    restaurant_id IS NOT NULL
    AND public.is_restaurant_staff(restaurant_id, auth.uid())
  );

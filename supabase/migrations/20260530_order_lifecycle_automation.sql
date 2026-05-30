-- ════════════════════════════════════════════════════════════════════
--  Order lifecycle automation:
--    1. pg_cron: expire stale unpaid orders every 5 minutes
--    2. Trigger: auto-assign nearest rider when order → preparing
-- ════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'expire_stale_orders_5m';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
  PERFORM cron.schedule(
    'expire_stale_orders_5m',
    '*/5 * * * *',
    $cron$SELECT public.expire_stale_orders();$cron$
  );
END $$;

CREATE OR REPLACE FUNCTION public.trg_auto_assign_rider()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'preparing' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      PERFORM public.assign_nearest_rider(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'auto-assign failed for order %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_auto_assign_rider_trg ON public.orders;
CREATE TRIGGER orders_auto_assign_rider_trg
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'preparing'::order_status AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trg_auto_assign_rider();

-- Live weather cache + served-city flag.
-- Applied live to project toywtnupchfywhtdhxvj via Supabase MCP on 2026-06-21.
--
--   #1 served-only city list: cities.served gates the picker so only places
--      with live partners are selectable (today just Ifrane; Casablanca/Rabat/
--      Marrakech have 0 live restaurants and were tappable into empty screens).
--   #3 live weather: city_weather becomes a server-refreshed CACHE. The edge
--      function refresh-weather (Open-Meteo, no key) runs every 30 min on
--      pg_cron and UPSERTs real conditions, so the home strip stops showing the
--      static "Light snow -2C" in summer. The apps read city_weather exactly as
--      before — no client change required.
--
-- NOT changed here: cart_quote pricing. surcharge_dh is populated by the refresh
-- job for a later, founder-gated pricing-wiring step.

-- ── columns ─────────────────────────────────────────────────────────────────
alter table public.cities add column if not exists served boolean not null default false;
alter table public.cities add column if not exists lat numeric;
alter table public.cities add column if not exists lng numeric;

alter table public.city_weather add column if not exists surcharge_dh int not null default 0;
alter table public.city_weather add column if not exists source text not null default 'static';

-- ── seed: only Ifrane is served today ───────────────────────────────────────
update public.cities set served = true  where id = 'ifrane';
update public.cities set served = false where id in ('casablanca', 'rabat', 'marrakech');

-- ── seed coordinates (weather fetch now; nearest-served-city later) ──────────
update public.cities set lat = 33.5228, lng = -5.1106 where id = 'ifrane';
update public.cities set lat = 33.5731, lng = -7.5898 where id = 'casablanca';
update public.cities set lat = 34.0209, lng = -6.8417 where id = 'rabat';
update public.cities set lat = 31.6295, lng = -7.9811 where id = 'marrakech';

-- ── schedule the refresh: pg_cron → pg_net → refresh-weather edge fn ─────────
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'refresh_weather_30m';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'refresh_weather_30m',
    '*/30 * * * *',
    $cron$
      select net.http_post(
        url     := 'https://toywtnupchfywhtdhxvj.functions.supabase.co/refresh-weather',
        headers := jsonb_build_object('content-type', 'application/json'),
        body    := '{}'::jsonb
      );
    $cron$
  );
end $$;

-- (A) cart_quote weather-surcharge interim gate + (B) Taourirt city.
-- Applied live to project toywtnupchfywhtdhxvj via Supabase MCP on 2026-06-21.
--
-- (A) The weather surcharge now reads the live city_weather advisory (fresh,
--     eta>0 only, clamped) instead of a flat +3 Dh/+4 min on the cities.weather
--     boolean — so a clear day no longer charges a weather fee while the strip
--     shows nothing. Uses magnitudes already in production (no new cap; the cap
--     is a separate founder decision).
-- (B) Taourirt — new served city in Oriental Morocco (no snow strip).

create or replace function public.cart_quote(
  p_store_id text,
  p_items jsonb,
  p_speed text default 'standard',
  p_tip_dh int default 0,
  p_address_id text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_subtotal int := 0;
  v_delivery int := 0;
  v_priority int := 0;
  v_weather  int := 0;
  v_weather_eta int := 0;
  v_city     text := 'Ifrane';
  v_time_min int := 20;
  v_eta_lo int; v_eta_hi int;
  v_line jsonb;
  v_price int;
begin
  select coalesce(r.fee_dh, 0), coalesce(r.time_min, 20), coalesce(r.city, 'Ifrane')
    into v_delivery, v_time_min, v_city
    from public.restaurants r
   where r.slug = p_store_id or r.id::text = p_store_id
   limit 1;

  for v_line in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    select coalesce(mi.price_dh, 0) into v_price
      from public.menu_items mi where mi.id::text = (v_line->>'itemId') limit 1;
    v_subtotal := v_subtotal + coalesce(v_price, 0) * coalesce((v_line->>'qty')::int, 1);
  end loop;

  -- Live, fresh, clamped weather advisory only (was: flat +3/+4 on a boolean).
  select least(coalesce(cw.surcharge_dh, 0), 5), least(coalesce(cw.eta_add_minutes, 0), 8)
    into v_weather, v_weather_eta
    from public.cities c
    join public.city_weather cw on cw.city_id = c.id
   where (c.id = lower(v_city) or lower(c.name) = lower(v_city))
     and c.weather = true
     and cw.eta_add_minutes > 0
     and cw.updated_at > now() - interval '60 minutes'
   limit 1;
  v_weather := coalesce(v_weather, 0);
  v_weather_eta := coalesce(v_weather_eta, 0);

  if p_speed = 'priority' then v_priority := 9; end if;

  if p_speed = 'priority' then
    v_eta_lo := greatest(v_time_min - 6, 8); v_eta_hi := v_time_min;
  else
    v_eta_lo := v_time_min; v_eta_hi := v_time_min + 6;
  end if;
  v_eta_lo := v_eta_lo + v_weather_eta; v_eta_hi := v_eta_hi + v_weather_eta;

  return jsonb_build_object(
    'subtotalDh', v_subtotal,
    'deliveryFeeDh', v_delivery,
    'priorityDh', v_priority,
    'weatherSurchargeDh', v_weather,
    'tipDh', coalesce(p_tip_dh, 0),
    'totalDh', v_subtotal + v_delivery + v_priority + v_weather + coalesce(p_tip_dh, 0),
    'etaMinutes', jsonb_build_array(v_eta_lo, v_eta_hi)
  );
end $$;

grant execute on function public.cart_quote(text, jsonb, text, int, text) to anon, authenticated;

insert into public.cities (id, name, campus, weather, served, default_address, default_address_sub, sort_order, lat, lng)
values ('taourirt', 'Taourirt', false, false, true, 'Boulevard Mohammed V', 'Centre-ville', 5, 34.4097, -2.8978)
on conflict (id) do update
  set served = excluded.served, lat = excluded.lat, lng = excluded.lng,
      default_address = excluded.default_address, default_address_sub = excluded.default_address_sub;

-- handoff/AtlaasGo API.md — §2 cities + weather, §5 server-priced cart quote.
-- Applied live to project toywtnupchfywhtdhxvj; captured here for reproducibility.

-- §2 Cities — campus/weather flags drive the global-vs-Ifrane gating.
create table if not exists public.cities (
  id text primary key,
  name text not null,
  campus boolean not null default false,
  weather boolean not null default false,
  default_address text not null default '',
  default_address_sub text not null default '',
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

insert into public.cities (id, name, campus, weather, default_address, default_address_sub, sort_order) values
  ('ifrane',     'Ifrane',     true,  true,  'Building 18 · Room 214', 'AUI Campus · 2nd floor', 1),
  ('casablanca', 'Casablanca', false, false, 'Rue Hassan II · Apt 4B', 'Maârif',                 2),
  ('rabat',      'Rabat',      false, false, 'Avenue Mohammed V',      'Agdal',                  3),
  ('marrakech',  'Marrakech',  false, false, 'Rue de la Liberté',      'Guéliz',                 4)
on conflict (id) do nothing;

create table if not exists public.city_weather (
  city_id text primary key references public.cities(id) on delete cascade,
  condition text not null,
  temp_c int not null,
  eta_add_minutes int not null default 0,
  note text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.city_weather (city_id, condition, temp_c, eta_add_minutes, note) values
  ('ifrane', 'Light snow', -2, 4, 'Atlas pass slowed — couriers on winter tyres')
on conflict (city_id) do update
  set condition = excluded.condition, temp_c = excluded.temp_c,
      eta_add_minutes = excluded.eta_add_minutes, note = excluded.note, updated_at = now();

alter table public.cities enable row level security;
alter table public.city_weather enable row level security;
drop policy if exists "cities: public read" on public.cities;
create policy "cities: public read" on public.cities for select to anon, authenticated using (true);
drop policy if exists "city_weather: public read" on public.city_weather;
create policy "city_weather: public read" on public.city_weather for select to anon, authenticated using (true);

-- §5 Server-priced cart quote — mirrors the Bill summary card exactly.
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
  v_city     text := 'Ifrane';
  v_time_min int := 20;
  v_weather_on boolean := false;
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

  select coalesce(c.weather, false) into v_weather_on
    from public.cities c where c.id = lower(v_city) or lower(c.name) = lower(v_city) limit 1;
  if v_weather_on then v_weather := 3; end if;
  if p_speed = 'priority' then v_priority := 9; end if;

  if p_speed = 'priority' then
    v_eta_lo := greatest(v_time_min - 6, 8); v_eta_hi := v_time_min;
  else
    v_eta_lo := v_time_min; v_eta_hi := v_time_min + 6;
  end if;
  if v_weather_on then v_eta_lo := v_eta_lo + 4; v_eta_hi := v_eta_hi + 4; end if;

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

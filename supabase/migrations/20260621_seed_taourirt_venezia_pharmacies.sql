-- Taourirt catalog seed: Venezia (snack / fast food) + 6 pharmacies sourced
-- from public web directories (Google / annuaires Maroc) on 2026-06-21. Same
-- shape as the Ifrane grocery/pharmacy seed. Idempotent. Applied live via MCP.
--
-- NOTE: pharmacy names/addresses come from public listings and should be
-- confirmed before real fulfilment; the per-pharmacy menu is a generic OTC
-- starter catalog (not the shop's actual stock).

insert into public.restaurants (slug,name,cuisine,cuisine_tags,description,emoji,img_variant,rating,time_min,fee_dh,tag,status,city,is_campus_partner,is_local_legend)
values
 ('venezia-taourirt',     'Venezia',             'Tacos · Fast food', array['tacos','fast','grill','burgers'], 'Snack Venezia — tacos, crispy fries and filet américain in the heart of Taourirt.', '🌮', 2, 4.3, 25, 10, null,        'live','Taourirt', false, true),
 ('ph-ennour-taourirt',   'Pharmacie Ennour',    'Pharmacy · Health', array['pharmacy','health','care'],       '968 rue Ifrane, Hay Ennahda · Taourirt — medicine, first aid and personal care delivered.', '💊', 1, 4.7, 18, 0, null, 'live','Taourirt', false, false),
 ('ph-errachad-taourirt', 'Pharmacie Errachad',  'Pharmacy · Care',   array['pharmacy','wellness'],            '731 Lot Al Massira · Taourirt — prescriptions, vitamins and everyday wellness.', '⚕️', 3, 4.6, 20, 0, null,          'live','Taourirt', false, false),
 ('ph-taourirt-taourirt', 'Pharmacie Taourirt',  'Pharmacy · Health', array['pharmacy','health'],              '578 rue Smara, Hay Jdid · Taourirt — your neighbourhood pharmacy, delivered.', '💊', 2, 4.5, 19, 0, null,            'live','Taourirt', false, false),
 ('ph-amal-taourirt',     'Pharmacie Amal',      'Pharmacy · Care',   array['pharmacy','care'],                'Bd Maghrib Arabi, Route Nationale 6 · Taourirt — medicine and care to your door.', '⚕️', 1, 4.6, 22, 0, null,        'live','Taourirt', false, false),
 ('ph-larocade-taourirt', 'Pharmacie la Rocade', 'Pharmacy · Health', array['pharmacy','health'],              '1084 Rte Périphérique 20 Août · Taourirt — first aid, vitamins and prescriptions.', '💊', 3, 4.4, 21, 0, null,       'live','Taourirt', false, false),
 ('ph-elmalhi-taourirt',  'Pharmacie El Malhi',  'Pharmacy · Wellness', array['pharmacy','wellness'],          '987 Hay Takaddoum · Taourirt — everyday wellness, a pharmacist in-app to help.', '⚕️', 2, 4.5, 20, 0, null,          'live','Taourirt', false, false)
on conflict (slug) do nothing;

-- Venezia menu (from its public listing: tacos, fries, filet américain)
insert into public.menu_categories (restaurant_id, name, sort_order)
select r.id, c.name, c.ord from public.restaurants r
join (values ('venezia-taourirt','Tacos & snacks',1),('venezia-taourirt','Frites',2),('venezia-taourirt','Boissons',3)) c(slug,name,ord)
  on r.slug = c.slug
where not exists (select 1 from public.menu_categories mc where mc.restaurant_id = r.id and mc.name = c.name);

insert into public.menu_items (restaurant_id, category_id, name, description, price_dh, available, sort_order, popularity)
select mc.restaurant_id, mc.id, i.name, i.descr, i.price, true, i.ord, i.pop
from public.menu_categories mc
join public.restaurants r on r.id = mc.restaurant_id
join (values
  ('venezia-taourirt','Tacos & snacks','Tacos poulet','Grilled chicken, fries & sauce in a pressed wrap',38,1,92),
  ('venezia-taourirt','Tacos & snacks','Tacos viande hachée','Minced beef, cheese & fries in a pressed wrap',42,2,80),
  ('venezia-taourirt','Tacos & snacks','Filet américain','American-style steak sandwich with fries',45,3,70),
  ('venezia-taourirt','Frites','Frites','Golden fries · generous portion',16,1,88),
  ('venezia-taourirt','Frites','Frites croustillantes','Extra-crispy loaded fries',22,2,64),
  ('venezia-taourirt','Boissons','Coca-Cola','Chilled · 33 cl',8,1,60)
) i(slug,cat,name,descr,price,ord,pop) on i.slug = r.slug and i.cat = mc.name
where not exists (select 1 from public.menu_items mi where mi.restaurant_id = mc.restaurant_id and mi.name = i.name);

-- Pharmacy menus: a compact OTC starter catalog for every Taourirt pharmacy
insert into public.menu_categories (restaurant_id, name, sort_order)
select r.id, c.name, c.ord
from public.restaurants r
join (values ('Pain & fever',1),('Cold & flu',2),('First aid',3)) c(name,ord) on true
where r.city = 'Taourirt' and r.cuisine ilike 'Pharmacy%'
  and not exists (select 1 from public.menu_categories mc where mc.restaurant_id = r.id and mc.name = c.name);

insert into public.menu_items (restaurant_id, category_id, name, description, price_dh, available, sort_order, popularity)
select mc.restaurant_id, mc.id, i.name, i.descr, i.price, true, i.ord, i.pop
from public.restaurants r
join public.menu_categories mc on mc.restaurant_id = r.id
join (values
  ('Pain & fever','Paracétamol 500mg','Relieves pain and lowers fever · box of 20',18,1,99),
  ('Pain & fever','Ibuprofène 400mg','Anti-inflammatory for aches and fever · box of 20',24,2,75),
  ('Cold & flu','Vitamine C 1000mg','Effervescent immune support · tube of 20',32,1,66),
  ('First aid','Pansements assortis','Waterproof, breathable · box of 40',14,1,50),
  ('First aid','Gel hydroalcoolique','70% alcohol hand gel · 250 ml',19,2,55)
) i(cat,name,descr,price,ord,pop) on i.cat = mc.name
where r.city = 'Taourirt' and r.cuisine ilike 'Pharmacy%'
  and not exists (select 1 from public.menu_items mi where mi.restaurant_id = mc.restaurant_id and mi.name = i.name);

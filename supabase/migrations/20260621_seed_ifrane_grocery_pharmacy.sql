-- Make the Grocery + Pharmacy verticals functional with realistic Ifrane
-- partners (same shape as the existing seeded food restaurants). Idempotent.
-- Applied live to project toywtnupchfywhtdhxvj; captured here for reproducibility.
insert into public.restaurants (slug,name,cuisine,cuisine_tags,description,emoji,img_variant,rating,time_min,fee_dh,tag,status,city,is_campus_partner,is_local_legend)
values
 ('epicerie-atlas',  'Épicerie Atlas',     'Grocery · Daily',       array['grocery','market','fresh'],     'Fresh produce, pantry staples and daily essentials — delivered across Ifrane.', '🥬', 1, 4.7, 18, 0, null,                'live','Ifrane', true,  false),
 ('marjane-ifrane',  'Marjane Market',     'Grocery · Supermarket', array['grocery','supermarket'],        'Your neighbourhood supermarket — groceries, drinks and household, to your door.','🛒', 2, 4.6, 25, 0, null,                'live','Ifrane', false, false),
 ('pharmacie-ifrane','Pharmacie d''Ifrane','Pharmacy · Health',     array['pharmacy','health','care'],     'Campus pharmacy — medicine, first aid and personal care, delivered discreetly.','💊', 1, 4.9, 15, 0, 'Open till midnight','live','Ifrane', true,  true),
 ('pharmacie-atlas', 'Pharmacie Atlas',    'Pharmacy · Care',       array['pharmacy','wellness'],          'Prescriptions, vitamins and everyday wellness — a pharmacist is in-app to help.','⚕️', 3, 4.8, 20, 0, null,               'live','Ifrane', false, false)
on conflict (slug) do nothing;

insert into public.menu_categories (restaurant_id, name, sort_order)
select r.id, c.name, c.ord from public.restaurants r
join (values
  ('epicerie-atlas','Fresh produce',1),('epicerie-atlas','Bakery & dairy',2),('epicerie-atlas','Pantry',3),
  ('marjane-ifrane','Drinks',1),('marjane-ifrane','Snacks',2),('marjane-ifrane','Household',3),
  ('pharmacie-ifrane','Pain & fever',1),('pharmacie-ifrane','Cold & flu',2),('pharmacie-ifrane','First aid',3),
  ('pharmacie-atlas','Vitamins & care',1),('pharmacie-atlas','Personal care',2)
) c(slug,name,ord) on r.slug = c.slug
where not exists (select 1 from public.menu_categories mc where mc.restaurant_id = r.id and mc.name = c.name);

insert into public.menu_items (restaurant_id, category_id, name, description, price_dh, available, sort_order, popularity)
select mc.restaurant_id, mc.id, i.name, i.descr, i.price, true, i.ord, i.pop
from public.menu_categories mc
join public.restaurants r on r.id = mc.restaurant_id
join (values
  ('epicerie-atlas','Fresh produce','Vine tomatoes','Locally grown, ripened on the vine · 500 g',12,1,90),
  ('epicerie-atlas','Fresh produce','Bananas','Sweet and ready to eat · 1 kg',9,2,70),
  ('epicerie-atlas','Bakery & dairy','Fresh khobz','Baked this morning · 2 loaves',3,1,95),
  ('epicerie-atlas','Bakery & dairy','Whole milk','Ifrane farm dairy · 1 L',8,2,80),
  ('epicerie-atlas','Bakery & dairy','Free-range eggs','From Atlas farms · box of 12',18,3,60),
  ('epicerie-atlas','Pantry','Olive oil','Cold-pressed Moroccan olive oil · 750 ml',62,1,50),
  ('marjane-ifrane','Drinks','Still water','Atlas spring water · 6 × 1.5 L',6,1,88),
  ('marjane-ifrane','Drinks','Orange juice','100% pressed · 1 L',14,2,55),
  ('marjane-ifrane','Snacks','Salted crisps','Crunchy potato crisps · sharing bag',11,1,72),
  ('marjane-ifrane','Snacks','Dark chocolate','70% cocoa · 100 g',16,2,48),
  ('marjane-ifrane','Household','Dish soap','Lemon · 500 ml',13,1,40),
  ('pharmacie-ifrane','Pain & fever','Paracetamol 500mg','Relieves pain and lowers fever · box of 20',18,1,99),
  ('pharmacie-ifrane','Pain & fever','Ibuprofen 400mg','Anti-inflammatory for aches and fever · box of 20',24,2,75),
  ('pharmacie-ifrane','Cold & flu','Vitamin C effervescent','1000mg — winter immune support · tube of 20',32,1,66),
  ('pharmacie-ifrane','Cold & flu','Throat lozenges','Honey & lemon · pack of 24',16,2,52),
  ('pharmacie-ifrane','First aid','Assorted plasters','Waterproof, breathable · box of 40',14,1,44),
  ('pharmacie-atlas','Vitamins & care','Vitamin D drops','Daily winter dose · 10 ml',45,1,58),
  ('pharmacie-atlas','Vitamins & care','Hand sanitiser gel','70% alcohol · 250 ml pump',19,2,61),
  ('pharmacie-atlas','Personal care','Lip balm SPF15','Protects against dry Atlas air · stick',28,1,49)
) i(slug,cat,name,descr,price,ord,pop) on i.slug = r.slug and i.cat = mc.name
where not exists (select 1 from public.menu_items mi where mi.restaurant_id = mc.restaurant_id and mi.name = i.name);

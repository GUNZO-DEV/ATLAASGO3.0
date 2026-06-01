-- Every live restaurant had coords=NULL, which made assign_nearest_rider
-- throw "restaurant coords missing" and silently never auto-assign a rider
-- (the trigger swallows the error so orders still advance, but dispatch
-- never fires). Seed realistic Ifrane / AUI-area coordinates as {lat,lng}
-- jsonb. Idempotent: only fills rows where coords IS NULL.
--
-- Coordinates are plausible points around Ifrane town + Al Akhawayn
-- University campus (~33.53 N, -5.11 W), spread within town so haversine
-- distances between riders and venues are meaningful.

UPDATE public.restaurants r SET coords = c.coords
FROM (VALUES
  ('aui-cafeteria',          '{"lat":33.5392,"lng":-5.1108}'::jsonb),
  ('campus-grill',           '{"lat":33.5401,"lng":-5.1125}'::jsonb),
  ('foodie',                 '{"lat":33.5285,"lng":-5.1098}'::jsonb),
  ('bonsai-sushi-bar',       '{"lat":33.5279,"lng":-5.1072}'::jsonb),
  ('crepeto',                '{"lat":33.5301,"lng":-5.1115}'::jsonb),
  ('cafe-hassan',            '{"lat":33.5312,"lng":-5.1083}'::jsonb),
  ('atlas-grill',            '{"lat":33.5268,"lng":-5.1121}'::jsonb),
  ('bab-mansour',            '{"lat":33.5294,"lng":-5.1090}'::jsonb),
  ('boulangerie-michlifen',  '{"lat":33.5276,"lng":-5.1104}'::jsonb),
  ('la-paix-pizzeria',       '{"lat":33.5288,"lng":-5.1131}'::jsonb),
  ('green-bowl',             '{"lat":33.5305,"lng":-5.1069}'::jsonb),
  ('ifrane-burger',          '{"lat":33.5319,"lng":-5.1112}'::jsonb),
  ('riad-saveurs',           '{"lat":33.5263,"lng":-5.1087}'::jsonb),
  ('cafe-berbere',           '{"lat":33.5297,"lng":-5.1059}'::jsonb),
  ('cafe-cedre',             '{"lat":33.5283,"lng":-5.1118}'::jsonb),
  ('cafe-tilila',            '{"lat":33.5274,"lng":-5.1095}'::jsonb),
  ('chez-nous-ifrane',       '{"lat":33.5309,"lng":-5.1102}'::jsonb),
  ('la-belle-vue',           '{"lat":33.5256,"lng":-5.1110}'::jsonb),
  ('pizza-michlifen',        '{"lat":33.5291,"lng":-5.1078}'::jsonb),
  ('restaurant-chamonix',    '{"lat":33.5316,"lng":-5.1126}'::jsonb),
  ('riad-cascade',           '{"lat":33.5248,"lng":-5.1099}'::jsonb),
  ('snack-atlas',            '{"lat":33.5302,"lng":-5.1086}'::jsonb),
  ('souk-bites',             '{"lat":33.5287,"lng":-5.1064}'::jsonb),
  ('tajine-wa-tagin',        '{"lat":33.5271,"lng":-5.1116}'::jsonb)
) AS c(slug, coords)
WHERE r.slug = c.slug AND r.coords IS NULL;

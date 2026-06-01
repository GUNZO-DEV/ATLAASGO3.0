-- Seed menus for the 13 live restaurants that had zero menu items.
-- Idempotent: categories/items are matched by (restaurant slug, name) and
-- guarded with NOT EXISTS, so re-running never duplicates. No hardcoded IDs.

-- ── Categories ─────────────────────────────────────────────────────
INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
SELECT r.id, c.name, c.sort_order
FROM (VALUES
  ('aui-cafeteria','Mains',1),('aui-cafeteria','Sandwiches',2),('aui-cafeteria','Drinks',3),
  ('cafe-berbere','Coffee & Tea',1),('cafe-berbere','Pastries',2),
  ('cafe-cedre','Hot Drinks',1),('cafe-cedre','Light Bites',2),
  ('cafe-tilila','Drinks',1),('cafe-tilila','Breakfast',2),
  ('campus-grill','Burgers',1),('campus-grill','Wraps',2),('campus-grill','Drinks',3),
  ('chez-nous-ifrane','Starters',1),('chez-nous-ifrane','Tagines',2),('chez-nous-ifrane','Couscous',3),
  ('la-belle-vue','Starters',1),('la-belle-vue','Mains',2),('la-belle-vue','Desserts',3),
  ('pizza-michlifen','Pizzas',1),('pizza-michlifen','Sides',2),
  ('restaurant-chamonix','Starters',1),('restaurant-chamonix','Mains',2),('restaurant-chamonix','Desserts',3),
  ('riad-cascade','Tagines',1),('riad-cascade','Couscous',2),('riad-cascade','Desserts',3),
  ('snack-atlas','Sandwiches',1),('snack-atlas','Plates',2),('snack-atlas','Drinks',3),
  ('souk-bites','Street Food',1),('souk-bites','Snacks',2),
  ('tajine-wa-tagin','Tagines',1),('tajine-wa-tagin','Sides',2)
) AS c(slug, name, sort_order)
JOIN public.restaurants r ON r.slug = c.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_categories mc WHERE mc.restaurant_id = r.id AND mc.name = c.name
);

-- ── Items ──────────────────────────────────────────────────────────
INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price_dh, sort_order)
SELECT r.id, mc.id, i.name, i.description, i.price_dh, i.sort_order
FROM (VALUES
  ('aui-cafeteria','Mains','Chicken Tagine','Slow-cooked with olives & preserved lemon',45,1),
  ('aui-cafeteria','Mains','Beef Kefta Plate','Spiced beef meatballs with rice',50,2),
  ('aui-cafeteria','Mains','Vegetable Couscous','Steamed semolina with seven vegetables',40,3),
  ('aui-cafeteria','Mains','Grilled Chicken Plate','Marinated chicken with fries & salad',48,4),
  ('aui-cafeteria','Sandwiches','Chicken Panini','Grilled chicken, cheese, veggies',30,1),
  ('aui-cafeteria','Sandwiches','Tuna Sandwich','Tuna, egg, olives in fresh bread',28,2),
  ('aui-cafeteria','Sandwiches','Veggie Wrap','Grilled vegetables & hummus',25,3),
  ('aui-cafeteria','Drinks','Fresh Orange Juice','Freshly squeezed',15,1),
  ('aui-cafeteria','Drinks','Mint Tea','Traditional Moroccan',10,2),
  ('aui-cafeteria','Drinks','Soft Drink','Coke, Fanta, Sprite',8,3),
  ('cafe-berbere','Coffee & Tea','Espresso','Single shot',12,1),
  ('cafe-berbere','Coffee & Tea','Cappuccino','Espresso & steamed milk',18,2),
  ('cafe-berbere','Coffee & Tea','Café au Lait','Coffee with milk',16,3),
  ('cafe-berbere','Coffee & Tea','Berber Mint Tea','Green tea with fresh mint',12,4),
  ('cafe-berbere','Pastries','Almond Briouat','Crispy almond pastry in honey',10,1),
  ('cafe-berbere','Pastries','Chebakia','Sesame & honey cookie',8,2),
  ('cafe-berbere','Pastries','Croissant','Butter croissant',10,3),
  ('cafe-berbere','Pastries','Msemen with Honey','Layered flatbread',12,4),
  ('cafe-cedre','Hot Drinks','Espresso','Single shot',12,1),
  ('cafe-cedre','Hot Drinks','Cappuccino','Espresso & steamed milk',18,2),
  ('cafe-cedre','Hot Drinks','Hot Chocolate','Rich dark chocolate',20,3),
  ('cafe-cedre','Hot Drinks','Mint Tea','Traditional Moroccan',10,4),
  ('cafe-cedre','Light Bites','Cheese Sandwich','Melted cheese in toasted bread',22,1),
  ('cafe-cedre','Light Bites','Croque Monsieur','Ham & cheese toastie',28,2),
  ('cafe-cedre','Light Bites','Cake of the Day','Ask your server',18,3),
  ('cafe-tilila','Drinks','Café Noir','Black coffee',10,1),
  ('cafe-tilila','Drinks','Café Cassé','Coffee with a dash of milk',14,2),
  ('cafe-tilila','Drinks','Fresh Juice','Orange or seasonal',16,3),
  ('cafe-tilila','Drinks','Mint Tea','Traditional Moroccan',10,4),
  ('cafe-tilila','Breakfast','Msemen','Pan-fried layered flatbread',12,1),
  ('cafe-tilila','Breakfast','Harcha with Cheese','Semolina griddle bread',14,2),
  ('cafe-tilila','Breakfast','Beghrir Pancakes','Thousand-hole pancakes with honey',15,3),
  ('cafe-tilila','Breakfast','Omelette','Three eggs, your choice of filling',20,4),
  ('campus-grill','Burgers','Classic Cheeseburger','Beef patty, cheese, lettuce, tomato',45,1),
  ('campus-grill','Burgers','Double Smash','Two smashed patties, double cheese',60,2),
  ('campus-grill','Burgers','Chicken Burger','Crispy chicken fillet & slaw',42,3),
  ('campus-grill','Wraps','Shawarma Wrap','Marinated chicken, garlic sauce',38,1),
  ('campus-grill','Wraps','Grilled Chicken Wrap','Grilled chicken & veggies',40,2),
  ('campus-grill','Wraps','Falafel Wrap','Crispy falafel & tahini',32,3),
  ('campus-grill','Drinks','Fresh-Squeezed OJ','Just oranges',18,1),
  ('campus-grill','Drinks','Lemonade','Fresh mint lemonade',15,2),
  ('campus-grill','Drinks','Soft Drink','Coke, Fanta, Sprite',8,3),
  ('chez-nous-ifrane','Starters','Harira Soup','Traditional tomato & lentil soup',18,1),
  ('chez-nous-ifrane','Starters','Moroccan Salad','Diced tomato, cucumber, onion',22,2),
  ('chez-nous-ifrane','Tagines','Chicken & Olive Tagine','With preserved lemon',55,1),
  ('chez-nous-ifrane','Tagines','Lamb Prune Tagine','Sweet lamb with prunes & almonds',70,2),
  ('chez-nous-ifrane','Tagines','Kefta Tagine','Meatballs in tomato sauce with egg',50,3),
  ('chez-nous-ifrane','Couscous','Seven-Veg Couscous','Friday-style with seven vegetables',50,1),
  ('chez-nous-ifrane','Couscous','Lamb Couscous','Tender lamb & vegetables',65,2),
  ('la-belle-vue','Starters','French Onion Soup','Gratinated with cheese',25,1),
  ('la-belle-vue','Starters','Caesar Salad','Romaine, parmesan, croutons',35,2),
  ('la-belle-vue','Mains','Grilled Sea Bass','With lemon butter & vegetables',90,1),
  ('la-belle-vue','Mains','Chicken Cordon Bleu','Stuffed with ham & cheese',70,2),
  ('la-belle-vue','Mains','Pasta Bolognese','Slow-cooked beef ragù',55,3),
  ('la-belle-vue','Desserts','Crème Caramel','Classic custard',25,1),
  ('la-belle-vue','Desserts','Fruit Salad','Fresh seasonal fruit',20,2),
  ('pizza-michlifen','Pizzas','Margherita','Tomato, mozzarella, basil',50,1),
  ('pizza-michlifen','Pizzas','Pepperoni','Tomato, mozzarella, pepperoni',65,2),
  ('pizza-michlifen','Pizzas','Quatre Fromages','Four-cheese blend',70,3),
  ('pizza-michlifen','Pizzas','Vegetarian','Peppers, mushrooms, onion, olives',55,4),
  ('pizza-michlifen','Pizzas','Chicken BBQ','BBQ chicken & red onion',68,5),
  ('pizza-michlifen','Sides','Garlic Bread','Toasted with garlic butter',20,1),
  ('pizza-michlifen','Sides','Mozzarella Sticks','Crispy with marinara dip',30,2),
  ('restaurant-chamonix','Starters','French Onion Soup','Gratinated with cheese',25,1),
  ('restaurant-chamonix','Starters','Caesar Salad','Romaine, parmesan, croutons',35,2),
  ('restaurant-chamonix','Mains','Beef Steak Frites','Grilled steak with fries',85,1),
  ('restaurant-chamonix','Mains','Roast Chicken','Half chicken, herb jus',60,2),
  ('restaurant-chamonix','Mains','Fish & Chips','Battered cod & fries',65,3),
  ('restaurant-chamonix','Desserts','Chocolate Fondant','Warm molten centre',30,1),
  ('restaurant-chamonix','Desserts','Tarte Tatin','Caramelised apple tart',28,2),
  ('riad-cascade','Tagines','Chicken Lemon Tagine','With preserved lemon & olives',60,1),
  ('riad-cascade','Tagines','Lamb Tagine with Prunes','Sweet & savoury',75,2),
  ('riad-cascade','Couscous','Royal Couscous','Lamb, chicken & merguez',70,1),
  ('riad-cascade','Couscous','Vegetable Couscous','Seven vegetables',50,2),
  ('riad-cascade','Desserts','Orange with Cinnamon','Simple & refreshing',18,1),
  ('riad-cascade','Desserts','Moroccan Pastry Platter','Assorted sweets',30,2),
  ('snack-atlas','Sandwiches','Kefta Sandwich','Spiced beef in fresh bread',30,1),
  ('snack-atlas','Sandwiches','Chicken Shawarma','Garlic sauce & pickles',35,2),
  ('snack-atlas','Sandwiches','Merguez Sandwich','Spicy lamb sausage',32,3),
  ('snack-atlas','Plates','Mixed Grill Plate','Kefta, chicken, merguez & fries',55,1),
  ('snack-atlas','Plates','Chicken Plate','Grilled chicken, rice & salad',45,2),
  ('snack-atlas','Drinks','Fresh Juice','Orange or seasonal',15,1),
  ('snack-atlas','Drinks','Soft Drink','Coke, Fanta, Sprite',8,2),
  ('souk-bites','Street Food','Maakouda','Fried potato fritters',15,1),
  ('souk-bites','Street Food','Sardine Sandwich','Spiced grilled sardines',25,2),
  ('souk-bites','Street Food','Bocadillo','Loaded Moroccan baguette',22,3),
  ('souk-bites','Street Food','Brochettes','Grilled meat skewers',35,4),
  ('souk-bites','Snacks','Harira','Traditional soup',18,1),
  ('souk-bites','Snacks','Sfenj','Moroccan doughnuts',10,2),
  ('tajine-wa-tagin','Tagines','Chicken Tagine','Classic with olives & lemon',50,1),
  ('tajine-wa-tagin','Tagines','Lamb & Prune Tagine','Sweet & tender',70,2),
  ('tajine-wa-tagin','Tagines','Kefta & Egg Tagine','Meatballs in tomato with egg',55,3),
  ('tajine-wa-tagin','Tagines','Fish Tagine','Chermoula-marinated fish',65,4),
  ('tajine-wa-tagin','Tagines','Vegetable Tagine','Seasonal vegetables',40,5),
  ('tajine-wa-tagin','Sides','Moroccan Bread','Fresh khobz',5,1),
  ('tajine-wa-tagin','Sides','Mint Tea','Traditional Moroccan',10,2)
) AS i(slug, cat, name, description, price_dh, sort_order)
JOIN public.restaurants r ON r.slug = i.slug
JOIN public.menu_categories mc ON mc.restaurant_id = r.id AND mc.name = i.cat
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items mi WHERE mi.restaurant_id = r.id AND mi.name = i.name
);

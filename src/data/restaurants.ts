export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  priceDh: number;
};

export type Restaurant = {
  slug: string;
  name: string;
  cuisine: string;
  rating: number;
  timeMin: number;
  feeDh: number | 'Free';
  tag?: 'Hot' | 'Trending' | 'New' | 'Chef' | '';
  imgVariant: 0 | 1 | 2 | 3 | 4 | 5;
  cats: string[];
  emoji: string;
  description: string;
  menu: { section: string; items: MenuItem[] }[];
};

export const RESTAURANTS: Restaurant[] = [
  {
    slug: 'cafe-hassan',
    name: 'Café Hassan',
    cuisine: 'Moroccan · Tagines',
    rating: 4.9,
    timeMin: 18,
    feeDh: 12,
    tag: 'Hot',
    imgVariant: 0,
    cats: ['Moroccan'],
    emoji: '🫖',
    description: 'Family-run café in Ifrane medina serving slow-cooked tagines and mint tea since 1987.',
    menu: [
      {
        section: 'Tagines',
        items: [
          { id: 'ch-tagine-kefta', name: 'Tagine Kefta', desc: 'Spiced beef meatballs in tomato & egg', priceDh: 65 },
          { id: 'ch-tagine-poulet', name: 'Tagine Poulet Citron', desc: 'Slow-cooked chicken with preserved lemon & olives', priceDh: 78 },
          { id: 'ch-tagine-agneau', name: 'Tagine Agneau Pruneaux', desc: 'Lamb tagine with prunes, almonds, sesame', priceDh: 95 },
        ],
      },
      {
        section: 'Couscous & Sides',
        items: [
          { id: 'ch-couscous', name: 'Couscous Royal', desc: 'Seven-vegetable couscous, lamb & chicken', priceDh: 110 },
          { id: 'ch-harira', name: 'Harira Soup', desc: 'Traditional ramadan tomato-lentil soup', priceDh: 22 },
          { id: 'ch-msemen', name: 'Msemen Plate', desc: 'Square pancakes with honey & amlou', priceDh: 28 },
        ],
      },
      {
        section: 'Drinks',
        items: [
          { id: 'ch-tea', name: 'Mint Tea', desc: 'Atlas mint, generous pour', priceDh: 14 },
          { id: 'ch-juice', name: 'Fresh OJ', desc: 'Hand-squeezed', priceDh: 18 },
        ],
      },
    ],
  },
  {
    slug: 'la-paix-pizzeria',
    name: 'La Paix Pizzeria',
    cuisine: 'Italian · Pizza',
    rating: 4.8,
    timeMin: 22,
    feeDh: 8,
    tag: 'Trending',
    imgVariant: 4,
    cats: ['Italian', 'Pizza'],
    emoji: '🍕',
    description: 'Wood-fired Neapolitan pizzas, run by Italian-trained Saïd next to Place de la Paix.',
    menu: [
      {
        section: 'Pizzas',
        items: [
          { id: 'lp-margherita', name: 'Margherita', desc: 'San Marzano, mozzarella di bufala, basil', priceDh: 62 },
          { id: 'lp-atlas', name: 'Atlas Special', desc: 'Khlii lamb, olives, ras-el-hanout drizzle', priceDh: 84 },
          { id: 'lp-veggie', name: 'Vegetable Garden', desc: 'Zucchini, eggplant, peppers, goat cheese', priceDh: 72 },
        ],
      },
      {
        section: 'Pasta',
        items: [
          { id: 'lp-bolognese', name: 'Tagliatelle Bolognese', desc: 'Slow-braised beef ragù', priceDh: 78 },
          { id: 'lp-pesto', name: 'Trofie al Pesto', desc: 'Genovese basil, pine nuts, parmigiano', priceDh: 68 },
        ],
      },
    ],
  },
  {
    slug: 'atlas-grill',
    name: 'Atlas Grill House',
    cuisine: 'Grilled · Halal',
    rating: 4.8,
    timeMin: 28,
    feeDh: 'Free',
    tag: 'New',
    imgVariant: 1,
    cats: ['Grill'],
    emoji: '🔥',
    description: 'Charcoal-grilled lamb, mechoui, and merguez — Atlas-region cuts from local farms.',
    menu: [
      {
        section: 'From the Grill',
        items: [
          { id: 'ag-mechoui', name: 'Mechoui (250g)', desc: 'Slow-roasted lamb shoulder, cumin salt', priceDh: 120 },
          { id: 'ag-merguez', name: 'Merguez Plate', desc: 'Six spicy lamb sausages, harissa', priceDh: 72 },
          { id: 'ag-brochettes', name: 'Brochettes Mix', desc: 'Lamb, chicken, kefta skewers', priceDh: 88 },
        ],
      },
      {
        section: 'Sides',
        items: [
          { id: 'ag-frites', name: 'Atlas Fries', desc: 'Hand-cut, ras-el-hanout', priceDh: 26 },
          { id: 'ag-salade', name: 'Moroccan Salad', desc: 'Tomato, cucumber, onion, parsley', priceDh: 22 },
        ],
      },
    ],
  },
  {
    slug: 'boulangerie-michlifen',
    name: 'Boulangerie Michlifen',
    cuisine: 'Bakery · Pastries',
    rating: 4.9,
    timeMin: 14,
    feeDh: 10,
    tag: '',
    imgVariant: 5,
    cats: ['Pastries', 'Cafés'],
    emoji: '🥐',
    description: 'French-Moroccan boulangerie, fresh viennoiseries every morning at 6am.',
    menu: [
      {
        section: 'Morning',
        items: [
          { id: 'bm-croissant', name: 'Croissant au Beurre', desc: 'AOP butter, 72-hour fermentation', priceDh: 12 },
          { id: 'bm-pain-choc', name: 'Pain au Chocolat', desc: 'Valrhona dark chocolate', priceDh: 14 },
          { id: 'bm-baghrir', name: 'Baghrir', desc: 'Thousand-hole pancake, honey-butter', priceDh: 22 },
        ],
      },
      {
        section: 'Patisserie',
        items: [
          { id: 'bm-corne', name: 'Corne de Gazelle', desc: 'Almond paste, orange-flower glaze', priceDh: 8 },
          { id: 'bm-chebakia', name: 'Chebakia (5pcs)', desc: 'Sesame-honey rose pastries', priceDh: 26 },
        ],
      },
    ],
  },
  {
    slug: 'riad-saveurs',
    name: 'Riad Saveurs',
    cuisine: 'Moroccan · Fine Dining',
    rating: 4.7,
    timeMin: 32,
    feeDh: 15,
    tag: 'Chef',
    imgVariant: 3,
    cats: ['Moroccan'],
    emoji: '🌶',
    description: "Chef Yacine's 7-course tasting brought to your door — Atlas terroir, modern technique.",
    menu: [
      {
        section: 'Tasting',
        items: [
          { id: 'rs-tasting', name: '7-Course Tasting', desc: 'Two people, chef\'s discretion', priceDh: 480 },
          { id: 'rs-pastilla', name: 'Pastilla au Pigeon', desc: 'Slow-cooked pigeon, almond, cinnamon dust', priceDh: 165 },
          { id: 'rs-lamb', name: 'Mrouzia', desc: 'Honey-spiced lamb, raisins, ras-el-hanout', priceDh: 145 },
        ],
      },
    ],
  },
  {
    slug: 'ifrane-burger',
    name: 'Ifrane Burger Co.',
    cuisine: 'Burgers · Fast',
    rating: 4.6,
    timeMin: 16,
    feeDh: 'Free',
    tag: '',
    imgVariant: 2,
    cats: ['Grill'],
    emoji: '🍔',
    description: 'Smash burgers, hand-cut fries — student favourite, open until 1am.',
    menu: [
      {
        section: 'Burgers',
        items: [
          { id: 'ib-classic', name: 'Classic Smash', desc: 'Double patty, american cheese, pickles', priceDh: 48 },
          { id: 'ib-atlas', name: 'Atlas Khlii Burger', desc: 'Khlii, caramelised onion, harissa mayo', priceDh: 62 },
          { id: 'ib-veggie', name: 'Cèdres Veggie', desc: 'Black bean, mushroom, smoked gouda', priceDh: 44 },
        ],
      },
    ],
  },
  {
    slug: 'green-bowl',
    name: 'Green Bowl Ifrane',
    cuisine: 'Healthy · Vegan',
    rating: 4.8,
    timeMin: 20,
    feeDh: 8,
    tag: 'New',
    imgVariant: 2,
    cats: ['Healthy'],
    emoji: '🥗',
    description: 'Cold-pressed juices, grain bowls, and zaalouk for the campus crowd.',
    menu: [
      {
        section: 'Bowls',
        items: [
          { id: 'gb-buddha', name: 'Atlas Buddha Bowl', desc: 'Quinoa, roasted veg, tahini-lemon', priceDh: 58 },
          { id: 'gb-zaalouk', name: 'Zaalouk Power Bowl', desc: 'Smoked eggplant, lentils, herbs', priceDh: 52 },
        ],
      },
      {
        section: 'Cold-press',
        items: [
          { id: 'gb-green', name: 'Green Atlas', desc: 'Kale, cucumber, apple, mint', priceDh: 32 },
          { id: 'gb-beet', name: 'Beet Reset', desc: 'Beet, ginger, carrot, lemon', priceDh: 32 },
        ],
      },
    ],
  },
  {
    slug: 'bab-mansour',
    name: 'Bab Mansour Café',
    cuisine: 'Cafés · Breakfast',
    rating: 4.7,
    timeMin: 12,
    feeDh: 6,
    tag: '',
    imgVariant: 5,
    cats: ['Cafés'],
    emoji: '☕',
    description: 'Specialty coffee + Moroccan breakfast — fastest delivery in Ifrane.',
    menu: [
      {
        section: 'Coffee',
        items: [
          { id: 'bm-espresso', name: 'Espresso', desc: 'House blend, dark roast', priceDh: 14 },
          { id: 'bm-cappuccino', name: 'Cappuccino', desc: 'Velvety microfoam', priceDh: 22 },
          { id: 'bm-spice', name: 'Atlas Spice Latte', desc: 'Cardamom, cinnamon, oat milk', priceDh: 28 },
        ],
      },
      {
        section: 'Breakfast',
        items: [
          { id: 'bm-msemen-set', name: 'Msemen Set', desc: 'Two msemen, honey, amlou, mint tea', priceDh: 34 },
          { id: 'bm-omelette', name: 'Berber Omelette', desc: 'Tomato, onion, cumin, msemen', priceDh: 38 },
        ],
      },
    ],
  },
];

export const CUISINES = ['All', 'Moroccan', 'Italian', 'Cafés', 'Grill', 'Pizza', 'Pastries', 'Healthy'] as const;

export function findRestaurant(slug: string) {
  return RESTAURANTS.find((r) => r.slug === slug);
}

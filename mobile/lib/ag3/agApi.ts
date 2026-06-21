/**
 * AtlaasGo 3.0 — mobile Supabase-native API client.
 *
 * Direct port of the web app's src/lib/agApi.ts to React Native. Same surface
 * (agApi.me / cities / catalog / cart / orders) and the EXACT spec field names,
 * but it imports the mobile Supabase client and inlines the minimal DB row
 * types it needs (mobile has no generated database.types).
 *
 * Differences vs. web:
 *   - imports `../supabase` (the AsyncStorage-backed RN client)
 *   - no `import.meta.env` anywhere (Hermes-safe)
 *   - local row types instead of `./database.types`
 *
 * Auth note: the spec describes phone OTP; AtlaasGo uses Clerk → Supabase. We
 * skip `/auth/*` and resolve `me.*` from the live Supabase session that the
 * Clerk→Supabase bridge establishes (see lib/auth.tsx).
 */
import { supabase } from '../supabase';

/* ── Minimal DB row types (inlined; mobile has no generated types) ─────────── */
type DbOrderStatus =
  | 'ordered'
  | 'preparing'
  | 'enRoute'
  | 'outForDelivery'
  | 'arriving'
  | 'delivered'
  | 'cancelled';

type Coords = { lat: number; lng: number; accuracyM?: number | null };

interface RestaurantRow {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  cuisine_tags: string[] | null;
  description: string | null;
  emoji: string | null;
  img_variant: number;
  rating: number;
  time_min: number;
  fee_dh: number;
  tag: string | null;
  status: string;
  owner_id: string | null;
  coords: Coords | null;
  is_campus_partner: boolean;
  is_local_legend: boolean;
  whatsapp_phone: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

interface MenuCategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

interface MenuItemRow {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_dh: number;
  available: boolean;
  image_url: string | null;
  sort_order: number;
  popularity: number | null;
}

interface CartItemSnapshot {
  id: string;
  restaurantSlug: string;
  restaurantName: string;
  name: string;
  priceDh: number;
  qty: number;
}

interface OrderRow {
  id: string;
  customer_id: string;
  items: CartItemSnapshot[] | null;
  status: DbOrderStatus;
  landmark: string | null;
  coords: Coords | null;
  total_dh: number;
  created_at: string;
  address_id: string | null;
  campus_building: string | null;
  city?: string | null;
}

interface AddressRow {
  id: string;
  user_id: string;
  label: string;
  building: string | null;
  room: string | null;
  landmark: string | null;
  is_default: boolean;
}

/* ── Spec types (mirror handoff/api-client.ts) ───────────────────────────── */
export type Lang = 'en' | 'fr' | 'ar';
export type Theme = 'light' | 'dark';
export type VerticalId = 'food' | 'grocery' | 'pharmacy';
export type OrderStatus = 'placed' | 'kitchen' | 'pickup' | 'enroute' | 'arrived' | 'delivered';

export interface User {
  id: string;
  name: string;
  initials: string;
  campusId: string | null;
  memberSince: number;
  language: Lang;
  theme: Theme;
  stats: { orders: number; favourites: number; walletDh: number };
}
export interface City {
  id: string; name: string; campus: boolean; weather: boolean; served: boolean;
  defaultAddress: string; defaultAddressSub: string;
}
export interface Weather { condition: string; tempC: number; etaAddMinutes: number; note: string; }
export interface Vertical { id: VerticalId; label: string; emoji: string; blurb: string; }
export interface Category { id: string; label: string; emoji: string; }
export interface Store {
  id: string; name: string; vertical: VerticalId; tags: string[]; cuisineIds: string[];
  rating: number; reviews: number; etaMinutes: [number, number]; distanceKm: number;
  deliveryFeeDh: number; priceTier: 1 | 2 | 3; promo: string | null; blurb: string;
  heroImageUrl: string | null; isFavourite: boolean;
  /** extra (not in spec): the prototype's emoji-tile fallback when heroImageUrl is null */
  emoji: string | null;
}
export interface ItemOption { id: string; label: string; priceDh: number; }
export interface MenuItem {
  id: string; name: string; priceDh: number; description: string; imageUrl: string | null;
  tag: string | null; kcal?: number; packSize?: string; options?: ItemOption[]; rx?: boolean;
}
export interface MenuSection { title: string; items: MenuItem[]; }
export interface Address {
  id: string; cityId: string; label: string; sub: string;
  building?: string; room?: string; floor?: string; dropNote?: string; isDefault: boolean;
}
export interface PaymentMethod { id: string; kind: 'wallet' | 'card'; label: string; last4?: string; }
export interface Promo { id: string; label: string; active: boolean; }
export interface CartLine { itemId: string; qty: number; optionIds?: string[]; }
export interface Quote {
  subtotalDh: number; deliveryFeeDh: number; priorityDh: number; weatherSurchargeDh: number;
  tipDh: number; totalDh: number; etaMinutes: [number, number];
}
export interface Order {
  id: string; store: { id: string; name: string; heroImageUrl: string | null };
  items: { itemId: string; name: string; qty: number; priceDh: number }[];
  status: OrderStatus; totalDh: number; placedAt: string; address: Address;
}
export interface Tracking {
  status: OrderStatus; etaMinutes: number; weatherAdjustMinutes: number; progress: number;
  courier: { id: string; name: string; initials: string; rating: number; vehicle: string; phone: string };
  route: { origin: [number, number]; dest: [number, number]; path: string };
  stages: { key: string; label: string; time: string; sub: string; done: boolean }[];
}
export interface Notification { id: string; title: string; body: string | null; read: boolean; createdAt: string; kind: string; }

/* ── taxonomy (no DB table — matches the spec's examples) ─────────────────── */
const VERTICALS: Vertical[] = [
  { id: 'food', label: 'Food', emoji: '🍽️', blurb: 'Restaurants, cafés & pastries' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒', blurb: 'Markets & daily essentials' },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊', blurb: 'Meds & care, pharmacist in-app' },
];
// Cuisine chips + tokens are DERIVED from the live catalog (no hardcoded list).
// Cuisine strings look like "Moroccan · Tagines" / "Burgers · Fast" — they get
// split into individual slug tokens so category chips filter real restaurants.
const TOKEN_EMOJI: Record<string, string> = {
  moroccan: '🍲', tagine: '🍲', tagines: '🍲', tajine: '🍲', couscous: '🍲',
  cafe: '☕', cafes: '☕', 'café': '☕', 'cafés': '☕', coffee: '☕', breakfast: '🍳',
  pastry: '🥐', pastries: '🥐', bakery: '🥐', desserts: '🍰', crepes: '🥞', 'crêpes': '🥞',
  grill: '🔥', grills: '🔥', grilled: '🔥', bbq: '🔥',
  pizza: '🍕', italian: '🍝', pasta: '🍝',
  burger: '🍔', burgers: '🍔', tacos: '🌮', burritos: '🌯', wings: '🍗',
  sushi: '🍣', japonais: '🍣', 'thaï': '🍜', thai: '🍜', asian: '🥢',
  healthy: '🥗', vegan: '🥗', salads: '🥗',
  french: '🥖', bistro: '🍷', sandwiches: '🥪', sandwich: '🥪', street: '🌯', international: '🌍',
  grocery: '🛒', market: '🛒', supermarket: '🛒', pharmacy: '💊', wellness: '💊',
};
// Too-generic to make a useful cuisine chip.
const STOP_TOKENS = new Set([
  'food', 'fine', 'dining', 'essentials', 'daily', 'fresh', 'grocery', 'market', 'supermarket',
  'pharmacy', 'health', 'care', 'wellness', 'fast', 'halal',
]);
const normKey = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tokenEmoji = (token: string) => TOKEN_EMOJI[normKey(token)] ?? '🍽️';

/* ── mappers ─────────────────────────────────────────────────────────────── */
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function deriveVertical(r: Pick<RestaurantRow, 'cuisine' | 'cuisine_tags'>): VerticalId {
  const hay = [r.cuisine, ...(r.cuisine_tags ?? [])].join(' ').toLowerCase();
  if (/pharmac/.test(hay)) return 'pharmacy';
  if (/grocery|épicerie|epicerie|market|grocer/.test(hay)) return 'grocery';
  return 'food';
}

function cuisineIds(r: Pick<RestaurantRow, 'cuisine' | 'cuisine_tags'>): string[] {
  const raw = [r.cuisine ?? '', ...(r.cuisine_tags ?? [])].join(' · ');
  return Array.from(new Set(raw.split(/[·,/|&]+/).map((s) => slug(s)).filter(Boolean)));
}

function priceTier(feeDh: number): 1 | 2 | 3 {
  if (feeDh <= 0) return 1;
  if (feeDh <= 12) return 2;
  return 3;
}

function isPromoBadge(tag: string | null): boolean {
  return !!tag && /[-−%]|off|free|deal|promo/i.test(tag);
}

function restaurantToStore(r: RestaurantRow, favSlugs: Set<string>, reviews = 0): Store {
  return {
    id: r.slug,
    name: r.name,
    vertical: deriveVertical(r),
    tags: r.cuisine_tags ?? [],
    cuisineIds: cuisineIds(r),
    rating: r.rating ?? 0,
    reviews,
    etaMinutes: [r.time_min, r.time_min + 6],
    distanceKm: 0, // no user-relative distance without a geolocation context
    deliveryFeeDh: r.fee_dh ?? 0,
    priceTier: priceTier(r.fee_dh ?? 0),
    promo: isPromoBadge(r.tag) ? r.tag : null,
    blurb: r.description ?? '',
    heroImageUrl: null,
    isFavourite: favSlugs.has(r.slug) || favSlugs.has(r.id),
    emoji: r.emoji,
  };
}

function menuItemToSpec(mi: MenuItemRow): MenuItem {
  return {
    id: mi.id,
    name: mi.name,
    priceDh: mi.price_dh,
    description: mi.description ?? '',
    imageUrl: mi.image_url,
    tag: (mi.popularity ?? 0) >= 80 ? 'most ordered' : null,
  };
}

const DB_TO_SPEC_STATUS: Record<DbOrderStatus, OrderStatus> = {
  ordered: 'placed', preparing: 'kitchen', enRoute: 'pickup',
  outForDelivery: 'enroute', arriving: 'arrived', delivered: 'delivered', cancelled: 'placed',
};
const STATUS_PROGRESS: Record<OrderStatus, number> = {
  placed: 0.1, kitchen: 0.3, pickup: 0.5, enroute: 0.75, arrived: 0.95, delivered: 1,
};

function addressRowToSpec(a: AddressRow): Address {
  return {
    id: a.id,
    cityId: 'ifrane',
    label: a.label,
    sub: a.landmark ?? '',
    building: a.building ?? undefined,
    room: a.room ?? undefined,
    dropNote: a.landmark ?? undefined,
    isDefault: a.is_default,
  };
}

function orderRowToSpec(o: OrderRow): Order {
  const first = o.items?.[0];
  return {
    id: o.id,
    store: { id: first?.restaurantSlug ?? '', name: first?.restaurantName ?? 'AtlaasGo', heroImageUrl: null },
    items: (o.items ?? []).map((i) => ({ itemId: i.id, name: i.name, qty: i.qty, priceDh: i.priceDh })),
    status: DB_TO_SPEC_STATUS[o.status] ?? 'placed',
    totalDh: o.total_dh,
    placedAt: o.created_at,
    address: {
      id: o.address_id ?? '',
      cityId: o.city ?? 'ifrane',
      label: o.landmark ?? '',
      sub: o.campus_building ?? '',
      isDefault: false,
    },
  };
}

const RESTAURANT_COLS =
  'id,slug,name,cuisine,cuisine_tags,description,emoji,img_variant,rating,time_min,fee_dh,tag,status,owner_id,coords,is_campus_partner,is_local_legend,whatsapp_phone,city,created_at,updated_at';

// A Store.id is the restaurant slug, but callers may also pass a real uuid id.
// Pick the matching column so we never compare a non-uuid slug against the uuid
// `id` column (PostgREST rejects that with a 400 "invalid input syntax for uuid").
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const storeKey = (idOrSlug: string): 'id' | 'slug' => (UUID_RE.test(idOrSlug) ? 'id' : 'slug');

/** A dish search hit — a menu item plus the store it belongs to (for navigation). */
export interface DishHit { id: string; name: string; priceDh: number; storeId: string; storeName: string; emoji: string | null; imageUrl: string | null; }

async function sessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function favouriteSlugs(uid: string | null): Promise<Set<string>> {
  if (!uid) return new Set();
  const { data } = await supabase.from('favorites').select('target_id').eq('user_id', uid).eq('kind', 'restaurant');
  return new Set(((data ?? []) as { target_id: string }[]).map((f) => f.target_id));
}

/* ── client ──────────────────────────────────────────────────────────────── */
export const agApi = {
  /* §1 me (Clerk-backed session, not OTP) */
  me: {
    get: async (): Promise<User | null> => {
      const uid = await sessionUserId();
      if (!uid) return null;
      const [{ data: p }, { data: w }, { count: orders }, { count: favs }] = await Promise.all([
        supabase.from('profiles').select('display_name, created_at, language, theme, campus_id').eq('id', uid).maybeSingle(),
        supabase.from('wallets').select('balance_dh').eq('user_id', uid).maybeSingle(),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid),
        supabase.from('favorites').select('user_id', { count: 'exact', head: true }).eq('user_id', uid),
      ]);
      const name = (p?.display_name as string | null) ?? 'Guest';
      return {
        id: uid,
        name,
        initials: name.trim().charAt(0).toUpperCase() || 'A',
        campusId: (p?.campus_id as string | null) ?? null,
        memberSince: p?.created_at ? new Date(p.created_at as string).getFullYear() : new Date().getFullYear(),
        language: ((p?.language as Lang) ?? 'en'),
        theme: ((p?.theme as Theme) ?? 'light'),
        stats: { orders: orders ?? 0, favourites: favs ?? 0, walletDh: (w?.balance_dh as number) ?? 0 },
      };
    },
    update: async (patch: Partial<Pick<User, 'name' | 'language' | 'theme' | 'campusId'>>): Promise<void> => {
      const uid = await sessionUserId();
      if (!uid) throw new Error('Not signed in');
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.display_name = patch.name;
      if (patch.language !== undefined) row.language = patch.language;
      if (patch.theme !== undefined) row.theme = patch.theme;
      if (patch.campusId !== undefined) row.campus_id = patch.campusId;
      if (Object.keys(row).length === 0) return;
      const { error } = await supabase.from('profiles').update(row).eq('id', uid);
      if (error) throw new Error(error.message);
    },
    setLanguage: (language: Lang) => agApi.me.update({ language }),
    setTheme: (theme: Theme) => agApi.me.update({ theme }),
    addresses: async (): Promise<Address[]> => {
      const uid = await sessionUserId();
      if (!uid) return [];
      const { data } = await supabase.from('addresses').select('*').eq('user_id', uid).order('is_default', { ascending: false });
      return ((data ?? []) as AddressRow[]).map(addressRowToSpec);
    },
    wallet: async (): Promise<{ balanceDh: number; transactions: unknown[] }> => {
      const uid = await sessionUserId();
      if (!uid) return { balanceDh: 0, transactions: [] };
      const [{ data: w }, { data: tx }] = await Promise.all([
        supabase.from('wallets').select('balance_dh').eq('user_id', uid).maybeSingle(),
        supabase.from('wallet_transactions').select('*').eq('wallet_id', uid).order('created_at', { ascending: false }).limit(50),
      ]);
      return { balanceDh: (w?.balance_dh as number) ?? 0, transactions: tx ?? [] };
    },
    paymentMethods: async (): Promise<PaymentMethod[]> => {
      // AtlaasGo settles via wallet + Stripe; expose the wallet as a method.
      return [{ id: 'wallet', kind: 'wallet', label: 'AtlaasGo Wallet' }];
    },
    promos: async (): Promise<Promo[]> => {
      const { data } = await supabase.from('promotions').select('code, description, is_active').eq('is_active', true);
      return ((data ?? []) as { code: string; description: string | null; is_active: boolean }[]).map((p) => ({
        id: p.code, label: p.description ?? p.code, active: p.is_active,
      }));
    },
    favourites: async (): Promise<Store[]> => {
      const uid = await sessionUserId();
      if (!uid) return [];
      const favs = await favouriteSlugs(uid);
      if (favs.size === 0) return [];
      const { data } = await supabase.from('restaurants').select(RESTAURANT_COLS).in('id', Array.from(favs));
      return ((data ?? []) as unknown as RestaurantRow[]).map((r) => restaurantToStore(r, favs));
    },
    setFavourite: async (storeId: string, on: boolean): Promise<{ isFavourite: boolean }> => {
      const uid = await sessionUserId();
      if (!uid) throw new Error('Not signed in');
      // storeId is a slug — resolve to the restaurant id used by favorites.target_id
      const { data: r } = await supabase.from('restaurants').select('id').eq(storeKey(storeId), storeId).maybeSingle();
      const targetId = (r?.id as string) ?? storeId;
      if (on) await supabase.from('favorites').upsert({ user_id: uid, kind: 'restaurant', target_id: targetId });
      else await supabase.from('favorites').delete().eq('user_id', uid).eq('kind', 'restaurant').eq('target_id', targetId);
      return { isFavourite: on };
    },
    notifications: async (): Promise<Notification[]> => {
      const uid = await sessionUserId();
      if (!uid) return [];
      const { data } = await supabase
        .from('notifications').select('id, title, body, read_at, created_at, kind')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(40);
      return ((data ?? []) as { id: string; title: string; body: string | null; read_at: string | null; created_at: string; kind: string }[])
        .map((n) => ({ id: n.id, title: n.title, body: n.body, read: !!n.read_at, createdAt: n.created_at, kind: n.kind }));
    },
    markNotificationsRead: async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return;
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    },
  },

  /* §2 cities & weather */
  cities: {
    list: async (): Promise<City[]> => {
      const { data } = await supabase.from('cities')
        .select('id, name, campus, weather, served, default_address, default_address_sub').order('sort_order');
      return ((data ?? []) as { id: string; name: string; campus: boolean; weather: boolean; served: boolean; default_address: string; default_address_sub: string }[])
        .map((c) => ({ id: c.id, name: c.name, campus: c.campus, weather: c.weather, served: c.served, defaultAddress: c.default_address, defaultAddressSub: c.default_address_sub }));
    },
    get: async (id: string): Promise<City | null> => {
      const { data: c } = await supabase.from('cities')
        .select('id, name, campus, weather, served, default_address, default_address_sub').eq('id', id).maybeSingle();
      if (!c) return null;
      return { id: c.id, name: c.name, campus: c.campus, weather: c.weather, served: c.served, defaultAddress: c.default_address, defaultAddressSub: c.default_address_sub };
    },
    weather: async (cityId: string): Promise<Weather | null> => {
      const { data: city } = await supabase.from('cities').select('weather').eq('id', cityId).maybeSingle();
      if (!city?.weather) return null; // null when city.weather === false (spec §2)
      const { data: w } = await supabase.from('city_weather').select('condition, temp_c, eta_add_minutes, note').eq('city_id', cityId).maybeSingle();
      if (!w) return null;
      return { condition: w.condition as string, tempC: w.temp_c as number, etaAddMinutes: w.eta_add_minutes as number, note: w.note as string };
    },
  },

  /* §3 catalog */
  catalog: {
    verticals: async (): Promise<Vertical[]> => VERTICALS,
    categories: async (vertical: VerticalId = 'food', city?: string): Promise<Category[]> => {
      // Derive cuisine chips from the live catalog for this vertical, scoped to
      // the selected city so a chip never filters the list to zero (e.g. a
      // "Moroccan" chip in a city whose only place serves tacos).
      let cq = supabase.from('restaurants').select('cuisine, cuisine_tags, status').eq('status', 'live');
      if (city) cq = cq.ilike('city', city);
      const { data } = await cq;
      const rows = (data ?? []) as Pick<RestaurantRow, 'cuisine' | 'cuisine_tags'>[];
      const acc = new Map<string, { label: string; emoji: string; n: number }>();
      for (const r of rows) {
        if (deriveVertical(r) !== vertical) continue;
        const raw = [r.cuisine ?? '', ...(r.cuisine_tags ?? [])].join(' · ');
        for (const token of raw.split(/[·,/|&]+/).map((s) => s.trim()).filter(Boolean)) {
          const id = slug(token);
          if (!id || STOP_TOKENS.has(id)) continue;
          const cur = acc.get(id);
          if (cur) cur.n += 1;
          else acc.set(id, { label: titleCase(token), emoji: tokenEmoji(token), n: 1 });
        }
      }
      return [...acc.entries()]
        .sort((a, b) => b[1].n - a[1].n)
        .slice(0, 8)
        .map(([id, v]) => ({ id, label: v.label, emoji: v.emoji }));
    },
    stores: async (p: { city?: string; vertical?: VerticalId; category?: string; fast?: boolean; sort?: 'rating' | 'eta' | 'distance'; limit?: number } = {}): Promise<Store[]> => {
      let q = supabase.from('restaurants').select(RESTAURANT_COLS).eq('status', 'live');
      if (p.city) q = q.ilike('city', p.city);
      if (p.fast) q = q.lte('time_min', 22);
      if (p.sort === 'eta') q = q.order('time_min', { ascending: true });
      else q = q.order('rating', { ascending: false }); // rating | distance(n/a) default
      if (p.limit) q = q.limit(p.limit);
      const [{ data }, favs] = await Promise.all([q, favouriteSlugs(await sessionUserId())]);
      let stores = ((data ?? []) as unknown as RestaurantRow[]).map((r) => restaurantToStore(r, favs));
      if (p.vertical) stores = stores.filter((s) => s.vertical === p.vertical);
      if (p.category) stores = stores.filter((s) => s.cuisineIds.includes(p.category!));
      return stores;
    },
    store: async (id: string): Promise<Store | null> => {
      const uid = await sessionUserId();
      const [{ data: r }, favs] = await Promise.all([
        supabase.from('restaurants').select(RESTAURANT_COLS).eq(storeKey(id), id).maybeSingle(),
        favouriteSlugs(uid),
      ]);
      if (!r) return null;
      const row = r as unknown as RestaurantRow;
      const { count } = await supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('restaurant_id', row.id);
      return restaurantToStore(row, favs, count ?? 0);
    },
    menu: async (id: string): Promise<MenuSection[]> => {
      const { data: r } = await supabase.from('restaurants').select('id').eq(storeKey(id), id).maybeSingle();
      if (!r) return [];
      const rid = (r as { id: string }).id;
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('restaurant_id', rid).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', rid).eq('available', true).order('sort_order'),
      ]);
      const itemRows = (items ?? []) as MenuItemRow[];
      const sections: MenuSection[] = ((cats ?? []) as MenuCategoryRow[]).map((c) => ({
        title: c.name,
        items: itemRows.filter((i) => i.category_id === c.id).map(menuItemToSpec),
      }));
      const uncategorised = itemRows.filter((i) => !i.category_id);
      if (uncategorised.length) sections.push({ title: 'More', items: uncategorised.map(menuItemToSpec) });
      return sections.filter((s) => s.items.length);
    },
    search: async (q: string, city?: string): Promise<{ stores: Store[]; dishes: DishHit[] }> => {
      const term = q.trim();
      if (!term) return { stores: [], dishes: [] };
      const clean = term.replace(/[%,()*]/g, ' ').trim() || term;
      const like = `%${clean}%`;
      // Stores: match name OR cuisine, scoped to live + the selected city.
      let storeQ = supabase
        .from('restaurants')
        .select(RESTAURANT_COLS)
        .eq('status', 'live')
        .or(`name.ilike.${like},cuisine.ilike.${like}`)
        .limit(20);
      if (city) storeQ = storeQ.ilike('city', city);
      // Dishes: menu items by name, joined to their (live) restaurant for the store ref.
      let dishQ = supabase
        .from('menu_items')
        .select('id, name, price_dh, image_url, restaurants!inner(slug, name, emoji, city, status)')
        .eq('available', true)
        .eq('restaurants.status', 'live')
        .ilike('name', like)
        .limit(24);
      if (city) dishQ = dishQ.ilike('restaurants.city', city);
      const [{ data: rs }, { data: ds }, favs] = await Promise.all([storeQ, dishQ, favouriteSlugs(await sessionUserId())]);
      const stores = ((rs ?? []) as unknown as RestaurantRow[]).map((r) => restaurantToStore(r, favs));
      type Rest = { slug: string; name: string; emoji: string | null };
      type DishRow = { id: string; name: string; price_dh: number | null; image_url: string | null; restaurants: Rest | Rest[] | null };
      const dishes: DishHit[] = ((ds ?? []) as DishRow[])
        .map((d) => {
          const rest = Array.isArray(d.restaurants) ? d.restaurants[0] : d.restaurants;
          return { id: d.id, name: d.name, priceDh: d.price_dh ?? 0, storeId: rest?.slug ?? '', storeName: rest?.name ?? '', emoji: rest?.emoji ?? null, imageUrl: d.image_url };
        })
        .filter((d) => d.storeId);
      return { stores, dishes };
    },
    trending: async (): Promise<string[]> => {
      // Real "trending in Ifrane" — the most-ordered dishes from food partners.
      const { data } = await supabase
        .from('menu_items')
        .select('name, popularity, restaurants(cuisine, cuisine_tags)')
        .eq('available', true)
        .order('popularity', { ascending: false })
        .limit(40);
      type Rest = { cuisine: string; cuisine_tags: string[] | null };
      const rows = (data ?? []) as Array<{ name: string; restaurants: Rest | Rest[] | null }>;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of rows) {
        const rest = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
        if (rest && deriveVertical(rest) !== 'food') continue;
        if (seen.has(row.name)) continue;
        seen.add(row.name);
        out.push(row.name);
        if (out.length >= 6) break;
      }
      return out.length ? out : ['Tagine', 'Pizza', 'Coffee', 'Pastries'];
    },
  },

  /* §5 server-priced cart quote */
  cart: {
    quote: async (input: { storeId: string; items: CartLine[]; addressId?: string; speed: 'standard' | 'priority'; tipDh: number }): Promise<Quote> => {
      const { data, error } = await supabase.rpc('cart_quote', {
        p_store_id: input.storeId,
        p_items: input.items,
        p_speed: input.speed,
        p_tip_dh: input.tipDh,
        p_address_id: input.addressId ?? null,
      });
      if (error) throw new Error(error.message);
      return data as Quote;
    },
  },

  /* §6–§7 orders & tracking */
  orders: {
    list: async (): Promise<{ active: Order[]; past: Order[] }> => {
      const uid = await sessionUserId();
      if (!uid) return { active: [], past: [] };
      const { data } = await supabase.from('orders').select('*').eq('customer_id', uid).order('created_at', { ascending: false }).limit(50);
      const orders = ((data ?? []) as OrderRow[]).map(orderRowToSpec);
      const ACTIVE = new Set<OrderStatus>(['placed', 'kitchen', 'pickup', 'enroute', 'arrived']);
      return { active: orders.filter((o) => ACTIVE.has(o.status)), past: orders.filter((o) => !ACTIVE.has(o.status)) };
    },
    get: async (id: string): Promise<Order | null> => {
      const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      return data ? orderRowToSpec(data as OrderRow) : null;
    },
    tracking: async (id: string): Promise<Tracking | null> => {
      const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      if (!o) return null;
      const order = o as OrderRow;
      const status = DB_TO_SPEC_STATUS[order.status] ?? 'placed';
      const [{ data: asg }, { data: weather }] = await Promise.all([
        supabase.from('order_assignments').select('rider_id').eq('order_id', id).eq('is_active', true).maybeSingle(),
        supabase.from('city_weather').select('eta_add_minutes').eq('city_id', order.city ?? 'ifrane').maybeSingle(),
      ]);
      let courier = { id: '', name: 'Courier', initials: 'C', rating: 5, vehicle: '', phone: '' };
      let riderCoords: [number, number] | null = null;
      if (asg?.rider_id) {
        const [{ data: rp }, { data: prof }, { data: locs }] = await Promise.all([
          supabase.from('riders').select('vehicle, rating').eq('user_id', asg.rider_id).maybeSingle(),
          supabase.from('profiles').select('display_name, phone').eq('id', asg.rider_id).maybeSingle(),
          supabase.from('rider_locations').select('coords').eq('rider_id', asg.rider_id).order('recorded_at', { ascending: false }).limit(1),
        ]);
        const nm = (prof?.display_name as string | null) ?? 'Courier';
        courier = {
          id: asg.rider_id, name: nm, initials: nm.charAt(0).toUpperCase() || 'C',
          rating: (rp?.rating as number) ?? 5, vehicle: (rp?.vehicle as string) ?? '', phone: (prof?.phone as string) ?? '',
        };
        const loc = ((locs ?? []) as { coords: { lat: number; lng: number } | null }[])[0];
        if (loc?.coords) riderCoords = [loc.coords.lat, loc.coords.lng];
      }
      const dest: [number, number] = order.coords ? [order.coords.lat, order.coords.lng] : [0, 0];
      const origin: [number, number] = riderCoords ?? dest;
      const stageDefs: { key: string; label: string; spec: OrderStatus }[] = [
        { key: 'placed', label: 'Order placed', spec: 'placed' },
        { key: 'kitchen', label: 'In the kitchen', spec: 'kitchen' },
        { key: 'pickup', label: 'Picked up', spec: 'pickup' },
        { key: 'enroute', label: 'On the way', spec: 'enroute' },
        { key: 'arrived', label: 'Arrived', spec: 'arrived' },
        { key: 'delivered', label: 'Delivered', spec: 'delivered' },
      ];
      const reached = STATUS_PROGRESS[status];
      return {
        status,
        etaMinutes: status === 'delivered' ? 0 : 18,
        weatherAdjustMinutes: (weather?.eta_add_minutes as number) ?? 0,
        progress: reached,
        courier,
        route: { origin, dest, path: '' },
        stages: stageDefs.map((s) => ({ key: s.key, label: s.label, time: '', sub: '', done: STATUS_PROGRESS[s.spec] <= reached })),
      };
    },
    reorder: async (id: string): Promise<{ cart: CartLine[] }> => {
      const { data } = await supabase.from('orders').select('items').eq('id', id).maybeSingle();
      const items = ((data?.items ?? []) as { id: string; qty: number }[]).map((i) => ({ itemId: i.id, qty: i.qty }));
      return { cart: items };
    },
    /** Subscribe to live tracking over Supabase Realtime (spec §7 uses raw WS). Returns an unsubscribe fn. */
    subscribe: (id: string, onUpdate: (t: Partial<Tracking>) => void): (() => void) => {
      const ch = supabase
        .channel(`order-live-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
          const next = payload.new as { status?: DbOrderStatus };
          if (next.status) {
            const status = DB_TO_SPEC_STATUS[next.status] ?? 'placed';
            onUpdate({ status, progress: STATUS_PROGRESS[status] });
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    },
    sendMessage: async (id: string, text: string): Promise<{ id: string }> => {
      const uid = await sessionUserId();
      const { data, error } = await supabase
        .from('order_messages')
        .insert({ order_id: id, sender_id: uid, sender_role: 'customer', kind: 'text', body: text })
        .select('id').maybeSingle();
      if (error) throw new Error(error.message);
      return { id: (data?.id as string) ?? '' };
    },
  },
};

export type AgApi = typeof agApi;

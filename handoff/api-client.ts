/**
 * AtlaasGo — typed API client (customer app)
 * Companion to "AtlaasGo API.md". Framework-agnostic fetch wrapper.
 * Field names match the prototype's window.AG.* mocks for a 1:1 swap.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.atlaasgo.com/v1';

let authToken: string | null = null;
export function setAuthToken(t: string | null) { authToken = t; }

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
const qs = (p: Record<string, unknown>) =>
  Object.entries(p).filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

/* ── types (see AtlaasGo API.md for full docs) ───────────────────────────── */
export type Lang = 'en' | 'fr' | 'ar';
export type Theme = 'light' | 'dark';
export type VerticalId = 'food' | 'grocery' | 'pharmacy';

export interface User { id: string; name: string; initials: string; campusId: string | null;
  memberSince: number; language: Lang; theme: Theme;
  stats: { orders: number; favourites: number; walletDh: number }; }
export interface City { id: string; name: string; campus: boolean; weather: boolean;
  defaultAddress: string; defaultAddressSub: string; }
export interface Weather { condition: string; tempC: number; etaAddMinutes: number; note: string; }
export interface Vertical { id: VerticalId; label: string; emoji: string; blurb: string; }
export interface Category { id: string; label: string; emoji: string; }
export interface Store { id: string; name: string; vertical: VerticalId; tags: string[];
  cuisineIds: string[]; rating: number; reviews: number; etaMinutes: [number, number];
  distanceKm: number; deliveryFeeDh: number; priceTier: 1 | 2 | 3; promo: string | null;
  blurb: string; heroImageUrl: string | null; isFavourite: boolean; }
export interface ItemOption { id: string; label: string; priceDh: number; }
export interface MenuItem { id: string; name: string; priceDh: number; description: string;
  imageUrl: string | null; tag: string | null; kcal?: number; packSize?: string;
  options?: ItemOption[]; rx?: boolean; }
export interface MenuSection { title: string; items: MenuItem[]; }
export interface Address { id: string; cityId: string; label: string; sub: string;
  building?: string; room?: string; floor?: string; dropNote?: string; isDefault: boolean; }
export interface CartLine { itemId: string; qty: number; optionIds?: string[]; }
export interface Quote { subtotalDh: number; deliveryFeeDh: number; priorityDh: number;
  weatherSurchargeDh: number; tipDh: number; totalDh: number; etaMinutes: [number, number]; }
export interface OrderInput { storeId: string; items: CartLine[]; addressId: string;
  handoff: 'door' | 'hand' | 'lounge'; speed: 'standard' | 'priority'; tipDh: number;
  paymentMethodId: string; groupOrderId?: string; }
export type OrderStatus = 'placed'|'kitchen'|'pickup'|'enroute'|'arrived'|'delivered';
export interface Order { id: string; store: Pick<Store,'id'|'name'|'heroImageUrl'>;
  items: { itemId: string; name: string; qty: number; priceDh: number }[];
  status: OrderStatus; totalDh: number; placedAt: string; address: Address; }
export interface Tracking { status: OrderStatus; etaMinutes: number; weatherAdjustMinutes: number;
  progress: number; courier: { id: string; name: string; initials: string; rating: number; vehicle: string; phone: string };
  route: { origin: [number, number]; dest: [number, number]; path: string };
  stages: { key: string; label: string; time: string; sub: string; done: boolean }[]; }

/* ── endpoints ───────────────────────────────────────────────────────────── */
export const api = {
  auth: {
    requestOtp: (phone: string) => req<{ sent: true }>(`/auth/otp/request`, { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone: string, code: string) => req<{ token: string; user: User }>(`/auth/otp/verify`, { method: 'POST', body: JSON.stringify({ phone, code }) }),
  },
  me: {
    get: () => req<User>(`/me`),
    update: (patch: Partial<User>) => req<User>(`/me`, { method: 'PATCH', body: JSON.stringify(patch) }),
    setLanguage: (language: Lang) => req<User>(`/me`, { method: 'PATCH', body: JSON.stringify({ language }) }),
    setTheme: (theme: Theme) => req<User>(`/me`, { method: 'PATCH', body: JSON.stringify({ theme }) }),
    address: () => req<{ city: City; address: Address }>(`/me/address`),
    setAddress: (cityId: string, addressId: string) => req<{ city: City; address: Address }>(`/me/address`, { method: 'PUT', body: JSON.stringify({ cityId, addressId }) }),
    addresses: () => req<Address[]>(`/me/addresses`),
    wallet: () => req<{ balanceDh: number; transactions: unknown[] }>(`/me/wallet`),
    paymentMethods: () => req<{ id: string; kind: string; label: string; last4?: string }[]>(`/me/payment-methods`),
    promos: () => req<{ id: string; label: string; active: boolean }[]>(`/me/promos`),
    favourites: () => req<Store[]>(`/me/favourites`),
    setFavourite: (storeId: string, on: boolean) => req<{ isFavourite: boolean }>(`/me/favourites/${storeId}`, { method: on ? 'PUT' : 'DELETE' }),
    notifications: () => req<unknown[]>(`/me/notifications`),
  },
  cities: {
    list: () => req<City[]>(`/cities`),
    get: (id: string) => req<City>(`/cities/${id}`),
    weather: (cityId: string) => req<Weather | null>(`/weather?${qs({ city: cityId })}`),
  },
  catalog: {
    verticals: () => req<Vertical[]>(`/verticals`),
    categories: (vertical: VerticalId = 'food') => req<Category[]>(`/categories?${qs({ vertical })}`),
    stores: (p: { city?: string; vertical?: VerticalId; category?: string; fast?: boolean; sort?: 'rating'|'eta'|'distance'; limit?: number; cursor?: string } = {}) =>
      req<Store[]>(`/stores?${qs(p)}`),
    store: (id: string) => req<Store>(`/stores/${id}`),
    menu: (id: string) => req<MenuSection[]>(`/stores/${id}/menu`),
    search: (q: string, city?: string) => req<{ stores: Store[]; items: MenuItem[] }>(`/search?${qs({ q, city })}`),
    trending: (city?: string) => req<string[]>(`/search/trending?${qs({ city })}`),
  },
  cart: {
    quote: (input: { storeId: string; items: CartLine[]; addressId: string; speed: 'standard'|'priority'; tipDh: number }) =>
      req<Quote>(`/cart/quote`, { method: 'POST', body: JSON.stringify(input) }),
  },
  orders: {
    create: (input: OrderInput) => req<Order>(`/orders`, { method: 'POST', body: JSON.stringify(input) }),
    list: () => req<{ active: Order[]; past: Order[] }>(`/orders`),
    get: (id: string) => req<Order>(`/orders/${id}`),
    reorder: (id: string) => req<{ cart: CartLine[] }>(`/orders/${id}/reorder`, { method: 'POST' }),
    tracking: (id: string) => req<Tracking>(`/orders/${id}/tracking`),
    /** Subscribe to live tracking. Returns an unsubscribe fn. */
    subscribe: (id: string, onUpdate: (t: Partial<Tracking>) => void): () => void => {
      const ws = new WebSocket(`${API_BASE.replace(/^http/, 'ws')}/orders/${id}/live`);
      ws.onmessage = (e) => {
        try { const m = JSON.parse(e.data); if (m.type === 'tracking.update') onUpdate(m.data); } catch {}
      };
      return () => ws.close();
    },
    sendMessage: (id: string, text: string) => req<{ id: string }>(`/orders/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  },
  groupOrders: {
    create: (storeId: string, addressId: string) => req<{ id: string; inviteCode: string }>(`/group-orders`, { method: 'POST', body: JSON.stringify({ storeId, addressId }) }),
    join: (code: string) => req<unknown>(`/group-orders/${code}/join`, { method: 'POST' }),
    get: (id: string) => req<unknown>(`/group-orders/${id}`),
  },
};

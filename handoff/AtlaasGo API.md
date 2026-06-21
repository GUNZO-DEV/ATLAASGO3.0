# AtlaasGo — Backend API reference (customer app)

> Companion to the **AtlaasGo Customer App** prototype (`AtlaasGo 3.0 App v2.html`).
> Every endpoint below maps 1:1 to data the prototype already renders, so the
> React screens can be migrated by swapping the in-memory `window.AG.*` mocks
> (in `app2/ag-data.jsx`) for these calls.

- **Base URL:** `https://api.atlaasgo.com/v1`
- **Auth:** `Authorization: Bearer <jwt>` on everything except `/auth/*` and public catalog reads.
- **Currency:** all money is **integer dirham (`dh`)** — no decimals, no minor units. `28` means `28 dh`.
- **IDs:** opaque strings (the prototype uses slugs like `amandine`, `mf`, `pharmacie`).
- **Realtime:** order tracking is delivered over WebSocket/SSE (see §7). Everything else is plain REST + JSON.
- **Backend note:** the production stack is Supabase (Postgres + Realtime + Auth). These REST shapes map cleanly onto PostgREST/RPC or an edge API; column names follow the JSON fields here.

---

## 0. Conventions

```jsonc
// Standard list envelope
{ "data": [ /* … */ ], "page": { "cursor": "…", "hasMore": false } }
// Standard error
{ "error": { "code": "not_found", "message": "Store not found" } }
```

Common query params: `?city=<cityId>` (defaults to the user's selected city), `?limit=`, `?cursor=`.

---

## 1. Auth & session

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/otp/request` | `{ phone }` | `{ sent: true }` |
| `POST` | `/auth/otp/verify` | `{ phone, code }` | `{ token, user }` |
| `POST` | `/auth/refresh` | `{ refreshToken }` | `{ token }` |
| `GET`  | `/me` | — | `User` |
| `PATCH`| `/me` | `Partial<User>` | `User` |

```ts
type User = {
  id: string;
  name: string;            // "Salma B."
  initials: string;        // "S"  → avatar
  campusId: string | null; // "aui" when an AUI student; gates dorm features
  memberSince: number;     // 2024
  language: 'en' | 'fr' | 'ar';   // Profile → Language switcher
  theme: 'light' | 'dark';        // Profile → Dark mode toggle
  stats: { orders: number; favourites: number; walletDh: number };
};
```

> **Prototype mapping:** `language` ⇄ `localStorage.ag_lang`; `theme` ⇄ the Tweaks/Profile toggle. Persist both on `PATCH /me` so they follow the account across devices.

---

## 2. Location & cities  *(drives the global vs. Ifrane gating)*

AtlaasGo is global. Two booleans on a city drive all the campus-only UI:
`campus` (dorm-precise drop, dorm group orders, AUI identity) and
`weather` (Atlas-pass snow strip, ETA surcharge).

| Method | Path | Returns |
|---|---|---|
| `GET` | `/cities` | `City[]` — picker list |
| `GET` | `/cities/:id` | `City` |
| `GET` | `/me/address` | currently-selected delivery target |
| `PUT` | `/me/address` | `{ cityId, addressId }` → set active city/address |
| `GET` | `/weather?city=ifrane` | `Weather \| null` (null when `city.weather === false`) |

```ts
type City = {
  id: string;            // "ifrane" | "casablanca" | "rabat" | "marrakech"
  name: string;
  campus: boolean;       // true only for Ifrane (AUI)
  weather: boolean;      // true only where Atlas-weather ETA applies
  defaultAddress: string;    // "Building 18 · Room 214"
  defaultAddressSub: string; // "AUI Campus · 2nd floor"
};

type Weather = {
  condition: string;     // "Light snow"
  tempC: number;         // -2
  etaAddMinutes: number; // +4  → shown on ETA + surcharge
  note: string;          // "Atlas pass slowed — couriers on winter tyres"
};
```

---

## 3. Catalog — verticals, categories, stores, menus

### 3.1 Taxonomy
| Method | Path | Returns |
|---|---|---|
| `GET` | `/verticals` | `Vertical[]` — Home "What do you need?" |
| `GET` | `/categories?vertical=food` | `Category[]` — cuisine chips (food only) |

```ts
type Vertical = { id: 'food'|'grocery'|'pharmacy'; label: string; emoji: string; blurb: string };
type Category = { id: string; label: string; emoji: string }; // tagine, cafe, pastry, grill, pizza
```

### 3.2 Stores
| Method | Path | Returns |
|---|---|---|
| `GET` | `/stores` | `Store[]` |
| `GET` | `/stores/:id` | `Store` |
| `GET` | `/stores/:id/menu` | `MenuSection[]` |

`GET /stores` query params:
`vertical=food|grocery|pharmacy` · `category=<id>` (food) · `city=<id>` ·
`fast=true` (eta ≤ 22 min, the "Fast near you" rail) · `sort=rating|eta|distance` · `limit` · `cursor`.

```ts
type Store = {
  id: string;
  name: string;                 // "Pâtisserie Amandine"
  vertical: 'food'|'grocery'|'pharmacy';
  tags: string[];               // ["pastry","café"]
  cuisineIds: string[];         // category ids (food)
  rating: number;               // 4.9
  reviews: number;              // 1240
  etaMinutes: [number, number]; // [18, 24]
  distanceKm: number;           // 0.4
  deliveryFeeDh: number;        // 0 = "Free"
  priceTier: 1|2|3;             // ·· / ···
  promo: string | null;         // "−20% before 11am"
  blurb: string;
  heroImageUrl: string | null;  // null → prototype falls back to emoji tile
  isFavourite: boolean;
};

type MenuSection = { title: string; items: MenuItem[] };

type MenuItem = {
  id: string;
  name: string;
  priceDh: number;
  description: string;
  imageUrl: string | null;
  tag: string | null;          // "best seller", "most ordered"
  // Exactly one of the following, by vertical:
  kcal?: number;               // FOOD → shows "410 kcal · made to order" + customisations
  packSize?: string;           // GROCERY/PHARMACY → "Box of 20 tablets", "1 L"
  options?: ItemOption[];      // FOOD customisations ("Make it yours")
  rx?: boolean;                // PHARMACY → show pharmacist-advice note
};

type ItemOption = { id: string; label: string; priceDh: number }; // 0 = "Free"
```

> **Vertical UI contract (already in the item sheet):** `kcal` → food customisation list; `rx` → "a licensed pharmacist is available in-app" note; otherwise (grocery) → "in stock, packed with care" note.

### 3.3 Search
| Method | Path | Returns |
|---|---|---|
| `GET` | `/search?q=&city=` | `{ stores: Store[]; items: MenuItem[] }` |
| `GET` | `/search/trending?city=` | `string[]` — trending chips |

---

## 4. Favourites · addresses · wallet · promos  *(Profile)*

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/favourites` | — | `Store[]` |
| `PUT` / `DELETE` | `/me/favourites/:storeId` | — | `{ isFavourite }` |
| `GET` | `/me/addresses` | — | `Address[]` |
| `POST` | `/me/addresses` | `AddressInput` | `Address` |
| `PATCH`/`DELETE` | `/me/addresses/:id` | … | `Address` |
| `GET` | `/me/wallet` | — | `{ balanceDh, transactions[] }` |
| `GET` | `/me/payment-methods` | — | `PaymentMethod[]` |
| `GET` | `/me/promos` | — | `Promo[]` |

```ts
type Address = {
  id: string;
  cityId: string;
  label: string;            // "Building 18 · Room 214"  /  "Rue Hassan II · Apt 4B"
  sub: string;              // "AUI Campus · 2nd floor"  /  "Maârif"
  // campus-only:
  building?: string; room?: string; floor?: string;
  dropNote?: string;        // "Leave at floor lounge"
  isDefault: boolean;
};
type PaymentMethod = { id: string; kind: 'wallet'|'card'; label: string; last4?: string };
type Promo = { id: string; label: string; active: boolean };
```

---

## 5. Cart quote  *(server-priced checkout)*

Keep the cart client-side; ask the server to **price** it (fees depend on city, speed, weather).

```
POST /cart/quote
```
```ts
// request
{
  storeId: string;
  items: { itemId: string; qty: number; optionIds?: string[] }[];
  addressId: string;
  speed: 'standard' | 'priority';
  tipDh: number;
}
// response  (mirrors the Bill summary card exactly)
{
  subtotalDh: number;
  deliveryFeeDh: number;       // 0 = "Free"
  priorityDh: number;          // 0 unless speed=priority (+9)
  weatherSurchargeDh: number;  // 0 unless city.weather (winter surcharge, 3)
  tipDh: number;
  totalDh: number;
  etaMinutes: [number, number];// [18,24] standard · [14,18] priority
}
```

---

## 6. Orders

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/orders` | `OrderInput` | `Order` (place order) |
| `GET` | `/orders` | — | `{ active: Order[]; past: Order[] }` |
| `GET` | `/orders/:id` | — | `Order` |
| `POST` | `/orders/:id/reorder` | — | `{ cart }` → prefilled cart |

```ts
type OrderInput = {
  storeId: string;
  items: { itemId: string; qty: number; optionIds?: string[] }[];
  addressId: string;
  handoff: 'door' | 'hand' | 'lounge';  // campus → "lounge"=Floor lounge; else "lounge"=Concierge
  speed: 'standard' | 'priority';
  tipDh: number;
  paymentMethodId: string;
  groupOrderId?: string;                // campus group orders
};

type Order = {
  id: string;                  // "AG-7K42"
  store: Pick<Store,'id'|'name'|'heroImageUrl'>;
  items: { itemId: string; name: string; qty: number; priceDh: number }[];
  status: 'placed'|'kitchen'|'pickup'|'enroute'|'arrived'|'delivered';
  totalDh: number;
  placedAt: string;            // ISO
  address: Address;
};
```

---

## 7. Live tracking  *(the signature screen)*

Initial fetch then subscribe for updates.

| Method | Path | Returns |
|---|---|---|
| `GET` | `/orders/:id/tracking` | `Tracking` (snapshot) |
| `WS`  | `/orders/:id/live` | streams `Tracking` deltas |

```ts
type Tracking = {
  status: Order['status'];
  etaMinutes: number;          // big gradient number
  weatherAdjustMinutes: number;// shown only when city.weather (snow note)
  progress: number;            // 0..1 along the route polyline
  courier: { id: string; name: string; initials: string; rating: number; vehicle: string; phone: string };
  route: { origin: [number,number]; dest: [number,number]; path: string }; // SVG/geo path
  stages: { key: string; label: string; time: string; sub: string; done: boolean }[];
};
```
- WS message: `{ type: 'tracking.update', data: Partial<Tracking> }`.
- Courier contact: `POST /orders/:id/messages` (chat) and the `courier.phone` (tel link).

---

## 8. Group orders  *(Ifrane / campus only — gate on `city.campus`)*

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/group-orders` | `{ storeId, addressId }` | `{ id, inviteCode }` |
| `POST` | `/group-orders/:code/join` | — | `GroupOrder` |
| `GET` | `/group-orders/:id` | — | `GroupOrder` |

```ts
type GroupOrder = {
  id: string; inviteCode: string; storeId: string; addressId: string;
  members: { userId: string; name: string; items: OrderInput['items'] }[];
  splitFeeDh: number;
};
```

---

## 9. Notifications
| Method | Path | Returns |
|---|---|---|
| `GET` | `/me/notifications` | `Notification[]` (drives the bell dot) |
| `POST` | `/me/notifications/read` | `{ ids: string[] }` |

---

## 10. Screen → endpoint map

| Screen (prototype file) | Endpoints |
|---|---|
| **Home** `screen-home2.jsx` | `/me`, `/me/address`, `/weather`, `/verticals`, `/categories`, `/stores?vertical&category`, `/stores?fast=true` |
| City picker `ag-app2.jsx` | `/cities`, `PUT /me/address` |
| **Search** `screen-tabs2.jsx` | `/search`, `/search/trending`, `/categories` |
| **Store + menu** `screen-restaurant2.jsx` | `/stores/:id`, `/stores/:id/menu`, `PUT /me/favourites/:id` |
| **Checkout** `screen-checkout2.jsx` | `/me/addresses`, `/me/payment-methods`, `POST /cart/quote`, `POST /orders` |
| **Tracking** `screen-tracking2.jsx` | `/orders/:id/tracking`, `WS /orders/:id/live`, `/orders/:id/messages` |
| **Orders** `screen-tabs2.jsx` | `/orders`, `/orders/:id/reorder` |
| **Profile** `screen-tabs2.jsx` | `/me`, `PATCH /me` (language, theme), `/me/wallet`, `/me/addresses`, `/me/favourites`, `/me/promos` |

---

## 11. Migration steps (suggested)

1. Drop in `api-client.ts` (companion file) and set `API_BASE` + the auth token.
2. Replace the static `window.AG` object in `app2/ag-data.jsx` with React Query / SWR hooks calling the client — keep the **same field names** so the JSX needs no changes beyond loading states.
3. Gate campus/weather UI on the `City.campus` / `City.weather` flags from `/cities` (already the prototype's contract).
4. Move pricing to `POST /cart/quote` so the Bill summary is server-authoritative.
5. Wire `/orders/:id/live` to the Tracking screen's `progress`/`etaMinutes` state.

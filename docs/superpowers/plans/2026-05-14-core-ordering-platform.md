# Core Ordering Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AtlaasGo into a full multi-restaurant ordering platform with discovery, menu browsing, collaborative group cart, checkout with scheduled delivery, and live order tracking.

**Architecture:** Firebase Firestore holds all data. CartContext wraps a real-time `onSnapshot` listener on a shared `carts/{cartId}` document — this powers group ordering. New Firestore collections: `restaurants` (with `categories` and `items` subcollections) and `carts`. Orders gain `restaurantId`, `items[]`, `subtotal`, `total`, `deliveryAddress`, `scheduledFor`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Firestore, Tailwind CSS v4, Framer Motion, Lucide React, react-hot-toast

---

## File Map

### Created
- `types/restaurant.ts` — Restaurant, MenuCategory, MenuItem interfaces
- `types/cart.ts` — Cart, CartItem interfaces
- `lib/restaurants.ts` — CUISINE_TYPES, filterByCuisine, getRestaurants, getRestaurant, getMenu
- `lib/cart.ts` — createCart, addCartItem, removeCartItem, updateCartItemQty, joinCart, checkoutCart, getCartSubtotal, getCartItemCount
- `contexts/CartContext.tsx` — CartProvider, useCart hook
- `components/RestaurantCard.tsx` — restaurant tile with cover, rating, ETA
- `components/CuisineFilterBar.tsx` — multi-select cuisine chips
- `components/RestaurantGrid.tsx` — responsive grid with skeletons
- `components/MenuCategoryNav.tsx` — sticky horizontal category tabs
- `components/MenuSection.tsx` — category heading + item list
- `components/MenuItem.tsx` — item card with Add button
- `components/CartSidebar.tsx` — desktop floating cart, mobile sticky bar
- `components/GroupOrderBanner.tsx` — participant avatars + invite link
- `components/AddressInput.tsx` — delivery address text input
- `components/OrderTimeline.tsx` — live vertical status steps
- `app/restaurants/page.tsx` — discovery page
- `app/restaurants/[id]/page.tsx` — menu page
- `app/checkout/page.tsx` — checkout page
- `app/orders/[id]/page.tsx` — order tracking page
- `scripts/seed-restaurants.ts` — seeds 2 restaurants with full menus
- `__tests__/restaurants.test.ts` — filterByCuisine + CUISINE_TYPES
- `__tests__/cart.test.ts` — getCartSubtotal, getCartItemCount

### Modified
- `firestore.rules` — add restaurants (public read) + carts (participant-only read/write)
- `app/layout.tsx` — wrap with CartProvider
- `app/page.tsx` — add "Browse Restaurants" CTA
- `types/order.ts` — extend Order with restaurantId, restaurantName, deliveryAddress, scheduledFor, subtotal, total, items (typed)

---

## Task 1: Types

**Files:**
- Create: `types/restaurant.ts`
- Create: `types/cart.ts`
- Modify: `types/order.ts`

- [ ] **Step 1: Create types/restaurant.ts**

```ts
// types/restaurant.ts
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  coverImage: string;
  logoImage: string;
  zone: string;
  isOpen: boolean;
  rating: number;
  reviewCount: number;
  deliveryFee: number;
  minOrder: number;
  estimatedDeliveryMins: number;
  address: string;
  coordinates: { lat: number; lng: number };
  tags: string[];
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  tags: string[];
  sortOrder: number;
}
```

- [ ] **Step 2: Create types/cart.ts**

```ts
// types/cart.ts
export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  addedBy: string; // Firebase Auth uid
  note?: string;
}

export interface Cart {
  id: string;
  restaurantId: string;
  restaurantName: string;
  ownerId: string;
  participants: string[];
  participantNames: Record<string, string>; // uid -> display name
  items: CartItem[];
  status: "active" | "checked_out";
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Extend types/order.ts**

Add these optional fields to the existing `Order` interface (after `deliveredAt`):

```ts
  // Multi-restaurant fields (present on orders placed via /restaurants flow)
  restaurantId?: string;
  restaurantName?: string;
  cartId?: string;
  deliveryAddress?: string;
  deliveryAddressNote?: string;
  orderNote?: string;
  scheduledFor?: string; // ISO timestamp; absent = ASAP
  subtotal?: number;
  total?: number;
```

Also update `OrderItem` to support the richer menu item shape. Replace the existing `OrderItem` interface:

```ts
export interface OrderItem {
  description?: string; // legacy field — kept for backward compat
  itemId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  note?: string;
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add types/restaurant.ts types/cart.ts types/order.ts && git commit -m "feat(types): add Restaurant, MenuCategory, MenuItem, Cart, CartItem types; extend Order"
```

---

## Task 2: lib/restaurants.ts + Tests

**Files:**
- Create: `lib/restaurants.ts`
- Create: `__tests__/restaurants.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/restaurants.test.ts
import { describe, it, expect } from "vitest";
import { filterByCuisine, CUISINE_TYPES } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";

const makeRestaurant = (cuisine: string[]): Restaurant => ({
  id: "r1", name: "Test", description: "", cuisine,
  coverImage: "", logoImage: "", zone: "ifrane", isOpen: true,
  rating: 4.0, reviewCount: 10, deliveryFee: 15, minOrder: 50,
  estimatedDeliveryMins: 30, address: "", coordinates: { lat: 0, lng: 0 },
  tags: [], createdAt: new Date().toISOString(),
});

describe("filterByCuisine", () => {
  it("returns all restaurants when no cuisines selected", () => {
    const list = [makeRestaurant(["moroccan"]), makeRestaurant(["italian"])];
    expect(filterByCuisine(list, [])).toHaveLength(2);
  });

  it("filters to matching cuisine", () => {
    const moroccan = makeRestaurant(["moroccan"]);
    const italian  = makeRestaurant(["italian"]);
    expect(filterByCuisine([moroccan, italian], ["moroccan"])).toEqual([moroccan]);
  });

  it("matches restaurants with multiple cuisines", () => {
    const multi = makeRestaurant(["moroccan", "healthy"]);
    expect(filterByCuisine([multi], ["healthy"])).toEqual([multi]);
  });

  it("returns empty when no match", () => {
    expect(filterByCuisine([makeRestaurant(["moroccan"])], ["italian"])).toHaveLength(0);
  });
});

describe("CUISINE_TYPES", () => {
  it("contains moroccan and italian", () => {
    expect(CUISINE_TYPES).toContain("moroccan");
    expect(CUISINE_TYPES).toContain("italian");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mbp/atlaasgo && npm test -- __tests__/restaurants.test.ts 2>&1 | tail -10
```

Expected: FAIL — `lib/restaurants` not found.

- [ ] **Step 3: Create lib/restaurants.ts**

```ts
// lib/restaurants.ts
import type { Restaurant, MenuCategory, MenuItem } from "@/types/restaurant";

export const CUISINE_TYPES = [
  "moroccan", "italian", "chinese", "fast-food", "healthy", "desserts", "other",
] as const;
export type CuisineType = (typeof CUISINE_TYPES)[number];

/** Pure filter — used by RestaurantGrid and tests. */
export function filterByCuisine(restaurants: Restaurant[], cuisines: string[]): Restaurant[] {
  if (cuisines.length === 0) return restaurants;
  return restaurants.filter((r) => r.cuisine.some((c) => cuisines.includes(c)));
}

export async function getRestaurants(zone: string): Promise<Restaurant[]> {
  const { collection, getDocs, query, where, orderBy } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDocs(
    query(collection(db, "restaurants"), where("zone", "==", zone), orderBy("rating", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Restaurant));
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDoc(doc(db, "restaurants", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Restaurant;
}

export async function getMenu(
  restaurantId: string
): Promise<{ category: MenuCategory; items: MenuItem[] }[]> {
  const { collection, getDocs, query, orderBy, where } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const catsSnap = await getDocs(
    query(
      collection(db, "restaurants", restaurantId, "categories"),
      orderBy("sortOrder")
    )
  );

  const result = await Promise.all(
    catsSnap.docs.map(async (catDoc) => {
      const category = { id: catDoc.id, ...catDoc.data() } as MenuCategory;
      const itemsSnap = await getDocs(
        query(
          collection(db, "restaurants", restaurantId, "categories", catDoc.id, "items"),
          where("available", "==", true),
          orderBy("sortOrder")
        )
      );
      const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
      return { category, items };
    })
  );

  return result;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd /Users/mbp/atlaasgo && npm test -- __tests__/restaurants.test.ts 2>&1 | tail -10
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/restaurants.ts __tests__/restaurants.test.ts && git commit -m "feat: add lib/restaurants with filterByCuisine, getRestaurants, getMenu"
```

---

## Task 3: lib/cart.ts + Tests

**Files:**
- Create: `lib/cart.ts`
- Create: `__tests__/cart.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/cart.test.ts
import { describe, it, expect } from "vitest";
import { getCartSubtotal, getCartItemCount } from "@/lib/cart";
import type { CartItem } from "@/types/cart";

const makeItem = (price: number, quantity: number): CartItem => ({
  itemId: "i1", name: "Item", price, quantity, addedBy: "uid1",
});

describe("getCartSubtotal", () => {
  it("returns 0 for empty cart", () => {
    expect(getCartSubtotal([])).toBe(0);
  });

  it("sums price × quantity for each item", () => {
    expect(getCartSubtotal([makeItem(30, 2), makeItem(20, 1)])).toBe(80);
  });
});

describe("getCartItemCount", () => {
  it("returns 0 for empty cart", () => {
    expect(getCartItemCount([])).toBe(0);
  });

  it("sums quantities", () => {
    expect(getCartItemCount([makeItem(10, 3), makeItem(10, 2)])).toBe(5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mbp/atlaasgo && npm test -- __tests__/cart.test.ts 2>&1 | tail -10
```

Expected: FAIL — `lib/cart` not found.

- [ ] **Step 3: Create lib/cart.ts**

```ts
// lib/cart.ts
import type { Cart, CartItem } from "@/types/cart";

// ─── Pure helpers (unit-testable) ─────────────────────────────────────────────

export function getCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// ─── Firestore helpers (lazy imports for testability) ─────────────────────────

export async function createCart(
  restaurantId: string,
  restaurantName: string,
  ownerId: string,
  ownerName: string
): Promise<string> {
  const { collection, addDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "carts"), {
    restaurantId,
    restaurantName,
    ownerId,
    participants: [ownerId],
    participantNames: { [ownerId]: ownerName },
    items: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function addCartItem(
  cartId: string,
  item: Omit<CartItem, "quantity"> & { quantity?: number }
): Promise<void> {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const cartRef = doc(db, "carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) throw new Error("Cart not found");
  const cart = snap.data() as Cart;

  const existingIdx = cart.items.findIndex(
    (i) => i.itemId === item.itemId && i.addedBy === item.addedBy
  );

  let updatedItems: CartItem[];
  if (existingIdx >= 0) {
    updatedItems = cart.items.map((i, idx) =>
      idx === existingIdx ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i
    );
  } else {
    updatedItems = [...cart.items, { ...item, quantity: item.quantity ?? 1 }];
  }

  await updateDoc(cartRef, { items: updatedItems, updatedAt: new Date().toISOString() });
}

export async function removeCartItem(
  cartId: string,
  itemId: string,
  addedBy: string
): Promise<void> {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const cartRef = doc(db, "carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) throw new Error("Cart not found");
  const cart = snap.data() as Cart;
  const updatedItems = cart.items.filter(
    (i) => !(i.itemId === itemId && i.addedBy === addedBy)
  );
  await updateDoc(cartRef, { items: updatedItems, updatedAt: new Date().toISOString() });
}

export async function updateCartItemQty(
  cartId: string,
  itemId: string,
  addedBy: string,
  qty: number
): Promise<void> {
  if (qty <= 0) return removeCartItem(cartId, itemId, addedBy);
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const cartRef = doc(db, "carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) throw new Error("Cart not found");
  const cart = snap.data() as Cart;
  const updatedItems = cart.items.map((i) =>
    i.itemId === itemId && i.addedBy === addedBy ? { ...i, quantity: qty } : i
  );
  await updateDoc(cartRef, { items: updatedItems, updatedAt: new Date().toISOString() });
}

export async function joinCart(cartId: string, uid: string, name: string): Promise<void> {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "carts", cartId), {
    participants: arrayUnion(uid),
    [`participantNames.${uid}`]: name,
    updatedAt: new Date().toISOString(),
  });
}

export async function checkoutCart(cartId: string): Promise<void> {
  const { doc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "carts", cartId), {
    status: "checked_out",
    updatedAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd /Users/mbp/atlaasgo && npm test -- __tests__/cart.test.ts 2>&1 | tail -10
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/cart.ts __tests__/cart.test.ts && git commit -m "feat: add lib/cart with CRUD helpers and pure subtotal/count utilities"
```

---

## Task 4: Firestore Rules — restaurants + carts

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add restaurants and carts rules**

Open `firestore.rules`. Inside the `match /databases/{database}/documents {` block, add these two new collection rules BEFORE the closing `}` of that block:

```
    match /restaurants/{restaurantId} {
      allow read: if true;
      allow write: if isAdmin();

      match /categories/{categoryId} {
        allow read: if true;
        allow write: if isAdmin();

        match /items/{itemId} {
          allow read: if true;
          allow write: if isAdmin();
        }
      }
    }

    match /carts/{cartId} {
      allow read: if isSignedIn() && (
        request.auth.uid == resource.data.ownerId ||
        request.auth.uid in resource.data.participants
      );
      allow create: if isSignedIn() &&
        request.auth.uid == request.resource.data.ownerId;
      allow update: if isSignedIn() && (
        request.auth.uid == resource.data.ownerId ||
        request.auth.uid in resource.data.participants
      );
      allow delete: if isAdmin();
    }
```

- [ ] **Step 2: Verify no syntax errors by checking structure**

```bash
grep -n "match /" /Users/mbp/atlaasgo/firestore.rules
```

Expected output includes lines for `/orders/`, `/users/`, `/driver_stats/`, `/zones/`, `/restaurants/`, `/carts/`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add firestore.rules && git commit -m "feat(rules): add public-read restaurants and participant-only carts rules"
```

---

## Task 5: Seed Script

**Files:**
- Create: `scripts/seed-restaurants.ts`

- [ ] **Step 1: Create scripts/seed-restaurants.ts**

```ts
// scripts/seed-restaurants.ts
// Run once: npx tsx scripts/seed-restaurants.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app =
  getApps().length === 0
    ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      })
    : getApps()[0];

const db = getFirestore(app);

const RESTAURANTS = [
  {
    name: "Al Karam",
    description: "Traditional Moroccan cuisine in the heart of Ifrane",
    cuisine: ["moroccan"],
    coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    logoImage: "",
    zone: "ifrane",
    isOpen: true,
    rating: 4.5,
    reviewCount: 124,
    deliveryFee: 15,
    minOrder: 40,
    estimatedDeliveryMins: 25,
    address: "Avenue Hassan II, Ifrane",
    coordinates: { lat: 33.5228, lng: -5.1128 },
    tags: ["popular", "top-rated"],
    createdAt: new Date().toISOString(),
    menu: [
      {
        category: { name: "Starters", sortOrder: 1 },
        items: [
          { name: "Harira Soup", description: "Traditional Moroccan tomato and lentil soup", price: 20, image: "", available: true, tags: ["vegetarian"], sortOrder: 1 },
          { name: "Zaalouk", description: "Grilled eggplant and tomato salad", price: 18, image: "", available: true, tags: ["vegetarian"], sortOrder: 2 },
        ],
      },
      {
        category: { name: "Mains", sortOrder: 2 },
        items: [
          { name: "Chicken Tagine", description: "Slow-cooked chicken with olives and preserved lemon", price: 75, image: "", available: true, tags: ["popular"], sortOrder: 1 },
          { name: "Lamb Couscous", description: "Slow-cooked lamb over fluffy couscous", price: 85, image: "", available: true, tags: [], sortOrder: 2 },
          { name: "Kefta Plate", description: "Spiced minced meat skewers with fries and salad", price: 55, image: "", available: true, tags: ["popular"], sortOrder: 3 },
        ],
      },
      {
        category: { name: "Drinks", sortOrder: 3 },
        items: [
          { name: "Mint Tea", description: "Moroccan sweet mint tea", price: 10, image: "", available: true, tags: [], sortOrder: 1 },
          { name: "Fresh Orange Juice", description: "Squeezed to order", price: 15, image: "", available: true, tags: [], sortOrder: 2 },
        ],
      },
    ],
  },
  {
    name: "Campus Burger",
    description: "Burgers, wraps and loaded fries — AUI student favourite",
    cuisine: ["fast-food"],
    coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    logoImage: "",
    zone: "ifrane",
    isOpen: true,
    rating: 4.2,
    reviewCount: 87,
    deliveryFee: 10,
    minOrder: 30,
    estimatedDeliveryMins: 20,
    address: "Near AUI Main Gate, Ifrane",
    coordinates: { lat: 33.521, lng: -5.1098 },
    tags: ["new"],
    createdAt: new Date().toISOString(),
    menu: [
      {
        category: { name: "Burgers", sortOrder: 1 },
        items: [
          { name: "Classic Burger", description: "Beef patty, cheddar, lettuce, tomato, pickles", price: 45, image: "", available: true, tags: ["popular"], sortOrder: 1 },
          { name: "Crispy Chicken Burger", description: "Fried chicken fillet, coleslaw, spicy mayo", price: 40, image: "", available: true, tags: [], sortOrder: 2 },
          { name: "Double Smash", description: "Two smashed beef patties, special sauce, caramelised onions", price: 60, image: "", available: true, tags: ["popular"], sortOrder: 3 },
        ],
      },
      {
        category: { name: "Sides", sortOrder: 2 },
        items: [
          { name: "Loaded Fries", description: "Crispy fries with cheese sauce and jalapeños", price: 25, image: "", available: true, tags: [], sortOrder: 1 },
          { name: "Onion Rings", description: "Beer-battered onion rings, 8 pcs", price: 20, image: "", available: true, tags: [], sortOrder: 2 },
        ],
      },
      {
        category: { name: "Drinks", sortOrder: 3 },
        items: [
          { name: "Soft Drink", description: "Coca-Cola, Sprite, or Fanta", price: 10, image: "", available: true, tags: [], sortOrder: 1 },
          { name: "Milkshake", description: "Vanilla, chocolate, or strawberry", price: 28, image: "", available: true, tags: ["popular"], sortOrder: 2 },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding restaurants...");
  for (const r of RESTAURANTS) {
    const { menu, ...restaurantData } = r;
    const restaurantRef = await addDoc(collection(db, "restaurants"), restaurantData);
    console.log(`✓ ${restaurantData.name} (${restaurantRef.id})`);
    for (const { category, items } of menu) {
      const catRef = await addDoc(
        collection(db, "restaurants", restaurantRef.id, "categories"),
        category
      );
      for (const item of items) {
        await addDoc(
          collection(db, "restaurants", restaurantRef.id, "categories", catRef.id, "items"),
          item
        );
      }
      console.log(`  ✓ ${category.name} (${items.length} items)`);
    }
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add scripts/seed-restaurants.ts && git commit -m "feat: add restaurant seed script (Al Karam + Campus Burger)"
```

- [ ] **Step 3: Run seed (optional — only if Firebase project is reachable)**

```bash
npx tsx scripts/seed-restaurants.ts
```

Expected:
```
Seeding restaurants...
✓ Al Karam (abc123)
  ✓ Starters (2 items)
  ✓ Mains (3 items)
  ✓ Drinks (2 items)
✓ Campus Burger (def456)
  ...
Done!
```

---

## Task 6: CartContext

**Files:**
- Create: `contexts/CartContext.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create contexts/CartContext.tsx**

```tsx
// contexts/CartContext.tsx
"use client";

import {
  createContext, useCallback, useContext, useEffect, useState,
} from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  createCart, addCartItem, removeCartItem, updateCartItemQty,
  joinCart, checkoutCart, getCartSubtotal, getCartItemCount,
} from "@/lib/cart";
import type { Cart, CartItem } from "@/types/cart";

const CART_KEY = "atlaasgo_cart_id";

interface CartContextValue {
  cart: Cart | null;
  cartId: string | null;
  subtotal: number;
  itemCount: number;
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: Omit<CartItem, "quantity" | "addedBy">
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  clearCart: () => void;
  shareGroupOrderLink: () => string;
  checkOut: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart]     = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore cartId from localStorage or ?cart= URL param on mount
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const urlCartId = params.get("cart");
    const stored    = localStorage.getItem(CART_KEY);
    const id        = urlCartId ?? stored;
    if (id) {
      if (urlCartId) localStorage.setItem(CART_KEY, urlCartId);
      setCartId(id);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Real-time listener on the cart doc
  useEffect(() => {
    if (!cartId) return;
    const unsub = onSnapshot(doc(db, "carts", cartId), (snap) => {
      if (!snap.exists()) { clearCart(); return; }
      const data = { id: snap.id, ...snap.data() } as Cart;
      if (data.status === "checked_out") { clearCart(); return; }
      setCart(data);
      setIsLoading(false);

      // Auto-join if current user isn't yet a participant
      const uid  = auth.currentUser?.uid;
      const name = auth.currentUser?.displayName ?? "Guest";
      if (uid && !data.participants.includes(uid)) {
        joinCart(cartId, uid, name);
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_KEY);
    setCartId(null);
    setCart(null);
    setIsLoading(false);
  }, []);

  const addItem = useCallback(
    async (
      restaurantId: string,
      restaurantName: string,
      item: Omit<CartItem, "quantity" | "addedBy">
    ) => {
      const uid  = auth.currentUser?.uid;
      const name = auth.currentUser?.displayName ?? "Guest";
      if (!uid) throw new Error("Must be signed in to add items");

      let id = cartId;
      if (!id) {
        id = await createCart(restaurantId, restaurantName, uid, name);
        localStorage.setItem(CART_KEY, id);
        setCartId(id);
      }
      await addCartItem(id, { ...item, addedBy: uid });
    },
    [cartId]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!cartId) return;
      const uid = auth.currentUser?.uid ?? "";
      await removeCartItem(cartId, itemId, uid);
    },
    [cartId]
  );

  const updateQty = useCallback(
    async (itemId: string, qty: number) => {
      if (!cartId) return;
      const uid = auth.currentUser?.uid ?? "";
      await updateCartItemQty(cartId, itemId, uid, qty);
    },
    [cartId]
  );

  const shareGroupOrderLink = useCallback((): string => {
    if (!cartId || !cart) return "";
    return `${window.location.origin}/restaurants/${cart.restaurantId}?cart=${cartId}`;
  }, [cartId, cart]);

  const checkOut = useCallback(async () => {
    if (!cartId) return;
    await checkoutCart(cartId);
    clearCart();
  }, [cartId, clearCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartId,
        subtotal:  cart ? getCartSubtotal(cart.items)  : 0,
        itemCount: cart ? getCartItemCount(cart.items) : 0,
        addItem, removeItem, updateQty, clearCart,
        shareGroupOrderLink, checkOut, isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap layout with CartProvider**

Open `app/layout.tsx`. Add this import after the existing imports:

```tsx
import { CartProvider } from "@/contexts/CartContext";
```

Then wrap `{children}` inside `<CartProvider>`. The `<ErrorBoundary>` line becomes:

```tsx
<ErrorBoundary><CartProvider>{children}</CartProvider></ErrorBoundary>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add contexts/CartContext.tsx app/layout.tsx && git commit -m "feat: add CartContext with real-time Firestore cart + group order support"
```

---

## Task 7: Restaurant Discovery Components

**Files:**
- Create: `components/RestaurantCard.tsx`
- Create: `components/CuisineFilterBar.tsx`
- Create: `components/RestaurantGrid.tsx`

- [ ] **Step 1: Create components/RestaurantCard.tsx**

```tsx
// components/RestaurantCard.tsx
"use client";

import Link from "next/link";
import { Star, Clock, ShoppingBag } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Cover */}
      <div className="relative h-36 bg-gray-100">
        {restaurant.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-orange-300" />
          </div>
        )}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-xs bg-black/60 px-3 py-1 rounded-full">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{restaurant.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {restaurant.rating.toFixed(1)}
          </span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {restaurant.estimatedDeliveryMins} min
          </span>
          <span>·</span>
          <span>
            {restaurant.deliveryFee === 0 ? "Free delivery" : `${restaurant.deliveryFee} MAD`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {restaurant.cuisine.slice(0, 2).map((c) => (
            <span
              key={c}
              className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full capitalize"
            >
              {c.replace("-", " ")}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create components/CuisineFilterBar.tsx**

```tsx
// components/CuisineFilterBar.tsx
"use client";

import { CUISINE_TYPES } from "@/lib/restaurants";

interface Props {
  selected: string[];
  onChange: (cuisines: string[]) => void;
}

export default function CuisineFilterBar({ selected, onChange }: Props) {
  const toggle = (cuisine: string) =>
    onChange(
      selected.includes(cuisine)
        ? selected.filter((c) => c !== cuisine)
        : [...selected, cuisine]
    );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onChange([])}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
          selected.length === 0
            ? "bg-[#E05A23] text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {CUISINE_TYPES.map((cuisine) => (
        <button
          key={cuisine}
          onClick={() => toggle(cuisine)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors cursor-pointer ${
            selected.includes(cuisine)
              ? "bg-[#E05A23] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cuisine.replace("-", " ")}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create components/RestaurantGrid.tsx**

```tsx
// components/RestaurantGrid.tsx
"use client";

import RestaurantCard from "@/components/RestaurantCard";
import { filterByCuisine } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

interface Props {
  restaurants: Restaurant[];
  selectedCuisines: string[];
  loading?: boolean;
}

export default function RestaurantGrid({ restaurants, selectedCuisines, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const filtered = filterByCuisine(restaurants, selectedCuisines);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No restaurants found</p>
        <p className="text-sm mt-1">Try a different cuisine filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/RestaurantCard.tsx components/CuisineFilterBar.tsx components/RestaurantGrid.tsx && git commit -m "feat: add RestaurantCard, CuisineFilterBar, RestaurantGrid components"
```

---

## Task 8: /restaurants Discovery Page

**Files:**
- Create: `app/restaurants/page.tsx`

- [ ] **Step 1: Create app/restaurants/page.tsx**

```tsx
// app/restaurants/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRestaurants } from "@/lib/restaurants";
import CuisineFilterBar from "@/components/CuisineFilterBar";
import RestaurantGrid from "@/components/RestaurantGrid";
import FloatingNavbar from "@/components/FloatingNavbar";
import type { Restaurant } from "@/types/restaurant";

export default function RestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants]         = useState<Restaurant[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [zone, setZone]                       = useState("ifrane");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    setLoading(true);
    getRestaurants(zone)
      .then(setRestaurants)
      .finally(() => setLoading(false));
  }, [zone]);

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Restaurants near you</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Delivering to{" "}
          <button
            onClick={() => setZone(zone === "ifrane" ? "oujda" : "ifrane")}
            className="font-medium text-[#E05A23] underline cursor-pointer capitalize"
          >
            {zone}
          </button>
        </p>
        <div className="mb-6">
          <CuisineFilterBar selected={selectedCuisines} onChange={setSelectedCuisines} />
        </div>
        <RestaurantGrid
          restaurants={restaurants}
          selectedCuisines={selectedCuisines}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/restaurants/page.tsx && git commit -m "feat: add /restaurants discovery page with cuisine filters"
```

---

## Task 9: Menu Page Components

**Files:**
- Create: `components/MenuCategoryNav.tsx`
- Create: `components/MenuSection.tsx`
- Create: `components/MenuItem.tsx`
- Create: `components/GroupOrderBanner.tsx`
- Create: `components/CartSidebar.tsx`

- [ ] **Step 1: Create components/MenuCategoryNav.tsx**

```tsx
// components/MenuCategoryNav.tsx
"use client";

import { useRef, useEffect } from "react";
import type { MenuCategory } from "@/types/restaurant";

interface Props {
  categories: MenuCategory[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function MenuCategoryNav({ categories, activeCategory, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector(
      `[data-cat="${activeCategory}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCategory]);

  return (
    <div ref={ref} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          data-cat={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeCategory === cat.id
              ? "bg-[#E05A23] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create components/MenuItem.tsx**

```tsx
// components/MenuItem.tsx
"use client";

import { Plus } from "lucide-react";
import type { MenuItem as MenuItemType } from "@/types/restaurant";

interface Props {
  item: MenuItemType;
  onAdd: (item: MenuItemType) => void;
}

export default function MenuItem({ item, onAdd }: Props) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl hover:shadow-sm transition-shadow">
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          className="w-20 h-20 shrink-0 rounded-lg object-cover bg-gray-100"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold text-gray-900 text-sm">{item.price} MAD</span>
          <button
            onClick={() => onAdd(item)}
            className="flex items-center gap-1 bg-[#E05A23] text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-orange-600 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create components/MenuSection.tsx**

```tsx
// components/MenuSection.tsx
"use client";

import MenuItem from "@/components/MenuItem";
import type { MenuCategory, MenuItem as MenuItemType } from "@/types/restaurant";

interface Props {
  category: MenuCategory;
  items: MenuItemType[];
  onAdd: (item: MenuItemType) => void;
}

export default function MenuSection({ category, items, onAdd }: Props) {
  if (items.length === 0) return null;
  return (
    <section id={`cat-${category.id}`} className="scroll-mt-32">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{category.name}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <MenuItem key={item.id} item={item} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create components/GroupOrderBanner.tsx**

```tsx
// components/GroupOrderBanner.tsx
"use client";

import { Users, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  shareLink: string;
  participants: Record<string, string>;
}

export default function GroupOrderBanner({ shareLink, participants }: Props) {
  const names = Object.values(participants);

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Group order link copied!");
  };

  return (
    <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#E05A23]" />
          <span className="text-xs font-medium text-gray-700">
            {names.length === 1
              ? "Just you"
              : `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`}
          </span>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 text-xs text-[#E05A23] font-medium hover:underline cursor-pointer"
        >
          <Copy className="w-3 h-3" />
          Invite
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create components/CartSidebar.tsx**

```tsx
// components/CartSidebar.tsx
"use client";

import Link from "next/link";
import { ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import GroupOrderBanner from "@/components/GroupOrderBanner";

export default function CartSidebar() {
  const { cart, subtotal, itemCount, removeItem, updateQty, shareGroupOrderLink } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-2xl shadow-sm p-6">
        <ShoppingBag className="w-8 h-8 mb-2" />
        <p className="text-sm font-medium">Your cart is empty</p>
        <p className="text-xs mt-1">Add items from the menu</p>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden max-h-[80vh]">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Your order</h3>
        <p className="text-xs text-gray-400 mt-0.5">{cart.restaurantName}</p>
      </div>

      <GroupOrderBanner
        shareLink={shareGroupOrderLink()}
        participants={cart.participantNames}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.items.map((item, idx) => (
          <div key={`${item.itemId}-${item.addedBy}-${idx}`} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-400">{item.price} MAD</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQty(item.itemId, item.quantity - 1)}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <Minus className="w-3 h-3 text-gray-600" />
              </button>
              <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.itemId, item.quantity + 1)}
                className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center hover:bg-orange-100 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#E05A23]" />
              </button>
              <button
                onClick={() => removeItem(item.itemId)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 cursor-pointer ml-0.5"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-500">Subtotal ({itemCount} items)</span>
          <span className="font-semibold text-gray-900">{subtotal} MAD</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full bg-[#E05A23] text-white text-center py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/MenuCategoryNav.tsx components/MenuSection.tsx components/MenuItem.tsx components/GroupOrderBanner.tsx components/CartSidebar.tsx && git commit -m "feat: add menu page components (CategoryNav, MenuSection, MenuItem, CartSidebar, GroupOrderBanner)"
```

---

## Task 10: /restaurants/[id] Menu Page

**Files:**
- Create: `app/restaurants/[id]/page.tsx`

- [ ] **Step 1: Create app/restaurants/[id]/page.tsx**

```tsx
// app/restaurants/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Clock, ChevronLeft } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRestaurant, getMenu } from "@/lib/restaurants";
import MenuCategoryNav from "@/components/MenuCategoryNav";
import MenuSection from "@/components/MenuSection";
import CartSidebar from "@/components/CartSidebar";
import { useCart } from "@/contexts/CartContext";
import toast from "react-hot-toast";
import type { Restaurant, MenuCategory, MenuItem } from "@/types/restaurant";
import type { CartItem } from "@/types/cart";

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu]             = useState<{ category: MenuCategory; items: MenuItem[] }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Clear-cart confirmation modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingItem, setPendingItem]       = useState<{
    restaurantId: string;
    restaurantName: string;
    item: Omit<CartItem, "quantity" | "addedBy">;
  } | null>(null);

  const { addItem, cart, clearCart } = useCart();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    Promise.all([getRestaurant(id), getMenu(id)]).then(([r, m]) => {
      setRestaurant(r);
      setMenu(m);
      if (m.length > 0) setActiveCategory(m[0].category.id);
      setLoading(false);
    });
  }, [id]);

  const handleAdd = async (item: MenuItem) => {
    if (!restaurant) return;
    const cartItem = { itemId: item.id, name: item.name, price: item.price };

    if (cart && cart.restaurantId !== restaurant.id) {
      setPendingItem({ restaurantId: restaurant.id, restaurantName: restaurant.name, item: cartItem });
      setShowClearModal(true);
      return;
    }

    try {
      await addItem(restaurant.id, restaurant.name, cartItem);
      toast.success(`${item.name} added`);
    } catch {
      toast.error("Failed to add item");
    }
  };

  const confirmClear = async () => {
    if (!pendingItem) return;
    clearCart();
    setShowClearModal(false);
    setTimeout(async () => {
      try {
        await addItem(pendingItem.restaurantId, pendingItem.restaurantName, pendingItem.item);
        toast.success("Item added");
      } catch {
        toast.error("Failed to add item");
      }
      setPendingItem(null);
    }, 150);
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E05A23] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Hero */}
      <div className="relative h-52 bg-gray-200">
        {restaurant.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link
          href="/restaurants"
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {restaurant.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {restaurant.estimatedDeliveryMins} min
            </span>
            <span>
              {restaurant.deliveryFee === 0
                ? "Free delivery"
                : `${restaurant.deliveryFee} MAD delivery`}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky category nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <MenuCategoryNav
          categories={menu.map((m) => m.category)}
          activeCategory={activeCategory}
          onSelect={(catId) => {
            setActiveCategory(catId);
            document
              .getElementById(`cat-${catId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>

      {/* Main content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
        <div className="space-y-10">
          {menu.map(({ category, items }) => (
            <MenuSection
              key={category.id}
              category={category}
              items={items}
              onAdd={handleAdd}
            />
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <CartSidebar />
          </div>
        </div>
      </div>

      {/* Mobile sticky cart bar */}
      {cart && cart.items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-30">
          <Link
            href="/checkout"
            className="flex items-center justify-between bg-[#E05A23] text-white px-4 py-3 rounded-xl font-semibold text-sm"
          >
            <span className="bg-orange-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cart.items.reduce((s, i) => s + i.quantity, 0)}
            </span>
            <span>View cart</span>
            <span>{cart.items.reduce((s, i) => s + i.price * i.quantity, 0)} MAD</span>
          </Link>
        </div>
      )}

      {/* Clear cart modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Start a new cart?</h3>
            <p className="text-sm text-gray-500 mb-5">
              You have items from <strong>{cart?.restaurantName}</strong>. Clear your cart to order
              from <strong>{pendingItem?.restaurantName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 py-2.5 bg-[#E05A23] text-white rounded-xl text-sm font-medium hover:bg-orange-600 cursor-pointer"
              >
                Clear & add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/restaurants/[id]/page.tsx && git commit -m "feat: add /restaurants/[id] menu page with sticky nav, add-to-cart, group order, mobile cart bar"
```

---

## Task 11: AddressInput Component + /checkout Page

**Files:**
- Create: `components/AddressInput.tsx`
- Create: `app/checkout/page.tsx`

- [ ] **Step 1: Create components/AddressInput.tsx**

```tsx
// components/AddressInput.tsx
"use client";

import { MapPin } from "lucide-react";

interface Props {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

export default function AddressInput({
  value,
  onChange,
  placeholder = "Enter delivery address",
}: Props) {
  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23] focus:border-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create app/checkout/page.tsx**

```tsx
// app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Calendar } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useCart } from "@/contexts/CartContext";
import AddressInput from "@/components/AddressInput";
import { calculateSurgeFee } from "@/lib/pricing";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, checkOut } = useCart();

  const [userId, setUserId]           = useState<string | null>(null);
  const [address, setAddress]         = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [orderNote, setOrderNote]     = useState("");
  const [scheduleMode, setScheduleMode] = useState<"asap" | "scheduled">("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(15);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUserId(user.uid);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!cart) { router.push("/restaurants"); return; }
    async function fetchFee() {
      const zone = "ifrane"; // Uses first zone — extend when restaurants have zone field
      const [pendingSnap, driversSnap] = await Promise.all([
        getDocs(query(collection(db, "orders"), where("status", "==", "pending"), where("zone", "==", zone))),
        getDocs(query(collection(db, "users"), where("role", "==", "driver"), where("isOnline", "==", true), where("zone", "==", zone))),
      ]);
      setDeliveryFee(calculateSurgeFee(zone, pendingSnap.size, driversSnap.size));
    }
    fetchFee();
  }, [cart, router]);

  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !userId) return;
    if (!address.trim()) { toast.error("Please enter your delivery address"); return; }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const orderRef = await addDoc(collection(db, "orders"), {
        customerId:        userId,
        restaurantId:      cart.restaurantId,
        restaurantName:    cart.restaurantName,
        cartId:            cart.id,
        items:             cart.items.map((i) => ({
          itemId: i.itemId, name: i.name, price: i.price,
          quantity: i.quantity, note: i.note ?? null,
        })),
        deliveryAddress:     address.trim(),
        deliveryAddressNote: addressNote.trim() || null,
        orderNote:           orderNote.trim() || null,
        scheduledFor:
          scheduleMode === "scheduled" && scheduledFor ? scheduledFor : null,
        status:        "pending",
        zone:          "ifrane",
        subtotal,
        fee:           deliveryFee,
        total,
        statusHistory: [{ status: "pending", timestamp: now, actorId: userId }],
        timestamp:     now,
      });

      await checkOut();
      toast.success("Order placed!");
      router.push(`/orders/${orderRef.id}`);
    } catch {
      toast.error("Failed to place order. Try again.");
      setLoading(false);
    }
  };

  if (!cart) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/restaurants/${cart.restaurantId}`}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Order from {cart.restaurantName}
            </h2>
            <div className="space-y-1.5">
              {cart.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {item.price * item.quantity} MAD
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm">Delivery address</h2>
            <AddressInput
              value={address}
              onChange={setAddress}
              placeholder="Street, building, dorm..."
            />
            <input
              type="text"
              value={addressNote}
              onChange={(e) => setAddressNote(e.target.value)}
              placeholder="Apartment, floor, landmark (optional)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
            />
          </div>

          {/* Delivery time */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Delivery time</h2>
            <div className="flex gap-2">
              {(["asap", "scheduled"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScheduleMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                    scheduleMode === mode
                      ? "border-[#E05A23] bg-orange-50 text-[#E05A23]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {mode === "asap" ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  {mode === "asap" ? "ASAP" : "Schedule"}
                </button>
              ))}
            </div>
            {scheduleMode === "scheduled" && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                required
                className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
              />
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Order notes (optional)
            </h2>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Any special requests..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23] resize-none"
            />
          </div>

          {/* Fee breakdown */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{subtotal} MAD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="text-gray-900">{deliveryFee} MAD</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{total} MAD</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#E05A23] text-white rounded-2xl font-bold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Placing order..." : `Place order · ${total} MAD`}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/AddressInput.tsx app/checkout/page.tsx && git commit -m "feat: add AddressInput component and /checkout page with scheduled delivery"
```

---

## Task 12: OrderTimeline + /orders/[id] Tracking Page

**Files:**
- Create: `components/OrderTimeline.tsx`
- Create: `app/orders/[id]/page.tsx`

- [ ] **Step 1: Create components/OrderTimeline.tsx**

```tsx
// components/OrderTimeline.tsx
"use client";

import { Check, Clock, Truck, Home, X } from "lucide-react";
import type { OrderStatus, StatusHistoryEntry } from "@/types/order";

const STEPS: { status: OrderStatus; label: string; Icon: React.ElementType }[] = [
  { status: "pending",   label: "Order placed",      Icon: Clock },
  { status: "accepted",  label: "Driver on the way",  Icon: Check },
  { status: "picked_up", label: "Order picked up",    Icon: Truck },
  { status: "delivered", label: "Delivered",          Icon: Home  },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "accepted", "picked_up", "delivered"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-MA", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
}

export default function OrderTimeline({ status, statusHistory = [] }: Props) {
  if (status === "cancelled" || status === "expired") {
    return (
      <div className="flex items-center gap-3 py-4 px-5 bg-red-50 rounded-2xl">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <X className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-red-700 capitalize">Order {status}</p>
          <p className="text-xs text-red-400 mt-0.5">This order is no longer active</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="relative">
      {STEPS.map(({ status: stepStatus, label, Icon }, idx) => {
        const isDone   = idx <= currentIdx;
        const isActive = idx === currentIdx;
        const entry    = statusHistory.find((h) => h.status === stepStatus);

        return (
          <div key={stepStatus} className="flex items-start gap-4 pb-6 relative">
            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={`absolute left-4 top-8 w-0.5 h-full -translate-x-1/2 ${
                  isDone && idx < currentIdx ? "bg-[#E05A23]" : "bg-gray-200"
                }`}
              />
            )}
            {/* Step icon */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                isActive
                  ? "bg-[#E05A23] text-white shadow-lg shadow-orange-200 animate-pulse"
                  : isDone
                  ? "bg-[#E05A23] text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            {/* Step label */}
            <div className="flex-1 pt-1">
              <p className={`text-sm font-medium ${isDone ? "text-gray-900" : "text-gray-400"}`}>
                {label}
              </p>
              {entry && (
                <p className="text-xs text-gray-400 mt-0.5">{formatTime(entry.timestamp)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create app/orders/[id]/page.tsx**

```tsx
// app/orders/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { onSnapshot, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import OrderTimeline from "@/components/OrderTimeline";
import type { Order, OrderItem } from "@/types/order";

interface RichOrder extends Order {
  restaurantName?: string;
  deliveryAddress?: string;
  items?: (OrderItem & { quantity?: number; price?: number })[];
  total?: number;
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [order, setOrder]   = useState<RichOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      setOrder({ id: snap.id, ...snap.data() } as RichOrder);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E05A23] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Order not found</p>
        <Link href="/restaurants" className="text-[#E05A23] text-sm font-medium">
          Browse restaurants
        </Link>
      </div>
    );
  }

  const isLive = ["pending", "accepted", "picked_up"].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order tracking</h1>
            {order.restaurantName && (
              <p className="text-xs text-gray-400 mt-0.5">{order.restaurantName}</p>
            )}
          </div>
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live tracking active
          </div>
        )}

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 text-sm">
            <p className="text-xs text-gray-400 mb-1">Delivering to</p>
            <p className="font-medium text-gray-800">{order.deliveryAddress}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <OrderTimeline status={order.status} statusHistory={order.statusHistory} />
        </div>

        {/* Order items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Your order</h2>
            <div className="space-y-1.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity ?? 1}× {item.name ?? item.description}
                  </span>
                  {item.price != null && (
                    <span className="text-gray-900">
                      {(item.price * (item.quantity ?? 1))} MAD
                    </span>
                  )}
                </div>
              ))}
              {order.total != null && (
                <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2 mt-1">
                  <span>Total</span>
                  <span>{order.total} MAD</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Re-order CTA */}
        {order.status === "delivered" && (
          <Link
            href="/restaurants"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E05A23] text-white rounded-2xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Order again
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/OrderTimeline.tsx app/orders/[id]/page.tsx && git commit -m "feat: add OrderTimeline component and /orders/[id] live tracking page"
```

---

## Task 13: Update Landing Page + Customer Dashboard

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add "Browse Restaurants" CTA to landing page**

Open `app/page.tsx`. Find the hero CTA buttons section (contains "Order Now" button). Add a new primary button linking to `/restaurants` right before or as the first button:

Find this block (the CTA buttons, which includes a Link to `/register`):
```tsx
<Link href="/register"
```

Add a new CTA button before it (or replace the first CTA):
```tsx
<Link
  href="/restaurants"
  className="inline-flex items-center gap-2 bg-[#E05A23] text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
>
  Browse Restaurants
</Link>
```

- [ ] **Step 2: Add active order + restaurant row to dashboard**

Open `app/dashboard/page.tsx`. Find where `OrderHistory` is rendered. Add this block ABOVE the `OrderHistory` component:

```tsx
{/* Browse restaurants CTA */}
<motion.div variants={item} className="mb-2">
  <Link
    href="/restaurants"
    className="flex items-center justify-between bg-[#E05A23] text-white rounded-2xl px-5 py-4 shadow-md shadow-orange-200"
  >
    <div>
      <p className="font-bold text-base">Order food</p>
      <p className="text-orange-100 text-sm mt-0.5">Browse restaurants near you</p>
    </div>
    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
      <ShoppingBag className="w-5 h-5 text-white" />
    </div>
  </Link>
</motion.div>
```

Add `import Link from "next/link"` and `import { ShoppingBag } from "lucide-react"` to the imports if not already present. (Check — `ShoppingBag` may need to be added to the existing Lucide import line.)

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/mbp/atlaasgo && npm test 2>&1 | tail -10
```

Expected: All tests pass (25+ passed).

- [ ] **Step 4: Run build**

```bash
cd /Users/mbp/atlaasgo && npm run build 2>&1 | tail -20
```

Expected: Clean build, no TypeScript errors, all routes compiled.

- [ ] **Step 5: Commit + push**

```bash
cd /Users/mbp/atlaasgo && git add app/page.tsx app/dashboard/page.tsx && git commit -m "feat: add Browse Restaurants CTA to landing page and customer dashboard" && git push origin main
```

Expected: All commits from Tasks 1–13 pushed to origin.

---

## Completion Checklist

- [ ] `types/restaurant.ts` and `types/cart.ts` created
- [ ] `lib/restaurants.ts` exports `CUISINE_TYPES`, `filterByCuisine`, `getRestaurants`, `getMenu`
- [ ] `lib/cart.ts` exports pure helpers + all Firestore cart CRUD
- [ ] All unit tests pass (`npm test`)
- [ ] Seed script runs and creates restaurants in Firestore
- [ ] `CartContext` wraps the app in `layout.tsx`
- [ ] `/restaurants` shows cuisine-filtered restaurant grid
- [ ] `/restaurants/[id]` shows menu with sticky nav, add-to-cart, group order invite, mobile cart bar
- [ ] Group order: second user joining via `?cart=` URL sees same cart in real-time
- [ ] Cross-restaurant add shows clear-cart confirmation modal
- [ ] `/checkout` creates order doc, clears cart, redirects to tracking
- [ ] `/orders/[id]` shows live timeline that updates when driver changes order status
- [ ] Clean production build (`npm run build`)

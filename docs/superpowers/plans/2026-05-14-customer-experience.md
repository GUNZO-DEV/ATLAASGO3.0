# Customer Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full customer experience layer — personalized dashboard, social community feed, favorites, saved addresses, reviews & ratings, referral system with Firestore credits, in-app notifications inbox, and customer settings.

**Architecture:** All data is Firebase Firestore. Hooks (`useFavorites`, `useNotifications`, `useSavedAddresses`) wrap `onSnapshot` listeners and expose typed state + mutation functions. Referral credits are a numeric field on the user doc applied at checkout. Notification docs are written inside `lib/orders.ts` on every status transition.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Firestore + Auth, Tailwind CSS v4, Lucide React, react-hot-toast

---

## File Map

### Created
- `lib/referral.ts` — generateReferralCode, applyReferralOnRegister, awardReferralCredit
- `lib/reviews.ts` — submitReview, calculateRollingAverage
- `hooks/useFavorites.ts` — real-time favorites array + toggle
- `hooks/useNotifications.ts` — real-time notifications list + unread count
- `hooks/useSavedAddresses.ts` — saved addresses array + add/remove/update
- `components/StarPicker.tsx` — interactive 1–5 star rating selector
- `components/NotificationItem.tsx` — single notification row
- `components/AddressCard.tsx` — saved address display card
- `components/AddressForm.tsx` — add/edit address inline form
- `components/ReferralCard.tsx` — code display + share button
- `app/community/page.tsx` — social discovery (trending, popular items, new)
- `app/favorites/page.tsx` — favorited restaurants grid
- `app/notifications/page.tsx` — in-app notification history
- `app/referral/page.tsx` — referral code share + credits balance
- `app/profile/addresses/page.tsx` — saved addresses management
- `app/profile/settings/page.tsx` — name, zone, account deletion
- `app/orders/[id]/review/page.tsx` — post-delivery review form
- `__tests__/referral.test.ts` — generateReferralCode, calculateRollingAverage

### Modified
- `app/register/page.tsx` — generate referralCode on signup, read ?ref= param
- `app/dashboard/page.tsx` — add active order banner, restaurant row, recent orders
- `app/checkout/page.tsx` — saved addresses dropdown + referral credit toggle
- `lib/orders.ts` — write notification doc after transitionOrder
- `components/FloatingNavbar.tsx` — bell icon with unread badge
- `components/RestaurantCard.tsx` — heart toggle using useFavorites
- `firestore.rules` — reviews + notifications subcollection rules

---

## Task 1: lib/referral.ts + lib/reviews.ts + Tests

**Files:**
- Create: `lib/referral.ts`
- Create: `lib/reviews.ts`
- Create: `__tests__/referral.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/referral.test.ts
import { describe, it, expect } from "vitest";
import { generateReferralCode } from "@/lib/referral";
import { calculateRollingAverage } from "@/lib/reviews";

describe("generateReferralCode", () => {
  it("returns a 6-character string", () => {
    expect(generateReferralCode()).toHaveLength(6);
  });

  it("returns only uppercase alphanumeric characters", () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("generates unique codes on repeated calls", () => {
    const codes = new Set(Array.from({ length: 100 }, generateReferralCode));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("calculateRollingAverage", () => {
  it("returns newRating when count is 0", () => {
    expect(calculateRollingAverage(0, 0, 5)).toBe(5);
  });

  it("averages correctly", () => {
    // existing avg=4, count=1, new rating=2 → (4*1+2)/2 = 3
    expect(calculateRollingAverage(4, 1, 2)).toBe(3);
  });

  it("handles many reviews", () => {
    // avg=3, count=10, new=5 → (30+5)/11 ≈ 3.18
    expect(calculateRollingAverage(3, 10, 5)).toBeCloseTo(3.18, 1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/mbp/atlaasgo && npm test -- __tests__/referral.test.ts 2>&1 | tail -10
```

Expected: FAIL — `lib/referral` not found.

- [ ] **Step 3: Create lib/referral.ts**

```ts
// lib/referral.ts

/** Generate a 6-character uppercase alphanumeric referral code. */
export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * After a new user registers with ?ref=CODE, look up the referrer
 * and store referredBy on the new user's doc.
 */
export async function applyReferralOnRegister(
  code: string,
  newUid: string
): Promise<void> {
  const { collection, query, where, limit, getDocs, doc, updateDoc } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const snap = await getDocs(
    query(collection(db, "users"), where("referralCode", "==", code), limit(1))
  );
  if (!snap.empty) {
    await updateDoc(doc(db, "users", newUid), { referredBy: snap.docs[0].id });
  }
}

/**
 * Award MAD credit to a referrer and write a notification.
 * Call this when the referee places their first order.
 */
export async function awardReferralCredit(
  referrerId: string,
  amount: number
): Promise<void> {
  const { doc, updateDoc, increment, collection, addDoc } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  await updateDoc(doc(db, "users", referrerId), {
    referralCredits: increment(amount),
  });

  await addDoc(collection(db, "users", referrerId, "notifications"), {
    type: "referral",
    title: "Referral bonus! 🎉",
    body: `You earned ${amount} MAD — a friend placed their first order`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Create lib/reviews.ts**

```ts
// lib/reviews.ts

/** Pure rolling average — used by submitReview and tests. */
export function calculateRollingAverage(
  currentAvg: number,
  currentCount: number,
  newRating: number
): number {
  if (currentCount === 0) return newRating;
  return (currentAvg * currentCount + newRating) / (currentCount + 1);
}

/**
 * Submit a review for a delivered order.
 * - Writes to users/{uid}/reviews/{auto-id}
 * - Marks orderId in user.reviewedOrderIds
 * - Updates restaurant rolling average via transaction
 */
export async function submitReview(
  uid: string,
  orderId: string,
  restaurantId: string,
  rating: number,
  comment: string
): Promise<void> {
  const { doc, runTransaction, collection, addDoc, updateDoc, arrayUnion } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  // Write review doc
  await addDoc(collection(db, "users", uid, "reviews"), {
    restaurantId,
    orderId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  });

  // Mark order as reviewed (prevents duplicate submissions)
  await updateDoc(doc(db, "users", uid), {
    reviewedOrderIds: arrayUnion(orderId),
  });

  // Update restaurant rating via rolling average transaction
  await runTransaction(db, async (tx) => {
    const restRef = doc(db, "restaurants", restaurantId);
    const restSnap = await tx.get(restRef);
    if (!restSnap.exists()) return;
    const { rating: cur = 0, reviewCount = 0 } = restSnap.data();
    const newCount  = reviewCount + 1;
    const newRating = calculateRollingAverage(cur, reviewCount, rating);
    tx.update(restRef, {
      rating:      Math.round(newRating * 10) / 10,
      reviewCount: newCount,
    });
  });
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd /Users/mbp/atlaasgo && npm test -- __tests__/referral.test.ts 2>&1 | tail -10
```

Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/referral.ts lib/reviews.ts __tests__/referral.test.ts && git commit -m "feat: add lib/referral and lib/reviews with pure helpers and tests"
```

---

## Task 2: Hooks — useFavorites, useNotifications, useSavedAddresses

**Files:**
- Create: `hooks/useFavorites.ts`
- Create: `hooks/useNotifications.ts`
- Create: `hooks/useSavedAddresses.ts`

- [ ] **Step 1: Create hooks/useFavorites.ts**

```ts
// hooks/useFavorites.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useFavorites(uid: string | null) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setFavorites(snap.data().favorites ?? []);
    });
    return unsub;
  }, [uid]);

  const toggle = useCallback(
    async (restaurantId: string) => {
      if (!uid) return;
      const isFav = favorites.includes(restaurantId);
      await updateDoc(doc(db, "users", uid), {
        favorites: isFav ? arrayRemove(restaurantId) : arrayUnion(restaurantId),
      });
    },
    [uid, favorites]
  );

  const isFavorite = useCallback(
    (restaurantId: string) => favorites.includes(restaurantId),
    [favorites]
  );

  return { favorites, toggle, isFavorite };
}
```

- [ ] **Step 2: Create hooks/useNotifications.ts**

```ts
// hooks/useNotifications.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AppNotification {
  id: string;
  type: "order_status" | "referral" | "promo" | "system";
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export function useNotifications(uid: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AppNotification)
      );
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [uid]);

  const markRead = useCallback(
    async (notifId: string) => {
      if (!uid) return;
      await updateDoc(doc(db, "users", uid, "notifications", notifId), {
        read: true,
      });
    },
    [uid]
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) =>
      batch.update(doc(db, "users", uid, "notifications", n.id), { read: true })
    );
    await batch.commit();
  }, [uid, notifications]);

  return { notifications, unreadCount, markRead, markAllRead };
}
```

- [ ] **Step 3: Create hooks/useSavedAddresses.ts**

```ts
// hooks/useSavedAddresses.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SavedAddress {
  id: string;
  label: string;   // "Home" | "Dorm" | "Office" | custom string
  address: string;
  note?: string;
  isDefault: boolean;
}

export function useSavedAddresses(uid: string | null) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setAddresses(snap.data().savedAddresses ?? []);
    });
    return unsub;
  }, [uid]);

  const persist = useCallback(
    async (updated: SavedAddress[]) => {
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), { savedAddresses: updated });
    },
    [uid]
  );

  const add = useCallback(
    async (addr: Omit<SavedAddress, "id">) => {
      if (addresses.length >= 5) return; // max 5
      const newAddr: SavedAddress = { ...addr, id: crypto.randomUUID() };
      const updated = addr.isDefault
        ? [...addresses.map((a) => ({ ...a, isDefault: false })), newAddr]
        : [...addresses, newAddr];
      await persist(updated);
    },
    [addresses, persist]
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(addresses.filter((a) => a.id !== id));
    },
    [addresses, persist]
  );

  const update = useCallback(
    async (id: string, changes: Partial<Omit<SavedAddress, "id">>) => {
      const updated = addresses.map((a) => {
        if (a.id !== id) {
          return changes.isDefault ? { ...a, isDefault: false } : a;
        }
        return { ...a, ...changes };
      });
      await persist(updated);
    },
    [addresses, persist]
  );

  return { addresses, add, remove, update };
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add hooks/useFavorites.ts hooks/useNotifications.ts hooks/useSavedAddresses.ts && git commit -m "feat: add useFavorites, useNotifications, useSavedAddresses hooks"
```

---

## Task 3: Firestore Rules — Reviews + Notifications

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add subcollection rules**

Open `firestore.rules`. Inside `match /users/{userId} {`, add these subcollection rules after the existing `allow delete` line:

```
      match /reviews/{reviewId} {
        allow read:   if isSignedIn() && (request.auth.uid == userId || isAdmin());
        allow create: if isSignedIn() && request.auth.uid == userId;
        allow update: if false;
        allow delete: if isAdmin();
      }

      match /notifications/{notifId} {
        allow read:   if isSignedIn() && request.auth.uid == userId;
        allow create: if isSignedIn();
        allow update: if isSignedIn() && request.auth.uid == userId
                        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
        allow delete: if isSignedIn() && request.auth.uid == userId;
      }
```

Also add the `social_feed` and `popular_items` collections inside the top-level `match /databases/{database}/documents {` block:

```
    match /social_feed/{restaurantId} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    match /popular_items/{itemId} {
      allow read:  if true;
      allow write: if isAdmin();
    }
```

- [ ] **Step 2: Verify structure**

```bash
grep -n "match /" /Users/mbp/atlaasgo/firestore.rules
```

Expected: lines for `/orders/`, `/users/`, `/users/{userId}/reviews/`, `/users/{userId}/notifications/`, `/driver_stats/`, `/zones/`, `/restaurants/`, `/carts/`, `/social_feed/`, `/popular_items/`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add firestore.rules && git commit -m "feat(rules): add reviews, notifications, social_feed, popular_items rules"
```

---

## Task 4: Write Notifications in lib/orders.ts

**Files:**
- Modify: `lib/orders.ts`

- [ ] **Step 1: Add notification titles/bodies map and write call**

Open `lib/orders.ts`. After the existing `import type { OrderStatus, StatusHistoryEntry } from "@/types/order";` line, add:

```ts
const NOTIFICATION_CONTENT: Partial<
  Record<OrderStatus, { title: string; body: string }>
> = {
  accepted:  { title: "Driver on the way! 🛵", body: "Your driver has accepted your order" },
  picked_up: { title: "Order picked up 📦",    body: "Your order is en route" },
  delivered: { title: "Delivered! ✅",          body: "Your order has arrived. Enjoy!" },
  cancelled: { title: "Order cancelled",        body: "Your order was cancelled" },
};
```

Then inside `transitionOrder`, after the `await updateDoc(...)` call, add:

```ts
  // Write in-app notification to customer
  const notifContent = NOTIFICATION_CONTENT[to];
  if (notifContent) {
    try {
      // Lazy import to avoid circular dependency
      const { collection: col, addDoc: add } = await import("firebase/firestore");
      // customerId must be fetched from the order or passed as extra
      const customerId = extra.customerId as string | undefined;
      if (customerId) {
        await add(col(db, "users", customerId, "notifications"), {
          type: "order_status",
          title: notifContent.title,
          body:  notifContent.body,
          read:  false,
          link:  `/orders/${orderId}`,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Notifications are non-critical — swallow errors
    }
  }
```

> **Note:** `customerId` must be passed in the `extra` object when calling `transitionOrder`. Update call sites in `app/driver/page.tsx`: pass `extra: { customerId: order.customerId }`.

- [ ] **Step 2: Update driver page call sites**

Open `app/driver/page.tsx`. Find every call to `transitionOrder(...)` (or the raw `updateDoc` calls for status changes). Ensure `customerId` is included in the extra payload. Example:

```ts
// Before:
await transitionOrder(order.id!, order.status, "accepted", driverId);

// After:
await transitionOrder(order.id!, order.status, "accepted", driverId, {
  customerId: order.customerId,
});
```

Repeat for `picked_up` and `delivered` transitions.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/mbp/atlaasgo && npm test 2>&1 | tail -10
```

Expected: All tests pass (no regressions).

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add lib/orders.ts app/driver/page.tsx && git commit -m "feat(orders): write in-app notification on every status transition"
```

---

## Task 5: Registration — Referral Code + ?ref= Param

**Files:**
- Modify: `app/register/page.tsx`

- [ ] **Step 1: Add imports**

Add to existing imports at the TOP of `app/register/page.tsx`:

```tsx
import { generateReferralCode, applyReferralOnRegister } from "@/lib/referral";
import { setDoc, doc } from "firebase/firestore";
```

- [ ] **Step 2: Read ?ref= param on mount**

Inside the component, add:

```tsx
const [refCode, setRefCode] = useState<string | null>(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) setRefCode(ref.toUpperCase());
}, []);
```

- [ ] **Step 3: Initialize user doc with referral code on register**

Inside the `register` branch of `handleSubmit`, after `createUserWithEmailAndPassword` succeeds and before `router.push`:

```tsx
// Initialize user document with referral code and defaults
const referralCode = generateReferralCode();
await setDoc(doc(db, "users", user.uid), {
  name:             user.displayName ?? "",
  email:            user.email ?? "",
  referralCode,
  referralCredits:  0,
  reviewedOrderIds: [],
  favorites:        [],
  savedAddresses:   [],
  orderCount:       0,
  createdAt:        new Date().toISOString(),
}, { merge: true });

// Apply referral if ?ref= was in the URL
if (refCode) {
  applyReferralOnRegister(refCode, user.uid).catch(() => {});
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/register/page.tsx && git commit -m "feat(auth): generate referralCode on signup, apply ?ref= referral param"
```

---

## Task 6: FloatingNavbar — Notifications Bell Badge

**Files:**
- Modify: `components/FloatingNavbar.tsx`

- [ ] **Step 1: Read the current FloatingNavbar**

Open `components/FloatingNavbar.tsx` to understand its current structure (auth state, links).

- [ ] **Step 2: Add notification bell with badge**

Add these imports at the top:

```tsx
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import Link from "next/link";
```

Inside the component, after the existing auth state hook, add:

```tsx
const { unreadCount } = useNotifications(userId ?? null);
```

In the JSX, add the bell icon in the nav actions area (next to existing links/logout):

```tsx
<Link href="/notifications" className="relative cursor-pointer">
  <Bell className="w-5 h-5 text-gray-600 hover:text-[#E05A23] transition-colors" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E05A23] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</Link>
```

> Read the full file first to find the correct location for the bell icon and the `userId` variable name used in the component.

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/FloatingNavbar.tsx && git commit -m "feat(nav): add notifications bell with unread count badge"
```

---

## Task 7: RestaurantCard — Heart Toggle

**Files:**
- Modify: `components/RestaurantCard.tsx`

- [ ] **Step 1: Add heart button**

Open `components/RestaurantCard.tsx`. Add these imports:

```tsx
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth"; // OR read uid from prop
```

Since the project doesn't use `react-firebase-hooks`, get the current user uid differently. Add:

```tsx
import { auth } from "@/lib/firebase";
```

Inside the `RestaurantCard` component body:

```tsx
const [uid, setUid] = useState<string | null>(null);
useEffect(() => {
  const unsub = auth.onAuthStateChanged((u) => setUid(u?.uid ?? null));
  return unsub;
}, []);
const { isFavorite, toggle } = useFavorites(uid);
```

Add the import for `useState` and `useEffect` if not already present.

In the JSX, add the heart button inside the cover image `div`, positioned top-right:

```tsx
<button
  onClick={(e) => {
    e.preventDefault(); // prevent Link navigation
    toggle(restaurant.id);
  }}
  className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition-transform cursor-pointer z-10"
>
  <Heart
    className={`w-4 h-4 transition-colors ${
      isFavorite(restaurant.id)
        ? "fill-red-500 text-red-500"
        : "text-gray-400"
    }`}
  />
</button>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/RestaurantCard.tsx && git commit -m "feat: add favorites heart toggle to RestaurantCard"
```

---

## Task 8: Customer Dashboard Redesign

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add active order detection**

Open `app/dashboard/page.tsx`. Add these imports at the top:

```tsx
import { collection, query, where, limit, onSnapshot, orderBy } from "firebase/firestore";
import Link from "next/link";
import type { Order } from "@/types/order";
import { getRestaurants } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";
import { ShoppingBag } from "lucide-react";
```

Add state for active order and recommended restaurants (near other useState calls):

```tsx
const [activeOrder, setActiveOrder]         = useState<Order | null>(null);
const [recommended, setRecommended]         = useState<Restaurant[]>([]);
const [recentOrders, setRecentOrders]       = useState<Order[]>([]);
```

- [ ] **Step 2: Add real-time active order listener**

Inside the `useEffect` that runs when `userId` is set, add:

```tsx
// Active order listener
const activeQ = query(
  collection(db, "orders"),
  where("customerId", "==", userId),
  where("status", "in", ["pending", "accepted", "picked_up"]),
  limit(1)
);
const unsubActive = onSnapshot(activeQ, (snap) => {
  setActiveOrder(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Order));
});

// Recent orders
const recentQ = query(
  collection(db, "orders"),
  where("customerId", "==", userId),
  orderBy("timestamp", "desc"),
  limit(3)
);
const unsubRecent = onSnapshot(recentQ, (snap) => {
  setRecentOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
});

// Recommended restaurants (top rated in zone)
getRestaurants("ifrane").then((list) => setRecommended(list.slice(0, 6)));

// Return cleanup including new unsubs
return () => { unsubActive(); unsubRecent(); };
```

- [ ] **Step 3: Add active order banner + restaurant row to JSX**

Inside the return JSX, BEFORE the existing `OrderForm` component, insert:

```tsx
{/* Active order banner */}
{activeOrder && (
  <motion.div variants={item} className="mb-4">
    <Link
      href={`/orders/${activeOrder.id}`}
      className="flex items-center justify-between bg-[#E05A23] text-white rounded-2xl px-5 py-4 shadow-md shadow-orange-200"
    >
      <div>
        <p className="text-xs font-medium text-orange-100 mb-0.5">Active order</p>
        <p className="font-bold capitalize">
          {activeOrder.status.replace("_", " ")}
        </p>
      </div>
      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
    </Link>
  </motion.div>
)}

{/* Browse restaurants CTA + recommended row */}
<motion.div variants={item} className="mb-6">
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-bold text-gray-900">Recommended for you</h2>
    <Link href="/restaurants" className="text-sm text-[#E05A23] font-medium">
      See all
    </Link>
  </div>
  {recommended.length > 0 ? (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {recommended.map((r) => (
        <Link
          key={r.id}
          href={`/restaurants/${r.id}`}
          className="shrink-0 w-40 rounded-xl overflow-hidden bg-white shadow-sm"
        >
          <div className="h-24 bg-gray-100">
            {r.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.coverImage} alt={r.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="p-2">
            <p className="text-xs font-semibold text-gray-900 truncate">{r.name}</p>
            <p className="text-xs text-gray-400">{r.estimatedDeliveryMins} min · {r.deliveryFee} MAD</p>
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <Link
      href="/restaurants"
      className="flex items-center justify-between bg-[#E05A23] text-white rounded-2xl px-5 py-4 shadow-md shadow-orange-200"
    >
      <div>
        <p className="font-bold text-base">Order food</p>
        <p className="text-orange-100 text-sm mt-0.5">Browse restaurants near you</p>
      </div>
      <ShoppingBag className="w-6 h-6" />
    </Link>
  )}
</motion.div>
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/dashboard/page.tsx && git commit -m "feat(dashboard): add active order banner and recommended restaurants row"
```

---

## Task 9: Community Dashboard (`/community`)

**Files:**
- Create: `app/community/page.tsx`

- [ ] **Step 1: Create app/community/page.tsx**

```tsx
// app/community/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, orderBy, limit, getDocs, where, Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import FloatingNavbar from "@/components/FloatingNavbar";
import RestaurantCard from "@/components/RestaurantCard";
import type { Restaurant } from "@/types/restaurant";
import { Flame, Star, Sparkles } from "lucide-react";

interface TrendingRestaurant extends Restaurant {
  recentOrderCount?: number;
}

interface PopularItem {
  id: string;
  itemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;
  image: string;
  averageRating: number;
}

export default function CommunityPage() {
  const router = useRouter();
  const [trending, setTrending]     = useState<TrendingRestaurant[]>([]);
  const [popular, setPopular]       = useState<PopularItem[]>([]);
  const [newArrivals, setNewArrivals] = useState<Restaurant[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    async function load() {
      // Trending: from social_feed ordered by trendingScore
      const feedSnap = await getDocs(
        query(collection(db, "social_feed"), orderBy("trendingScore", "desc"), limit(5))
      );

      const trendingRestaurants = await Promise.all(
        feedSnap.docs.map(async (feedDoc) => {
          const feedData = feedDoc.data();
          const restSnap = await getDocs(
            query(collection(db, "restaurants"), where("__name__", "==", feedDoc.id), limit(1))
          );
          if (restSnap.empty) return null;
          const r = { id: restSnap.docs[0].id, ...restSnap.docs[0].data() } as Restaurant;
          return { ...r, recentOrderCount: feedData.recentOrderCount ?? 0 };
        })
      );
      setTrending(trendingRestaurants.filter(Boolean) as TrendingRestaurant[]);

      // Popular items
      const itemsSnap = await getDocs(
        query(collection(db, "popular_items"), orderBy("averageRating", "desc"), limit(8))
      );
      setPopular(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PopularItem)));

      // New this month
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const newSnap = await getDocs(
        query(
          collection(db, "restaurants"),
          where("createdAt", ">=", thirtyDaysAgo),
          orderBy("createdAt", "desc"),
          limit(6)
        )
      );
      setNewArrivals(newSnap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant)));

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12 space-y-10">

        {/* Trending Now */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-[#E05A23]" />
            <h2 className="text-lg font-bold text-gray-900">Trending Now</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-gray-400 text-sm">No trending data yet — place some orders!</p>
          ) : (
            <div className="space-y-3">
              {trending.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {r.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.coverImage} alt={r.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {r.cuisine.join(" · ")}
                    </p>
                  </div>
                  {(r.recentOrderCount ?? 0) > 0 && (
                    <span className="shrink-0 text-xs bg-orange-50 text-[#E05A23] font-bold px-2 py-1 rounded-full">
                      🔥 {r.recentOrderCount} today
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Popular Items */}
        {popular.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-gray-900">Popular Items</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {popular.map((item) => (
                <Link
                  key={item.id}
                  href={`/restaurants/${item.restaurantId}`}
                  className="shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                >
                  <div className="h-24 bg-gray-100">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.price} MAD</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-500">{item.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New This Month */}
        {newArrivals.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-bold text-gray-900">New This Month</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {newArrivals.map((r) => (
                <div key={r.id} className="relative">
                  <span className="absolute top-2 left-2 z-10 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-medium">
                    New
                  </span>
                  <RestaurantCard restaurant={r} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/community/page.tsx && git commit -m "feat: add /community social discovery page (trending, popular items, new arrivals)"
```

---

## Task 10: Favorites Page

**Files:**
- Create: `app/favorites/page.tsx`

- [ ] **Step 1: Create app/favorites/page.tsx**

```tsx
// app/favorites/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useFavorites } from "@/hooks/useFavorites";
import { getRestaurant } from "@/lib/restaurants";
import RestaurantGrid from "@/components/RestaurantGrid";
import FloatingNavbar from "@/components/FloatingNavbar";
import type { Restaurant } from "@/types/restaurant";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function FavoritesPage() {
  const router = useRouter();
  const [uid, setUid]                 = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { favorites } = useFavorites(uid);

  useEffect(() => {
    if (!uid) return;
    if (favorites.length === 0) { setLoading(false); setRestaurants([]); return; }
    setLoading(true);
    Promise.all(favorites.map(getRestaurant))
      .then((results) => setRestaurants(results.filter(Boolean) as Restaurant[]))
      .finally(() => setLoading(false));
  }, [uid, favorites.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        </div>

        {!loading && restaurants.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No favorites yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              Tap the heart on any restaurant to save it here
            </p>
            <Link
              href="/restaurants"
              className="inline-block bg-[#E05A23] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <RestaurantGrid
            restaurants={restaurants}
            selectedCuisines={[]}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/favorites/page.tsx && git commit -m "feat: add /favorites page showing saved restaurants"
```

---

## Task 11: Saved Addresses — Components + Page

**Files:**
- Create: `components/AddressCard.tsx`
- Create: `components/AddressForm.tsx`
- Create: `app/profile/addresses/page.tsx`

- [ ] **Step 1: Create components/AddressCard.tsx**

```tsx
// components/AddressCard.tsx
"use client";

import { MapPin, Pencil, Trash2, Check } from "lucide-react";
import type { SavedAddress } from "@/hooks/useSavedAddresses";

interface Props {
  address: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AddressCard({ address, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
        <MapPin className="w-4 h-4 text-[#E05A23]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 text-sm">{address.label}</p>
          {address.isDefault && (
            <span className="text-xs bg-orange-50 text-[#E05A23] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Default
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5 truncate">{address.address}</p>
        {address.note && (
          <p className="text-xs text-gray-400 mt-0.5">{address.note}</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-red-50 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create components/AddressForm.tsx**

```tsx
// components/AddressForm.tsx
"use client";

import { useState } from "react";
import type { SavedAddress } from "@/hooks/useSavedAddresses";

const LABEL_OPTIONS = ["Home", "Dorm", "Office", "Other"];

interface Props {
  initial?: Partial<SavedAddress>;
  onSave: (addr: Omit<SavedAddress, "id">) => Promise<void>;
  onCancel: () => void;
}

export default function AddressForm({ initial, onSave, onCancel }: Props) {
  const [label, setLabel]       = useState(initial?.label ?? "Home");
  const [customLabel, setCustomLabel] = useState(
    initial?.label && !LABEL_OPTIONS.includes(initial.label) ? initial.label : ""
  );
  const [address, setAddress]   = useState(initial?.address ?? "");
  const [note, setNote]         = useState(initial?.note ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving]     = useState(false);

  const finalLabel = label === "Other" ? customLabel : label;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !finalLabel.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label:   finalLabel,
        address: address.trim(),
        note:    note.trim() || undefined,
        isDefault,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      {/* Label selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Label</label>
        <div className="flex gap-2 flex-wrap">
          {LABEL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLabel(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                label === opt
                  ? "bg-[#E05A23] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {label === "Other" && (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Custom label"
            className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
            required
          />
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, building, dorm..."
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Note <span className="text-gray-300">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Room 204, 2nd floor, blue door..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
        />
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 accent-[#E05A23]"
        />
        <span className="text-sm text-gray-700">Set as default address</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 bg-[#E05A23] text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving..." : "Save address"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create app/profile/addresses/page.tsx**

```tsx
// app/profile/addresses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import AddressCard from "@/components/AddressCard";
import AddressForm from "@/components/AddressForm";
import FloatingNavbar from "@/components/FloatingNavbar";
import type { SavedAddress } from "@/hooks/useSavedAddresses";
import { Plus, MapPin } from "lucide-react";
import toast from "react-hot-toast";

export default function AddressesPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<SavedAddress | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { addresses, add, remove, update } = useSavedAddresses(uid);

  const handleAdd = async (addr: Omit<SavedAddress, "id">) => {
    await add(addr);
    setShowForm(false);
    toast.success("Address saved");
  };

  const handleUpdate = async (addr: Omit<SavedAddress, "id">) => {
    if (!editing) return;
    await update(editing.id, addr);
    setEditing(null);
    toast.success("Address updated");
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    toast.success("Address removed");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
          {addresses.length < 5 && !showForm && !editing && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm text-[#E05A23] font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        <div className="space-y-3">
          {showForm && (
            <AddressForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
          )}

          {addresses.length === 0 && !showForm ? (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No saved addresses</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Save your dorm, home, or office for faster checkout
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#E05A23] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 cursor-pointer"
              >
                Add address
              </button>
            </div>
          ) : (
            addresses.map((addr) =>
              editing?.id === addr.id ? (
                <AddressForm
                  key={addr.id}
                  initial={addr}
                  onSave={handleUpdate}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  onEdit={() => setEditing(addr)}
                  onDelete={() => handleDelete(addr.id)}
                />
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/AddressCard.tsx components/AddressForm.tsx app/profile/addresses/page.tsx && git commit -m "feat: add saved addresses components and /profile/addresses page"
```

---

## Task 12: Update /checkout — Saved Addresses + Referral Credit

**Files:**
- Modify: `app/checkout/page.tsx`

- [ ] **Step 1: Add saved address dropdown and referral credit**

Open `app/checkout/page.tsx`. Add these imports:

```tsx
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
```

Add state inside the component:

```tsx
const { addresses } = useSavedAddresses(userId);
const [referralCredits, setReferralCredits] = useState(0);
const [useCredit, setUseCredit]             = useState(false);
```

Fetch referral credits when userId loads:

```tsx
useEffect(() => {
  if (!userId) return;
  getDoc(doc(db, "users", userId)).then((snap) => {
    if (snap.exists()) setReferralCredits(snap.data().referralCredits ?? 0);
  });
}, [userId]);
```

Calculate adjusted total:

```tsx
const creditApplied = useCredit ? Math.min(referralCredits, total) : 0;
const finalTotal    = total - creditApplied;
```

In the JSX, add saved addresses dropdown BEFORE the `<AddressInput>`:

```tsx
{addresses.length > 0 && (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1.5">
      Saved addresses
    </label>
    <select
      onChange={(e) => { if (e.target.value) setAddress(e.target.value); }}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23] bg-white"
    >
      <option value="">— Select a saved address —</option>
      {addresses.map((a) => (
        <option key={a.id} value={a.address}>
          {a.label}: {a.address}
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-400 mt-1">Or enter a new address below</p>
  </div>
)}
```

Add referral credit toggle in the fee breakdown section BEFORE the total line:

```tsx
{referralCredits > 0 && (
  <label className="flex items-center justify-between cursor-pointer py-1">
    <span className="text-sm text-gray-600">
      Use referral credit ({referralCredits} MAD)
    </span>
    <input
      type="checkbox"
      checked={useCredit}
      onChange={(e) => setUseCredit(e.target.checked)}
      className="w-4 h-4 accent-[#E05A23]"
    />
  </label>
)}
{useCredit && creditApplied > 0 && (
  <div className="flex justify-between text-sm text-green-600">
    <span>Credit applied</span>
    <span>-{creditApplied} MAD</span>
  </div>
)}
```

Update the total display to use `finalTotal` and the submit button label:

```tsx
// In the fee breakdown total row:
<span className="text-gray-900">{finalTotal} MAD</span>

// Submit button:
{loading ? "Placing order..." : `Place order · ${finalTotal} MAD`}
```

In `handleSubmit`, after `await checkOut()`, if credit was applied, deduct it:

```tsx
if (useCredit && creditApplied > 0 && userId) {
  await updateDoc(doc(db, "users", userId), {
    referralCredits: increment(-creditApplied),
  });
}
```

Also add `creditUsed: creditApplied` to the `addDoc` order payload.

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/checkout/page.tsx && git commit -m "feat(checkout): add saved address dropdown and referral credit toggle"
```

---

## Task 13: StarPicker + Review Page

**Files:**
- Create: `components/StarPicker.tsx`
- Create: `app/orders/[id]/review/page.tsx`

- [ ] **Step 1: Create components/StarPicker.tsx**

```tsx
// components/StarPicker.tsx
"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange: (rating: number) => void;
}

export default function StarPicker({ value, onChange }: Props) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create app/orders/[id]/review/page.tsx**

```tsx
// app/orders/[id]/review/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StarPicker from "@/components/StarPicker";
import { submitReview } from "@/lib/reviews";
import toast from "react-hot-toast";
import type { Order } from "@/types/order";

export default function ReviewPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();

  const [uid, setUid]           = useState<string | null>(null);
  const [order, setOrder]       = useState<Order & { restaurantId?: string; restaurantName?: string } | null>(null);
  const [rating, setRating]     = useState(0);
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!uid || !orderId) return;
    // Load order
    getDoc(doc(db, "orders", orderId)).then((snap) => {
      if (!snap.exists()) return;
      setOrder({ id: snap.id, ...snap.data() } as Order & { restaurantId?: string; restaurantName?: string });
    });
    // Check if already reviewed
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists() && (snap.data().reviewedOrderIds ?? []).includes(orderId)) {
        setAlreadyDone(true);
      }
    });
  }, [uid, orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !order || rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setLoading(true);
    try {
      await submitReview(uid, orderId, order.restaurantId ?? "", rating, comment);
      toast.success("Review submitted!");
      router.push(`/orders/${orderId}`);
    } catch {
      toast.error("Failed to submit review");
      setLoading(false);
    }
  };

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 font-medium">You already reviewed this order</p>
        <Link href={`/orders/${orderId}`} className="text-[#E05A23] text-sm font-medium">
          Back to order
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href={`/orders/${orderId}`}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Rate your order</h1>
        </div>

        {order && (
          <p className="text-gray-500 text-sm mb-6">
            from <strong className="text-gray-900">{order.restaurantName ?? "Restaurant"}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-4">How was your experience?</p>
            <StarPicker value={rating} onChange={setRating} />
            <p className="text-xs text-gray-400 mt-3">
              {rating === 0 && "Tap a star to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very good"}
              {rating === 5 && "Excellent!"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Leave a comment <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="What did you love? Anything to improve?"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/300</p>
          </div>

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full py-4 bg-[#E05A23] text-white rounded-2xl font-bold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add review prompt to /orders/[id]**

Open `app/orders/[id]/page.tsx`. After loading the order, also fetch the user doc to check `reviewedOrderIds`. Add state:

```tsx
const [canReview, setCanReview] = useState(false);
```

In the `onSnapshot` callback, after `setOrder(...)`:

```tsx
// Check if user can leave a review
const user = auth.currentUser;
if (user && data.status === "delivered") {
  getDoc(doc(db, "users", user.uid)).then((userSnap) => {
    const reviewed = userSnap.data()?.reviewedOrderIds ?? [];
    setCanReview(!reviewed.includes(id));
  });
}
```

Add import: `import { getDoc } from "firebase/firestore";`

In the JSX, after the "Order again" button (or in place of it when delivered):

```tsx
{order.status === "delivered" && canReview && (
  <Link
    href={`/orders/${id}/review`}
    className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-[#E05A23] text-[#E05A23] rounded-2xl font-semibold text-sm hover:bg-orange-50 transition-colors mt-3"
  >
    ⭐ Rate your order
  </Link>
)}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/StarPicker.tsx app/orders/[id]/review/page.tsx app/orders/[id]/page.tsx && git commit -m "feat: add StarPicker, review page, and review prompt on order tracking"
```

---

## Task 14: Notifications Page

**Files:**
- Create: `components/NotificationItem.tsx`
- Create: `app/notifications/page.tsx`

- [ ] **Step 1: Create components/NotificationItem.tsx**

```tsx
// components/NotificationItem.tsx
"use client";

import Link from "next/link";
import { Bell, Package, Gift, Megaphone } from "lucide-react";
import type { AppNotification } from "@/hooks/useNotifications";

const ICON_MAP: Record<string, React.ElementType> = {
  order_status: Package,
  referral:     Gift,
  promo:        Megaphone,
  system:       Bell,
};

interface Props {
  notification: AppNotification;
  onRead: (id: string) => void;
}

export default function NotificationItem({ notification, onRead }: Props) {
  const Icon = ICON_MAP[notification.type] ?? Bell;

  const content = (
    <div
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.read
          ? "bg-white"
          : "bg-orange-50 border-l-4 border-[#E05A23]"
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        notification.read ? "bg-gray-100" : "bg-orange-100"
      }`}>
        <Icon className={`w-4 h-4 ${notification.read ? "text-gray-400" : "text-[#E05A23]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${notification.read ? "text-gray-700" : "text-gray-900"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{notification.body}</p>
        <p className="text-xs text-gray-300 mt-1">
          {new Date(notification.createdAt).toLocaleDateString("en-MA", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-[#E05A23] shrink-0 mt-1.5" />
      )}
    </div>
  );

  return notification.link ? (
    <Link href={notification.link}>{content}</Link>
  ) : (
    <>{content}</>
  );
}
```

- [ ] **Step 2: Create app/notifications/page.tsx**

```tsx
// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "@/components/NotificationItem";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(uid);

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-[#E05A23] font-medium cursor-pointer hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Order updates and referral rewards will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/NotificationItem.tsx app/notifications/page.tsx && git commit -m "feat: add NotificationItem component and /notifications page"
```

---

## Task 15: Referral Page

**Files:**
- Create: `components/ReferralCard.tsx`
- Create: `app/referral/page.tsx`

- [ ] **Step 1: Create components/ReferralCard.tsx**

```tsx
// components/ReferralCard.tsx
"use client";

import { Copy, Share2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  code: string;
  credits: number;
}

export default function ReferralCard({ code, credits }: Props) {
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied!");
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join AtlaasGo",
        text: `Use my code ${code} to get a discount on your first order!`,
        url: shareLink,
      });
    } else {
      copyLink();
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#E05A23] to-orange-400 rounded-3xl p-6 text-white shadow-xl shadow-orange-200">
      {credits > 0 && (
        <div className="bg-white/20 rounded-2xl px-4 py-2.5 mb-5 text-center">
          <p className="text-sm font-medium text-white/80">Available credits</p>
          <p className="text-3xl font-bold">{credits} MAD</p>
        </div>
      )}

      <p className="text-sm font-medium text-white/80 mb-2 text-center">Your referral code</p>
      <div className="flex items-center justify-between bg-white/20 rounded-2xl px-5 py-3 mb-5">
        <span className="text-2xl font-bold tracking-widest">{code}</span>
        <button
          onClick={copyCode}
          className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors cursor-pointer"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={shareNative}
        className="w-full flex items-center justify-center gap-2 bg-white text-[#E05A23] py-3 rounded-2xl font-bold text-sm hover:bg-orange-50 transition-colors cursor-pointer"
      >
        <Share2 className="w-4 h-4" />
        Share with friends
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create app/referral/page.tsx**

```tsx
// app/referral/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import ReferralCard from "@/components/ReferralCard";
import FloatingNavbar from "@/components/FloatingNavbar";

export default function ReferralPage() {
  const router = useRouter();
  const [code, setCode]       = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/register"); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setCode(snap.data().referralCode ?? null);
        setCredits(snap.data().referralCredits ?? 0);
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Refer & Earn</h1>
        <p className="text-gray-500 text-sm mb-8">
          Share your code — earn <strong className="text-gray-700">20 MAD</strong> every time a friend places their first order
        </p>

        {loading ? (
          <div className="h-48 bg-gray-200 rounded-3xl animate-pulse" />
        ) : code ? (
          <>
            <ReferralCard code={code} credits={credits} />

            <div className="mt-8 bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-900">How it works</h2>
              {[
                { step: "1", text: "Share your unique referral code or link" },
                { step: "2", text: "Friend signs up and places their first order" },
                { step: "3", text: "You get 20 MAD added to your credit balance" },
                { step: "4", text: "Use credits at checkout for any future order" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-[#E05A23] text-xs font-bold flex items-center justify-center shrink-0">
                    {step}
                  </span>
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-center py-10">No referral code found</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mbp/atlaasgo && git add components/ReferralCard.tsx app/referral/page.tsx && git commit -m "feat: add ReferralCard component and /referral page"
```

---

## Task 16: Customer Settings Page

**Files:**
- Create: `app/profile/settings/page.tsx`

- [ ] **Step 1: Create app/profile/settings/page.tsx**

```tsx
// app/profile/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged, updateProfile, deleteUser,
} from "firebase/auth";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import FloatingNavbar from "@/components/FloatingNavbar";
import toast from "react-hot-toast";
import { User, MapPin, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [uid, setUid]         = useState<string | null>(null);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [zone, setZone]       = useState("ifrane");
  const [saving, setSaving]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
      setName(user.displayName ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phoneNumber ?? "");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!uid) return;
    import("firebase/firestore").then(({ doc: d, getDoc }) => {
      getDoc(d(db, "users", uid)).then((snap) => {
        if (snap.exists()) setZone(snap.data().zone ?? "ifrane");
      });
    });
  }, [uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, "users", uid), { name, zone });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!uid || !auth.currentUser) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", uid));
      await deleteUser(auth.currentUser);
      router.push("/");
    } catch {
      toast.error("Failed to delete account. Please re-login and try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Profile */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-[#E05A23]" />
              <h2 className="font-semibold text-gray-900 text-sm">Profile</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="text"
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400"
                />
              </div>
              {phone && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    disabled
                    className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-[#E05A23]" />
              <h2 className="font-semibold text-gray-900 text-sm">Delivery zone</h2>
            </div>
            <div className="flex gap-2">
              {["ifrane", "oujda"].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(z)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors cursor-pointer border ${
                    zone === z
                      ? "border-[#E05A23] bg-orange-50 text-[#E05A23]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-[#E05A23] text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-red-600 text-sm">Danger zone</h2>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 font-medium hover:underline cursor-pointer"
            >
              Delete my account
            </button>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                This will permanently delete your account and all data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mbp/atlaasgo && git add app/profile/settings/page.tsx && git commit -m "feat: add /profile/settings page (name, zone, account deletion)"
```

---

## Task 17: Cloud Functions — Social Feed + Referral Credit

**Files:**
- Create: `functions/src/index.ts`

> **Prerequisite:** Firebase Blaze (paid) plan required. If not on Blaze, skip this task — the social feed will stay at 0 and referral credits can be awarded manually or via a future migration.

- [ ] **Step 1: Initialize Firebase Functions**

```bash
cd /Users/mbp/atlaasgo && npx firebase init functions --project YOUR_PROJECT_ID
```

Select TypeScript when prompted. This creates `functions/` directory.

- [ ] **Step 2: Replace functions/src/index.ts**

```ts
// functions/src/index.ts
import { onDocumentCreated, onSchedule } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/** Increment social_feed trendingScore on every new order. */
export const onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data?.data();
  if (!order) return;

  const { restaurantId, customerId } = order;

  // Update social feed
  if (restaurantId) {
    const feedRef = db.doc(`social_feed/${restaurantId}`);
    await feedRef.set(
      {
        restaurantId,
        trendingScore:    admin.firestore.FieldValue.increment(1),
        recentOrderCount: admin.firestore.FieldValue.increment(1),
        updatedAt:        new Date().toISOString(),
      },
      { merge: true }
    );
  }

  // Award referral credit on first order
  if (customerId) {
    const userRef  = db.doc(`users/${customerId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;
    const userData = userSnap.data()!;
    const orderCount = (userData.orderCount ?? 0) + 1;

    await userRef.update({ orderCount });

    if (orderCount === 1 && userData.referredBy) {
      const referrerId = userData.referredBy as string;
      await db.doc(`users/${referrerId}`).update({
        referralCredits: admin.firestore.FieldValue.increment(20),
      });
      await db.collection(`users/${referrerId}/notifications`).add({
        type:      "referral",
        title:     "Referral bonus! 🎉",
        body:      "You earned 20 MAD — a friend placed their first order",
        read:      false,
        createdAt: new Date().toISOString(),
      });
    }
  }
});

/** Reset recentOrderCount every 24 hours. */
export const resetDailyOrderCounts = onSchedule("every 24 hours", async () => {
  const snap = await db.collection("social_feed").get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { recentOrderCount: 0 }));
  await batch.commit();
});
```

- [ ] **Step 3: Deploy functions**

```bash
cd /Users/mbp/atlaasgo/functions && npm run build && cd .. && npx firebase deploy --only functions
```

Expected: Both functions deployed successfully.

- [ ] **Step 4: Commit**

```bash
cd /Users/mbp/atlaasgo && git add functions/ && git commit -m "feat(functions): add onOrderCreated (social feed + referral) and daily reset"
```

---

## Task 18: Run All Tests + Build + Push

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/mbp/atlaasgo && npm test 2>&1 | tail -15
```

Expected: All tests pass (28+ passing across 5 test files).

- [ ] **Step 2: Run production build**

```bash
npm run build 2>&1 | tail -25
```

Expected: Clean build, no TypeScript errors. Routes compiled:
- `/community`, `/favorites`, `/notifications`, `/referral`
- `/profile/addresses`, `/profile/settings`
- `/orders/[id]/review`

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

---

## Completion Checklist

- [ ] `generateReferralCode` returns 6-char uppercase alphanumeric — tested
- [ ] `calculateRollingAverage` math is correct — tested
- [ ] `useFavorites` heart toggle persists across page refresh
- [ ] `useNotifications` shows unread badge in FloatingNavbar
- [ ] `useSavedAddresses` max 5, default flag works
- [ ] Registration generates `referralCode` and initializes user doc fields
- [ ] `?ref=CODE` on register page stores `referredBy` on new user
- [ ] Dashboard shows active order banner + recommended restaurant row
- [ ] `/community` shows trending, popular items, new arrivals sections
- [ ] `/favorites` shows only restaurants the user has hearted
- [ ] `/profile/addresses` add/edit/delete works, max 5 enforced
- [ ] `/checkout` saved addresses dropdown pre-fills address field
- [ ] `/checkout` referral credit toggle reduces final total
- [ ] Credit deducted from user doc on order submit
- [ ] Review prompt appears on `/orders/[id]` after delivery
- [ ] `/orders/[id]/review` submits review, updates restaurant rating
- [ ] One review per order enforced (prompt disappears after submit)
- [ ] Notifications written on every order status change
- [ ] `/notifications` marks individual + all as read
- [ ] `/referral` shows code + credits + share button
- [ ] `/profile/settings` saves name + zone, deletes account
- [ ] All tests pass, clean production build

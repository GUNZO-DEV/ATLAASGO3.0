# AtlaasGo — Sub-project 2: Customer Experience Design

## Goal

Build the full customer-facing experience layer on top of the ordering platform: a personalized dashboard, a social community discovery feed, favorites, saved addresses, reviews & ratings, a referral system with Firestore credit balance, an in-app notifications inbox, and customer settings.

## Architecture

All data lives in Firebase Firestore. No new backend service — social feed scores are maintained by a lightweight Firestore Cloud Function triggered on each new order. Referral credits are a numeric field on the user doc applied at checkout. Everything is Firebase Auth–gated.

## Tech Stack

- Next.js 16 App Router, React 19, TypeScript
- Firebase Firestore + Firebase Auth
- Tailwind CSS v4, Framer Motion, Lucide React, react-hot-toast
- Existing: `lib/firebase.ts`, `types/order.ts`, `components/FloatingNavbar.tsx`

---

## Firestore Schema

### Extend `users/{uid}`
Add these fields to the existing user document:

```ts
favorites: string[];             // restaurantId values
savedAddresses: {
  id: string;                    // nanoid
  label: string;                 // "Home" | "Dorm" | "Office" | custom
  address: string;
  note?: string;
  isDefault: boolean;
}[];
referralCode: string;            // 6-char alphanumeric, generated on registration
referralCredits: number;         // MAD balance, default 0
referredBy?: string;             // uid of referrer
reviewedOrderIds: string[];      // prevents duplicate reviews
zone?: string;                   // "ifrane" | "oujda" — user preference
```

### `users/{uid}/reviews/{reviewId}`
```ts
{
  restaurantId: string;
  orderId: string;
  rating: number;         // 1–5 integer
  comment: string;
  createdAt: string;      // ISO timestamp
}
```

### `users/{uid}/notifications/{notifId}`
```ts
{
  type: "order_status" | "referral" | "promo" | "system";
  title: string;
  body: string;
  read: boolean;
  link?: string;          // e.g. "/orders/abc123"
  createdAt: string;
}
```

### `social_feed/{restaurantId}`
```ts
{
  restaurantId: string;
  trendingScore: number;        // incremented on each order
  recentOrderCount: number;     // orders in last 24h (reset by Cloud Function)
  updatedAt: string;
}
```

### `popular_items/{itemId}` (denormalized)
```ts
{
  itemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;
  image: string;
  averageRating: number;
  reviewCount: number;
  updatedAt: string;
}
```

---

## Pages & Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Redesigned customer home — active order, recommended restaurants, recent orders, quick order form |
| `/community` | Social discovery — trending, popular items, new arrivals |
| `/favorites` | Saved restaurants grid |
| `/profile/addresses` | Saved addresses list + add/edit/delete |
| `/profile/settings` | Name, zone preference, account deletion |
| `/notifications` | In-app notification history, mark-all-read |
| `/referral` | Share referral code, view credits balance |
| `/orders/[id]/review` | Post-delivery review form |

---

## Customer Dashboard (`/dashboard`)

Redesign the existing page into a personalized home. Sections top to bottom:

1. **Active order banner** — if user has an order in `pending | accepted | picked_up` status, show a pulsing orange strip with restaurant name, current status, and link to `/orders/[id]`. Detected via Firestore query: `where("customerId","==",uid), where("status","in",["pending","accepted","picked_up"])`, limit 1.

2. **"For you" restaurant row** — horizontal scroll of top 6 restaurants in user's zone sorted by `rating desc`. Each card is `RestaurantCard` from Sub-project 1. Links to `/restaurants/[id]`.

3. **Recent orders** — last 3 orders, each showing restaurant name, item count, total, status badge, and a "Re-order" button that pre-fills the cart.

4. **Quick Order Form** — existing `OrderForm` component stays below for legacy-style ordering.

The current dashboard already has a rich UI. Steps 1–3 are injected above the existing content.

---

## Community Dashboard (`/community`)

A separate social-feel discovery page — distinct from `/restaurants` (which is a utility grid). Three sections:

### Trending Now
Top 5 restaurants sorted by `social_feed/{id}.trendingScore` descending. Each card shows the restaurant's `RestaurantCard` plus an overlay badge: "🔥 {recentOrderCount} orders today". Clicking goes to `/restaurants/[id]`.

### Popular Items
Horizontal scrollable strip of top 8 `popular_items` docs sorted by `averageRating desc`. Each chip shows item image, name, price, and star rating. Clicking navigates to the restaurant's menu page.

### New This Month
Restaurants with `createdAt` within the last 30 days. Shows up to 6 in a 2-col grid with a "New" badge on the card.

`social_feed` is updated by a Firestore Cloud Function (`onDocumentCreated("orders/{id}")`) that:
1. Increments `social_feed/{restaurantId}.trendingScore` by 1
2. Increments `recentOrderCount` by 1
3. Sets `updatedAt` to now

A scheduled Cloud Function resets `recentOrderCount` to 0 every 24h (cron: `every 24 hours`).

---

## Favorites

`users/{uid}.favorites` is a `string[]` of restaurantId values stored on the user doc.

**Toggle:** A heart `IconButton` appears on every `RestaurantCard`. When clicked:
- If not favorited: `arrayUnion(restaurantId)` on `users/{uid}.favorites`
- If favorited: `arrayRemove(restaurantId)` from `users/{uid}.favorites`

**`/favorites` page:** Reads `user.favorites[]`, then fetches each restaurant doc in parallel with `Promise.all(ids.map(getRestaurant))`. Renders them in a `RestaurantGrid`.

**Hook:** `useFavorites(uid)` — `onSnapshot` listener on the user doc, returns `{ favorites: string[], toggle(id): void }`. Used by both `RestaurantCard` (heart state) and `/favorites` page.

---

## Saved Addresses

`users/{uid}.savedAddresses` is an array (max 5) of address objects with a generated `id` (use `crypto.randomUUID()`).

**`/profile/addresses` page:**
- Lists saved addresses as cards with label, address text, note, and default badge
- "Add address" button opens an inline form: label selector (Home/Dorm/Office/Custom), address text field, optional note, set-as-default toggle
- Edit and delete actions per card
- All writes use `updateDoc` with the full updated array (no subcollection needed at this scale)

**Checkout integration:** When user has saved addresses, `/checkout` (Sub-project 1) shows a "Saved addresses" dropdown above the manual address input. Selecting one fills the address field. (Modify `app/checkout/page.tsx` to read `user.savedAddresses` and render the dropdown.)

**Labels:** Predefined options: "Home", "Dorm", "Office" + "Other" (free text). Dorm addresses show a building/room field as the note.

---

## Reviews & Ratings

**Trigger:** When `/orders/[id]` detects `status === "delivered"` and `orderId` is NOT in `user.reviewedOrderIds`, show a "Rate your order" card below the timeline.

**`/orders/[id]/review` page:** Simple form:
- Star picker (1–5, tap to select)
- Comment textarea (optional, max 300 chars)
- Submit button

**On submit:**
1. Write `users/{uid}/reviews/{reviewId}` doc
2. `arrayUnion(orderId)` on `user.reviewedOrderIds`
3. Update `restaurants/{restaurantId}.rating` using a Firestore transaction: read current `rating` and `reviewCount`, calculate new rolling average: `newRating = (currentRating * reviewCount + newRating) / (reviewCount + 1)`, write back both fields
4. If item-level review is provided, update `popular_items/{itemId}.averageRating` similarly

**One review per order:** Enforced by checking `user.reviewedOrderIds` before showing the review prompt and before writing.

---

## Referral System

### Code Generation
On registration (`app/register/page.tsx`), after `createUserWithEmailAndPassword` succeeds, generate a referral code and write the user doc:
```ts
const referralCode = Math.random().toString(36).slice(2, 8).toUpperCase(); // e.g. "A3KX9Z"
await setDoc(doc(db, "users", uid), {
  referralCode,
  referralCredits: 0,
  reviewedOrderIds: [],
  favorites: [],
  savedAddresses: [],
}, { merge: true });
```

### Referral Link
`/referral` page shows:
- The user's code in a large display + copy button
- Share link: `https://atlaasgo.ma/register?ref={code}` with copy + native share API
- Current credits balance: "{credits} MAD available"
- How it works: "Share your code → friend places first order → you get 20 MAD"

### Referee Registration
In `app/register/page.tsx`, on mount read `?ref=CODE` URL param. After successful registration, look up the referrer:
```ts
const snap = await getDocs(query(collection(db, "users"), where("referralCode", "==", code), limit(1)));
if (!snap.empty) {
  await updateDoc(doc(db, "users", newUser.uid), { referredBy: snap.docs[0].id });
}
```

### Credit Award
A Firestore Cloud Function `onDocumentCreated("orders/{id}")` checks:
1. Is this the customer's first order? (`orderCount === 1` on user doc — increment a `orderCount` field each order)
2. Does the customer have a `referredBy` uid?
3. If both true: `increment(20)` on `users/{referredBy}.referralCredits` and write a notification doc

### Credit at Checkout
`/checkout` page: if `user.referralCredits > 0`, show a toggle "Use {credits} MAD credit". If toggled:
- `useCredit = Math.min(referralCredits, total)`
- Final total = `total - useCredit`
- On order submit: `increment(-useCredit)` on `user.referralCredits`
- Store `creditUsed: number` on the order doc

---

## Notifications Center

### Writing Notifications
On order status changes (in `lib/orders.ts` `transitionOrder`), after the Firestore update, write a notification doc:
```ts
await addDoc(collection(db, "users", customerId, "notifications"), {
  type: "order_status",
  title: statusTitle[to],    // e.g. "Driver on the way!"
  body: statusBody[to],
  read: false,
  link: `/orders/${orderId}`,
  createdAt: new Date().toISOString(),
});
```

Title/body map:
- `accepted` → "Driver on the way! 🛵" / "Your driver has accepted your order"
- `picked_up` → "Order picked up 📦" / "Your order is en route"
- `delivered` → "Delivered! ✅" / "Your order has arrived. Enjoy!"

### `/notifications` Page
- Lists notifications newest-first with `onSnapshot`
- Unread shown with orange left border + light orange background
- Clicking a notification: marks it `read: true`, navigates to `link` if present
- "Mark all read" button: batch write all unread docs to `read: true`

### Unread Badge
`FloatingNavbar` gets a bell icon with an unread count badge. `useNotifications(uid)` hook returns `unreadCount` via `onSnapshot` with `where("read","==",false)` query.

---

## Customer Settings (`/profile/settings`)

Single page with three sections:

**Profile:**
- Display name — text input, saves to `auth.currentUser.updateProfile({ displayName })` + `updateDoc(users/uid, { name })`
- Phone — read-only display (set via Firebase Auth)
- Email — read-only display

**Preferences:**
- Zone — select between "Ifrane" and "Oujda", saves to `users/{uid}.zone`

**Account:**
- "Delete my account" — confirmation modal → `auth.currentUser.delete()` + `deleteDoc(users/uid)`

---

## New Files

### Hooks
- `hooks/useFavorites.ts` — real-time favorites array + toggle function
- `hooks/useNotifications.ts` — real-time unread count + notifications list
- `hooks/useSavedAddresses.ts` — saved addresses array + add/edit/delete helpers

### Lib
- `lib/referral.ts` — `generateReferralCode()`, `applyReferralOnRegister(code, newUid)`, `awardReferralCredit(referrerId, amount)`
- `lib/reviews.ts` — `submitReview(uid, orderId, restaurantId, rating, comment)` with rolling average transaction

### Components
- `components/StarPicker.tsx` — interactive 1–5 star selector
- `components/NotificationItem.tsx` — single notification row
- `components/AddressCard.tsx` — saved address display card
- `components/AddressForm.tsx` — add/edit address inline form
- `components/ReferralCard.tsx` — code display + share button

### Pages
- `app/community/page.tsx`
- `app/favorites/page.tsx`
- `app/notifications/page.tsx`
- `app/referral/page.tsx`
- `app/profile/addresses/page.tsx`
- `app/profile/settings/page.tsx`
- `app/orders/[id]/review/page.tsx`

### Cloud Functions
- `functions/src/onOrderCreated.ts` — increments `social_feed` trendingScore + awards referral credit on first order
- `functions/src/resetDailyOrderCounts.ts` — scheduled function, resets `recentOrderCount` every 24h

> **Note:** Cloud Functions require Firebase Blaze (paid) plan. If Blaze is not active, move the `onOrderCreated` logic inline into `lib/orders.ts` `transitionOrder` and skip the scheduled reset (reset on-read instead: treat counts older than 24h as 0).

### Modified
- `app/dashboard/page.tsx` — add active order banner, restaurant row, recent orders
- `app/register/page.tsx` — generate referralCode on signup, apply `?ref=` param
- `app/checkout/page.tsx` — saved addresses dropdown + referral credit toggle
- `components/FloatingNavbar.tsx` — add notifications bell with unread badge
- `components/RestaurantCard.tsx` — add heart toggle using `useFavorites`
- `lib/orders.ts` — write notification doc after `transitionOrder`
- `firestore.rules` — add rules for reviews, notifications subcollections

---

## Testing

Unit tests (`__tests__/`):
- `referral.test.ts` — `generateReferralCode()` produces 6-char alphanumeric, unique across calls
- `reviews.test.ts` — rolling average calculation: `submitReview` math is correct

Manual checklist:
- [ ] Heart toggle on RestaurantCard persists across page refresh
- [ ] `/favorites` shows only favorited restaurants
- [ ] Saved address appears in `/checkout` dropdown
- [ ] Referral code in `?ref=` URL is captured and stored on new user
- [ ] Referral credit appears after referee places first order
- [ ] Credit deducted correctly at checkout
- [ ] Review prompt appears after delivery, disappears after submitted
- [ ] Restaurant rating updates after review
- [ ] Notifications appear in `/notifications` with correct titles
- [ ] Unread count badge shows in FloatingNavbar

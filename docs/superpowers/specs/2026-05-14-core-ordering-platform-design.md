# AtlaasGo — Sub-project 1: Core Ordering Platform Design

## Goal

Transform AtlaasGo from a single-zone delivery MVP into a full multi-restaurant ordering platform. Customers can discover restaurants by cuisine, browse menus, build a cart (alone or collaboratively), check out with delivery details, and track their live order status.

## Architecture

Firebase Firestore is the single data store. All UI state that must persist across devices (cart, order) lives in Firestore. Ephemeral UI state (selected cuisine filter, scroll position) lives in React component state. Next.js 16 App Router with client components where real-time listeners are needed.

## Tech Stack

- Next.js 16 App Router, React 19, TypeScript
- Firebase Firestore (real-time `onSnapshot` for cart and order tracking)
- Tailwind CSS v4, Framer Motion
- Existing: `types/order.ts`, `lib/orders.ts`, `lib/pricing.ts`, `constants/zones.ts`

---

## Firestore Schema

### `restaurants/{restaurantId}`
```ts
{
  id: string;
  name: string;
  description: string;
  cuisine: string[];           // ["moroccan", "italian", "chinese", ...]
  coverImage: string;          // URL
  logoImage: string;           // URL
  zone: string;                // "ifrane" | "oujda"
  isOpen: boolean;
  rating: number;              // 0–5, 1 decimal
  reviewCount: number;
  deliveryFee: number;         // MAD
  minOrder: number;            // MAD
  estimatedDeliveryMins: number;
  address: string;
  coordinates: { lat: number; lng: number };
  tags: string[];              // ["popular", "new", "top-rated"]
  createdAt: string;           // ISO timestamp
}
```

### `restaurants/{restaurantId}/categories/{categoryId}`
```ts
{
  id: string;
  name: string;       // "Starters", "Mains", "Desserts", "Drinks"
  sortOrder: number;
}
```

### `restaurants/{restaurantId}/categories/{categoryId}/items/{itemId}`
```ts
{
  id: string;
  name: string;
  description: string;
  price: number;          // MAD
  image: string;          // URL
  available: boolean;
  tags: string[];         // ["vegetarian", "spicy", "popular"]
  sortOrder: number;
}
```

### `carts/{cartId}`
```ts
{
  id: string;
  restaurantId: string;
  ownerId: string;                          // Firebase Auth uid
  participants: string[];                   // all uid's who joined
  participantNames: Record<string, string>; // uid -> display name
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    addedBy: string;   // uid
    note?: string;     // per-item note
  }[];
  status: "active" | "checked_out";
  createdAt: string;
  updatedAt: string;
}
```

### `orders/{orderId}` — extends existing schema with:
```ts
{
  // ... existing fields (customerId, driverId, status, zone, fee, etc.)
  restaurantId: string;
  cartId?: string;
  restaurantName: string;
  deliveryAddress: string;
  deliveryAddressNote?: string;
  scheduledFor?: string;    // ISO timestamp; absent = ASAP
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    note?: string;
  }[];
  subtotal: number;         // sum of items × qty
  deliveryFee: number;
  total: number;            // subtotal + deliveryFee + surgeFee
}
```

---

## Pages & Routing

### `/restaurants` — Discovery Page
- Cuisine filter bar: multi-select chips (All, Moroccan, Italian, Chinese, Fast Food, Healthy, Desserts)
- Restaurant grid: 2-col mobile, 3-col tablet, 4-col desktop
- Each card: cover image, logo, name, cuisine tags, rating, delivery fee, ETA, open/closed badge
- Filters are URL params (`?cuisine=moroccan,italian`) for shareability
- Firestore query: `collection("restaurants")` with `where("zone", "==", userZone)` + `where("isOpen", "==", true)` optionally

### `/restaurants/[id]` — Menu Page
- Hero: cover image + restaurant info (name, rating, ETA, delivery fee, min order)
- Sticky category nav: horizontal scrollable tabs (Starters, Mains, Desserts, Drinks)
- Menu grid: items in scrollable sections, each with image, name, description, price, "Add" button
- Quick-order sidebar (desktop): floats right, shows cart items with qty controls, group order banner, subtotal, "Go to Checkout" CTA
- Mobile: sidebar collapses to sticky bottom bar showing item count + subtotal + CTA

### `/checkout` — Checkout Page
- Cart summary (read-only item list)
- Delivery address input (text field + optional "Drop a pin" map)
- Scheduled delivery toggle: ASAP (default) or pick date/time
- Order notes (one field for the whole order)
- Group order participant list (avatars + names)
- Fee breakdown: subtotal, delivery fee, surge (if active), total
- "Place Order" button → creates order doc, marks cart as checked_out

### `/orders/[id]` — Order Tracking Page
- Live vertical timeline: Pending → Accepted → Picked Up → Delivered
- Each completed step shows its timestamp
- Active step pulses with orange animation
- Restaurant name + item count summary at top
- Re-order button at bottom once delivered

### Updated: `/` (Landing Page)
- Add "Browse Restaurants" primary CTA button linking to `/restaurants`
- Existing 3D hero, zone cards, and feature sections remain

### Updated: `/dashboard` (Customer Dashboard)
- Add "Continue where you left off" active order card (if order in flight)
- Add "Recommended" horizontal restaurant scroll row
- Existing order history remains below

---

## Cart System & Group Ordering

### CartContext (`contexts/CartContext.tsx`)
Wraps a Firestore `carts/{cartId}` document. Exposes:
- `cart: Cart | null`
- `addItem(restaurantId, item)` — creates cart doc if none exists; blocks adding from a different restaurant (shows confirmation modal to clear cart)
- `removeItem(itemId)`
- `updateQty(itemId, qty)`
- `clearCart()`
- `shareGroupOrderLink(): string` — returns `window.location.origin + /restaurants/${restaurantId}?cart=${cartId}`
- `joinGroupOrder(cartId)` — adds current uid to `participants[]` and `participantNames`

### Cart Persistence
On mount, `CartContext` reads `cartId` from `localStorage`. If found, attaches `onSnapshot` to `carts/{cartId}`. If cart status is `checked_out`, clears `localStorage` and resets.

### Group Order Flow
1. Owner opens restaurant page → adds first item → cart doc created, cartId saved to localStorage
2. Owner taps **"Invite to Group Order"** → copies share link to clipboard
3. Friend opens link → `?cart=cartId` param detected → CartContext calls `joinGroupOrder(cartId)`
4. Both see the same cart in real-time — each item shows the avatar of who added it
5. Owner goes to `/checkout` → reviews all items from all participants → places order
6. After checkout: cart status = `checked_out`, all participants see "Order placed!" banner

### Switching Restaurants
If a user tries to add from a different restaurant while a cart exists, show a modal:
> "Your cart has items from [Restaurant A]. Clear cart and start fresh with [Restaurant B]?"

---

## Checkout → Order Creation

`/checkout` reads the active cart from `CartContext`. On "Place Order":
1. Validate: delivery address not empty, cart not empty
2. Call `calculateSurgeFee(zone, pendingCount, onlineDriverCount)` for live fee
3. `addDoc(collection(db, "orders"), { ...cartItems, restaurantId, deliveryAddress, scheduledFor, total, status: "pending", statusHistory: [...] })`
4. `updateDoc(carts/cartId, { status: "checked_out" })`
5. Clear localStorage cartId
6. `router.push("/orders/" + orderId)`

---

## Order Tracking

`/orders/[id]` attaches `onSnapshot` to `orders/{orderId}`. Renders timeline steps based on `order.statusHistory`. Each step in the timeline:
- Icon (clock, check, truck, home)
- Label ("Order Placed", "Accepted by Driver", "Picked Up", "Delivered")
- Timestamp (from `statusHistory` entry)
- Pulse animation on the current active step (Framer Motion)

Uses existing `OrderStatus` type: `pending | accepted | picked_up | delivered | cancelled | expired`

---

## New Files

### Types
- `types/restaurant.ts` — `Restaurant`, `MenuCategory`, `MenuItem`
- `types/cart.ts` — `Cart`, `CartItem`

### Lib
- `lib/restaurants.ts` — `getRestaurants(zone, cuisines[])`, `getRestaurant(id)`, `getMenu(restaurantId)`, `getMenuCategory(restaurantId, categoryId)`. Also exports `CUISINE_TYPES = ["moroccan", "italian", "chinese", "fast-food", "healthy", "desserts", "other"]` — the canonical list used by both the filter bar and restaurant documents.
- `lib/cart.ts` — `createCart(restaurantId, ownerId)`, `addCartItem(cartId, item)`, `removeCartItem(cartId, itemId)`, `updateCartItemQty(cartId, itemId, qty)`, `joinCart(cartId, uid, name)`, `checkoutCart(cartId)`

### Context
- `contexts/CartContext.tsx`

### Components
| File | Responsibility |
|------|---------------|
| `components/RestaurantCard.tsx` | Cover image, rating, ETA, cuisine chips, open badge |
| `components/CuisineFilterBar.tsx` | Multi-select chip filters, synced with URL params |
| `components/RestaurantGrid.tsx` | Responsive grid, loading skeletons |
| `components/MenuCategoryNav.tsx` | Sticky horizontal tab nav, scrolls to section |
| `components/MenuSection.tsx` | Category heading + item grid |
| `components/MenuItem.tsx` | Image, name, price, Add button, per-item note |
| `components/CartSidebar.tsx` | Floating sidebar (desktop) / sticky bottom bar (mobile) |
| `components/GroupOrderBanner.tsx` | Participant avatars, invite link copy button |
| `components/CheckoutForm.tsx` | Address, schedule picker, notes, fee breakdown |
| `components/OrderTimeline.tsx` | Vertical status steps with timestamps |
| `components/AddressInput.tsx` | Text input + optional map pin drop |

### Pages
- `app/restaurants/page.tsx`
- `app/restaurants/[id]/page.tsx`
- `app/checkout/page.tsx`
- `app/orders/[id]/page.tsx`

### Scripts
- `scripts/seed-restaurants.ts` — seeds 5 initial restaurants with categories and items into Firestore. Run once: `npx tsx scripts/seed-restaurants.ts`

### Firestore Rules additions
```
match /restaurants/{id} {
  allow read: if true;
  allow write: if isAdmin();
  match /categories/{catId} {
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
  allow create: if isSignedIn() && request.auth.uid == request.resource.data.ownerId;
  allow update: if isSignedIn() && (
    request.auth.uid == resource.data.ownerId ||
    request.auth.uid in resource.data.participants
  );
}
```

---

## Testing

Unit tests (`__tests__/`):
- `cart.test.ts` — `createCart`, `addCartItem`, `removeCartItem`, `updateCartItemQty` logic
- `restaurants.test.ts` — cuisine filter logic, zone filtering

No E2E tests in this sub-project. Manual testing checklist:
- [ ] Restaurant grid shows filtered results by cuisine
- [ ] Adding items from two restaurants triggers clear-cart modal
- [ ] Group order share link works — second user sees same cart in real-time
- [ ] Checkout creates order doc and clears cart
- [ ] Order tracking page updates live when driver changes status

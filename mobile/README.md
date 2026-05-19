# AtlaasGo Mobile (Expo) — ⏸ PAUSED

> **Status:** This project is paused. The active production target is the
> web app at the worktree root, backed by Supabase. This codebase still
> imports `firebase`/`@react-native-firebase` packages and will need a port
> to `@supabase/supabase-js` (and `expo-auth-session` for OAuth) before it
> runs again. The 3 screens (category grid, progress timeline, landmark
> checkout) are preserved as-is for when the mobile track resumes.

React Native + Expo SDK 54 + NativeWind v4 + Moti/Reanimated + Firestore.

## Quick start (with local dev backend)

```bash
# terminal 1 — start Firestore emulator + seed
cd backend
npm install
npm run emulators           # http://localhost:4000 for the UI
# terminal 2
cd backend && npm run seed  # categories, partners, demo orders

# terminal 3 — run the mobile app
cd mobile
cp .env.example .env        # EXPO_PUBLIC_USE_EMULATOR=true is already set
npm install
npx expo start              # press i / a / w
```

See [`../backend/README.md`](../backend/README.md) for the backend details.

## Quick start (with production Firebase)

```bash
cd mobile
cp .env.example .env        # set EXPO_PUBLIC_USE_EMULATOR=false, fill EXPO_PUBLIC_FIREBASE_*
npm install
npx expo start
```

## Features in this prototype

### 1. Category grid — [`components/CategoryGrid.tsx`](components/CategoryGrid.tsx)
High-performance vertical grid for Food / Pharmacy / Groceries. Non-collision
scale-on-tap: pressed card scales to **1.05**, all other cards recede to **0.92**
and dim to **0.55 opacity** simultaneously. The interaction uses scale only —
never translate — so neighbours can't collide. Entry stagger is 80ms + 90ms × index.

### 2. 5-segment progress timeline — [`components/ProgressTimeline.tsx`](components/ProgressTimeline.tsx)
Vertical timeline with `ordered → preparing → enRoute → outForDelivery → arriving`.
The connector line between segments animates its height via Moti when the stage
advances. The active segment renders a [`Pulse`](components/primitives/Pulse.tsx)
component — a static dot with an outward-fading ring on a 1.6s loop.

### 3a. Driver assignment view — [`app/driver/[id].tsx`](app/driver/[id].tsx)
Reads the same order doc; surfaces `driverPayload.headerLandmark` as the dominant
header element (24px Montserrat 800 over the brand-dark background, the
GeoPoint shown in mono underneath). Single sticky CTA advances the order to
the next stage via [`useAdvanceOrder`](hooks/useAdvanceOrder.ts), proving the
mirrored landmark field is the load-bearing route for the driver app.

### 3b. Dev orders index — [`app/orders.tsx`](app/orders.tsx)
Live list of recent orders (streamed via [`useOrdersList`](hooks/useOrdersList.ts))
with side-by-side "Customer view" / "Driver view" buttons per row. Use it to
flip between perspectives on a single device so the real-time update loop is
demonstrable during review.

### 3. Landmark checkout — [`app/checkout.tsx`](app/checkout.tsx)
Mandatory `landmark` text field (min 3 chars) with Moroccan-style suggestions
("Near the Grand Mosque", "Behind the Telecom Shop", …). GPS coords captured
via `expo-location` are shown alongside. On submit, `useCreateOrder` writes:

```ts
{
  status: 'ordered',
  coords: { lat, lng, accuracyM },
  landmark: string,
  driverPayload: {
    headerLandmark: landmark,            // mirrored
    coords: new GeoPoint(lat, lng),      // Firestore GeoPoint
    deliveryNotes?: string,
  },
  …
}
```

The mirrored `driverPayload.headerLandmark` is the field the driver app's
assignment header reads — keeps the read path single-doc, no joins.

## Architecture

```
mobile/
├── app/                         expo-router file routes
│   ├── _layout.tsx              root stack, gesture-handler, safe-area, global.css
│   ├── index.tsx                category grid screen
│   ├── checkout.tsx             landmark + GPS checkout
│   ├── orders.tsx               dev orders index (customer ↔ driver toggle)
│   ├── order/[id].tsx           live order timeline (customer)
│   └── driver/[id].tsx          driver assignment payload + advance CTA
│
├── components/
│   ├── CategoryGrid.tsx         active-id state, recede orchestration
│   ├── CategoryCard.tsx         entry stagger + scale/recede + gradient + emoji
│   ├── ProgressTimeline.tsx     5 segments + animated connector fill
│   ├── ProgressSegment.tsx      done / current / pending state
│   ├── LandmarkInput.tsx        validated text + GPS strip + suggestions
│   └── primitives/
│       ├── Pulse.tsx            looping radial ring (Moti, no Reanimated boilerplate)
│       └── PressableScale.tsx   scale-on-press wrapper (no recede)
│
├── hooks/
│   ├── useCategories.ts         Firestore onSnapshot, fallback to static when unconfigured
│   ├── useOrderStatus.ts        live order snapshot + useDemoOrderProgress timer fallback
│   ├── useOrdersList.ts         live list of recent orders for the dev index
│   ├── useLocation.ts           expo-location permission + capture
│   ├── useCreateOrder.ts        addDoc with driverPayload mirror
│   └── useAdvanceOrder.ts       driver mutation: advanceTo / advanceFrom
│
├── lib/
│   ├── types.ts                 Order, OrderStage, DriverPayload, Category
│   ├── theme.ts                 brand tokens + STAGE_LABELS
│   └── firestore.ts             collection refs with typed converters
│
├── firebaseConfig.ts            env-driven Firestore init
├── .env.example                 EXPO_PUBLIC_FIREBASE_* keys
├── tailwind.config.js           NativeWind preset + brand colours
├── babel.config.js              babel-preset-expo + nativewind/babel
├── metro.config.js              withNativeWind(input: './global.css')
└── global.css                   @tailwind base/components/utilities
```

## Firestore schema

### `categories/{key}`
```ts
{
  id: 'food' | 'pharmacy' | 'groceries',
  label, tagline, emoji,
  gradient: [string, string],
  partnerCount: number,
}
```

### `orders/{orderId}`
```ts
{
  customerId, category, totalDh,
  status: 'ordered' | 'preparing' | 'enRoute' | 'outForDelivery' | 'arriving' | 'delivered',
  createdAt: serverTimestamp(),
  coords: { lat, lng, accuracyM? },
  landmark: string,                     // mandatory, ≥3 chars
  driverPayload: {
    headerLandmark: string,             // = landmark
    coords: GeoPoint,                   // Firestore GeoPoint
    deliveryNotes?: string,
  },
}
```

## Without Firebase

Both hooks degrade gracefully when env vars aren't set:
- `useCategories` returns a static fallback of the 3 categories.
- `useCreateOrder` returns `null` on failure; `checkout.tsx` then routes to a
  `demo-…` order id which is handled by `useDemoOrderProgress` — a timer that
  walks the timeline through all 5 stages so reviewers can see the animation.

## Verified

- `npx tsc --noEmit` → exit 0
- `npx expo export --platform ios` → ~3600 modules, 7.39 MB hbc, no errors
- `npx expo export --platform android` → same
- **Live-update loop** (against Firestore emulator + seeded data): driver-side
  `updateDoc({status: …})` reaches the customer-side `onSnapshot` listener for
  every stage transition. See [`../backend/listen-test.ts`](../backend/listen-test.ts)
  in the smoke-test record.

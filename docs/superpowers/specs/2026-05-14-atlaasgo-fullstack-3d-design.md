# AtlaasGo — Full-Stack 3D Redesign

**Date:** 2026-05-14  
**Status:** Approved  
**Stack:** Next.js 15, React Three Fiber, Tailwind CSS v4, Firebase Auth + Firestore, FCM, WhatsApp Business API

---

## Approach

Foundation-first, then parallel feature tracks.

1. **Phase 1 — Foundation:** Shared R3F component library + backend schema/state machine
2. **Phase 2 — Parallel:** Frontend 3D pages (Track A) + Backend engine (Track B) built simultaneously

---

## Architecture

### Frontend

```
lib/r3f/
  canvas.tsx          → global R3F canvas config, renderer settings
  lighting.tsx        → shared lighting presets (ambient, directional, point)
  materials.ts        → shared MeshStandardMaterial, MeshReflectorMaterial configs

components/3d/
  SceneCanvas.tsx     → global R3F canvas wrapper with post-processing
  DeliveryOrb.tsx     → order status sphere (color/pulse by state, orbiting particles)
  MountainScene.tsx   → low-poly Atlas mountains with animated clouds
  CityMap3D.tsx       → flat 3D city map (Ifrane/Oujda), driver dot, route TubeGeometry
  TruckModel.tsx      → animated delivery truck (header + driver page)
  ParticleField.tsx   → ambient background particle system
  BarChart3D.tsx      → earnings bar chart using BoxGeometry
  DonutChart3D.tsx    → stats donut chart using TorusGeometry
```

### Backend

```
lib/
  orders.ts           → order state machine + Firestore transition helpers
  zones.ts            → zone registry (coordinates, fees, surge, polygon)
  notifications.ts    → FCM push dispatch + WhatsApp Business API templates
  pricing.ts          → dynamic fee calculation with surge multiplier (update existing)

firestore.rules       → hardened per-role security rules
functions/
  onOrderCreated.ts   → calculate fee + surgeFee, write to order doc
  onOrderExpired.ts   → scheduled: expire pending orders older than 10 min
```

---

## Firestore Schema

### `orders/{orderId}`
```ts
{
  customerId: string
  driverId: string | null
  zone: string
  pickup: string
  dropoff: string
  description: string
  status: "pending" | "accepted" | "picked_up" | "delivered" | "cancelled" | "expired"
  statusHistory: { status: string; timestamp: Timestamp; actorId: string }[]
  fee: number
  surgeFee: number
  createdAt: Timestamp
  acceptedAt: Timestamp | null
  pickedUpAt: Timestamp | null
  deliveredAt: Timestamp | null
}
```

### `users/{uid}`
```ts
{
  name: string
  email: string
  phone: string | null
  role: "customer" | "driver" | "admin"
  zone: string
  fcmToken: string | null   // new — for push notifications
  createdAt: string
}
```

### `zones/{zoneId}`
```ts
{
  name: string
  baseFee: number
  surgeMultiplier: number   // e.g. 1.5
  polygon: GeoPoint[]
  active: boolean
}
```

---

## Order State Machine

```
created → pending → accepted → picked_up → delivered
                ↘ cancelled  (customer or admin, any state before delivered)
                ↘ expired    (pending > 10 min, no driver accepted)
```

Each transition:
- Updates `status` field
- Appends to `statusHistory[]` with timestamp + actorId
- Triggers notification to relevant party

---

## Dynamic Pricing

- Base fee from zone config (`lib/zones.ts`)
- Surge trigger: `pendingOrders / onlineDrivers > 2.0` → apply `surgeMultiplier`
- Calculated in `onOrderCreated` Cloud Function at order creation time
- `surgeFee` stored separately on order doc for transparency

---

## Notifications

### Push (FCM)
- Driver receives push when new order appears in their zone
- Customer receives push on: accepted, picked_up, delivered, cancelled

### WhatsApp Business API
- Template: `driver_accepted` → "Your AtlaasGo driver is on their way!"
- Template: `driver_picked_up` → "Your order has been picked up."
- Template: `order_delivered` → "Your order has been delivered. Rate your experience."
- Fallback: existing WhatsApp link if API unavailable

### Tab Alert
- Keep existing `lib/tabAlert.ts` as in-browser fallback when app is open

---

## Firestore Security Rules

| Role | Orders | Users |
|---|---|---|
| Customer | Read/write own orders | Read/write own profile |
| Driver | Read pending orders in own zone; write status on accepted orders | Read own profile |
| Admin | Read all; write status + cancel only | Read all |
| Public | None | None |

---

## 3D Frontend — Page Designs

### Landing Page (`/`)
- **Hero:** Full-viewport R3F canvas — low-poly Atlas mountains, animated clouds, location pin drops with spring physics. Camera dolly-zoom on load.
- **Scroll parallax:** Mountains recede on scroll, text layers float at different Z depths (Framer Motion scroll hooks + R3F camera offset)
- **Zone cards:** 3D city tiles (Ifrane/Oujda) with Drei `Float` + `MeshReflectorMaterial`, tilt on hover
- **CTA buttons:** Subtle 3D press depth effect with contact shadow

### Customer Dashboard (`/dashboard`)
- **DeliveryOrb:** Glowing sphere changes color/pulse by order state:
  - `pending` → orange pulse
  - `accepted` → blue steady glow
  - `picked_up` → cyan fast pulse
  - `delivered` → green burst + confetti
- **Orbiting particles:** Speed up as driver approaches (based on estimated distance)
- **Order form:** Glassmorphism card floating above Drei `ContactShadows` surface
- **CityMap3D:** Real-time driver dot moves via Firestore listener, route drawn with `TubeGeometry`

### Driver Dashboard (`/driver`)
- **Order cards:** R3F bloom post-processing on new order ping (replaces CSS `animate-order-ping`)
- **TruckModel:** Animated delivery truck in header, bounces when driver goes online
- **BarChart3D:** Earnings bar chart with BoxGeometry, animates in on new delivery
- **Status indicators:** 3D orbs per order showing state

### Admin Dashboard (`/admin`)
- **Birds-eye CityMap3D:** All active orders as glowing dots, real-time via Firestore
- **DonutChart3D:** Delivery success rate, zone volume (TorusGeometry)
- **Order table:** Existing table + 3D status indicator column

---

## Dependencies to Add

```json
"@react-three/fiber": "^8.x",
"@react-three/drei": "^9.x",
"@react-three/postprocessing": "^2.x",
"three": "^0.x",
"firebase-admin": "^12.x",
"firebase-functions": "^5.x"
```

---

## Out of Scope

- Payment processing (cash on delivery remains)
- Customer ratings/reviews
- Driver onboarding flow
- Multi-language support

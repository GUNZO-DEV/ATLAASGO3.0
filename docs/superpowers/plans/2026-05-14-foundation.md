# AtlaasGo — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install React Three Fiber, update the order type system (pending → accepted → picked_up → delivered | cancelled | expired), create shared 3D primitives, and update the zone/pricing libraries — giving Phase 2 (frontend) and Phase 3 (backend) a solid, tested foundation to build on.

**Architecture:** Pure logic (state machine, pricing, zones) is fully tested with Vitest. 3D components are visual-only and not unit-tested. All status string changes are search-replaced across the codebase to avoid runtime mismatches.

**Tech Stack:** Next.js 16, React 19, React Three Fiber 8, @react-three/drei 9, @react-three/postprocessing 2, three.js, Tailwind CSS v4, Firebase, Vitest

---

## File Map

### Created
- `vitest.config.ts` — Vitest config for Next.js
- `types/order.ts` — updated OrderStatus union + Order interface
- `lib/orders.ts` — order state machine (transition helpers + validation)
- `lib/zones.ts` — zone registry with surge config (replaces constants/zones.ts for zone config, keeps LANDMARKS there)
- `lib/r3f/canvas.tsx` — global R3F canvas wrapper with post-processing
- `lib/r3f/lighting.tsx` — shared lighting presets
- `lib/r3f/materials.ts` — shared material configs
- `components/3d/ParticleField.tsx` — ambient background particles
- `components/3d/DeliveryOrb.tsx` — order status sphere (color/pulse by state)
- `components/3d/MountainScene.tsx` — low-poly Atlas mountains hero
- `components/3d/TruckModel.tsx` — animated delivery truck
- `components/3d/CityMap3D.tsx` — flat 3D city map with driver dot + route
- `components/3d/BarChart3D.tsx` — earnings bar chart using BoxGeometry
- `components/3d/DonutChart3D.tsx` — stats donut using TorusGeometry
- `__tests__/orders.test.ts` — state machine tests
- `__tests__/pricing.test.ts` — pricing + surge tests
- `__tests__/zones.test.ts` — zone lookup tests

### Modified
- `package.json` — add R3F, drei, postprocessing, three, vitest
- `lib/pricing.ts` — add surge multiplier support
- `app/driver/page.tsx` — `"assigned"` → `"accepted"` 
- `app/admin/dashboard/page.tsx` — `"assigned"` → `"accepted"`, add `"expired"`
- `firestore.rules` — `"assigned"` → `"accepted"`, add `"expired"` transition
- `constants/zones.ts` — add `ZONE_CONFIGS` export (keeps LANDMARKS, LANDMARK_COORDS)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install R3F + Vitest**

```bash
cd /Users/mbp/atlaasgo
npm install @react-three/fiber @react-three/drei @react-three/postprocessing three
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @types/three
```

Expected: No peer dep errors. `node_modules/three` and `node_modules/@react-three` appear.

- [ ] **Step 2: Verify installs**

```bash
node -e "require('@react-three/fiber'); console.log('R3F ok')"
node -e "require('three'); console.log('three ok')"
```

Expected: Both print "ok".

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add React Three Fiber, drei, postprocessing, Vitest"
```

---

## Task 2: Set Up Vitest

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create smoke test to verify setup**

```ts
// __tests__/smoke.test.ts
describe("vitest setup", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run smoke test**

```bash
npm test
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts __tests__/smoke.test.ts package.json
git commit -m "test: add Vitest config and smoke test"
```

---

## Task 3: Update Order Types

**Files:**
- Modify: `types/order.ts`

The existing status `"assigned"` is renamed to `"accepted"` throughout the codebase. We also add `"expired"` and `statusHistory`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/orders.test.ts
import { isValidTransition } from "@/lib/orders";

describe("isValidTransition", () => {
  it("allows pending → accepted", () => {
    expect(isValidTransition("pending", "accepted")).toBe(true);
  });
  it("allows accepted → picked_up", () => {
    expect(isValidTransition("accepted", "picked_up")).toBe(true);
  });
  it("allows picked_up → delivered", () => {
    expect(isValidTransition("picked_up", "delivered")).toBe(true);
  });
  it("allows pending → cancelled", () => {
    expect(isValidTransition("pending", "cancelled")).toBe(true);
  });
  it("allows accepted → cancelled", () => {
    expect(isValidTransition("accepted", "cancelled")).toBe(true);
  });
  it("allows pending → expired", () => {
    expect(isValidTransition("pending", "expired")).toBe(true);
  });
  it("rejects delivered → pending", () => {
    expect(isValidTransition("delivered", "pending")).toBe(false);
  });
  it("rejects accepted → pending", () => {
    expect(isValidTransition("accepted", "pending")).toBe(false);
  });
  it("rejects delivered → cancelled", () => {
    expect(isValidTransition("delivered", "cancelled")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- __tests__/orders.test.ts
```

Expected: FAIL — `lib/orders` not found.

- [ ] **Step 3: Update types/order.ts**

```ts
// types/order.ts
export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "expired";

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string; // ISO string
  actorId: string;
}

export interface OrderItem {
  description: string;
}

export interface Order {
  id?: string;
  customerId: string;
  driverId?: string;
  items: OrderItem[];
  pickup?: string;
  dropoff?: string;
  phone?: string;
  status: OrderStatus;
  zone: string;
  fee?: number;
  surgeFee?: number;
  statusHistory?: StatusHistoryEntry[];
  timestamp: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}
```

- [ ] **Step 4: Commit types**

```bash
git add types/order.ts
git commit -m "feat(types): add accepted/expired statuses, statusHistory, surgeFee"
```

---

## Task 4: Create Order State Machine

**Files:**
- Create: `lib/orders.ts`

- [ ] **Step 1: Implement lib/orders.ts**

```ts
// lib/orders.ts
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OrderStatus, StatusHistoryEntry } from "@/types/order";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ["accepted", "cancelled", "expired"],
  accepted:  ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
  expired:   [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function buildHistoryEntry(
  status: OrderStatus,
  actorId: string
): StatusHistoryEntry {
  return { status, timestamp: new Date().toISOString(), actorId };
}

/**
 * Transition an order to a new status in Firestore.
 * Validates the transition, appends to statusHistory, and writes
 * the relevant timestamp field (acceptedAt, pickedUpAt, deliveredAt).
 */
export async function transitionOrder(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  actorId: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }

  const entry = buildHistoryEntry(to, actorId);
  const timestampField: Record<OrderStatus, string | null> = {
    pending:   null,
    accepted:  "acceptedAt",
    picked_up: "pickedUpAt",
    delivered: "deliveredAt",
    cancelled: null,
    expired:   null,
  };

  const update: Record<string, unknown> = {
    status: to,
    [`statusHistory`]: [...[], entry], // caller must merge with existing array
    ...extra,
  };

  const tsField = timestampField[to];
  if (tsField) update[tsField] = entry.timestamp;

  await updateDoc(doc(db, "orders", orderId), update);
}
```

- [ ] **Step 2: Run tests**

```bash
npm test -- __tests__/orders.test.ts
```

Expected: 9 passed.

- [ ] **Step 3: Commit**

```bash
git add lib/orders.ts __tests__/orders.test.ts
git commit -m "feat: order state machine with transition validation"
```

---

## Task 5: Update Zones Library

**Files:**
- Modify: `constants/zones.ts` — add ZONE_CONFIGS
- Create: `__tests__/zones.test.ts`

- [ ] **Step 1: Write zone tests**

```ts
// __tests__/zones.test.ts
import { ZONE_CONFIGS, getZoneConfig } from "@/constants/zones";

describe("zones", () => {
  it("returns ifrane config", () => {
    const z = getZoneConfig("ifrane");
    expect(z.baseFee).toBe(15);
    expect(z.surgeMultiplier).toBeGreaterThan(1);
    expect(z.active).toBe(true);
  });

  it("returns oujda config", () => {
    const z = getZoneConfig("oujda");
    expect(z.baseFee).toBe(10);
  });

  it("throws for unknown zone", () => {
    expect(() => getZoneConfig("rabat")).toThrow("Unknown zone");
  });

  it("all active zones have polygon coords", () => {
    Object.values(ZONE_CONFIGS)
      .filter((z) => z.active)
      .forEach((z) => expect(z.centerLat).toBeDefined());
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- __tests__/zones.test.ts
```

Expected: FAIL — `getZoneConfig` not found.

- [ ] **Step 3: Add ZONE_CONFIGS to constants/zones.ts**

Append to the end of `constants/zones.ts`:

```ts
export interface ZoneConfig {
  id: string;
  name: string;
  baseFee: number;
  surgeMultiplier: number; // applied when demand/supply ratio > 2.0
  active: boolean;
  centerLat: number;
  centerLng: number;
}

export const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  ifrane: {
    id: "ifrane",
    name: "Ifrane",
    baseFee: 15,
    surgeMultiplier: 1.5,
    active: true,
    centerLat: 33.5228,
    centerLng: -5.1128,
  },
  oujda: {
    id: "oujda",
    name: "Oujda",
    baseFee: 10,
    surgeMultiplier: 1.5,
    active: true,
    centerLat: 34.6819,
    centerLng: -1.9086,
  },
};

export function getZoneConfig(zone: string): ZoneConfig {
  const config = ZONE_CONFIGS[zone.toLowerCase()];
  if (!config) throw new Error(`Unknown zone: ${zone}`);
  return config;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/zones.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add constants/zones.ts __tests__/zones.test.ts
git commit -m "feat(zones): add ZoneConfig, ZONE_CONFIGS, getZoneConfig"
```

---

## Task 6: Update Pricing with Surge Support

**Files:**
- Modify: `lib/pricing.ts`
- Create: `__tests__/pricing.test.ts`

- [ ] **Step 1: Write pricing tests**

```ts
// __tests__/pricing.test.ts
import { calculateFee, calculateSurgeFee, isSurge } from "@/lib/pricing";

describe("isSurge", () => {
  it("triggers when demand/supply > 2", () => {
    expect(isSurge(5, 2)).toBe(true);  // ratio = 2.5
  });
  it("does not trigger when ratio ≤ 2", () => {
    expect(isSurge(4, 2)).toBe(false); // ratio = 2.0
  });
  it("does not trigger with no drivers online (avoid div/0)", () => {
    expect(isSurge(5, 0)).toBe(false);
  });
});

describe("calculateSurgeFee", () => {
  it("applies surge multiplier when surging", () => {
    // ifrane base = 15, multiplier = 1.5 → 22.5 → rounds to 22.5
    const fee = calculateSurgeFee("ifrane", 5, 2);
    expect(fee).toBe(22.5);
  });
  it("returns base fee when not surging", () => {
    const fee = calculateSurgeFee("ifrane", 2, 2);
    expect(fee).toBe(15);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- __tests__/pricing.test.ts
```

Expected: FAIL — `isSurge` not found.

- [ ] **Step 3: Add surge functions to lib/pricing.ts**

Append to `lib/pricing.ts` (keep all existing code):

```ts
// ─── Surge pricing ────────────────────────────────────────────────────────────
import { getZoneConfig } from "@/constants/zones";

const SURGE_RATIO_THRESHOLD = 2.0;

/**
 * Returns true when pending orders outpace online drivers enough to trigger surge.
 */
export function isSurge(pendingOrders: number, onlineDrivers: number): boolean {
  if (onlineDrivers === 0) return false;
  return pendingOrders / onlineDrivers > SURGE_RATIO_THRESHOLD;
}

/**
 * Fee calculation for a new order with optional surge.
 * Surge is computed from live demand/supply counts (caller passes these in).
 * Result is rounded to nearest 0.5 MAD.
 */
export function calculateSurgeFee(
  zone: string,
  pendingOrders: number,
  onlineDrivers: number,
  at: Date = new Date()
): number {
  const config = getZoneConfig(zone);
  const base = isLateNight(at)
    ? config.baseFee * LATE_NIGHT_MULTIPLIER
    : config.baseFee;
  const multiplier = isSurge(pendingOrders, onlineDrivers)
    ? config.surgeMultiplier
    : 1;
  return Math.round(base * multiplier * 2) / 2;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/pricing.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing.ts __tests__/pricing.test.ts
git commit -m "feat(pricing): add isSurge, calculateSurgeFee with demand/supply ratio"
```

---

## Task 7: Migrate "assigned" → "accepted" Across Codebase

**Files:**
- Modify: `app/driver/page.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `firestore.rules`

- [ ] **Step 1: Rename in driver page**

In `app/driver/page.tsx`:
- Line with `where("status", "in", ["assigned", "picked_up"])` → `["accepted", "picked_up"]`
- Line with `status: "assigned"` → `status: "accepted"`
- Line with `updateDoc(..., { status: "assigned", driverId, assignedAt:...})` → `{ status: "accepted", driverId, acceptedAt: new Date(now).toISOString() }`

- [ ] **Step 2: Rename in admin page**

In `app/admin/dashboard/page.tsx`:
```ts
const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Pending",    color: "bg-yellow-100 text-yellow-700" },
  accepted:  { label: "Accepted",   color: "bg-blue-100 text-blue-700" },
  picked_up: { label: "On the Way", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Delivered",  color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled",  color: "bg-red-100 text-red-600" },
  expired:   { label: "Expired",    color: "bg-gray-100 text-gray-500" },
};
```

- [ ] **Step 3: Update firestore.rules**

Replace `"assigned"` with `"accepted"` in `firestore.rules`. The `driverAccept` function:

```
function driverAccept() {
  return callerIsOnline() &&
    resource.data.status == 'pending' &&
    request.resource.data.status == 'accepted' &&
    request.resource.data.driverId == request.auth.uid &&
    coreFieldsUnchanged();
}
```

The `driverProgress` function:

```
function driverProgress() {
  let isAssignedDriver = request.auth.uid == resource.data.driverId;
  let validTransition  =
    (resource.data.status == 'accepted'  && request.resource.data.status == 'picked_up') ||
    (resource.data.status == 'picked_up' && request.resource.data.status == 'delivered');
  return isAssignedDriver &&
    validTransition &&
    coreFieldsUnchanged() &&
    request.resource.data.driverId == resource.data.driverId;
}
```

- [ ] **Step 4: Search for any remaining "assigned" strings**

```bash
grep -r '"assigned"' /Users/mbp/atlaasgo/app /Users/mbp/atlaasgo/components /Users/mbp/atlaasgo/lib /Users/mbp/atlaasgo/types
```

Expected: No output (all occurrences replaced).

- [ ] **Step 5: Verify app still builds**

```bash
cd /Users/mbp/atlaasgo && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors related to OrderStatus.

- [ ] **Step 6: Commit**

```bash
git add app/driver/page.tsx app/admin/dashboard/page.tsx firestore.rules
git commit -m "feat: rename status 'assigned' → 'accepted' across codebase"
```

---

## Task 8: R3F Canvas Wrapper

**Files:**
- Create: `lib/r3f/canvas.tsx`
- Create: `lib/r3f/lighting.tsx`
- Create: `lib/r3f/materials.ts`

- [ ] **Step 1: Create lib/r3f/canvas.tsx**

```tsx
// lib/r3f/canvas.tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";
import { Preload } from "@react-three/drei";

interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
  camera?: { fov?: number; position?: [number, number, number] };
}

/**
 * Global R3F canvas with sensible defaults for AtlaasGo scenes.
 * Wrap any 3D scene with this component.
 */
export default function SceneCanvas({
  children,
  className = "absolute inset-0 w-full h-full",
  camera = { fov: 45, position: [0, 0, 8] },
}: SceneCanvasProps) {
  return (
    <Canvas
      camera={camera}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      className={className}
    >
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
```

- [ ] **Step 2: Create lib/r3f/lighting.tsx**

```tsx
// lib/r3f/lighting.tsx
"use client";

/**
 * Shared lighting presets. Import the one that matches the scene mood.
 */

/** Warm ambient + directional — used for the hero mountain scene */
export function HeroLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffd5aa" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        color="#fff4e0"
        castShadow
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#e05a23" />
    </>
  );
}

/** Cool blue ambient — used for the city map */
export function MapLighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#cce4ff" />
      <directionalLight position={[0, 10, 0]} intensity={0.8} color="#ffffff" />
    </>
  );
}

/** Dashboard neutral lighting */
export function DashboardLighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 4, 4]} intensity={0.6} color="#e05a23" />
    </>
  );
}
```

- [ ] **Step 3: Create lib/r3f/materials.ts**

```ts
// lib/r3f/materials.ts
import * as THREE from "three";

/** AtlaasGo brand orange — used for orbs, highlights */
export const brandOrangeMaterial = new THREE.MeshStandardMaterial({
  color: "#e05a23",
  roughness: 0.2,
  metalness: 0.1,
  emissive: "#e05a23",
  emissiveIntensity: 0.15,
});

/** Dark navy — used for mountain geometry */
export const navyMaterial = new THREE.MeshStandardMaterial({
  color: "#1e2d4a",
  roughness: 0.8,
  metalness: 0.0,
});

/** Glass-like material for map tiles */
export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#a8c5ff",
  roughness: 0.05,
  metalness: 0.0,
  transmission: 0.8,
  transparent: true,
  opacity: 0.7,
});
```

- [ ] **Step 4: Commit**

```bash
git add lib/r3f/
git commit -m "feat(r3f): add SceneCanvas wrapper, lighting presets, shared materials"
```

---

## Task 9: ParticleField Component

**Files:**
- Create: `components/3d/ParticleField.tsx`

- [ ] **Step 1: Create components/3d/ParticleField.tsx**

```tsx
// components/3d/ParticleField.tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count?: number;
  spread?: number;
  speed?: number;
  color?: string;
}

/**
 * Ambient floating particle system — used as background element.
 * Particles drift upward slowly and wrap around.
 */
export default function ParticleField({
  count = 120,
  spread = 12,
  speed = 0.008,
  color = "#e05a23",
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.5;
    }
    return arr;
  }, [count, spread]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speed;
      if (pos[i * 3 + 1] > spread / 2) {
        pos[i * 3 + 1] = -spread / 2;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.04}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/3d/ParticleField.tsx
git commit -m "feat(3d): add ParticleField ambient particle system"
```

---

## Task 10: DeliveryOrb Component

**Files:**
- Create: `components/3d/DeliveryOrb.tsx`

- [ ] **Step 1: Create components/3d/DeliveryOrb.tsx**

```tsx
// components/3d/DeliveryOrb.tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Float } from "@react-three/drei";
import * as THREE from "three";
import type { OrderStatus } from "@/types/order";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   "#e05a23", // brand orange — pulsing
  accepted:  "#3b82f6", // blue — steady
  picked_up: "#06b6d4", // cyan — fast pulse
  delivered: "#22c55e", // green — burst
  cancelled: "#6b7280", // gray — dim
  expired:   "#4b5563", // dark gray
};

const STATUS_PULSE_SPEED: Record<OrderStatus, number> = {
  pending:   1.8,
  accepted:  0.5,
  picked_up: 3.0,
  delivered: 0,
  cancelled: 0,
  expired:   0,
};

interface DeliveryOrbProps {
  status: OrderStatus;
}

/**
 * Glowing sphere that represents order status.
 * Changes color and pulse speed by status.
 * Use inside a SceneCanvas.
 */
export default function DeliveryOrb({ status }: DeliveryOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = STATUS_COLORS[status];
  const pulseSpeed = STATUS_PULSE_SPEED[status];

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (pulseSpeed > 0) {
      const t = clock.getElapsedTime();
      mat.emissiveIntensity = 0.3 + Math.sin(t * pulseSpeed) * 0.2;
    } else {
      mat.emissiveIntensity = status === "delivered" ? 0.5 : 0.1;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.92}
        />
      </Sphere>
    </Float>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/3d/DeliveryOrb.tsx
git commit -m "feat(3d): add DeliveryOrb order status sphere with color/pulse by state"
```

---

## Task 11: MountainScene Component

**Files:**
- Create: `components/3d/MountainScene.tsx`

- [ ] **Step 1: Create components/3d/MountainScene.tsx**

```tsx
// components/3d/MountainScene.tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Low-poly Atlas mountains procedurally generated from cone geometry.
 * Used as the landing page hero background inside a SceneCanvas.
 */
export default function MountainScene() {
  const groupRef = useRef<THREE.Group>(null);

  const mountains = useMemo(() => [
    { x: -3, z: -3, height: 3.5, radius: 1.8, color: "#1e2d4a" },
    { x:  0, z: -4, height: 5.0, radius: 2.2, color: "#13203a" },
    { x:  3, z: -3, height: 3.0, radius: 1.6, color: "#2b3f63" },
    { x: -1.5, z: -2, height: 2.5, radius: 1.2, color: "#1e2d4a" },
    { x:  1.8, z: -2, height: 2.0, radius: 1.0, color: "#2b3f63" },
    { x: -5, z: -5, height: 2.8, radius: 1.5, color: "#13203a" },
    { x:  5, z: -5, height: 2.4, radius: 1.3, color: "#13203a" },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Slow drift to add life
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, 0, m.z]} castShadow>
          <coneGeometry args={[m.radius, m.height, 6]} />
          <meshStandardMaterial
            color={m.color}
            roughness={0.9}
            metalness={0.0}
            flatShading
          />
        </mesh>
      ))}
      {/* Snow caps on tallest peaks */}
      {mountains.filter(m => m.height >= 3.5).map((m, i) => (
        <mesh key={`snow-${i}`} position={[m.x, m.height * 0.65, m.z]}>
          <coneGeometry args={[m.radius * 0.35, m.height * 0.3, 6]} />
          <meshStandardMaterial color="#f0f4ff" roughness={0.7} flatShading />
        </mesh>
      ))}
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0d1628" roughness={1} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/3d/MountainScene.tsx
git commit -m "feat(3d): add low-poly Atlas MountainScene hero component"
```

---

## Task 12: TruckModel Component

**Files:**
- Create: `components/3d/TruckModel.tsx`

- [ ] **Step 1: Create components/3d/TruckModel.tsx**

```tsx
// components/3d/TruckModel.tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

interface TruckModelProps {
  isOnline?: boolean;
}

/**
 * Simple low-poly delivery truck built from primitives.
 * Bounces when online. Used in driver dashboard header.
 */
export default function TruckModel({ isOnline = false }: TruckModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !isOnline) return;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 3) * 0.05;
  });

  return (
    <Float speed={isOnline ? 2 : 0.5} floatIntensity={isOnline ? 0.3 : 0.1}>
      <group ref={groupRef} scale={0.7}>
        {/* Cab */}
        <RoundedBox args={[0.8, 0.6, 1.2]} radius={0.05} position={[0.3, 0.2, 0]}>
          <meshStandardMaterial color="#1e2d4a" roughness={0.4} metalness={0.3} />
        </RoundedBox>
        {/* Cargo box */}
        <RoundedBox args={[1.2, 0.7, 1.2]} radius={0.04} position={[-0.4, 0.25, 0]}>
          <meshStandardMaterial
            color={isOnline ? "#e05a23" : "#6b7280"}
            roughness={0.3}
            metalness={0.1}
          />
        </RoundedBox>
        {/* Wheels */}
        {[[-0.6, -0.15, 0.5], [-0.6, -0.15, -0.5], [0.5, -0.15, 0.5], [0.5, -0.15, -0.5]].map(
          ([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
              <meshStandardMaterial color="#0d1628" roughness={0.9} />
            </mesh>
          )
        )}
        {/* Windshield */}
        <mesh position={[0.72, 0.28, 0]} rotation={[0, 0, -0.3]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshPhysicalMaterial
            color="#a8d4ff"
            transparent
            opacity={0.7}
            roughness={0}
          />
        </mesh>
      </group>
    </Float>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/3d/TruckModel.tsx
git commit -m "feat(3d): add low-poly TruckModel delivery vehicle component"
```

---

## Task 13: CityMap3D Component

**Files:**
- Create: `components/3d/CityMap3D.tsx`

- [ ] **Step 1: Create components/3d/CityMap3D.tsx**

```tsx
// components/3d/CityMap3D.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Line } from "@react-three/drei";
import * as THREE from "three";
import { LANDMARK_COORDS } from "@/constants/zones";

interface MapDot {
  id: string;
  lat: number;
  lng: number;
  color?: string;
}

interface CityMap3DProps {
  zone: "ifrane" | "oujda";
  /** Driver/order dots to render */
  dots?: MapDot[];
  /** Show route line between first two dots */
  showRoute?: boolean;
}

const ZONE_BOUNDS = {
  ifrane: { minLat: 33.51, maxLat: 33.54, minLng: -5.13, maxLng: -5.09 },
  oujda:  { minLat: 34.66, maxLat: 34.70, minLng: -1.93, maxLng: -1.88 },
};

/** Map a GPS coord to local [-5, 5] 3D space */
function project(lat: number, lng: number, bounds: typeof ZONE_BOUNDS.ifrane): [number, number] {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) - 0.5) * 10;
  const y = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) - 0.5) * 10;
  return [x, y];
}

/**
 * Flat 3D city map with projected GPS dots and optional route line.
 * Pass dots=[{ id, lat, lng, color }] to show drivers or orders.
 */
export default function CityMap3D({ zone, dots = [], showRoute = false }: CityMap3DProps) {
  const bounds = ZONE_BOUNDS[zone];

  const landmarks = useMemo(() => {
    const coords = LANDMARK_COORDS;
    return Object.entries(coords)
      .filter(([name]) => {
        const zoneNames = zone === "ifrane"
          ? ["AUI Dorms", "Marché", "Grand Hotel", "Pizza Rustica", "Bonsai Sushi"]
          : ["Sidi Maafa", "Place Ziri Ibn Attia", "Université Mohammed Premier"];
        return zoneNames.includes(name);
      })
      .map(([name, [lat, lng]]) => ({
        name,
        pos: project(lat, lng, bounds),
      }));
  }, [zone, bounds]);

  const routePoints = useMemo(() => {
    if (!showRoute || dots.length < 2) return [];
    const [a, b] = dots;
    const [ax, ay] = project(a.lat, a.lng, bounds);
    const [bx, by] = project(b.lat, b.lng, bounds);
    return [new THREE.Vector3(ax, 0.05, -ay), new THREE.Vector3(bx, 0.05, -by)];
  }, [dots, showRoute, bounds]);

  return (
    <group>
      {/* Base map tile */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11, 11]} />
        <meshStandardMaterial color="#1e2d4a" roughness={0.9} />
      </mesh>

      {/* Grid lines */}
      {[-4, -2, 0, 2, 4].map((v) => (
        <group key={v}>
          <Line points={[[-5, 0.01, v], [5, 0.01, v]]} color="#2b3f63" lineWidth={1} />
          <Line points={[[v, 0.01, -5], [v, 0.01, 5]]} color="#2b3f63" lineWidth={1} />
        </group>
      ))}

      {/* Landmark dots */}
      {landmarks.map(({ name, pos: [x, y] }) => (
        <mesh key={name} position={[x, 0.08, -y]}>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
          <meshStandardMaterial color="#2b3f63" />
        </mesh>
      ))}

      {/* Live dots (drivers / orders) */}
      {dots.map(({ id, lat, lng, color = "#e05a23" }) => {
        const [x, y] = project(lat, lng, bounds);
        return (
          <Sphere key={id} args={[0.12, 16, 16]} position={[x, 0.15, -y]}>
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.8}
            />
          </Sphere>
        );
      })}

      {/* Route line */}
      {routePoints.length === 2 && (
        <Line
          points={routePoints}
          color="#e05a23"
          lineWidth={2}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
    </group>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/3d/CityMap3D.tsx
git commit -m "feat(3d): add CityMap3D with GPS projection, landmark dots, route line"
```

---

## Task 14: BarChart3D and DonutChart3D

**Files:**
- Create: `components/3d/BarChart3D.tsx`
- Create: `components/3d/DonutChart3D.tsx`

- [ ] **Step 1: Create components/3d/BarChart3D.tsx**

```tsx
// components/3d/BarChart3D.tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChart3DProps {
  data: BarData[];
  maxValue?: number;
  maxHeight?: number;
}

/**
 * Simple 3D bar chart using BoxGeometry.
 * Used in the driver earnings section.
 */
export default function BarChart3D({ data, maxValue, maxHeight = 3 }: BarChart3DProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = 0.5;
  const gap = 0.2;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <group position={[-totalWidth / 2 + barWidth / 2, 0, 0]}>
      {data.map(({ label, value, color = "#e05a23" }, i) => {
        const height = Math.max((value / max) * maxHeight, 0.05);
        const x = i * (barWidth + gap);
        return (
          <group key={label} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[barWidth, height, barWidth]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.15}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
            <Text
              position={[0, -0.25, 0]}
              fontSize={0.18}
              color="#94a3b8"
              anchorX="center"
              anchorY="top"
            >
              {label}
            </Text>
          </group>
        );
      })}
      {/* Baseline */}
      <mesh position={[totalWidth / 2 - barWidth / 2, 0, 0]}>
        <boxGeometry args={[totalWidth, 0.02, 0.02]} />
        <meshStandardMaterial color="#2b3f63" />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Create components/3d/DonutChart3D.tsx**

```tsx
// components/3d/DonutChart3D.tsx
"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChart3DProps {
  segments: DonutSegment[];
  innerRadius?: number;
  outerRadius?: number;
  label?: string;
}

/**
 * 3D donut chart using TorusGeometry segments.
 * Used in admin dashboard for delivery success rate.
 */
export default function DonutChart3D({
  segments,
  innerRadius = 0.6,
  outerRadius = 1.0,
  label,
}: DonutChart3DProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const arcs = useMemo(() => {
    let angle = 0;
    return segments.map((seg) => {
      const fraction = seg.value / total;
      const arcLength = fraction * Math.PI * 2;
      const start = angle;
      angle += arcLength;
      return { ...seg, start, arcLength };
    });
  }, [segments, total]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {arcs.map(({ label: segLabel, color, start, arcLength }) => (
        <mesh key={segLabel}>
          <torusGeometry
            args={[
              (innerRadius + outerRadius) / 2,
              (outerRadius - innerRadius) / 2,
              16,
              48,
              arcLength - 0.04, // small gap between segments
            ]}
          />
          <primitive
            object={
              new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.2,
                roughness: 0.3,
              })
            }
          />
        </mesh>
      ))}
      {label && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.28}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          rotation={[Math.PI / 2, 0, 0]}
        >
          {label}
        </Text>
      )}
    </group>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/3d/BarChart3D.tsx components/3d/DonutChart3D.tsx
git commit -m "feat(3d): add BarChart3D earnings chart and DonutChart3D stats component"
```

---

## Task 15: Run All Tests + Final Build Check

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/mbp/atlaasgo && npm test
```

Expected: All tests pass (smoke, orders, pricing, zones).

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: Successful build, no TypeScript errors.

- [ ] **Step 3: Delete smoke test**

```bash
rm __tests__/smoke.test.ts
git add __tests__/
git commit -m "test: remove smoke test now that real tests exist"
```

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

Expected: All commits pushed to GUNZO-DEV/atlaasgo.

---

## Next Steps

- **Plan 2:** `2026-05-14-3d-frontend.md` — uses all components from this plan to redesign landing, dashboard, driver, and admin pages
- **Plan 3:** `2026-05-14-backend-engine.md` — surge pricing integration, FCM notifications, WhatsApp Business API, hardened Firestore rules

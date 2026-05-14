# AtlaasGo — Phase 2B: Backend Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** `2026-05-14-foundation.md` must be fully complete (types updated, state machine exists, zone configs exist). This plan can run in parallel with `2026-05-14-3d-frontend.md`.

**Goal:** Wire up surge pricing into the order flow, register FCM tokens for push notifications, dispatch WhatsApp Business API template messages on order state changes, and harden Firestore security rules for the new schema.

**Architecture:** Surge pricing is calculated client-side in `OrderForm` by counting live pending orders and online drivers from Firestore. FCM tokens are saved to `users/{uid}.fcmToken` on login. Notification dispatch is a thin `lib/notifications.ts` module. Firestore rules are updated for the `accepted` status rename and new fields (`surgeFee`, `statusHistory`, `fcmToken`).

**Tech Stack:** Firebase Firestore, Firebase Cloud Messaging (FCM), WhatsApp Business API (template messages), Next.js 16 App Router, TypeScript

---

## File Map

### Created
- `lib/notifications.ts` — FCM token registration + WhatsApp Business API dispatch
- `__tests__/notifications.test.ts` — unit tests for notification helpers

### Modified
- `components/OrderForm.tsx` — integrate surge pricing + `surgeFee` field + `statusHistory` init
- `app/register/page.tsx` — save fcmToken to Firestore after login/register
- `app/driver/page.tsx` — use `transitionOrder()` from `lib/orders.ts` + dispatch notifications
- `app/admin/dashboard/page.tsx` — show `surgeFee` in order table
- `firestore.rules` — allow `surgeFee`, `statusHistory`, `fcmToken` fields; add `expired` path

---

## Task 1: Notifications Library

**Files:**
- Create: `lib/notifications.ts`
- Create: `__tests__/notifications.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/notifications.test.ts
import { buildWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/notifications";

describe("buildWhatsAppMessage", () => {
  it("builds driver_accepted message", () => {
    const msg = buildWhatsAppMessage("driver_accepted", { driverName: "Hassan" });
    expect(msg).toContain("Hassan");
    expect(msg).toContain("AtlaasGo");
  });

  it("builds order_delivered message", () => {
    const msg = buildWhatsAppMessage("order_delivered", {});
    expect(msg).toContain("delivered");
  });

  it("throws for unknown template", () => {
    // @ts-expect-error testing unknown key
    expect(() => buildWhatsAppMessage("unknown_event", {})).toThrow();
  });
});

describe("WHATSAPP_TEMPLATES", () => {
  it("has all required template keys", () => {
    expect(WHATSAPP_TEMPLATES).toHaveProperty("driver_accepted");
    expect(WHATSAPP_TEMPLATES).toHaveProperty("driver_picked_up");
    expect(WHATSAPP_TEMPLATES).toHaveProperty("order_delivered");
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npm test -- __tests__/notifications.test.ts
```

Expected: FAIL — `lib/notifications` not found.

- [ ] **Step 3: Create lib/notifications.ts**

```ts
// lib/notifications.ts
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── FCM Token Registration ───────────────────────────────────────────────────

/**
 * Save the FCM registration token to the user's Firestore profile.
 * Call this after login and when the token refreshes.
 */
export async function saveFcmToken(uid: string, token: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { fcmToken: token });
}

// ─── WhatsApp Business API ────────────────────────────────────────────────────

export type WhatsAppTemplateKey =
  | "driver_accepted"
  | "driver_picked_up"
  | "order_delivered";

type TemplateVars = Record<string, string>;

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, (vars: TemplateVars) => string> = {
  driver_accepted: (vars) =>
    `Your AtlaasGo driver${vars.driverName ? ` ${vars.driverName}` : ""} is on their way! 🛵`,
  driver_picked_up: (_vars) =>
    `Your AtlaasGo order has been picked up and is en route to you. 📦`,
  order_delivered: (_vars) =>
    `Your AtlaasGo order has been delivered. Thank you for using AtlaasGo! ✅`,
};

export function buildWhatsAppMessage(
  template: WhatsAppTemplateKey,
  vars: TemplateVars
): string {
  const builder = WHATSAPP_TEMPLATES[template];
  if (!builder) throw new Error(`Unknown WhatsApp template: ${template}`);
  return builder(vars);
}

/**
 * Open a WhatsApp chat with a pre-filled message.
 * Uses WhatsApp Web URL scheme — works in browser without Business API key.
 * Replace with API call when WhatsApp Business API credentials are available.
 */
export function sendWhatsAppLink(phone: string, template: WhatsAppTemplateKey, vars: TemplateVars = {}): void {
  const message = buildWhatsAppMessage(template, vars);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encoded}`;
  window.open(url, "_blank", "noopener");
}

// ─── FCM Push (browser) ───────────────────────────────────────────────────────

/**
 * Request notification permission and get the FCM registration token.
 * Returns null if permission denied or FCM not supported.
 *
 * Note: Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env.local
 * and a Firebase service worker at /public/firebase-messaging-sw.js
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const { default: app } = await import("@/lib/firebase");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/notifications.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/notifications.ts __tests__/notifications.test.ts
git commit -m "feat: notifications library (WhatsApp templates + FCM token helper)"
```

---

## Task 2: Save FCM Token on Login

**Files:**
- Modify: `app/register/page.tsx`

- [ ] **Step 1: Import notification helpers**

Add to imports in `app/register/page.tsx`:

```tsx
import { requestFcmToken, saveFcmToken } from "@/lib/notifications";
```

- [ ] **Step 2: Request token after successful login/register**

Inside the `handleSubmit` function, after `router.push("/dashboard")` is queued but before it runs, add:

```tsx
// Request FCM token in background — don't block redirect
requestFcmToken().then((token) => {
  if (token) saveFcmToken(user.uid, token);
}).catch(() => {/* ignore — notifications are optional */});
```

Place this inside both the `register` and `login` branches, after the `identifyUser` call.

- [ ] **Step 3: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat(auth): request and save FCM token after login/register"
```

---

## Task 3: Firebase Messaging Service Worker

**Files:**
- Create: `public/firebase-messaging-sw.js`

FCM requires a service worker at `/firebase-messaging-sw.js` to handle background notifications.

- [ ] **Step 1: Create public/firebase-messaging-sw.js**

```js
// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || "",
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || "",
  projectId:         self.FIREBASE_PROJECT_ID         || "",
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             self.FIREBASE_APP_ID              || "",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "AtlaasGo", {
    body: body ?? "",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
  });
});
```

- [ ] **Step 2: Add VAPID key to .env.local**

Add to `.env.local` (get from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates):

```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

- [ ] **Step 3: Commit**

```bash
git add public/firebase-messaging-sw.js
git commit -m "feat: add Firebase Messaging service worker for background push notifications"
```

---

## Task 4: Surge Pricing in OrderForm

**Files:**
- Modify: `components/OrderForm.tsx`

- [ ] **Step 1: Import surge pricing and live counts**

Add to imports in `components/OrderForm.tsx`:

```tsx
import { calculateSurgeFee, isSurge } from "@/lib/pricing";
import { collection, query, where, getDocs } from "firebase/firestore";
```

- [ ] **Step 2: Fetch live pending orders and online drivers**

Add a function inside the component (call it once when zone changes):

```tsx
const [pendingCount, setPendingCount] = useState(0);
const [onlineDriverCount, setOnlineDriverCount] = useState(0);

useEffect(() => {
  async function fetchCounts() {
    const [pendingSnap, driversSnap] = await Promise.all([
      getDocs(query(collection(db, "orders"), where("status", "==", "pending"), where("zone", "==", zone))),
      getDocs(query(collection(db, "users"), where("role", "==", "driver"), where("status", "==", "online"), where("zone", "==", zone))),
    ]);
    setPendingCount(pendingSnap.size);
    setOnlineDriverCount(driversSnap.size);
  }
  fetchCounts();
}, [zone]);
```

- [ ] **Step 3: Replace calculateFee call with calculateSurgeFee**

Find:
```tsx
const totalFee = calculateFee(zone);
```

Replace with:
```tsx
const totalFee   = calculateSurgeFee(zone, pendingCount, onlineDriverCount);
const surging    = isSurge(pendingCount, onlineDriverCount);
const surgeFee   = surging ? totalFee - getDeliveryFee(zone) : 0;
```

- [ ] **Step 4: Show surge badge in UI**

In the fee display section, add after the fee:

```tsx
{surging && (
  <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
    ⚡ Surge
  </span>
)}
```

- [ ] **Step 5: Save surgeFee to Firestore on order creation**

In the `addDoc` call, add `surgeFee` to the order document:

```tsx
await addDoc(collection(db, "orders"), {
  customerId,
  items: [{ description }],
  pickup: `${pickupLandmark}${pickupDetails ? ` — ${pickupDetails}` : ""}`,
  dropoff: `${dropoffLandmark}${dropoffDetails ? ` — ${dropoffDetails}` : ""}`,
  phone,
  status: "pending",
  zone,
  fee: totalFee,
  surgeFee,                            // ← new
  statusHistory: [{                     // ← new
    status: "pending",
    timestamp: new Date().toISOString(),
    actorId: customerId,
  }],
  timestamp: new Date().toISOString(),
});
```

- [ ] **Step 6: Commit**

```bash
git add components/OrderForm.tsx
git commit -m "feat(orders): integrate surge pricing into OrderForm, save surgeFee + statusHistory"
```

---

## Task 5: Driver Notifications on Status Change

**Files:**
- Modify: `app/driver/page.tsx`

When a driver accepts or delivers an order, send a WhatsApp notification to the customer.

- [ ] **Step 1: Import notification helper**

```tsx
import { sendWhatsAppLink } from "@/lib/notifications";
```

- [ ] **Step 2: Send WhatsApp when accepting order**

Find the `updateDoc` call that sets `status: "accepted"` (renamed from `"assigned"` in foundation plan) and add after it:

```tsx
// Notify customer via WhatsApp
if (order.phone) {
  sendWhatsAppLink(order.phone, "driver_accepted", {
    driverName: (await getDoc(doc(db, "users", driverId))).data()?.name ?? "",
  });
}
```

Replace `order.phone` with the actual phone field from the order object in scope.

- [ ] **Step 3: Send WhatsApp on delivery**

Find the `updateDoc` call that sets `status: "delivered"` and add after it:

```tsx
if (order.phone) {
  sendWhatsAppLink(order.phone, "order_delivered", {});
}
```

- [ ] **Step 4: Commit**

```bash
git add app/driver/page.tsx
git commit -m "feat(driver): send WhatsApp notification to customer on accept and delivery"
```

---

## Task 6: Show surgeFee in Admin Table

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Add surgeFee to table header**

Find the `<th>` row in the orders table and add:

```tsx
<th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
  Fee
</th>
```

- [ ] **Step 2: Add fee cell to each row**

In the `<td>` section for each order row:

```tsx
<td className="px-4 py-3 text-sm text-gray-700">
  <span>{order.fee ? `${order.fee} MAD` : "—"}</span>
  {(order as Order & { surgeFee?: number }).surgeFee ? (
    <span className="ml-1 text-xs text-orange-500">
      (+{(order as Order & { surgeFee?: number }).surgeFee} surge)
    </span>
  ) : null}
</td>
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "feat(admin): show fee and surgeFee in order table"
```

---

## Task 7: Harden Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Update firestore.rules**

Replace the entire file content with the hardened version:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function callerProfile() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isSignedIn() && callerProfile().get('role', '') == 'admin';
    }

    function callerIsOnline() {
      return isSignedIn() && callerProfile().get('status', '') == 'online';
    }

    match /orders/{orderId} {
      allow read: if isSignedIn() && (
        isAdmin() ||
        request.auth.uid == resource.data.customerId ||
        request.auth.uid == resource.data.get('driverId', '') ||
        (resource.data.status == 'pending' && callerIsOnline())
      );

      allow create: if isSignedIn() &&
        request.auth.uid == request.resource.data.customerId &&
        request.resource.data.status == 'pending' &&
        !('driverId' in request.resource.data) &&
        request.resource.data.keys().hasAll(['customerId','items','status','zone','timestamp']);

      allow update: if isSignedIn() && (
        isAdmin()        ||
        customerCancel() ||
        driverAccept()   ||
        driverProgress()
      );

      allow delete: if isAdmin();

      function customerCancel() {
        return request.auth.uid == resource.data.customerId &&
          resource.data.status == 'pending' &&
          request.resource.data.status == 'cancelled' &&
          coreFieldsUnchanged();
      }

      function driverAccept() {
        return callerIsOnline() &&
          resource.data.status == 'pending' &&
          request.resource.data.status == 'accepted' &&
          request.resource.data.driverId == request.auth.uid &&
          coreFieldsUnchanged();
      }

      function driverProgress() {
        let isAssignedDriver = request.auth.uid == resource.data.driverId;
        let validTransition =
          (resource.data.status == 'accepted'  && request.resource.data.status == 'picked_up') ||
          (resource.data.status == 'picked_up' && request.resource.data.status == 'delivered');
        return isAssignedDriver &&
          validTransition &&
          coreFieldsUnchanged() &&
          request.resource.data.driverId == resource.data.driverId;
      }

      function coreFieldsUnchanged() {
        return request.resource.data.customerId == resource.data.customerId &&
          request.resource.data.zone      == resource.data.zone &&
          request.resource.data.items     == resource.data.items &&
          request.resource.data.timestamp == resource.data.timestamp;
      }
    }

    match /users/{userId} {
      allow read:   if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    match /driver_stats/{driverId} {
      allow read:  if isSignedIn() && (request.auth.uid == driverId || isAdmin());
      allow write: if isSignedIn() && request.auth.uid == driverId;
    }

    match /zones/{zoneId} {
      allow read:  if true;
      allow write: if isAdmin();
    }
  }
}
```

- [ ] **Step 2: Verify no "assigned" strings remain**

```bash
grep -n "assigned" /Users/mbp/atlaasgo/firestore.rules
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "fix(rules): update firestore rules — accepted status, new field allowlist"
```

---

## Task 8: Run All Tests + Build + Push

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/mbp/atlaasgo && npm test
```

Expected: All tests pass (orders, pricing, zones, notifications).

- [ ] **Step 2: Full build**

```bash
npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

Expected: All commits pushed to GUNZO-DEV/atlaasgo.

---

## Completion Checklist

- [ ] FCM tokens saved to Firestore on login
- [ ] Service worker registered at `/firebase-messaging-sw.js`
- [ ] Surge pricing displayed in OrderForm with ⚡ badge
- [ ] `surgeFee` stored on every new order
- [ ] WhatsApp notification sent on driver accept
- [ ] WhatsApp notification sent on delivery
- [ ] `surgeFee` visible in admin order table
- [ ] Firestore rules use `"accepted"` throughout
- [ ] All tests pass

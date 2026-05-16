// lib/orders.ts
import type { Order, OrderStatus, StatusHistoryEntry } from "@/types/order";

// ─── Status machine ──────────────────────────────────────────────────────────

const STATUS_NOTIFICATIONS: Partial<Record<string, { title: string; body: string }>> = {
  accepted:  { title: "Coursier en route ! 🛵",  body: "Ton coursier a accepté ta commande" },
  picked_up: { title: "Commande récupérée 📦",     body: "Ta commande est en chemin" },
  delivered: { title: "Livré ! ✅",               body: "Ta commande est arrivée. Bon appétit !" },
};

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

export function buildHistoryEntry(status: OrderStatus, actorId: string): StatusHistoryEntry {
  return { status, timestamp: new Date().toISOString(), actorId };
}

// ─── Create order ─────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  customerId: string;
  restaurantId: string;
  restaurantName: string;
  cartId?: string;
  items: Order["items"];
  deliveryAddress: string;
  deliveryAddressNote?: string;
  orderNote?: string;
  scheduledFor?: string;
  zone: string;
  subtotal: number;
  fee: number;
  total: number;
  creditUsed?: number;
}

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const { collection, addDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const now = new Date().toISOString();

  // Strip undefined values — Firestore rejects them with
  // "Unsupported field value: undefined".
  const raw = {
    ...input,
    status: "pending" as OrderStatus,
    statusHistory: [{ status: "pending", timestamp: now, actorId: input.customerId }],
    timestamp: now,
  };
  const data = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined)
  );

  // Also strip undefined from nested item objects
  if (Array.isArray(data.items)) {
    data.items = (data.items as Record<string, unknown>[]).map((item) =>
      Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined))
    );
  }

  const ref = await addDoc(collection(db, "orders"), data);
  return ref.id;
}

// ─── Read / subscribe ─────────────────────────────────────────────────────────

export async function getOrder(orderId: string): Promise<Order | null> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDoc(doc(db, "orders", orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

export async function getUserOrders(uid: string): Promise<Order[]> {
  const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("customerId", "==", uid),
      orderBy("timestamp", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

/** Real-time listener for a single order. Returns unsubscribe fn. */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: Order | null) => void
): () => void {
  // Lazy import pattern keeps this testable
  let unsub = () => {};
  (async () => {
    const { doc, onSnapshot } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    unsub = onSnapshot(
      doc(db, "orders", orderId),
      (snap) => {
        if (!snap.exists()) { onUpdate(null); return; }
        onUpdate({ id: snap.id, ...snap.data() } as Order);
      },
      (err) => {
        console.warn("subscribeToOrder failed:", err.code);
        onUpdate(null);
      }
    );
  })();
  return () => unsub();
}

/** Real-time listener for all orders of a customer. Returns unsubscribe fn. */
export function subscribeToUserOrders(
  uid: string,
  onUpdate: (orders: Order[]) => void
): () => void {
  let unsub = () => {};
  (async () => {
    const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", uid),
      orderBy("timestamp", "desc")
    );
    unsub = onSnapshot(
      q,
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))),
      (err) => {
        console.warn("subscribeToUserOrders failed:", err.code);
        onUpdate([]);
      }
    );
  })();
  return () => unsub();
}

/** Real-time listener for pending orders in a zone (for driver app). */
export function subscribeToPendingOrders(
  zone: string,
  onUpdate: (orders: Order[]) => void
): () => void {
  let unsub = () => {};
  (async () => {
    const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const q = query(
      collection(db, "orders"),
      where("status", "==", "pending"),
      where("zone", "==", zone),
      orderBy("timestamp", "asc")
    );
    unsub = onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    });
  })();
  return () => unsub();
}

/** Real-time listener for all live orders (admin use). */
export function subscribeLiveOrders(
  onUpdate: (orders: Order[]) => void
): () => void {
  let unsub = () => {};
  (async () => {
    const { collection, query, where, orderBy, onSnapshot } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "accepted", "picked_up"]),
      orderBy("timestamp", "desc")
    );
    unsub = onSnapshot(
      q,
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))),
      (err) => {
        console.warn("subscribeLiveOrders failed (admin-only):", err.code);
        onUpdate([]);
      }
    );
  })();
  return () => unsub();
}

// ─── Transition ───────────────────────────────────────────────────────────────

export async function transitionOrder(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  actorId: string,
  extra: Record<string, unknown> = {},
  customerId?: string
): Promise<void> {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }

  const entry = buildHistoryEntry(to, actorId);
  const timestampField: Partial<Record<OrderStatus, string>> = {
    accepted:  "acceptedAt",
    picked_up: "pickedUpAt",
    delivered: "deliveredAt",
  };

  const update: Record<string, unknown> = { status: to, ...extra };
  const tsField = timestampField[to];
  if (tsField) update[tsField] = entry.timestamp;

  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "orders", orderId), {
    ...update,
    statusHistory: arrayUnion(entry),
  });

  // Write in-app notification for customer
  const notifData = STATUS_NOTIFICATIONS[to];
  if (notifData && customerId) {
    const { addDoc, collection: col } = await import("firebase/firestore");
    await addDoc(col(db, "users", customerId, "notifications"), {
      type: "order_status",
      title: notifData.title,
      body: notifData.body,
      read: false,
      link: `/orders/${orderId}`,
      createdAt: new Date().toISOString(),
    });
  }
}

// ─── Customer cancel ─────────────────────────────────────────────────────────

/**
 * Cancel a pending order. Customer must be the order owner; status must still
 * be 'pending'. Fails (silently logged) if either condition isn't met — the
 * Firestore rule (`customerCancel()`) enforces the constraints server-side.
 */
export async function cancelOrder(orderId: string, customerId: string): Promise<void> {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const entry = buildHistoryEntry("cancelled", customerId);
  await updateDoc(doc(db, "orders", orderId), {
    status: "cancelled",
    cancelledAt: entry.timestamp,
    statusHistory: arrayUnion(entry),
  });
}

// ─── Expire stale pending orders ─────────────────────────────────────────────

/**
 * Best-effort client-side sweep for pending orders that were never accepted
 * by a driver. Customers run this on their tracking page so their own stale
 * orders flip to 'expired' without needing a server worker.
 *
 * Rule (`customerCancel()` covers it indirectly): a customer can transition
 * their own pending order to 'cancelled'. We use the same write here but
 * mark with status='expired' which the rule also accepts (transition is
 * listed in VALID_TRANSITIONS). Returns the number of orders expired.
 */
export async function expireStaleOrders(
  customerId: string,
  staleAfterMs = 5 * 60 * 1000
): Promise<number> {
  const { collection, query, where, getDocs, doc, updateDoc, arrayUnion } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
      where("status", "==", "pending")
    )
  );

  const cutoff = Date.now() - staleAfterMs;
  let expired = 0;
  for (const d of snap.docs) {
    const ts = d.data().timestamp;
    if (!ts || new Date(ts).getTime() > cutoff) continue;
    const entry = buildHistoryEntry("expired", customerId);
    try {
      await updateDoc(doc(db, "orders", d.id), {
        status: "expired",
        expiredAt: entry.timestamp,
        statusHistory: arrayUnion(entry),
      });
      expired++;
    } catch (err) {
      // Rule may deny if another actor already transitioned the order;
      // that's fine — we just skip.
      console.warn("expireStaleOrders: skip", d.id, (err as Error).message);
    }
  }
  return expired;
}

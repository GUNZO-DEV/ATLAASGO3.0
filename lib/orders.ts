import type { OrderStatus, StatusHistoryEntry } from "@/types/order";

const STATUS_NOTIFICATIONS: Partial<Record<string, { title: string; body: string }>> = {
  accepted:  { title: "Driver on the way! 🛵",  body: "Your driver has accepted your order" },
  picked_up: { title: "Order picked up 📦",       body: "Your order is en route" },
  delivered: { title: "Delivered! ✅",            body: "Your order has arrived. Enjoy!" },
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

export function buildHistoryEntry(
  status: OrderStatus,
  actorId: string
): StatusHistoryEntry {
  return { status, timestamp: new Date().toISOString(), actorId };
}

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

  const update: Record<string, unknown> = {
    status: to,
    ...extra,
  };

  const tsField = timestampField[to];
  if (tsField) update[tsField] = entry.timestamp;

  // Firestore update — lazy import to allow pure unit tests without Firebase
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

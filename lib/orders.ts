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
}

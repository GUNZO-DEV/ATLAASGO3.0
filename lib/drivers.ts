// lib/drivers.ts — Driver profile, online/offline, ride ops

export interface DriverProfile {
  uid: string;
  name: string;
  phone?: string;
  avatar?: string; // sprite id e.g. "avatar:youssef"
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  zone: string;
  currentOrderId?: string | null;
  earningsToday: number;
  earningsWeek: number;
  tipsTotal: number;
  runsToday: number;
  runsWeek: number;
  createdAt: string;
}

/** Get or create a driver profile doc. */
export async function getDriverProfile(uid: string): Promise<DriverProfile | null> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const snap = await getDoc(doc(db, "drivers", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as DriverProfile;
}

/**
 * Toggle driver online/offline status. Auto-creates a driver profile with
 * sensible defaults the first time a courier toggles online.
 */
export async function setDriverOnline(
  uid: string,
  online: boolean,
  zone = "casablanca",
  meta?: { name?: string; phone?: string; avatar?: string }
): Promise<void> {
  const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const ref  = doc(db, "drivers", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // First time → create full DriverProfile
    await setDoc(ref, {
      uid,
      name: meta?.name ?? "Coursier",
      phone: meta?.phone ?? "",
      avatar: meta?.avatar ?? "avatar:youssef",
      rating: 5.0,
      totalDeliveries: 0,
      isOnline: online,
      zone,
      currentOrderId: null,
      earningsToday: 0,
      earningsWeek: 0,
      tipsTotal: 0,
      runsToday: 0,
      runsWeek: 0,
      createdAt: new Date().toISOString(),
      lastSeen: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { isOnline: online, zone, lastSeen: serverTimestamp() });
  }

  // Mirror on user doc so surge pricing query can find online drivers.
  // Also flip role to 'driver' so the rule that gates pending-order reads matches.
  try {
    await updateDoc(doc(db, "users", uid), { isOnline: online, zone, role: "driver" });
  } catch {
    // user doc may not exist yet for fresh accounts — that's ok, the
    // /drivers/{uid} doc is the source of truth.
  }
}

/** Accept a pending order — assigns driverId and transitions to accepted. */
export async function acceptOrder(orderId: string, driverId: string, customerId?: string): Promise<void> {
  const { transitionOrder } = await import("@/lib/orders");
  await transitionOrder(orderId, "pending", "accepted", driverId, { driverId }, customerId);
  // Mark driver as busy
  const { doc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "drivers", driverId), { currentOrderId: orderId });
}

/** Mark order as picked up. */
export async function markPickedUp(orderId: string, driverId: string, customerId?: string): Promise<void> {
  const { transitionOrder } = await import("@/lib/orders");
  await transitionOrder(orderId, "accepted", "picked_up", driverId, {}, customerId);
}

/** Mark order as delivered + update driver earnings. */
export async function markDelivered(
  orderId: string,
  driverId: string,
  earnAmount: number,
  customerId?: string
): Promise<void> {
  const { transitionOrder } = await import("@/lib/orders");
  await transitionOrder(orderId, "picked_up", "delivered", driverId, {}, customerId);

  const { doc, updateDoc, increment } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "drivers", driverId), {
    currentOrderId: null,
    earningsToday: increment(earnAmount),
    earningsWeek: increment(earnAmount),
    runsToday: increment(1),
    runsWeek: increment(1),
    totalDeliveries: increment(1),
  });
}

/** Real-time listener for online drivers in a zone (for admin/surge). */
export function subscribeOnlineDrivers(
  zone: string,
  onUpdate: (count: number) => void
): () => void {
  let unsub = () => {};
  (async () => {
    const { collection, query, where, onSnapshot } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const q = query(
      collection(db, "drivers"),
      where("isOnline", "==", true),
      where("zone", "==", zone)
    );
    unsub = onSnapshot(
      q,
      (snap) => onUpdate(snap.size),
      (err) => {
        console.warn("subscribeOnlineDrivers failed:", err.code);
        onUpdate(0);
      }
    );
  })();
  return () => unsub();
}

/** Real-time listener for all drivers (admin fleet view). */
export function subscribeAllDrivers(
  onUpdate: (drivers: DriverProfile[]) => void
): () => void {
  let unsub = () => {};
  (async () => {
    const { collection, onSnapshot } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    unsub = onSnapshot(
      collection(db, "drivers"),
      (snap) => onUpdate(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as DriverProfile))),
      (err) => {
        console.warn("subscribeAllDrivers failed (admin-only):", err.code);
        onUpdate([]);
      }
    );
  })();
  return () => unsub();
}

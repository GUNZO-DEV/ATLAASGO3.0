import type { Cart, CartItem } from "@/types/cart";

// ─── Pure helpers (unit-testable) ──────────────────────────────────────────────

export function getCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// ─── Firestore helpers (lazy imports for testability) ──────────────────────────

export async function createCart(
  restaurantId: string,
  restaurantName: string,
  ownerId: string,
  ownerName: string
): Promise<string> {
  const { collection, addDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "carts"), {
    restaurantId,
    restaurantName,
    ownerId,
    participants: [ownerId],
    participantNames: { [ownerId]: ownerName },
    items: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function addCartItem(
  cartId: string,
  item: Omit<CartItem, "quantity"> & { quantity?: number }
): Promise<void> {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const cartRef = doc(db, "carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) throw new Error("Cart not found");
  const cart = snap.data() as Cart;

  const existingIdx = cart.items.findIndex(
    (i) => i.itemId === item.itemId && i.addedBy === item.addedBy
  );

  let updatedItems: CartItem[];
  if (existingIdx >= 0) {
    updatedItems = cart.items.map((i, idx) =>
      idx === existingIdx ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i
    );
  } else {
    updatedItems = [...cart.items, { ...item, quantity: item.quantity ?? 1 }];
  }

  await updateDoc(cartRef, { items: updatedItems, updatedAt: new Date().toISOString() });
}

export async function removeCartItem(
  cartId: string,
  itemId: string,
  addedBy: string
): Promise<void> {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const cartRef = doc(db, "carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) throw new Error("Cart not found");
  const cart = snap.data() as Cart;
  const updatedItems = cart.items.filter(
    (i) => !(i.itemId === itemId && i.addedBy === addedBy)
  );
  await updateDoc(cartRef, { items: updatedItems, updatedAt: new Date().toISOString() });
}

export async function updateCartItemQty(
  cartId: string,
  itemId: string,
  addedBy: string,
  qty: number
): Promise<void> {
  if (qty <= 0) return removeCartItem(cartId, itemId, addedBy);
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  const cartRef = doc(db, "carts", cartId);
  const snap = await getDoc(cartRef);
  if (!snap.exists()) throw new Error("Cart not found");
  const cart = snap.data() as Cart;
  const updatedItems = cart.items.map((i) =>
    i.itemId === itemId && i.addedBy === addedBy ? { ...i, quantity: qty } : i
  );
  await updateDoc(cartRef, { items: updatedItems, updatedAt: new Date().toISOString() });
}

export async function joinCart(cartId: string, uid: string, name: string): Promise<void> {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "carts", cartId), {
    participants: arrayUnion(uid),
    [`participantNames.${uid}`]: name,
    updatedAt: new Date().toISOString(),
  });
}

export async function checkoutCart(cartId: string): Promise<void> {
  const { doc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "carts", cartId), {
    status: "checked_out",
    updatedAt: new Date().toISOString(),
  });
}

// contexts/CartContext.tsx
"use client";

import {
  createContext, useCallback, useContext, useEffect, useState,
} from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  createCart, addCartItem, removeCartItem, updateCartItemQty,
  joinCart, checkoutCart, getCartSubtotal, getCartItemCount,
} from "@/lib/cart";
import type { Cart, CartItem } from "@/types/cart";

const CART_KEY = "atlaasgo_cart_id";

interface CartContextValue {
  cart: Cart | null;
  cartId: string | null;
  subtotal: number;
  itemCount: number;
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: Omit<CartItem, "quantity" | "addedBy">
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  clearCart: () => void;
  shareGroupOrderLink: () => string;
  checkOut: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart]     = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore cartId from localStorage or ?cart= URL param on mount
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const urlCartId = params.get("cart");
    const stored    = localStorage.getItem(CART_KEY);
    const id        = urlCartId ?? stored;
    if (id) {
      if (urlCartId) localStorage.setItem(CART_KEY, urlCartId);
      setCartId(id);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Real-time listener on the cart doc
  useEffect(() => {
    if (!cartId) return;
    const unsub = onSnapshot(doc(db, "carts", cartId), (snap) => {
      if (!snap.exists()) { clearCart(); return; }
      const data = { id: snap.id, ...snap.data() } as Cart;
      if (data.status === "checked_out") { clearCart(); return; }
      setCart(data);
      setIsLoading(false);

      // Auto-join if current user isn't yet a participant
      const uid  = auth.currentUser?.uid;
      const name = auth.currentUser?.displayName ?? "Guest";
      if (uid && !data.participants.includes(uid)) {
        joinCart(cartId, uid, name);
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_KEY);
    setCartId(null);
    setCart(null);
    setIsLoading(false);
  }, []);

  const addItem = useCallback(
    async (
      restaurantId: string,
      restaurantName: string,
      item: Omit<CartItem, "quantity" | "addedBy">
    ) => {
      const uid  = auth.currentUser?.uid;
      const name = auth.currentUser?.displayName ?? "Guest";
      if (!uid) throw new Error("Must be signed in to add items");

      let id = cartId;
      if (!id) {
        id = await createCart(restaurantId, restaurantName, uid, name);
        localStorage.setItem(CART_KEY, id);
        setCartId(id);
      }
      await addCartItem(id, { ...item, addedBy: uid });
    },
    [cartId]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!cartId) return;
      const uid = auth.currentUser?.uid ?? "";
      await removeCartItem(cartId, itemId, uid);
    },
    [cartId]
  );

  const updateQty = useCallback(
    async (itemId: string, qty: number) => {
      if (!cartId) return;
      const uid = auth.currentUser?.uid ?? "";
      await updateCartItemQty(cartId, itemId, uid, qty);
    },
    [cartId]
  );

  const shareGroupOrderLink = useCallback((): string => {
    if (!cartId || !cart) return "";
    return `${window.location.origin}/restaurants/${cart.restaurantId}?cart=${cartId}`;
  }, [cartId, cart]);

  const checkOut = useCallback(async () => {
    if (!cartId) return;
    await checkoutCart(cartId);
    clearCart();
  }, [cartId, clearCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartId,
        subtotal:  cart ? getCartSubtotal(cart.items)  : 0,
        itemCount: cart ? getCartItemCount(cart.items) : 0,
        addItem, removeItem, updateQty, clearCart,
        shareGroupOrderLink, checkOut, isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Mobile cart store — mirrors the web app's src/lib/cart.ts (same fee model
 * and totals).
 *
 * Note: we hand-roll AsyncStorage persistence instead of zustand's `persist`
 * middleware. That middleware imports `import.meta`, which Hermes (RN's JS
 * engine) rejects; rather than depend on a fragile babel polyfill, we rehydrate
 * and save manually below.
 */
const STORAGE_KEY = 'atlaasgo-cart';
export type CartItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  desc?: string;
  priceDh: number;
  qty: number;
};

/** Fixed delivery fees (DH) — match the web app. */
const CAMPUS_FEE = 20; // Main gate → dorms
const RESTAURANT_FEE = 35; // Restaurant → main gate

type State = {
  items: CartItem[];
  isCampusOrder: boolean;
  add: (item: Omit<CartItem, 'qty'>, qty?: number, isCampus?: boolean) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  deliveryFee: () => number;
  serviceFee: () => number;
  total: () => number;
  count: () => number;
};

export const useCart = create<State>()((set, get) => ({
  items: [],
  isCampusOrder: false,
  add: (item, qty = 1, isCampus) => {
    set((s) => {
      // A cart holds items from one restaurant; switching restaurants
      // replaces the cart (standard food-delivery behaviour).
      const differentRestaurant =
        s.items.length > 0 && s.items[0].restaurantId !== item.restaurantId;
      const base = differentRestaurant ? [] : s.items;
      const existing = base.find((i) => i.id === item.id);
      const nextCampus = isCampus !== undefined ? isCampus : s.isCampusOrder;
      if (existing) {
        return {
          items: base.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i)),
          isCampusOrder: nextCampus,
        };
      }
      return { items: [...base, { ...item, qty }], isCampusOrder: nextCampus };
    });
  },
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  setQty: (id, qty) =>
    set((s) => ({
      items:
        qty <= 0
          ? s.items.filter((i) => i.id !== id)
          : s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
    })),
  clear: () => set({ items: [], isCampusOrder: false }),
  subtotal: () => get().items.reduce((acc, i) => acc + i.priceDh * i.qty, 0),
  deliveryFee: () => (get().isCampusOrder ? CAMPUS_FEE : RESTAURANT_FEE),
  serviceFee: () => Math.round(get().subtotal() * 0.04),
  total: () => get().subtotal() + get().deliveryFee() + get().serviceFee(),
  count: () => get().items.reduce((acc, i) => acc + i.qty, 0),
}));

// ── Manual AsyncStorage persistence (Hermes-safe) ──────────────────
// Rehydrate once on load, then save on every change.
AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const parsed = JSON.parse(raw) as { items?: CartItem[]; isCampusOrder?: boolean };
    useCart.setState({
      items: Array.isArray(parsed.items) ? parsed.items : [],
      isCampusOrder: !!parsed.isCampusOrder,
    });
  })
  .catch(() => {
    /* ignore corrupt cache */
  });

useCart.subscribe((s) => {
  void AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ items: s.items, isCampusOrder: s.isCampusOrder }),
  );
});

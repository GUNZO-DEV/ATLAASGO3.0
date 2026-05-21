import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  id: string;
  restaurantSlug: string;
  restaurantName: string;
  name: string;
  desc?: string;
  priceDh: number;
  qty: number;
};

/** Fixed delivery fees (DH) */
const CAMPUS_FEE = 20;     // Main gate → dorms
const RESTAURANT_FEE = 35; // Restaurant → main gate

type State = {
  items: CartItem[];
  isCampusOrder: boolean;
  add: (item: Omit<CartItem, 'qty'>, qty?: number, isCampus?: boolean) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
  deliveryFee: () => number;
  serviceFee: () => number;
  count: () => number;
};

export const useCart = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      isCampusOrder: false,
      add: (item, qty = 1, isCampus) => {
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          const nextCampus = isCampus !== undefined ? isCampus : s.isCampusOrder;
          if (existing) {
            return {
              items: s.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i)),
              isCampusOrder: nextCampus,
            };
          }
          return { items: [...s.items, { ...item, qty }], isCampusOrder: nextCampus };
        });
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items:
            qty <= 0 ? s.items.filter((i) => i.id !== id) : s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),
      clear: () => set({ items: [], isCampusOrder: false }),
      subtotal: () => get().items.reduce((acc, i) => acc + i.priceDh * i.qty, 0),
      deliveryFee: () => (get().isCampusOrder ? CAMPUS_FEE : RESTAURANT_FEE),
      serviceFee: () => Math.round(get().subtotal() * 0.04),
      total: () => get().subtotal() + get().deliveryFee() + get().serviceFee(),
      count: () => get().items.reduce((acc, i) => acc + i.qty, 0),
    }),
    { name: 'atlaasgo-cart' },
  ),
);

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

type State = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
  deliveryFee: () => number;
  serviceFee: () => number;
  count: () => number;
};

const FREE_DELIVERY_THRESHOLD = 120;

export const useCart = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: s.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i)),
            };
          }
          return { items: [...s.items, { ...item, qty }] };
        });
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items:
            qty <= 0 ? s.items.filter((i) => i.id !== id) : s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((acc, i) => acc + i.priceDh * i.qty, 0),
      deliveryFee: () => (get().subtotal() >= FREE_DELIVERY_THRESHOLD ? 0 : 12),
      serviceFee: () => Math.round(get().subtotal() * 0.04),
      total: () => get().subtotal() + get().deliveryFee() + get().serviceFee(),
      count: () => get().items.reduce((acc, i) => acc + i.qty, 0),
    }),
    { name: 'atlaasgo-cart' },
  ),
);

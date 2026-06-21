// AtlaasGo 3.0 — cart context. Single-store cart (adding from a different
// store replaces the cart). Persists to localStorage 'ag3-cart'.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'ag3-cart';

export interface CartItem {
  itemId: string;
  storeId: string;
  name: string;
  priceDh: number;
  emoji?: string;
  qty: number;
}

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty: number) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalDh: number;
  storeId: string | null;
};

const Ctx = createContext<CartCtx | null>(null);

function readInitial(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const add = (item: Omit<CartItem, 'qty'>, qty: number) => {
    setItems((cur) => {
      // single-store cart: switching stores resets the cart
      const base = cur.length && cur[0].storeId !== item.storeId ? [] : cur;
      const ex = base.find((x) => x.itemId === item.itemId);
      if (ex) return base.map((x) => (x.itemId === item.itemId ? { ...x, qty: x.qty + qty } : x));
      return [...base, { ...item, qty }];
    });
  };

  const setQty = (itemId: string, qty: number) => {
    setItems((cur) => (qty <= 0 ? cur.filter((x) => x.itemId !== itemId) : cur.map((x) => (x.itemId === itemId ? { ...x, qty } : x))));
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((s, c) => s + c.qty, 0), [items]);
  const subtotalDh = useMemo(() => items.reduce((s, c) => s + c.priceDh * c.qty, 0), [items]);
  const storeId = items[0]?.storeId ?? null;

  const value = useMemo<CartCtx>(
    () => ({ items, add, setQty, clear, count, subtotalDh, storeId }),
    [items, count, subtotalDh, storeId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

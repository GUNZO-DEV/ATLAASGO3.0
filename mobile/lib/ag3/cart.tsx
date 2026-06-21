// AtlaasGo 3.0 — cart context (RN port of src/app3/CartContext.tsx).
// Single-store cart (adding from a different store replaces the cart).
// Persists to AsyncStorage 'ag3-cart'.
//
// This is INTENTIONALLY separate from the existing lib/cart.ts (the zustand
// store the current Stripe checkout uses) so the 3.0 screens can adopt the new
// cart shape without disturbing the working payment flow.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ag3-cart';

export interface Ag3CartItem {
  itemId: string;
  storeId: string;
  name: string;
  priceDh: number;
  emoji?: string;
  qty: number;
}

type CartCtx = {
  items: Ag3CartItem[];
  add: (item: Omit<Ag3CartItem, 'qty'>, qty: number) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalDh: number;
  storeId: string | null;
};

const Ctx = createContext<CartCtx | null>(null);

export function Ag3CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Ag3CartItem[]>([]);
  // Don't persist until after the initial AsyncStorage rehydrate, or we'd clobber
  // the saved cart with the empty initial state.
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setItems(parsed as Ag3CartItem[]);
          } catch {
            /* ignore corrupt cache */
          }
        }
        hydrated.current = true;
      })
      .catch(() => {
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
      /* ignore */
    });
  }, [items]);

  const add = (item: Omit<Ag3CartItem, 'qty'>, qty: number) => {
    setItems((cur) => {
      // single-store cart: switching stores resets the cart
      const base = cur.length && cur[0].storeId !== item.storeId ? [] : cur;
      const ex = base.find((x) => x.itemId === item.itemId);
      if (ex) return base.map((x) => (x.itemId === item.itemId ? { ...x, qty: x.qty + qty } : x));
      return [...base, { ...item, qty }];
    });
  };

  const setQty = (itemId: string, qty: number) => {
    setItems((cur) =>
      qty <= 0 ? cur.filter((x) => x.itemId !== itemId) : cur.map((x) => (x.itemId === itemId ? { ...x, qty } : x)),
    );
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

export function useAg3Cart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAg3Cart must be used inside Ag3CartProvider');
  return ctx;
}

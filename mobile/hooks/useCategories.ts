import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { categoriesCol } from '../lib/firestore';
import type { Category } from '../lib/types';

/**
 * Static fallback while Firestore is empty / unconfigured. The real
 * `categories` collection (when present) overrides this on first snapshot.
 */
const FALLBACK: Category[] = [
  {
    id: 'food',
    label: 'Food',
    tagline: "Ifrane's kitchens, on tap",
    emoji: '🍲',
    gradient: ['#FF8A65', '#FF5722'],
    partnerCount: 28,
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    tagline: 'Medicine, fast & verified',
    emoji: '💊',
    gradient: ['#34D399', '#059669'],
    partnerCount: 9,
  },
  {
    id: 'groceries',
    label: 'Groceries',
    tagline: 'Fresh from the souk',
    emoji: '🛒',
    gradient: ['#FFB74D', '#C66B1F'],
    partnerCount: 14,
  },
];

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        query(categoriesCol(), orderBy('label')),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
          if (rows.length > 0) setCategories(rows);
          setLoading(false);
        },
        (err) => {
          // Stay on fallback — common when Firebase env vars aren't configured yet.
          setError(err);
          setLoading(false);
        },
      );
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
    return () => unsub?.();
  }, []);

  return { categories, loading, error };
}

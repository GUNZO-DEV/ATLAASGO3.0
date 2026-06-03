import type { Category } from '../lib/types';

/**
 * Categories are a UI concept, not a Supabase table (the web app treats them
 * the same way). This returns the canonical AtlaasGo categories statically —
 * no backend round-trip needed. Kept as a hook so screens don't change.
 */
const CATEGORIES: Category[] = [
  {
    id: 'food',
    label: 'Food',
    tagline: "Ifrane's kitchens, on tap",
    emoji: '🍲',
    gradient: ['#FF8A65', '#FF5722'],
    partnerCount: 24,
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
  return { categories: CATEGORIES, loading: false, error: null as Error | null };
}

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
    // Food: warm, hungry, energetic.
    accent: '#FF5722',
    soft: '#FFF1EB',
    headline: 'Hungry? Let’s fix that.',
    voice: 'From medina tagines to campus burgers — hot, fast, to your door.',
    sectionTitle: 'Open in Ifrane',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    tagline: 'Medicine, fast & verified',
    emoji: '💊',
    gradient: ['#34D399', '#059669'],
    partnerCount: 9,
    // Pharmacy: calm, careful, trustworthy.
    accent: '#059669',
    soft: '#ECFDF5',
    headline: 'Feel better, faster.',
    voice: 'Verified pharmacies, discreet delivery, prescriptions handled with care.',
    sectionTitle: 'Pharmacies near you',
  },
  {
    id: 'groceries',
    label: 'Groceries',
    tagline: 'Fresh from the souk',
    emoji: '🛒',
    gradient: ['#FFB74D', '#C66B1F'],
    partnerCount: 14,
    // Groceries: fresh, abundant, market-morning.
    accent: '#C66B1F',
    soft: '#FFF7EC',
    headline: 'Straight from the souk.',
    voice: 'Daily-fresh produce, pantry staples and market finds, picked for you.',
    sectionTitle: 'Markets & grocers',
  },
];

export function useCategories() {
  return { categories: CATEGORIES, loading: false, error: null as Error | null };
}

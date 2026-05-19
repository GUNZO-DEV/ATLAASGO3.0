/**
 * Seeds the local Firestore emulator with AtlaasGo dev data:
 *   - 3 categories (food / pharmacy / groceries)
 *   - 4 partner restaurants per category
 *   - 2 demo orders walking the timeline
 *
 * Usage:   npm run seed       (with emulators already running)
 *   or:    npm run reset      (one-shot: starts emulator, seeds, exits)
 */
import { initializeApp } from 'firebase/app';
import {
  GeoPoint,
  Timestamp,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-atlaasgo';
const HOST = process.env.FIRESTORE_HOST ?? '127.0.0.1';
const PORT = Number(process.env.FIRESTORE_PORT ?? 8080);

const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' });
const db = getFirestore(app);
connectFirestoreEmulator(db, HOST, PORT);

type CategoryKey = 'food' | 'pharmacy' | 'groceries';

const CATEGORIES: Array<{
  id: CategoryKey;
  label: string;
  tagline: string;
  emoji: string;
  gradient: [string, string];
  partnerCount: number;
}> = [
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

const PARTNERS: Record<CategoryKey, Array<{ id: string; name: string; rating: number; timeMin: number }>> = {
  food: [
    { id: 'cafe-hassan', name: 'Café Hassan', rating: 4.9, timeMin: 18 },
    { id: 'la-paix-pizzeria', name: 'La Paix Pizzeria', rating: 4.8, timeMin: 22 },
    { id: 'atlas-grill', name: 'Atlas Grill House', rating: 4.8, timeMin: 28 },
    { id: 'boulangerie-michlifen', name: 'Boulangerie Michlifen', rating: 4.9, timeMin: 14 },
  ],
  pharmacy: [
    { id: 'pharmacy-michlifen', name: 'Pharmacie Michlifen', rating: 4.7, timeMin: 12 },
    { id: 'pharmacy-atlas', name: 'Pharmacie Atlas', rating: 4.6, timeMin: 18 },
    { id: 'pharmacy-paix', name: 'Pharmacie de la Paix', rating: 4.8, timeMin: 14 },
    { id: 'pharmacy-cedres', name: 'Pharmacie des Cèdres', rating: 4.5, timeMin: 22 },
  ],
  groceries: [
    { id: 'marjane-ifrane', name: 'Marjane Ifrane', rating: 4.5, timeMin: 32 },
    { id: 'carrefour-meknes', name: 'Carrefour Express', rating: 4.4, timeMin: 38 },
    { id: 'souk-ifrane', name: 'Souk Centrale', rating: 4.7, timeMin: 26 },
    { id: 'bio-atlas', name: 'Bio Atlas', rating: 4.8, timeMin: 28 },
  ],
};

// AUI Building 16, Ifrane (approx)
const AUI_COORDS = { lat: 33.5350, lng: -5.1106 };

const DEMO_ORDERS = [
  {
    id: 'demo-active',
    customerId: 'student-yasmine',
    category: 'food' as CategoryKey,
    status: 'outForDelivery' as const,
    coords: { ...AUI_COORDS, accuracyM: 8 },
    landmark: 'Near the AUI gate, opposite the library',
    totalDh: 138,
    driverPayload: {
      headerLandmark: 'Near the AUI gate, opposite the library',
      coords: new GeoPoint(AUI_COORDS.lat, AUI_COORDS.lng),
      deliveryNotes: 'Building 16, Room 204',
    },
  },
  {
    id: 'demo-recent',
    customerId: 'student-omar',
    category: 'groceries' as CategoryKey,
    status: 'preparing' as const,
    coords: { lat: 33.5325, lng: -5.1138, accuracyM: 12 },
    landmark: 'Behind the Telecom shop on Avenue Mohammed V',
    totalDh: 212,
    driverPayload: {
      headerLandmark: 'Behind the Telecom shop on Avenue Mohammed V',
      coords: new GeoPoint(33.5325, -5.1138),
      deliveryNotes: '',
    },
  },
];

async function seed() {
  console.log(`Seeding Firestore emulator at ${HOST}:${PORT} (project ${PROJECT_ID})…`);

  for (const c of CATEGORIES) {
    await setDoc(doc(db, 'categories', c.id), c);
    console.log(`  categories/${c.id}`);
  }

  for (const cat of Object.keys(PARTNERS) as CategoryKey[]) {
    for (const p of PARTNERS[cat]) {
      await setDoc(doc(db, 'partners', p.id), { ...p, category: cat });
      console.log(`  partners/${p.id}`);
    }
  }

  for (const o of DEMO_ORDERS) {
    await setDoc(doc(db, 'orders', o.id), { ...o, createdAt: serverTimestamp() });
    console.log(`  orders/${o.id}`);
  }

  console.log('Seed done.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });

// Silence unused-import noise for Timestamp (kept for future use).
void Timestamp;

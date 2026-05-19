/**
 * Verifies firestore.rules are enforced. Attempts:
 *   1. an order create with an empty landmark — rule should reject
 *   2. an order create with a valid landmark — rule should accept
 *
 * Uses a unique doc id per run so prior runs don't mask a regression by
 * turning `create` into `update`.
 */
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  GeoPoint,
} from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-atlaasgo', apiKey: 'demo-key' });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const runId = Math.random().toString(36).slice(2, 10);

async function attempt(landmark: string) {
  await setDoc(doc(db, 'orders', `rules-test-${runId}-${landmark.length}`), {
    customerId: 'x',
    category: 'food',
    status: 'ordered',
    coords: { lat: 33.5, lng: -5.1 },
    landmark,
    totalDh: 1,
    driverPayload: {
      headerLandmark: landmark,
      coords: new GeoPoint(33.5, -5.1),
    },
  });
}

async function main() {
  // 1. empty landmark — must be rejected
  try {
    await attempt('');
    console.log('✗ empty landmark create succeeded — RULES NOT ENFORCING');
    process.exit(2);
  } catch (e) {
    const msg = (e as Error).message;
    if (!/permission|PERMISSION_DENIED/i.test(msg)) {
      console.log('? unexpected error on empty-landmark create:', msg);
      process.exit(3);
    }
    console.log('✓ empty landmark rejected by rules');
  }

  // 2. valid landmark — must be accepted
  try {
    await attempt('Near the Grand Mosque');
    console.log('✓ valid landmark accepted by rules');
  } catch (e) {
    console.log('✗ valid landmark create rejected — RULES TOO STRICT:', (e as Error).message);
    process.exit(4);
  }

  console.log('Rules contract verified.');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

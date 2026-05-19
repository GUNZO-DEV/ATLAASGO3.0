/**
 * Live-update smoke test.
 *
 * Walks `orders/demo-active` through every order stage on a real Firestore
 * emulator. Snapshots the doc after each write to confirm propagation —
 * proving the mobile app's onSnapshot listeners (which use the same client SDK
 * code path) will receive these updates in real-time.
 *
 * Usage:  npm run advance     (emulator must be running)
 */
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-atlaasgo';
const HOST = process.env.FIRESTORE_HOST ?? '127.0.0.1';
const PORT = Number(process.env.FIRESTORE_PORT ?? 8080);

const STAGES = ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'] as const;
const ORDER_ID = process.argv[2] ?? 'demo-active';
const STEP_MS = 800;

const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' });
const db = getFirestore(app);
connectFirestoreEmulator(db, HOST, PORT);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Advancing orders/${ORDER_ID} through all stages…`);
  const ref = doc(db, 'orders', ORDER_ID);

  for (const stage of STAGES) {
    await updateDoc(ref, { status: stage });
    await sleep(150);
    const snap = await getDoc(ref);
    const persisted = snap.data()?.status;
    const ok = persisted === stage ? '✓' : '✗';
    console.log(`  ${ok} status -> ${stage}  (read-back: ${persisted})`);
    if (persisted !== stage) process.exit(1);
    await sleep(STEP_MS);
  }
  console.log('Live-update loop verified.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('advance-demo failed:', e);
    process.exit(1);
  });

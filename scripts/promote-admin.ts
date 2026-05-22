/**
 * scripts/promote-admin.ts
 * Promotes an existing user account to `role: 'admin'` so they can access
 * the /admin/dashboard page.
 *
 * Run:   npx tsx scripts/promote-admin.ts <email> <password>
 * Run:   SEED_EMAIL=... SEED_PASSWORD=... npx tsx scripts/promote-admin.ts
 *
 * Note: Requires the user to already exist (registered via /register page).
 * After signing in we flip their own `role` to 'admin'. The rules allow
 * `request.auth.uid == userId` to update their own user doc, so no
 * privileged credentials are needed.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db   = getFirestore(app);

const email    = process.argv[2] ?? process.env.SEED_EMAIL;
const password = process.argv[3] ?? process.env.SEED_PASSWORD;

if (!email || !password) {
  console.error("Usage: npx tsx scripts/promote-admin.ts <email> <password>");
  console.error("   or: SEED_EMAIL=... SEED_PASSWORD=... npx tsx scripts/promote-admin.ts");
  process.exit(1);
}

async function promote() {
  const { user } = await signInWithEmailAndPassword(auth, email!, password!);
  console.log(`🔐 Signed in as ${email} (uid: ${user.uid})`);

  await updateDoc(doc(db, "users", user.uid), { role: "admin" });
  console.log(`✅ User promoted to admin. Visit /admin/dashboard.`);
  process.exit(0);
}

promote().catch((err) => {
  console.error("❌ Promote failed:", err.message ?? err);
  process.exit(1);
});

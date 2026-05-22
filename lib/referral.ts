// lib/referral.ts

/** Generate a 6-character uppercase alphanumeric referral code. */
export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Register a referral code → uid mapping in the `referralCodes` collection.
 * Allows other users (during signup with ?ref=CODE) to resolve the code's
 * owner without needing permission to query the private `users` collection.
 *
 * Idempotent — if a previous version was created with a different uid,
 * Firestore rules block overwrites; callers should handle the failure.
 */
export async function registerReferralCode(code: string, uid: string): Promise<void> {
  const { doc, setDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await setDoc(doc(db, "referralCodes", code), {
    uid,
    createdAt: new Date().toISOString(),
  });
}

/**
 * After a new user registers with ?ref=CODE, look up the referrer
 * via the public `referralCodes` collection and store `referredBy`
 * on the new user's doc.
 *
 * Falls back to legacy users-collection query for backwards-compat
 * with codes that were issued before the referralCodes table existed.
 */
export async function applyReferralOnRegister(
  code: string,
  newUid: string
): Promise<void> {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  // 1. Direct lookup via referralCodes collection (preferred path)
  const codeSnap = await getDoc(doc(db, "referralCodes", code));
  let referrerId = codeSnap.exists() ? (codeSnap.data().uid as string | undefined) : undefined;

  // 2. Fall back to legacy users query (only works for self-referral,
  //    but worth attempting in case rules ever change).
  if (!referrerId) {
    try {
      const { collection, query, where, limit, getDocs } =
        await import("firebase/firestore");
      const snap = await getDocs(
        query(collection(db, "users"), where("referralCode", "==", code), limit(1))
      );
      if (!snap.empty) referrerId = snap.docs[0].id;
    } catch {
      // permission-denied is expected here for non-admin callers.
    }
  }

  if (!referrerId || referrerId === newUid) return;
  await updateDoc(doc(db, "users", newUid), { referredBy: referrerId });
}

/**
 * Award MAD credit to a referrer and write a notification.
 * Call this when the referee places their first order.
 */
export async function awardReferralCredit(
  referrerId: string,
  amount: number
): Promise<void> {
  const { doc, updateDoc, increment, collection, addDoc } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  await updateDoc(doc(db, "users", referrerId), {
    referralCredits: increment(amount),
  });

  await addDoc(collection(db, "users", referrerId, "notifications"), {
    type: "referral",
    title: "Bonus de parrainage ! 🎉",
    body: `Vous avez gagné ${amount} MAD — un ami a passé sa première commande`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

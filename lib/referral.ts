/** Generate a 6-character uppercase alphanumeric referral code. */
export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * After a new user registers with ?ref=CODE, look up the referrer
 * and store referredBy on the new user's doc.
 */
export async function applyReferralOnRegister(
  code: string,
  newUid: string
): Promise<void> {
  const { collection, query, where, limit, getDocs, doc, updateDoc } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const snap = await getDocs(
    query(collection(db, "users"), where("referralCode", "==", code), limit(1))
  );
  if (!snap.empty) {
    await updateDoc(doc(db, "users", newUid), { referredBy: snap.docs[0].id });
  }
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
    title: "Referral bonus! 🎉",
    body: `You earned ${amount} MAD — a friend placed their first order`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

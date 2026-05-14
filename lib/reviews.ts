/** Pure rolling average — used by submitReview and tests. */
export function calculateRollingAverage(
  currentAvg: number,
  currentCount: number,
  newRating: number
): number {
  if (currentCount === 0) return newRating;
  return (currentAvg * currentCount + newRating) / (currentCount + 1);
}

/**
 * Submit a review for a delivered order.
 * - Writes to users/{uid}/reviews/{auto-id}
 * - Marks orderId in user.reviewedOrderIds
 * - Updates restaurant rolling average via transaction
 */
export async function submitReview(
  uid: string,
  orderId: string,
  restaurantId: string,
  rating: number,
  comment: string
): Promise<void> {
  const { doc, runTransaction, collection, addDoc, updateDoc, arrayUnion } =
    await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  // Write review doc
  await addDoc(collection(db, "users", uid, "reviews"), {
    restaurantId,
    orderId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  });

  // Mark order as reviewed (prevents duplicate submissions)
  await updateDoc(doc(db, "users", uid), {
    reviewedOrderIds: arrayUnion(orderId),
  });

  // Update restaurant rating via rolling average transaction
  await runTransaction(db, async (tx) => {
    const restRef = doc(db, "restaurants", restaurantId);
    const restSnap = await tx.get(restRef);
    if (!restSnap.exists()) return;
    const { rating: cur = 0, reviewCount = 0 } = restSnap.data();
    const newCount = reviewCount + 1;
    const newRating = calculateRollingAverage(cur, reviewCount, rating);
    tx.update(restRef, {
      rating: Math.round(newRating * 10) / 10,
      reviewCount: newCount,
    });
  });
}

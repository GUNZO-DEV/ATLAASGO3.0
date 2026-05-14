"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StarPicker from "@/components/StarPicker";
import { submitReview } from "@/lib/reviews";
import toast from "react-hot-toast";
import type { Order } from "@/types/order";

export default function ReviewPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();

  const [uid, setUid]                 = useState<string | null>(null);
  const [order, setOrder]             = useState<Order & { restaurantId?: string; restaurantName?: string } | null>(null);
  const [rating, setRating]           = useState(0);
  const [comment, setComment]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!uid || !orderId) return;
    getDoc(doc(db, "orders", orderId))
      .then((snap) => {
        if (!snap.exists()) return;
        setOrder({ id: snap.id, ...snap.data() } as Order & { restaurantId?: string; restaurantName?: string });
      })
      .catch((err) => console.error("Failed to load order:", err));
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (snap.exists() && (snap.data().reviewedOrderIds ?? []).includes(orderId)) {
          setAlreadyDone(true);
        }
      })
      .catch((err) => console.error("Failed to check review status:", err));
  }, [uid, orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !order || rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setLoading(true);
    try {
      await submitReview(uid, orderId, order.restaurantId ?? "", rating, comment);
      toast.success("Review submitted!");
      setLoading(false);
      router.push(`/orders/${orderId}`);
    } catch {
      toast.error("Failed to submit review");
      setLoading(false);
    }
  };

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 font-medium">You already reviewed this order</p>
        <Link href={`/orders/${orderId}`} className="text-[#E05A23] text-sm font-medium">
          Back to order
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href={`/orders/${orderId}`}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Rate your order</h1>
        </div>

        {order && (
          <p className="text-gray-500 text-sm mb-6">
            from <strong className="text-gray-900">{order.restaurantName ?? "Restaurant"}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-4">How was your experience?</p>
            <StarPicker value={rating} onChange={setRating} />
            <p className="text-xs text-gray-400 mt-3">
              {rating === 0 && "Tap a star to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very good"}
              {rating === 5 && "Excellent!"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Leave a comment <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="What did you love? Anything to improve?"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/300</p>
          </div>

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full py-4 bg-[#E05A23] text-white rounded-2xl font-bold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
}

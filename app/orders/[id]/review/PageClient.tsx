"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { submitReview } from "@/lib/reviews";
import toast from "react-hot-toast";
import type { Order } from "@/types/order";

type OrderWithMeta = Order & { restaurantId?: string; restaurantName?: string };

const RATING_LABELS: Record<number, string> = {
  0: "Touchez une étoile pour noter",
  1: "Médiocre",
  2: "Passable",
  3: "Bien",
  4: "Très bien",
  5: "Excellent !",
};

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
        >
          <Star
            className={`w-9 h-9 ${
              n <= value ? "fill-[#F0A500] text-[#F0A500]" : "fill-transparent text-[#1B2440]/20"
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();

  const [uid, setUid]                 = useState<string | null>(null);
  const [order, setOrder]             = useState<OrderWithMeta | null>(null);
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
        setOrder({ id: snap.id, ...snap.data() } as OrderWithMeta);
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
      toast.error("Veuillez sélectionner une note");
      return;
    }
    setLoading(true);
    try {
      await submitReview(uid, orderId, order.restaurantId ?? "", rating, comment);
      toast.success("Merci pour votre avis !");
      router.push(`/orders/${orderId}`);
    } catch (err) {
      console.error("submitReview failed:", err);
      toast.error("Échec de l'envoi de l'avis");
      setLoading(false);
    }
  };

  // Already-reviewed state
  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
          <div className="w-14 h-14 rounded-full bg-[#2DC08A]/10 flex items-center justify-center mx-auto mb-4">
            <Star className="w-7 h-7 fill-[#2DC08A] text-[#2DC08A]" />
          </div>
          <h2
            className="text-[20px] font-extrabold text-[#1B2440] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Avis déjà envoyé
          </h2>
          <p className="text-sm text-[#6B7A9E] mb-5">
            Merci d&apos;avoir partagé votre expérience sur cette commande.
          </p>
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex items-center gap-2 bg-[#E55A26] hover:bg-[#C94D20] text-white font-bold text-sm px-6 py-2.5 rounded-full transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour à la commande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[600px] mx-auto px-6 pt-8 pb-16">

        {/* Back bar */}
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-1.5 text-[#6B7A9E] hover:text-[#1B2440] text-sm font-medium transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour à la commande
        </Link>

        {/* Title */}
        <h1
          className="font-extrabold text-[28px] text-[#1B2440] leading-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Évaluez votre commande
        </h1>
        {order?.restaurantName && (
          <p className="text-sm text-[#6B7A9E] mb-8">
            chez <span className="font-bold text-[#1B2440]">{order.restaurantName}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Star rating card */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7A9E] text-center mb-5">
              Votre note
            </p>
            <StarRow value={rating} onChange={setRating} />
            <p className="text-sm text-[#1B2440] font-medium text-center mt-4 min-h-[20px]">
              {RATING_LABELS[rating]}
            </p>
          </div>

          {/* Comment card */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <label
              htmlFor="review-comment"
              className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7A9E] mb-3"
            >
              Commentaire <span className="font-normal normal-case tracking-normal text-[#6B7A9E]">(optionnel)</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="Qu'avez-vous aimé ? Quelque chose à améliorer ?"
              rows={4}
              className="w-full px-4 py-3 bg-[#F5F0E8] border border-transparent focus:border-[#E55A26]/30 rounded-xl text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:outline-none focus:ring-0 resize-none transition-colors"
            />
            <p className="text-xs text-[#6B7A9E] mt-1.5 text-right">{comment.length}/300</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full py-4 bg-[#E55A26] hover:bg-[#C94D20] text-white rounded-2xl font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_4px_14px_rgba(229,90,38,0.25)]"
          >
            {loading ? "Envoi en cours…" : "Envoyer mon avis"}
          </button>
        </form>
      </div>
    </div>
  );
}

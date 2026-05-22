// app/referral/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Copy, Share2, Gift, UserPlus, ShoppingBag, Wallet } from "lucide-react";
import toast from "react-hot-toast";

const STEPS = [
  { icon: Share2,     title: "Partagez votre code",         body: "Envoyez-le à vos amis par message ou réseau social." },
  { icon: UserPlus,   title: "Un ami s'inscrit",            body: "Avec votre code lors de son inscription." },
  { icon: ShoppingBag, title: "Il passe sa 1ère commande",  body: "Vous gagnez 20 MAD dès la livraison." },
  { icon: Wallet,     title: "Utilisez vos crédits",        body: "Appliquez vos MAD à n'importe quelle commande." },
];

export default function ReferralPage() {
  const router = useRouter();
  const [code, setCode]       = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/register"); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setCode(data.referralCode ?? null);
          setCredits(data.referralCredits ?? 0);
          setReferredBy(data.referredBy ?? null);
        }
      } catch (err) {
        console.error("Failed to load referral data:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${code ?? ""}`;

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  const copyLink = () => {
    if (!code) return;
    navigator.clipboard.writeText(shareLink);
    toast.success("Lien copié !");
  };

  const shareNative = () => {
    if (!code) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Rejoignez AtlaasGo",
        text: `Utilisez mon code ${code} pour une réduction sur votre première commande !`,
        url: shareLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#E55A26] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 bg-[#E55A26]/10 text-[#E55A26] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
            <Gift className="w-3 h-3" />
            Parrainage
          </div>
          <h1
            className="font-extrabold text-[32px] text-[#1B2440] leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Parrainez, gagnez 20 MAD
          </h1>
          <p className="text-sm text-[#6B7A9E] mt-1.5">
            Chaque ami qui passe sa première commande vous rapporte <strong className="text-[#1B2440]">20 MAD</strong> en crédit.
          </p>
        </div>

        {code ? (
          <>
            {/* Referral card (zellige-style navy) */}
            <div className="relative bg-[#1B2440] text-white rounded-2xl p-7 overflow-hidden shadow-[0_10px_30px_rgba(27,36,64,0.18)] mb-6">
              {/* Zellige dot overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.12]"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative">
                {/* Credits balance */}
                {credits > 0 && (
                  <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 mb-5 inline-flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-[#2DC08A]" />
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Crédits disponibles</p>
                      <p
                        className="text-2xl font-extrabold leading-none mt-0.5"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {credits} MAD
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-[11px] uppercase tracking-widest text-white/60 font-bold mb-2">Votre code</p>
                <div className="flex items-center justify-between bg-white/15 backdrop-blur rounded-xl px-5 py-4 mb-5">
                  <span
                    className="text-3xl font-extrabold tracking-[0.18em]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 transition flex items-center justify-center cursor-pointer"
                    aria-label="Copier le code"
                  >
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareNative}
                    className="flex items-center justify-center gap-2 bg-[#E55A26] hover:bg-[#C94D20] text-white font-bold text-sm py-3 rounded-xl transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Partager
                  </button>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm py-3 rounded-xl transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    Copier le lien
                  </button>
                </div>
              </div>
            </div>

            {/* Referred-by badge */}
            {referredBy && (
              <div className="bg-[#2DC08A]/10 border border-[#2DC08A]/20 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2DC08A]/20 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-[#2DC08A]" />
                </div>
                <p className="text-sm text-[#1B2440]">
                  Vous avez été parrainé. Votre première commande débloquera un bonus pour votre parrain !
                </p>
              </div>
            )}

            {/* How it works */}
            <h2
              className="text-[18px] font-extrabold text-[#1B2440] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Comment ça marche
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FEF0E7] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#E55A26]" />
                    </div>
                    <div>
                      <p className="font-extrabold text-[#1B2440] text-sm leading-tight">{s.title}</p>
                      <p className="text-xs text-[#6B7A9E] mt-0.5 leading-snug">{s.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <p className="text-[#6B7A9E] text-sm">Aucun code de parrainage trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
}

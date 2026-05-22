// app/wallet/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Wallet,
  Crown,
  Check,
  ShoppingBag,
  Gift,
  ArrowUpCircle,
  Copy,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";

const DEMO_TRANSACTIONS = [
  { id: "1", label: "Commande #A3KX9Z", amount: -45, date: "15 mai 2026", type: "order" },
  { id: "2", label: "Bonus parrainage", amount: +20, date: "14 mai 2026", type: "referral" },
  { id: "3", label: "Recharge", amount: +100, date: "12 mai 2026", type: "topup" },
  { id: "4", label: "Commande #B7YM2P", amount: -32, date: "11 mai 2026", type: "order" },
  { id: "5", label: "Bonus parrainage", amount: +20, date: "10 mai 2026", type: "referral" },
];

const PRIME_BENEFITS = [
  "Livraison gratuite illimitée",
  "Offres exclusives chaque semaine",
  "Support prioritaire 24/7",
  "Accès anticipé aux nouveaux restos",
];

function TransactionIcon({ type }: { type: string }) {
  if (type === "order") {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#FEF0E7] flex items-center justify-center shrink-0">
        <ShoppingBag className="w-4.5 h-4.5 text-[#E55A26]" style={{ width: 18, height: 18 }} />
      </div>
    );
  }
  if (type === "referral") {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#2DC08A]/10 flex items-center justify-center shrink-0">
        <Gift className="text-[#2DC08A]" style={{ width: 18, height: 18 }} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-[#1B2440]/10 flex items-center justify-center shrink-0">
      <ArrowUpCircle className="text-[#1B2440]" style={{ width: 18, height: 18 }} />
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/register");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.referralCredits ?? 0);
          setReferralCode(data.referralCode ?? null);
        }
      } catch (err) {
        console.error("Failed to load wallet data:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success("Code copié !");
  };

  const shareReferralCode = () => {
    if (!referralCode) return;
    const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Rejoignez AtlaasGo",
        text: `Utilisez mon code ${referralCode} pour une réduction sur votre première commande !`,
        url: shareLink,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareLink);
      toast.success("Lien copié !");
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
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-[#E55A26]/10 text-[#E55A26] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
            <Wallet className="w-3 h-3" />
            Portefeuille
          </div>
          <h1
            className="font-extrabold text-[28px] text-[#1B2440] leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mon Wallet
          </h1>
          <p className="text-sm text-[#6B7A9E] mt-1">
            Gérez vos crédits et votre abonnement Prime.
          </p>
        </div>

        {/* Wallet hero card */}
        <div className="relative bg-gradient-to-br from-[#1B2440] to-[#0D1628] rounded-2xl p-6 overflow-hidden mb-6 shadow-[0_10px_30px_rgba(27,36,64,0.25)]">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-widest text-white/60 font-bold">
              Mon solde
            </p>
            <p
              className="text-5xl font-extrabold text-white mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {balance}{" "}
              <span className="text-2xl text-white/60">DH</span>
            </p>
            <button className="mt-4 bg-[#E55A26] hover:bg-[#C94D20] text-white font-bold text-sm px-6 py-2.5 rounded-full transition cursor-pointer">
              Recharger
            </button>
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(27,36,64,0.06)] mb-6 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2
              className="font-extrabold text-[#1B2440] text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Historique
            </h2>
          </div>
          <div className="divide-y divide-[#F5F0E8]">
            {DEMO_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                <TransactionIcon type={tx.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1B2440] truncate">{tx.label}</p>
                  <p className="text-xs text-[#6B7A9E]">{tx.date}</p>
                </div>
                <span
                  className={`text-sm font-extrabold shrink-0 ${
                    tx.amount > 0 ? "text-[#2DC08A]" : "text-red-500"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount} DH
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Prime membership card */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(27,36,64,0.06)] mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0A500]/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#F0A500]" />
            </div>
            <div>
              <p className="font-extrabold text-[#1B2440]">AtlaasGo Prime</p>
              <p className="text-xs text-[#6B7A9E]">Livraison gratuite + offres exclusives</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {PRIME_BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-[#1B2440]">
                <div className="w-5 h-5 rounded-full bg-[#2DC08A]/10 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#2DC08A]" />
                </div>
                {b}
              </div>
            ))}
          </div>

          {/* Pricing toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPlan("monthly")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                plan === "monthly"
                  ? "bg-[#F0A500] text-white"
                  : "bg-[#F5F0E8] text-[#1B2440]"
              }`}
            >
              29 DH/mois
            </button>
            <button
              onClick={() => setPlan("yearly")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                plan === "yearly"
                  ? "bg-[#F0A500] text-white"
                  : "bg-[#F5F0E8] text-[#1B2440]"
              }`}
            >
              249 DH/an{" "}
              <span className="text-[10px] opacity-70">(-28%)</span>
            </button>
          </div>

          <button className="w-full py-3 bg-[#F0A500] hover:bg-[#D89400] text-white rounded-2xl font-bold text-sm transition cursor-pointer">
            S'abonner à Prime
          </button>
        </div>

        {/* Referral code section */}
        {referralCode && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#FEF0E7] flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-[#E55A26]" />
              </div>
              <div>
                <p className="font-extrabold text-[#1B2440] text-sm">Mon code parrainage</p>
                <p className="text-xs text-[#6B7A9E]">Partagez et gagnez 20 DH par ami</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#F5F0E8] rounded-xl px-4 py-3 mb-3">
              <span
                className="text-xl font-extrabold tracking-[0.15em] text-[#1B2440]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {referralCode}
              </span>
              <button
                type="button"
                onClick={copyReferralCode}
                className="w-9 h-9 rounded-lg bg-white hover:bg-[#FEF0E7] transition flex items-center justify-center cursor-pointer shadow-sm"
                aria-label="Copier le code"
              >
                <Copy className="w-4 h-4 text-[#E55A26]" />
              </button>
            </div>

            <button
              type="button"
              onClick={shareReferralCode}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#E55A26] hover:bg-[#C94D20] text-white font-bold text-sm rounded-xl transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Partager mon code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

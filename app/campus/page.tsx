// app/campus/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { GraduationCap, Building2, DoorOpen, Send } from "lucide-react";
import toast from "react-hot-toast";

const BUILDINGS = [
  "Résidence A",
  "Résidence B",
  "Résidence C",
  "Résidence D",
  "Bâtiment Académique",
  "Bibliothèque",
  "Cafétéria",
  "Gymnase",
];

export default function CampusPage() {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/register");
        return;
      }
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim() || !building) return;
    setLoading(true);
    try {
      // Simulate order submission
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Commande envoyée !");
      setRequest("");
      setBuilding("");
      setRoom("");
    } catch {
      toast.error("Erreur lors de l'envoi. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
            <GraduationCap className="w-3 h-3" />
            Campus
          </div>
          <h1
            className="font-extrabold text-[28px] text-[#1B2440] leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Livraison Campus AUIER
          </h1>
          <p className="text-sm text-[#6B7A9E] mt-1">
            Commandez ce que vous voulez, on vous le livre.
          </p>
        </div>

        {/* Order form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] space-y-5">

            {/* What do you want? */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#1B2440] uppercase tracking-wider mb-2">
                <Send className="w-3.5 h-3.5 text-[#E55A26]" />
                Qu'est-ce que vous voulez ?
              </label>
              <textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder="Décrivez ce que vous voulez... (ex: 2 tacos + 1 jus d'orange du Snack Tanjia)"
                rows={3}
                className="w-full px-4 py-3 bg-[#F5F0E8] border border-transparent focus:border-[#E55A26]/30 rounded-xl text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:outline-none focus:ring-0 resize-none transition-colors"
              />
            </div>

            {/* Building selector */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#1B2440] uppercase tracking-wider mb-2">
                <Building2 className="w-3.5 h-3.5 text-[#E55A26]" />
                Bâtiment
              </label>
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full bg-[#F5F0E8] border border-transparent focus:border-[#E55A26]/30 rounded-xl px-4 py-3 text-sm text-[#1B2440] focus:outline-none focus:ring-0 appearance-none cursor-pointer transition-colors"
              >
                <option value="" disabled>
                  Sélectionnez votre bâtiment
                </option>
                {BUILDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Room number */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#1B2440] uppercase tracking-wider mb-2">
                <DoorOpen className="w-3.5 h-3.5 text-[#E55A26]" />
                Numéro de chambre / bureau
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="ex: 204"
                className="w-full bg-[#F5F0E8] border border-transparent focus:border-[#E55A26]/30 rounded-xl px-4 py-3 text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
          </div>

          {/* Fixed price display */}
          <div className="bg-[#1B2440] rounded-2xl p-5 text-center relative overflow-hidden">
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
                Frais de livraison fixe
              </p>
              <p
                className="text-4xl font-extrabold text-white mt-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                10 DH
              </p>
              <p className="text-xs text-white/60 mt-1">Pas de surprises</p>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading || !request.trim() || !building}
            className="w-full py-4 bg-[#E55A26] hover:bg-[#C94D20] text-white rounded-2xl font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_4px_14px_rgba(229,90,38,0.25)]"
          >
            {loading ? "Envoi en cours…" : "Commander maintenant"}
          </button>
        </form>
      </div>
    </div>
  );
}

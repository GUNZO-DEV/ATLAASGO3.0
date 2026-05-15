// app/favorites/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useFavorites } from "@/hooks/useFavorites";
import { getRestaurant } from "@/lib/restaurants";
import RestaurantSprite from "@/components/atlas/RestaurantSprite";
import type { Restaurant } from "@/types/restaurant";

export default function FavoritesPage() {
  const router = useRouter();

  const [uid, setUid]                 = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { favorites, toggle } = useFavorites(uid);

  useEffect(() => {
    if (!uid) return;
    if (favorites.length === 0) { setLoading(false); setRestaurants([]); return; }
    setLoading(true);
    Promise.all(favorites.map(getRestaurant))
      .then((results) => setRestaurants(results.filter((r): r is Restaurant => r !== null)))
      .catch((err) => console.error("Failed to load favorites:", err))
      .finally(() => setLoading(false));
  }, [uid, favorites.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16">

        {/* Header */}
        <div className="mb-6">
          <h1
            className="font-extrabold text-[32px] text-[#1B2440] leading-tight flex items-center gap-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Heart className="w-8 h-8 fill-[#E55A26] text-[#E55A26]" />
            Mes favoris
          </h1>
          <p className="text-sm text-[#6B7A9E] mt-1">
            {restaurants.length} restaurant{restaurants.length !== 1 ? "s" : ""} sauvegardé{restaurants.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-[3px] border-[#E55A26] border-t-transparent animate-spin" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF0E7] flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-[#E55A26]" />
            </div>
            <h2
              className="text-[22px] font-extrabold text-[#1B2440] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Aucun favori pour l&apos;instant
            </h2>
            <p className="text-[#6B7A9E] text-sm mb-5">
              Touchez le cœur sur n&apos;importe quel restaurant pour le sauvegarder ici.
            </p>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 bg-[#E55A26] hover:bg-[#C94D20] text-white font-bold px-6 py-3 rounded-full transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Explorer les restos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.id}`}
                className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative">
                  <RestaurantSprite id={`rest:${r.id}`} height={140} radius={0} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggle(r.id);
                    }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                    aria-label="Retirer des favoris"
                  >
                    <Heart className="w-4 h-4 fill-[#E55A26] text-[#E55A26]" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-extrabold text-[#1B2440] text-sm leading-tight truncate">
                    {r.name}
                  </h3>
                  <p className="text-[11px] text-[#6B7A9E] mt-0.5 truncate">{r.description}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-[#6B7A9E]">
                    <span className="flex items-center gap-1">
                      <span className="text-[#F0A500]">★</span>
                      <span className="font-bold text-[#1B2440]">{r.rating}</span>
                    </span>
                    <span>{r.estimatedDeliveryMins} min</span>
                    <span className="font-medium">{r.deliveryFee} DH</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

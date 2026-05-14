// app/favorites/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useFavorites } from "@/hooks/useFavorites";
import { getRestaurant } from "@/lib/restaurants";
import RestaurantGrid from "@/components/RestaurantGrid";
import FloatingNavbar from "@/components/FloatingNavbar";
import type { Restaurant } from "@/types/restaurant";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function FavoritesPage() {
  const router = useRouter();
  const [uid, setUid]                 = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { favorites } = useFavorites(uid);

  useEffect(() => {
    if (!uid) return;
    if (favorites.length === 0) { setLoading(false); setRestaurants([]); return; }
    setLoading(true);
    Promise.all(favorites.map(getRestaurant))
      .then((results) => setRestaurants(results.filter((r): r is Restaurant => r !== null)))
      .catch((err) => { console.error("Failed to load favorites:", err); setError("Failed to load your favorites. Please refresh."); })
      .finally(() => setLoading(false));
  }, [uid, favorites.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {!loading && restaurants.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No favorites yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              Tap the heart on any restaurant to save it here
            </p>
            <Link
              href="/restaurants"
              className="inline-block bg-[#E05A23] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <RestaurantGrid
            restaurants={restaurants}
            selectedCuisines={[]}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

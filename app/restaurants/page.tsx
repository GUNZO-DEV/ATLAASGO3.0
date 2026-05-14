// app/restaurants/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRestaurants } from "@/lib/restaurants";
import CuisineFilterBar from "@/components/CuisineFilterBar";
import RestaurantGrid from "@/components/RestaurantGrid";
import FloatingNavbar from "@/components/FloatingNavbar";
import type { Restaurant } from "@/types/restaurant";

export default function RestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants]           = useState<Restaurant[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [zone, setZone]                         = useState("ifrane");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    setLoading(true);
    getRestaurants(zone)
      .then(setRestaurants)
      .finally(() => setLoading(false));
  }, [zone]);

  return (
    <div className="min-h-screen bg-cream">
      <FloatingNavbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.02em] font-[family-name:var(--font-display)] mb-1">Restaurants autour de toi</h1>
        <p className="text-navy-soft mb-6 text-sm">
          Livraison à{" "}
          <button
            onClick={() => setZone(zone === "ifrane" ? "oujda" : "ifrane")}
            className="font-medium text-brand underline cursor-pointer capitalize"
          >
            {zone}
          </button>
        </p>
        <div className="mb-6">
          <CuisineFilterBar selected={selectedCuisines} onChange={setSelectedCuisines} />
        </div>
        <RestaurantGrid
          restaurants={restaurants}
          selectedCuisines={selectedCuisines}
          loading={loading}
        />
      </div>
    </div>
  );
}

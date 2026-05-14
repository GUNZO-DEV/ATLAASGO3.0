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
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Restaurants near you</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Delivering to{" "}
          <button
            onClick={() => setZone(zone === "ifrane" ? "oujda" : "ifrane")}
            className="font-medium text-[#E05A23] underline cursor-pointer capitalize"
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

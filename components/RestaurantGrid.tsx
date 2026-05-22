// components/RestaurantGrid.tsx
"use client";

import RestaurantCard from "@/components/RestaurantCard";
import { filterByCuisine } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

interface Props {
  restaurants: Restaurant[];
  selectedCuisines: string[];
  loading?: boolean;
}

export default function RestaurantGrid({ restaurants, selectedCuisines, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const filtered = filterByCuisine(restaurants, selectedCuisines);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No restaurants found</p>
        <p className="text-sm mt-1">Try a different cuisine filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
    </div>
  );
}

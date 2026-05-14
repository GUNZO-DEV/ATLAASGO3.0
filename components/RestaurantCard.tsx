// components/RestaurantCard.tsx
"use client";

import Link from "next/link";
import { Star, Clock, ShoppingBag, Heart } from "lucide-react";
import type { Restaurant } from "@/types/restaurant";
import { useFavorites } from "@/hooks/useFavorites";
import { auth } from "@/lib/firebase";

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const uid = auth.currentUser?.uid ?? null;
  const { isFavorite, toggle } = useFavorites(uid);
  const fav = isFavorite(restaurant.id);

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Cover */}
      <div className="relative h-36 bg-gray-100">
        {restaurant.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-orange-300" />
          </div>
        )}
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-xs bg-black/60 px-3 py-1 rounded-full">
              Closed
            </span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(restaurant.id);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow cursor-pointer hover:scale-110 transition-transform"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${fav ? "fill-red-500 text-red-500" : "text-gray-400"}`}
          />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{restaurant.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {restaurant.rating.toFixed(1)}
          </span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {restaurant.estimatedDeliveryMins} min
          </span>
          <span>·</span>
          <span>
            {restaurant.deliveryFee === 0 ? "Free delivery" : `${restaurant.deliveryFee} MAD`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {restaurant.cuisine.slice(0, 2).map((c) => (
            <span
              key={c}
              className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full capitalize"
            >
              {c.replace("-", " ")}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

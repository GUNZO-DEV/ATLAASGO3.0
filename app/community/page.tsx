// app/community/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, orderBy, limit, getDocs, where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import FloatingNavbar from "@/components/FloatingNavbar";
import RestaurantCard from "@/components/RestaurantCard";
import type { Restaurant } from "@/types/restaurant";
import { Flame, Star, Sparkles } from "lucide-react";

interface TrendingRestaurant extends Restaurant {
  recentOrderCount?: number;
}

interface PopularItem {
  id: string;
  itemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;
  image: string;
  averageRating: number;
}

export default function CommunityPage() {
  const router = useRouter();
  const [trending, setTrending]       = useState<TrendingRestaurant[]>([]);
  const [popular, setPopular]         = useState<PopularItem[]>([]);
  const [newArrivals, setNewArrivals] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    async function load() {
      // Trending: from social_feed ordered by trendingScore
      const feedSnap = await getDocs(
        query(collection(db, "social_feed"), orderBy("trendingScore", "desc"), limit(5))
      );

      const trendingRestaurants = await Promise.all(
        feedSnap.docs.map(async (feedDoc) => {
          const feedData = feedDoc.data();
          const restSnap = await getDocs(
            query(collection(db, "restaurants"), where("__name__", "==", feedDoc.id), limit(1))
          );
          if (restSnap.empty) return null;
          const r = { id: restSnap.docs[0].id, ...restSnap.docs[0].data() } as Restaurant;
          return { ...r, recentOrderCount: feedData.recentOrderCount ?? 0 };
        })
      );
      setTrending(trendingRestaurants.filter(Boolean) as TrendingRestaurant[]);

      // Popular items
      const itemsSnap = await getDocs(
        query(collection(db, "popular_items"), orderBy("averageRating", "desc"), limit(8))
      );
      setPopular(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PopularItem)));

      // New this month
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const newSnap = await getDocs(
        query(
          collection(db, "restaurants"),
          where("createdAt", ">=", thirtyDaysAgo),
          orderBy("createdAt", "desc"),
          limit(6)
        )
      );
      setNewArrivals(newSnap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant)));

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNavbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12 space-y-10">

        {/* Trending Now */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-[#E05A23]" />
            <h2 className="text-lg font-bold text-gray-900">Trending Now</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-gray-400 text-sm">No trending data yet — place some orders!</p>
          ) : (
            <div className="space-y-3">
              {trending.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {r.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.coverImage} alt={r.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {r.cuisine.join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs bg-orange-50 text-[#E05A23] font-bold px-2 py-1 rounded-full">
                    🔥 {r.recentOrderCount ?? 0} orders today
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Popular Items */}
        {popular.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-gray-900">Popular Items</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {popular.map((item) => (
                <Link
                  key={item.id}
                  href={`/restaurants/${item.restaurantId}`}
                  className="shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                >
                  <div className="h-24 bg-gray-100">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.price} MAD</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-500">{item.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New This Month */}
        {newArrivals.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-bold text-gray-900">New This Month</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {newArrivals.map((r) => (
                <div key={r.id} className="relative">
                  <span className="absolute top-2 left-2 z-10 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-medium">
                    New
                  </span>
                  <RestaurantCard restaurant={r} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

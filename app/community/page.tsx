// app/community/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, orderBy, limit, getDocs, where, getDoc, doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
      // Trending: from social_feed ordered by trendingScore
      const feedSnap = await getDocs(
        query(collection(db, "social_feed"), orderBy("trendingScore", "desc"), limit(5))
      );

      const trendingRestaurants = await Promise.all(
        feedSnap.docs.map(async (feedDoc) => {
          const feedData = feedDoc.data();
          const restSnap = await getDoc(doc(db, "restaurants", feedDoc.id));
          if (!restSnap.exists()) return null;
          const r = { id: restSnap.id, ...restSnap.data() } as Restaurant;
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

      } catch (err) {
        console.error("Community page load error:", err);
        setError("Failed to load community data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16">

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1
            className="font-extrabold text-[32px] text-[#1B2440] leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Communauté
          </h1>
          <p className="text-sm text-[#6B7A9E] mt-1">
            Découvrez ce que la communauté AtlaasGo commande en ce moment
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-6">{error}</p>
        )}

        {/* ── Trending Now ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-[#E55A26]/10 text-[#E55A26] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
              <Flame className="w-3 h-3" />
              Trending Now
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-[#6B7A9E] text-sm">
              Pas encore de données de tendances — passez quelques commandes&nbsp;!
            </p>
          ) : (
            <div className="space-y-3">
              {trending.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  className="block w-full bg-[#1B2440] text-white rounded-2xl p-4 relative overflow-hidden group cursor-pointer"
                >
                  {/* Zellige dot pattern overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.12]"
                    style={{
                      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="relative flex items-center gap-4">
                    {/* Rank number */}
                    <span
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 font-extrabold text-sm text-white/80"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {idx + 1}
                    </span>

                    {/* Cover image */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 shrink-0">
                      {r.coverImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.coverImage} alt={r.name} className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* Name + cuisine */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-extrabold text-white text-base leading-tight truncate"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {r.name}
                      </p>
                      <p className="text-xs text-white/60 mt-0.5 truncate capitalize">
                        {(r.cuisine ?? []).join(" · ")}
                      </p>
                    </div>

                    {/* Order count badge */}
                    <span className="shrink-0 bg-[#E55A26] text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap group-hover:bg-[#C94D20] transition-colors">
                      {r.recentOrderCount ?? 0} commandes aujourd&apos;hui
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Popular Items ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-[#F0A500]/10 text-[#F0A500] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
              <Star className="w-3 h-3" />
              Populaires
            </span>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shrink-0 w-36 h-44 bg-white/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : popular.length === 0 ? null : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {popular.map((item) => (
                <Link
                  key={item.id}
                  href={`/restaurants/${item.restaurantId}`}
                  className="shrink-0 w-40 bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(27,36,64,0.06)] cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="h-28 bg-[#F5F0E8]">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-extrabold text-[#1B2440] truncate leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                      {item.name}
                    </p>
                    <p className="text-xs text-[#6B7A9E] mt-0.5">{item.restaurantName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-[#E55A26]">{item.price} MAD</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-[#F0A500] text-[#F0A500]" />
                        <span className="text-xs font-bold text-[#1B2440]">
                          {item.averageRating?.toFixed(1) ?? "–"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── New This Month ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-[#2DC08A]/10 text-[#2DC08A] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              Nouveau ce mois-ci
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-44 bg-white/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : newArrivals.length === 0 ? null : (
            <div className="grid grid-cols-2 gap-3">
              {newArrivals.map((r) => (
                <div key={r.id} className="relative">
                  <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-[#2DC08A] text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    Nouveau
                  </span>
                  <RestaurantCard restaurant={r} />
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

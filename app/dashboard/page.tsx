// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  ChevronRight,
  RefreshCw,
  Search,
  Mic,
  Home,
  ClipboardList,
  Heart,
  Wallet,
  User,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { subscribeToUserOrders, expireStaleOrders } from "@/lib/orders";
import RestaurantSprite from "@/components/atlas/RestaurantSprite";
import type { Order } from "@/types/order";
import type { Restaurant } from "@/types/restaurant";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  pending:   "En attente",
  accepted:  "Coursier en route",
  picked_up: "En livraison",
  delivered: "Livré",
  cancelled: "Annulé",
  expired:   "Expiré",
};

const STAGE_COLOR: Record<string, string> = {
  pending:   "bg-[#F0A500]/20 text-[#8A6610]",
  accepted:  "bg-[#E55A26]/20 text-[#C94D20]",
  picked_up: "bg-[#2DC08A]/20 text-[#2DC08A]",
  delivered: "bg-[#2DC08A]/10 text-[#2DC08A]",
  cancelled: "bg-gray-100 text-gray-500",
  expired:   "bg-gray-100 text-gray-400",
};

// Map restaurant names to sprite IDs used in our sprite sheet
const REST_SPRITE: Record<string, string> = {
  "Dar Naji":           "rest:darnaji",
  "Café Clock":         "rest:cafeclock",
  "Snack Tanjia":       "rest:snacktanjia",
  "Atay & Co":          "rest:atayco",
  "Riad Mogador":       "rest:riadmogador",
  "Baladi Healthy":     "rest:baladi",
};

const CATEGORIES = [
  { label: "Burgers",  icon: "🍔" },
  { label: "Pizza",    icon: "🍕" },
  { label: "Tajine",   icon: "🥘" },
  { label: "Sushi",    icon: "🍣" },
  { label: "Café",     icon: "☕" },
  { label: "Desserts", icon: "🍰" },
  { label: "Healthy",  icon: "🥗" },
  { label: "Poulet",   icon: "🍗" },
];

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-MA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function isActive(status: string) {
  return ["pending", "accepted", "picked_up"].includes(status);
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-[#E55A26] border-t-transparent animate-spin" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId]           = useState<string | null>(null);
  const [userName, setUserName]       = useState<string>("");
  const [memberSince, setMemberSince] = useState<string>("");
  const [orders, setOrders]           = useState<Order[]>([]);
  const [checking, setChecking]       = useState(true);
  const [recommended, setRecommended] = useState<Restaurant[]>([]);

  // New state for greeting widget
  const [weather, setWeather]         = useState("18");
  const [prayerTime, setPrayerTime]   = useState("20:45");

  // New state for saved addresses
  const [addresses, setAddresses]         = useState<{ id: string; label: string; address: string; isDefault: boolean }[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  // 1. Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/register"); return; }
      setUserId(user.uid);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        setUserName(data?.name ?? user.email ?? "");
        if (data?.createdAt) {
          setMemberSince(new Intl.DateTimeFormat("fr-MA", { year: "numeric" }).format(new Date(data.createdAt)));
        }
        // Load saved addresses
        if (Array.isArray(data?.savedAddresses) && data.savedAddresses.length > 0) {
          setAddresses(data.savedAddresses);
          const def = data.savedAddresses.find((a: { isDefault: boolean; id: string }) => a.isDefault);
          setSelectedAddress(def?.id ?? data.savedAddresses[0]?.id ?? null);
        }
      } catch {
        setUserName(user.email ?? "");
      }
      setChecking(false);
    });
    return unsub;
  }, [router]);

  // 2. Real-time order subscription + stale-pending sweep
  useEffect(() => {
    if (!userId) return;
    // Best-effort: flip any pending orders older than 5 min to 'expired'
    // so they don't keep showing as "in progress" forever. Fires once per
    // mount; errors swallowed (rule may deny if state moved underneath us).
    expireStaleOrders(userId).catch(() => {});
    const unsub = subscribeToUserOrders(userId, setOrders);
    return unsub;
  }, [userId]);

  // 3. Recommended restaurants — top 6 in user's zone sorted by rating
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { collection, query, where, orderBy, limit, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      // Fetch user zone first
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "users", userId));
      const zone = snap.data()?.zone ?? "ifrane";
      const restSnap = await getDocs(
        query(collection(db, "restaurants"), where("zone", "==", zone), orderBy("rating", "desc"), limit(6))
      );
      setRecommended(restSnap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant)));
    })();
  }, [userId]);

  // Suppress unused-variable lint warnings for static state setters that are
  // intentionally kept for future API integration.
  void setWeather;
  void setPrayerTime;

  if (checking) return <Skeleton />;

  const activeOrders = orders.filter((o) => isActive(o.status));
  const pastOrders   = orders.filter((o) => !isActive(o.status));
  const totalSpent   = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.total ?? 0), 0);

  // Active order to highlight (most recent)
  const liveOrder = activeOrders[0] ?? null;

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-24">

        {/* ── 1. Greeting header with weather + prayer time widget ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="font-extrabold text-[32px] text-[#1B2440]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Bonjour, {userName.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-[#6B7A9E] mt-0.5">
              Qu&apos;est-ce qui vous ferait plaisir ?
            </p>
          </div>
          {/* Weather + prayer widget */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex items-center gap-3">
            <div className="text-center">
              <p className="text-[11px] font-bold text-[#6B7A9E] uppercase tracking-wider">Ifrane</p>
              <p
                className="text-lg font-extrabold text-[#1B2440]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {weather}°C
              </p>
            </div>
            <div className="w-px h-8 bg-[#F5F0E8]" />
            <div className="text-center">
              <p className="text-[11px] font-bold text-[#6B7A9E] uppercase tracking-wider">Maghrib</p>
              <p
                className="text-lg font-extrabold text-[#1B2440]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {prayerTime}
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Saved addresses chip selector ── */}
        {addresses.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAddress(a.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer ${
                  selectedAddress === a.id
                    ? "bg-[#1B2440] text-white"
                    : "bg-white text-[#1B2440] shadow-[0_2px_10px_rgba(27,36,64,0.06)]"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* ── 3. Smart search bar ── */}
        <div
          onClick={() => router.push("/restaurants")}
          className="bg-white rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-[0_2px_10px_rgba(27,36,64,0.06)] mb-6 cursor-pointer hover:shadow-md transition-shadow"
        >
          <Search className="w-5 h-5 text-[#6B7A9E]" />
          <span className="text-[#6B7A9E] text-sm">Rechercher un resto ou un plat…</span>
          <Mic className="w-5 h-5 text-[#E55A26] ml-auto" />
        </div>

        {/* ── 4. Popular categories ── */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={`/restaurants?category=${encodeURIComponent(cat.label)}`}
              className="shrink-0 bg-white rounded-2xl px-4 py-3 flex flex-col items-center gap-1.5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] hover:shadow-md transition-shadow min-w-[72px]"
            >
              <span className="text-2xl leading-none">{cat.icon}</span>
              <span className="text-[11px] font-bold text-[#1B2440] whitespace-nowrap">{cat.label}</span>
            </Link>
          ))}
        </div>

        {/* ── 5. Special offers banner ── */}
        <div className="relative bg-[#E55A26] rounded-2xl p-6 mb-8 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Offre spéciale</p>
            <h3
              className="text-2xl font-extrabold text-white mt-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              -20% sur votre 1ère commande
            </h3>
            <p className="text-sm text-white/80 mt-1">Code : BIENVENUE</p>
          </div>
        </div>

        {/* ── 6. Live order banner ── */}
        {liveOrder && (
          <Link
            href={`/orders/${liveOrder.id}`}
            className="block w-full bg-[#1B2440] text-white rounded-2xl p-6 mb-8 relative overflow-hidden group"
          >
            {/* Zellige-style dot pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.12]"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative grid grid-cols-[1fr_auto] gap-5 items-center">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2DC08A] animate-pulse" />
                  {STAGE_LABEL[liveOrder.status] ?? "En cours"}
                </div>
                <h2
                  className="text-[28px] font-extrabold leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {liveOrder.restaurantName} · {liveOrder.items?.[0]?.name ?? "Ta commande"}
                </h2>
                <p className="text-sm text-white/80 mt-1">
                  {liveOrder.status === "accepted"  && "Coursier en route · "}
                  {liveOrder.status === "picked_up" && "Livraison en cours · "}
                  {liveOrder.status === "pending"   && "En attente d'un coursier · "}
                  {liveOrder.total} DH
                </p>
                {/* Progress bars */}
                <div className="flex gap-1.5 mt-4 max-w-xs">
                  {(["pending", "accepted", "picked_up"] as const).map((s, i) => {
                    const stageIdx = ["pending", "accepted", "picked_up"].indexOf(liveOrder.status);
                    const filled   = i <= stageIdx;
                    return (
                      <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/20">
                        {filled && <div className="h-full bg-[#E55A26] rounded-full" />}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#E55A26] px-5 py-3 rounded-full font-bold text-sm whitespace-nowrap group-hover:bg-[#C94D20] transition-colors">
                Suivre →
              </div>
            </div>
          </Link>
        )}

        {/* ── 7. Pour vous — recommended restaurants ── */}
        {recommended.length > 0 && (
          <>
            <h2 className="text-[20px] font-extrabold text-[#1B2440] mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Pour vous
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 mb-8 scrollbar-hide">
              {recommended.map((r) => (
                <Link key={r.id} href={`/restaurants/${r.id}`} className="shrink-0 w-[200px] bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="h-[110px] overflow-hidden">
                    <RestaurantSprite id={`rest:${r.id}`} height={110} radius={0} />
                  </div>
                  <div className="p-3">
                    <h3 className="font-extrabold text-[#1B2440] text-sm truncate">{r.name}</h3>
                    <p className="text-[11px] text-[#6B7A9E] truncate mt-0.5">{r.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-[#6B7A9E]">
                      <span className="flex items-center gap-0.5">
                        <span className="text-[#F0A500]">★</span>
                        <span className="font-bold text-[#1B2440]">{r.rating}</span>
                      </span>
                      <span>{r.estimatedDeliveryMins} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── 8. Stat chips ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Commandes",     value: orders.length.toString(),                                           sub: "au total" },
            { label: "Total dépensé", value: `${totalSpent.toLocaleString("fr-MA")} DH`,                        sub: "livraisons payées" },
            { label: "Restos visités", value: new Set(orders.map((o) => o.restaurantId)).size.toString(),        sub: "restaurants uniques" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7A9E] mb-1">{s.label}</p>
              <p
                className="text-[22px] font-extrabold text-[#1B2440]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </p>
              <p className="text-xs text-[#6B7A9E] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Browse CTA when no orders ── */}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center mb-8 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF0E7] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-[#E55A26]" />
            </div>
            <h2
              className="text-[22px] font-extrabold text-[#1B2440] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pas encore de commandes
            </h2>
            <p className="text-[#6B7A9E] text-sm mb-5">Découvrez nos restaurants partenaires et commandez !</p>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 bg-[#E55A26] hover:bg-[#C94D20] text-white font-bold px-6 py-3 rounded-full transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Explorer les restos
            </Link>
          </div>
        )}

        {/* ── 9. Past orders grid ── */}
        {pastOrders.length > 0 && (
          <>
            <h2
              className="text-[20px] font-extrabold text-[#1B2440] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Historique
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {pastOrders.map((order) => {
                const spriteId    = REST_SPRITE[order.restaurantName ?? ""] ?? "rest:darnaji";
                const itemsSummary = order.items?.map((i) => i.name).join(" · ") ?? "";

                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="bg-white rounded-[18px] p-4 flex gap-3.5 items-center hover:shadow-md transition-shadow group"
                  >
                    {/* Restaurant thumbnail */}
                    <div className="w-[60px] h-[60px] rounded-[14px] overflow-hidden shrink-0">
                      <RestaurantSprite id={spriteId} height={60} radius={0} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold text-[#1B2440] text-sm leading-tight truncate">
                          {order.restaurantName}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STAGE_COLOR[order.status] ?? "bg-gray-100 text-gray-500"}`}
                        >
                          {STAGE_LABEL[order.status] ?? order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7A9E] mt-1 truncate">{itemsSummary}</p>
                      <p className="text-[11px] text-[#6B7A9E] mt-0.5">{fmtDate(order.timestamp)}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-extrabold text-[#1B2440] text-sm">{order.total} DH</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/restaurants/${order.restaurantId}`);
                        }}
                        className="mt-1.5 bg-[#F5F0E8] hover:bg-[#FEF0E7] text-[#1B2440] rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Recommander
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ── Browse more CTA ── */}
        {orders.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 text-[#1B2440] border border-[#1B2440]/20 hover:border-[#E55A26] hover:text-[#E55A26] font-bold text-sm px-6 py-3 rounded-full transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Commander à nouveau
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>

      {/* ── 10. Bottom navigation bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F0E8] z-50 safe-area-pb">
        <div className="max-w-[1100px] mx-auto flex justify-around py-2">
          {[
            { icon: Home,          label: "Accueil",   href: "/dashboard" },
            { icon: ClipboardList, label: "Commandes", href: "/dashboard" },
            { icon: Heart,         label: "Favoris",   href: "/favorites" },
            { icon: Wallet,        label: "Wallet",    href: "/wallet" },
            { icon: User,          label: "Profil",    href: "/profile/settings" },
          ].map((item) => {
            const Icon   = item.icon;
            const active = item.href === "/dashboard" && item.label === "Accueil";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-[#E55A26]" : "text-[#6B7A9E]"}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

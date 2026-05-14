"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { identifyUser } from "@/lib/analytics";
import OrderForm from "@/components/OrderForm";
import LiveTracker from "@/components/LiveTracker";
import OrderHistory from "@/components/OrderHistory";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Truck, Clock, LayoutDashboard, LogOut, ShoppingBag } from "lucide-react";
import type { OrderStatus } from "@/types/order";
import type { Restaurant } from "@/types/restaurant";
import dynamic from "next/dynamic";
import { getRestaurants } from "@/lib/restaurants";
import RestaurantCard from "@/components/RestaurantCard";

const SceneCanvas       = dynamic(() => import("@/lib/r3f/canvas"),                  { ssr: false });
const DeliveryOrb       = dynamic(() => import("@/components/3d/DeliveryOrb"),       { ssr: false });
const DashboardLighting = dynamic(
  () => import("@/lib/r3f/lighting").then((m) => ({ default: m.DashboardLighting })),
  { ssr: false }
);
const CityMap3D   = dynamic(() => import("@/components/3d/CityMap3D"),  { ssr: false });
const MapLighting = dynamic(
  () => import("@/lib/r3f/lighting").then((m) => ({ default: m.MapLighting })),
  { ssr: false }
);

interface Prefill {
  description: string;
  pickup: string;
  dropoff: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function DashboardPage() {
  const [userId, setUserId]           = useState<string | null>(null);
  const [userName, setUserName]       = useState<string>("");
  const [hasActiveOrder, setHasActiveOrder] = useState(true);
  const [prefill, setPrefill]         = useState<Prefill | undefined>();
  const [checking, setChecking]       = useState(true);
  const [signingOut, setSigningOut]   = useState(false);
  const [activeOrderStatus, setActiveOrderStatus] = useState<OrderStatus>("pending");
  const [driverDot, setDriverDot] = useState<{ id: string; lat: number; lng: number } | null>(null);
  const [mapZone, setMapZone] = useState<"ifrane" | "oujda">("ifrane");
  const [activeOrder, setActiveOrder] = useState<{ id: string; restaurantName?: string; status: string } | null>(null);
  const [recommended, setRecommended] = useState<Restaurant[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/register");
      } else {
        setUserId(user.uid);
        identifyUser(user.uid, { role: "customer", email: user.email ?? undefined });
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          setUserName(snap.data()?.name ?? user.email ?? "");
        } catch {
          setUserName(user.email ?? "");
        }
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  // Active order detection
  useEffect(() => {
    if (!userId) return;
    let unsub: (() => void) | undefined;
    Promise.all([
      import("firebase/firestore"),
      import("@/lib/firebase"),
    ]).then(([{ collection, query, where, onSnapshot, limit }, { db: firestoreDb }]) => {
      const q = query(
        collection(firestoreDb, "orders"),
        where("customerId", "==", userId),
        where("status", "in", ["pending", "accepted", "picked_up"]),
        limit(1)
      );
      unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const d = snap.docs[0];
          setActiveOrder({ id: d.id, restaurantName: d.data().restaurantName, status: d.data().status });
        } else {
          setActiveOrder(null);
        }
      });
    });
    return () => unsub?.();
  }, [userId]);

  // Recommended restaurants
  useEffect(() => {
    getRestaurants("ifrane").then((list) => setRecommended(list.slice(0, 6)));
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut(auth);
    router.push("/");
  };

  const handleReorder = (data: Prefill) => {
    setPrefill(data);
    setHasActiveOrder(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (checking) {
    return (
      <main
        className="min-h-screen bg-cream px-4 py-10"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div className="animate-pulse">
            <div className="h-7 w-32 bg-cream-2 rounded-xl mb-2" />
            <div className="h-4 w-48 bg-cream-2 rounded-xl" />
          </div>
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-cream px-4 py-10"
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          {/* ── Header row ── */}
          <motion.div variants={item} className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-emerald-atlaasgo" strokeWidth={1.8} />
                <h1 className="text-2xl font-extrabold text-navy tracking-[-0.02em] font-[family-name:var(--font-display)]">
                  {userName ? `Hey, ${userName.split(" ")[0]}` : "Dashboard"}
                </h1>
              </div>
              <p className="text-navy-soft text-sm pl-7">Place and track your deliveries</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 text-xs text-navy-soft hover:text-red-500 border border-line hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
              {signingOut ? "…" : "Sign out"}
            </motion.button>
          </motion.div>

          {/* ── Stat chips row ── */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            <div className="card-glass flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-atlaasgo/10 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-emerald-atlaasgo" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[11px] text-navy-soft font-medium uppercase tracking-wider">Delivery</p>
                <p className="text-sm font-bold text-navy">15 MAD flat</p>
              </div>
            </div>
            <div className="card-glass flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-gold" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[11px] text-navy-soft font-medium uppercase tracking-wider">Avg. Time</p>
                <p className="text-sm font-bold text-navy">~25 min</p>
              </div>
            </div>
          </motion.div>

          {/* ── DeliveryOrb 3D status visualization ── */}
          {hasActiveOrder && (
            <motion.div variants={item}>
              <div className="w-full h-48 rounded-3xl overflow-hidden relative mb-0" style={{ background: 'rgba(30,45,74,0.4)' }}>
                <SceneCanvas camera={{ fov: 50, position: [0, 0, 4] }}>
                  <DashboardLighting />
                  <DeliveryOrb status={activeOrderStatus} />
                </SceneCanvas>
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    {activeOrderStatus === "pending"   && "Waiting for a driver…"}
                    {activeOrderStatus === "accepted"  && "Driver on the way"}
                    {activeOrderStatus === "picked_up" && "Your order is en route"}
                    {activeOrderStatus === "delivered" && "Delivered! 🎉"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CityMap3D live tracking ── */}
          {(activeOrderStatus === "accepted" || activeOrderStatus === "picked_up") && hasActiveOrder && (
            <motion.div variants={item}>
              <div className="w-full h-64 rounded-3xl overflow-hidden relative" style={{ background: '#1e2d4a' }}>
                <SceneCanvas camera={{ fov: 60, position: [0, 8, 0.01] }}>
                  <MapLighting />
                  <CityMap3D
                    zone={mapZone}
                    dots={driverDot ? [{ ...driverDot, color: "#e05a23" }] : []}
                  />
                </SceneCanvas>
                <div className="absolute top-3 left-4">
                  <span className="text-white/50 text-xs">Live tracking</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Live tracker / Order form ── */}
          <motion.div variants={item} className="card-glass !p-0 overflow-hidden">
            {hasActiveOrder ? (
              <div
                data-ph-capture-attribute-section="live-tracker"
                className="p-6"
              >
                <LiveTracker
                  customerId={userId!}
                  onNoActiveOrder={() => setHasActiveOrder(false)}
                  onStatusChange={(status, zone) => {
                    if (status) setActiveOrderStatus(status);
                    if (zone === "ifrane" || zone === "oujda") setMapZone(zone);
                  }}
                />
              </div>
            ) : (
              <div data-ph-capture-attribute-section="order-form" className="p-6">
                <h2 className="text-base font-bold text-navy mb-5 tracking-tight">
                  {prefill ? "Reorder" : "New Order"}
                </h2>
                <OrderForm
                  customerId={userId!}
                  onOrderPlaced={() => { setHasActiveOrder(true); setPrefill(undefined); }}
                  prefill={prefill}
                />
              </div>
            )}
          </motion.div>

          {/* ── Active order banner ── */}
          {activeOrder && (
            <motion.div variants={item}>
              <Link
                href={`/orders/${activeOrder.id}`}
                className="flex items-center justify-between bg-orange-500 text-white rounded-2xl px-5 py-3 mb-4 animate-pulse"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {activeOrder.restaurantName ?? "Your order"} — {activeOrder.status.replace("_", " ")}
                  </p>
                  <p className="text-orange-100 text-xs mt-0.5">Tap to track your order</p>
                </div>
                <span className="text-white text-lg">→</span>
              </Link>
            </motion.div>
          )}

          {/* ── Recommended restaurants ── */}
          {recommended.length > 0 && (
            <motion.div variants={item} className="mb-4">
              <h2 className="font-bold text-navy text-base mb-3">Recommended for you</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {recommended.map((r) => (
                  <div key={r.id} className="shrink-0 w-48">
                    <RestaurantCard restaurant={r} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Browse restaurants CTA ── */}
          <motion.div variants={item}>
            <Link
              href="/restaurants"
              className="flex items-center justify-between bg-brand text-white rounded-2xl px-5 py-4 shadow-md shadow-brand/20 mb-4"
            >
              <div>
                <p className="font-bold text-base">Order food</p>
                <p className="text-white/80 text-sm mt-0.5">Browse restaurants near you</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* ── Order history ── */}
          <motion.div variants={item} className="card-glass !p-0 overflow-hidden">
            <div
              data-ph-capture-attribute-section="order-history"
              className="p-6"
            >
              <OrderHistory customerId={userId!} onReorder={handleReorder} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}

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
import { motion } from "framer-motion";
import { Truck, Clock, LayoutDashboard, LogOut } from "lucide-react";
import type { OrderStatus } from "@/types/order";
import dynamic from "next/dynamic";

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
        className="min-h-screen px-4 py-10"
        style={{ background: "linear-gradient(135deg, #f0faf5 0%, #ffffff 50%, #fffbf0 100%)" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div className="animate-pulse">
            <div className="h-7 w-32 bg-gray-200 rounded-xl mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded-xl" />
          </div>
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ background: "linear-gradient(135deg, #f0faf5 0%, #ffffff 50%, #fffbf0 100%)" }}
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
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {userName ? `Hey, ${userName.split(" ")[0]}` : "Dashboard"}
                </h1>
              </div>
              <p className="text-gray-400 text-sm pl-7">Place and track your deliveries</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer disabled:opacity-50 shrink-0"
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
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Delivery</p>
                <p className="text-sm font-bold text-gray-800">15 MAD flat</p>
              </div>
            </div>
            <div className="card-glass flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-gold" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Avg. Time</p>
                <p className="text-sm font-bold text-gray-800">~25 min</p>
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
                <h2 className="text-base font-bold text-gray-900 mb-5 tracking-tight">
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

"use client";

import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getDeliveryFee, formatMAD } from "@/lib/pricing";
import EarningsCard from "@/components/EarningsCard";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import DriverSkeleton from "@/components/DriverSkeleton";
import { motion } from "framer-motion";
import { Zap, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { track, identifyUser } from "@/lib/analytics";
import { playDing } from "@/lib/sound";
import { startTabAlert, stopTabAlert } from "@/lib/tabAlert";
import type { Order } from "@/types/order";

const WHATSAPP_MSG = encodeURIComponent(
  "Salam, this is your Atlaasgo driver! I am on my way with your order."
);

export default function DriverPage() {
  const [pending, setPending]       = useState<Order[]>([]);
  const [active, setActive]         = useState<Order[]>([]);
  const [driverId, setDriverId]     = useState<string | null>(null);
  const [isOnline, setIsOnline]     = useState(false);
  const [loading, setLoading]       = useState<string | null>(null);
  const [checking, setChecking]     = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const celebratedIds = useRef<Set<string>>(new Set());
  const deliveredInitialized = useRef(false);
  const pendingInitialized = useRef(false);
  // Tracks when each pending order was first seen — for time-to-accept metric
  const orderSeenAt  = useRef<Map<string, number>>(new Map());
  // Tracks when this driver accepted each order — for time-to-deliver metric
  const acceptedAt   = useRef<Map<string, number>>(new Map());
  // IDs of orders currently showing the ping animation
  const [alertIds, setAlertIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut(auth);
    router.push("/");
  };

  const fireConfetti = () => {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#006747", "#b8973e", "#ffffff"] });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
      else {
        setDriverId(user.uid);
        identifyUser(user.uid, { role: "driver", email: user.email ?? undefined });
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  // Pending orders (available to accept)
  useEffect(() => {
    if (!driverId) return;
    const q = query(collection(db, "orders"), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));

      if (!pendingInitialized.current) {
        // Seed known orders on first load — no alerts for pre-existing orders
        orders.forEach((o) => { if (o.id) orderSeenAt.current.set(o.id, Date.now()); });
        pendingInitialized.current = true;
        setPending(orders);
        return;
      }

      // Detect genuinely new orders
      const newIds: string[] = [];
      orders.forEach((o) => {
        if (o.id && !orderSeenAt.current.has(o.id)) {
          orderSeenAt.current.set(o.id, Date.now());
          track("driver_order_viewed", { driverId, orderId: o.id, zone: o.zone });
          newIds.push(o.id);
        }
      });

      if (newIds.length > 0) {
        // 1. Sound
        playDing();

        // 2. Tab alert
        startTabAlert(`🔔 New Order! — Atlaasgo`);

        // 3. Ping animation — add IDs, clear after 4 pulses (~4 s)
        setAlertIds((prev) => new Set([...prev, ...newIds]));
        setTimeout(() => {
          setAlertIds((prev) => {
            const next = new Set(prev);
            newIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 4500);
      }

      // Stop tab alert once all pending orders are gone
      if (orders.length === 0) stopTabAlert();

      setPending(orders);
    });
  }, [driverId]);

  // Active orders assigned to this driver
  useEffect(() => {
    if (!driverId) return;
    const q = query(
      collection(db, "orders"),
      where("driverId", "==", driverId),
      where("status", "in", ["assigned", "picked_up"])
    );
    return onSnapshot(q, (snap) =>
      setActive(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
    );
  }, [driverId]);

  // Watch for newly-delivered orders and celebrate
  useEffect(() => {
    if (!driverId) return;
    const q = query(
      collection(db, "orders"),
      where("driverId", "==", driverId),
      where("status", "==", "delivered")
    );
    return onSnapshot(q, (snap) => {
      if (!deliveredInitialized.current) {
        // Seed known delivered IDs on first load — don't celebrate past deliveries
        snap.docs.forEach((d) => celebratedIds.current.add(d.id));
        deliveredInitialized.current = true;
        return;
      }
      snap.docs.forEach((d) => {
        if (!celebratedIds.current.has(d.id)) {
          celebratedIds.current.add(d.id);
          const order = d.data() as Order;
          const accepted = acceptedAt.current.get(d.id);
          const secondsToDeliver = accepted ? Math.round((Date.now() - accepted) / 1000) : 0;
          track("driver_delivered", {
            driverId: driverId!,
            orderId: d.id,
            zone: order.zone,
            fee: order.fee ?? getDeliveryFee(order.zone),
            secondsToDeliver,
          });
          fireConfetti();
          toast.success("Delivery complete! Great job!", { duration: 5000 });
        }
      });
    });
  }, [driverId]);

  const updateStatus = async (orderId: string, status: string) => {
    setLoading(orderId + status);
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
      if (status === "picked_up" && driverId) {
        track("driver_picked_up", { driverId, orderId });
      }
    } finally {
      setLoading(null);
    }
  };

  const acceptDelivery = async (orderId: string, order: Order) => {
    if (!driverId) return;
    setLoading(orderId + "accepting");
    try {
      const now = Date.now();
      await updateDoc(doc(db, "orders", orderId), { status: "assigned", driverId, assignedAt: new Date(now).toISOString() });
      acceptedAt.current.set(orderId, now);
      const seenAt = orderSeenAt.current.get(orderId);
      const secondsToAccept = seenAt ? Math.round((now - seenAt) / 1000) : 0;
      track("driver_order_accepted", { driverId, orderId, zone: order.zone, secondsToAccept });
      stopTabAlert();
      toast.success("Let's go! Navigate to pickup.", { icon: "🛵", duration: 5000 });
    } finally {
      setLoading(null);
    }
  };

  const pageStyle = { background: "linear-gradient(135deg, #f0faf5 0%, #ffffff 50%, #fffbf0 100%)" };

  if (checking) {
    return (
      <main className="min-h-screen px-4 py-10" style={pageStyle}>
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div className="animate-pulse">
            <div className="h-7 w-40 bg-gray-200 rounded-xl mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded-xl" />
          </div>
          <DriverSkeleton />
        </div>
      </main>
    );
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen px-4 py-10"
      style={pageStyle}
    >
      <div className="max-w-2xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-5">

          {/* ── Header ── */}
          <motion.div variants={staggerItem} className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-atlaasgo" strokeWidth={1.8} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Driver Dashboard</h1>
                <p className="text-gray-400 text-sm">Manage your deliveries</p>
              </div>
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

          {/* ── Bento top row: toggle + earnings ── */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-glass !p-4">
              <AvailabilityToggle driverId={driverId!} onChange={setIsOnline} />
            </div>
            <div className="card-glass !p-4">
              <EarningsCard driverId={driverId!} />
            </div>
          </motion.div>

          {/* ── Active orders ── */}
          {active.length > 0 && (
            <motion.section variants={staggerItem} className="flex flex-col gap-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Active</h2>
              {active.map((order) => (
                <motion.div
                  key={order.id}
                  whileHover={{ scale: 1.01 }}
                  className="card-glass flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{order.items[0]?.description}</p>
                      {order.pickup  && <p className="text-xs text-gray-400">From: {order.pickup}</p>}
                      {order.dropoff && <p className="text-xs text-gray-400">To: {order.dropoff}</p>}
                    </div>
                    <span className="shrink-0 text-xs bg-emerald-atlaasgo/10 text-emerald-atlaasgo font-medium px-2 py-0.5 rounded-full capitalize">
                      {order.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-gold">{formatMAD(getDeliveryFee(order.zone))}</span>
                    {order.phone && (
                      <a
                        href={`https://wa.me/${order.phone}?text=${WHATSAPP_MSG}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-white bg-[#25D366] hover:bg-[#1ebe5d] px-3 py-1.5 rounded-xl font-medium transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.526 5.854L.057 23.882l6.198-1.626A11.947 11.947 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.651-.502-5.166-1.378l-.371-.22-3.681.965.981-3.595-.242-.381A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        Contact Customer
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {order.status === "assigned" && (
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                        onClick={() => updateStatus(order.id!, "picked_up")}
                        disabled={loading === order.id + "picked_up"}
                        className="btn-primary flex-1 text-sm"
                      >
                        {loading === order.id + "picked_up" ? "Updating..." : "Mark as Picked Up"}
                      </motion.button>
                    )}
                    {order.status === "picked_up" && (
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                        onClick={() => updateStatus(order.id!, "delivered")}
                        disabled={loading === order.id + "delivered"}
                        className="btn-primary flex-1 text-sm"
                      >
                        {loading === order.id + "delivered" ? "Updating..." : "Mark as Delivered"}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.section>
          )}

          {/* ── Available orders ── */}
          <motion.section variants={staggerItem} className="flex flex-col gap-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Available</h2>
            {!isOnline ? (
              <div className="card-glass flex flex-col items-center gap-2 py-10 text-center">
                <span className="text-3xl">☕</span>
                <p className="text-gray-600 text-sm font-semibold">You&apos;re on a break.</p>
                <p className="text-gray-400 text-xs">Toggle &quot;Active &amp; Ready&quot; to see new orders.</p>
              </div>
            ) : pending.length === 0 ? (
              <div className="card-glass py-10 text-center text-gray-400 text-sm">
                No pending orders right now. Check back soon.
              </div>
            ) : (
              pending.map((order) => {
                const isNew = alertIds.has(order.id!);
                return (
                  <motion.div
                    key={order.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`bg-white/70 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between gap-4 border transition
                      ${isNew
                        ? "border-emerald-atlaasgo/60 animate-order-ping"
                        : "border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
                      }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 truncate">{order.items[0]?.description}</p>
                        {isNew && (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-atlaasgo px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-ping inline-block" />
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>Zone: <span className="text-emerald-atlaasgo font-medium capitalize">{order.zone}</span></span>
                        <span className="font-bold text-gold">{formatMAD(getDeliveryFee(order.zone))}</span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                      onClick={() => acceptDelivery(order.id!, order)}
                      disabled={loading === order.id + "accepting"}
                      className="shrink-0 btn-primary text-sm"
                    >
                      {loading === order.id + "accepting" ? "Accepting..." : "Accept Delivery"}
                    </motion.button>
                  </motion.div>
                );
              })
            )}
          </motion.section>
        </motion.div>
      </div>
    </motion.main>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AdminTableSkeleton from "@/components/AdminTableSkeleton";
import type { Order, OrderStatus } from "@/types/order";
import { track } from "@/lib/analytics";
import dynamic from "next/dynamic";

const SceneCanvas       = dynamic(() => import("@/lib/r3f/canvas"),              { ssr: false });
const CityMap3D         = dynamic(() => import("@/components/3d/CityMap3D"),     { ssr: false });
const DonutChart3D      = dynamic(() => import("@/components/3d/DonutChart3D"),  { ssr: false });
const MapLighting       = dynamic(
  () => import("@/lib/r3f/lighting").then((m) => ({ default: m.MapLighting })),
  { ssr: false }
);
const DashboardLighting = dynamic(
  () => import("@/lib/r3f/lighting").then((m) => ({ default: m.DashboardLighting })),
  { ssr: false }
);

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Pending",    color: "bg-yellow-100 text-yellow-700" },
  accepted:  { label: "Accepted",   color: "bg-blue-100 text-blue-700" },
  picked_up: { label: "On the Way", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Delivered",  color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled",  color: "bg-red-100 text-red-600" },
  expired:   { label: "Expired",    color: "bg-gray-100 text-gray-500" },
};

function timeElapsed(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

interface EnrichedOrder extends Order {
  customerName: string;
  driverName: string;
}

async function fetchName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data().name ?? "Unknown") : "Unknown";
  } catch {
    return "Unknown";
  }
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [tick, setTick] = useState(0);
  const [adminId, setAdminId] = useState<string | null>(null);
  const router = useRouter();

  // Re-render every 30s to update elapsed time
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
      else setAdminId(user.uid);
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const enrich = useCallback(async (rawOrders: Order[]): Promise<EnrichedOrder[]> => {
    const uniqueIds = [...new Set([
      ...rawOrders.map((o) => o.customerId),
      ...rawOrders.filter((o) => o.driverId).map((o) => o.driverId!),
    ])];

    const nameMap: Record<string, string> = {};
    await Promise.all(uniqueIds.map(async (id) => {
      nameMap[id] = await fetchName(id);
    }));

    return rawOrders.map((o) => ({
      ...o,
      customerName: nameMap[o.customerId] ?? "Unknown",
      driverName:   o.driverId ? (nameMap[o.driverId] ?? "Unknown") : "—",
    }));
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "accepted", "picked_up"])
    );

    return onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      const enriched = await enrich(raw);
      setOrders(enriched.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
    });
  }, [enrich]);

  const cancelOrder = async (orderId: string) => {
    setCancelling(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "cancelled" });
      if (adminId) track("admin_order_cancelled", { adminId, orderId });
    } finally {
      setCancelling(null);
    }
  };

  // Scatter active orders on the Ifrane map (placeholder coords until real GPS stored)
  const orderDots = orders
    .filter((o) => ["pending", "accepted", "picked_up"].includes(o.status))
    .map((o, i) => ({
      id: o.id ?? String(i),
      lat: 33.5228 + (Math.sin(i * 1.5) * 0.012),
      lng: -5.1128 + (Math.cos(i * 1.5) * 0.012),
      color:
        o.status === "pending"   ? "#e05a23" :
        o.status === "accepted"  ? "#3b82f6" : "#06b6d4",
    }));

  const donutSegments = [
    { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length,                         color: "#22c55e" },
    { label: "Active",    value: orders.filter((o) => ["accepted","picked_up"].includes(o.status)).length,      color: "#3b82f6" },
    { label: "Pending",   value: orders.filter((o) => o.status === "pending").length,                           color: "#e05a23" },
    { label: "Cancelled", value: orders.filter((o) => ["cancelled","expired"].includes(o.status)).length,       color: "#6b7280" },
  ].filter((s) => s.value > 0);

  if (checking) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="animate-pulse">
            <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
          <AdminTableSkeleton />
        </div>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-gray-50 px-4 py-10"
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-atlaasgo">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {orders.length} active order{orders.length !== 1 ? "s" : ""} in the system
            </p>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Auto-refreshes every 30s
          </span>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          {(["pending", "accepted", "picked_up"] as OrderStatus[]).map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            return (
              <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_LABELS[s].color}`}>
                <span>{STATUS_LABELS[s].label}</span>
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
        </div>

        {/* 3D Live Map + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Birds-eye city map */}
          <div className="lg:col-span-2 h-56 rounded-2xl overflow-hidden relative" style={{ background: '#1e2d4a' }}>
            <SceneCanvas camera={{ fov: 55, position: [0, 10, 0.01] }}>
              <MapLighting />
              <CityMap3D zone="ifrane" dots={orderDots} />
            </SceneCanvas>
            <div className="absolute top-3 left-4">
              <span className="text-white/50 text-xs font-medium">Live Orders — Ifrane</span>
            </div>
          </div>
          {/* Stats donut */}
          <div className="h-56 rounded-2xl overflow-hidden relative" style={{ background: 'rgba(30,45,74,0.6)' }}>
            <SceneCanvas camera={{ fov: 45, position: [0, 0, 4] }}>
              <DashboardLighting />
              <DonutChart3D
                segments={donutSegments.length > 0 ? donutSegments : [{ label: "No orders", value: 1, color: "#2b3f63" }]}
                label={String(orders.length)}
              />
            </SceneCanvas>
            <p className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-xs">Total orders</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="card-moroccan p-12 text-center text-gray-400">
            No active orders right now.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card-moroccan overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/20 bg-emerald-atlaasgo/5">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Elapsed</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-800">{order.customerName}</td>
                      <td className="px-5 py-4 text-gray-600 max-w-[200px]">
                        <p className="truncate">{order.items[0]?.description}</p>
                        {order.pickup && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {order.pickup} → {order.dropoff}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{order.driverName}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_LABELS[order.status].color}`}>
                          {STATUS_LABELS[order.status].label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 font-mono text-xs" suppressHydrationWarning>
                        {timeElapsed(order.timestamp)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => cancelOrder(order.id!)}
                          disabled={cancelling === order.id}
                          className="text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                        >
                          {cancelling === order.id ? "Cancelling..." : "Cancel Order"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-4">
              {orders.map((order) => (
                <div key={order.id} className="card-moroccan flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{order.customerName}</p>
                      <p className="text-sm text-gray-500 truncate">{order.items[0]?.description}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_LABELS[order.status].color}`}>
                      {STATUS_LABELS[order.status].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div><span className="font-medium">Driver:</span> {order.driverName}</div>
                    <div suppressHydrationWarning><span className="font-medium">Elapsed:</span> {timeElapsed(order.timestamp)}</div>
                    {order.pickup && <div className="col-span-2"><span className="font-medium">Route:</span> {order.pickup} → {order.dropoff}</div>}
                  </div>
                  <button
                    onClick={() => cancelOrder(order.id!)}
                    disabled={cancelling === order.id}
                    className="w-full text-sm text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 py-2 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {cancelling === order.id ? "Cancelling..." : "Cancel Order"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.main>
  );
}

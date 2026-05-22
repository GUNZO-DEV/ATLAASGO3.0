"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getDeliveryFee, formatMAD } from "@/lib/pricing";
import type { Order, OrderStatus } from "@/types/order";

/* ─── constants ──────────────────────────────────────────────── */

const STATUS_STYLES: Record<OrderStatus, { dot: string; text: string; badge: string }> = {
  pending:   { dot: "bg-yellow-400",  text: "text-yellow-400",  badge: "bg-yellow-400/10 text-yellow-400  border-yellow-400/30" },
  accepted:  { dot: "bg-blue-400",    text: "text-blue-400",    badge: "bg-blue-400/10   text-blue-400    border-blue-400/30"   },
  picked_up: { dot: "bg-purple-400",  text: "text-purple-400",  badge: "bg-purple-400/10 text-purple-400  border-purple-400/30" },
  delivered: { dot: "bg-emerald-400", text: "text-emerald-400", badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30" },
  cancelled: { dot: "bg-red-500",     text: "text-red-500",     badge: "bg-red-500/10    text-red-400     border-red-500/30"    },
  expired:   { dot: "bg-gray-400",    text: "text-gray-400",    badge: "bg-gray-400/10   text-gray-400    border-gray-400/30"   },
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "Pending",
  accepted:  "Accepted",
  picked_up: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  expired:   "Expired",
};

type ActionKey = `${string}-cancel` | `${string}-complete`;

/* ─── helpers ────────────────────────────────────────────────── */

function timeElapsed(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/* ─── sub-components ─────────────────────────────────────────── */

function Pill({ status }: { status: OrderStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      <p className="text-emerald-400/60 text-xs tracking-widest uppercase font-mono">Authenticating</p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center gap-3">
      <span className="text-red-500 text-4xl">⛔</span>
      <p className="text-red-400 font-mono text-sm tracking-wider">ACCESS DENIED</p>
      <p className="text-gray-600 text-xs">Admin role required</p>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */

export default function AdminMonitorPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [authState, setAuthState]     = useState<"checking" | "denied" | "ok">("checking");
  const [actionLoading, setActionLoading] = useState<ActionKey | null>(null);
  const [statusFilter, setStatusFilter]   = useState<OrderStatus | "all">("all");
  const [tick, setTick]               = useState(0);
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);

  // tick every second for live elapsed times
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // auth + role guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/register"); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists() || snap.data().role !== "admin") {
          setAuthState("denied");
          return;
        }
      } catch {
        setAuthState("denied");
        return;
      }
      setAuthState("ok");
    });
    return () => unsub();
  }, [router]);

  // live orders listener
  useEffect(() => {
    if (authState !== "ok") return;
    return onSnapshot(collection(db, "orders"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setOrders(all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });
  }, [authState]);

  const setStatus = async (orderId: string, status: OrderStatus, key: ActionKey) => {
    setActionLoading(key);
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
    } finally {
      setActionLoading(null);
    }
  };

  if (authState === "checking") return <LoadingScreen />;
  if (authState === "denied")   return <AccessDenied />;

  const filtered = statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const counts = (["pending", "accepted", "picked_up", "delivered", "cancelled", "expired"] as OrderStatus[]).reduce(
    (acc, s) => ({ ...acc, [s]: orders.filter((o) => o.status === s).length }),
    {} as Record<OrderStatus, number>
  );

  // suppress unused var warning from tick
  void tick;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100 font-mono">

      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0f1a]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold tracking-widest uppercase text-emerald-400">
            Live Operations
          </span>
          <span className="text-xs text-gray-600 border border-white/10 px-2 py-0.5 rounded">
            Atlaasgo Admin
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{orders.length} total orders</span>
          <span className="text-emerald-400/60">● LIVE</span>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6 max-w-screen-2xl mx-auto">

        {/* stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(["pending", "accepted", "picked_up", "delivered", "cancelled", "expired"] as OrderStatus[]).map((s) => {
            const st = STATUS_STYLES[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={`flex flex-col gap-1 p-4 rounded-xl border transition cursor-pointer text-left ${
                  statusFilter === s
                    ? `${st.badge} border-current`
                    : "bg-white/3 border-white/5 hover:border-white/15"
                }`}
              >
                <span className="text-2xl font-bold tabular-nums">{counts[s]}</span>
                <span className={`text-xs uppercase tracking-wider ${statusFilter === s ? "" : "text-gray-500"}`}>
                  {STATUS_LABELS[s]}
                </span>
              </button>
            );
          })}
        </div>

        {/* table */}
        <div
          ref={tableRef}
          className="rounded-xl border border-white/5 overflow-hidden bg-[#0d1321]"
        >
          {/* table header */}
          <div className="grid grid-cols-[auto_80px_90px_130px_130px_90px_180px] gap-x-4 px-5 py-3 border-b border-white/5 bg-white/2 text-xs text-gray-500 uppercase tracking-widest">
            <span>Order ID</span>
            <span>City</span>
            <span>Status</span>
            <span>Customer</span>
            <span>Driver</span>
            <span>Elapsed</span>
            <span className="text-right">Actions</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-600 text-sm">
              No orders match this filter.
            </div>
          ) : (
            <div className="divide-y divide-white/3">
              {filtered.map((order) => {
                const cancelKey:   ActionKey = `${order.id}-cancel`;
                const completeKey: ActionKey = `${order.id}-complete`;
                const isActive = order.status !== "cancelled" && order.status !== "delivered";
                const st = STATUS_STYLES[order.status];

                return (
                  <div
                    key={order.id}
                    className="grid grid-cols-[auto_80px_90px_130px_130px_90px_180px] gap-x-4 items-center px-5 py-3.5 hover:bg-white/2 transition-colors group"
                  >
                    {/* Order ID */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-bold text-white/80 tracking-wider">
                        #{shortId(order.id!)}
                      </span>
                      <span className="text-[10px] text-gray-600 truncate max-w-[140px]">
                        {order.items[0]?.description ?? "—"}
                      </span>
                    </div>

                    {/* City */}
                    <span className="text-xs text-gray-400 capitalize">{order.zone}</span>

                    {/* Status */}
                    <Pill status={order.status} />

                    {/* Customer */}
                    <span className="text-xs text-gray-400 font-mono truncate" title={order.customerId}>
                      {order.customerId.slice(0, 10)}…
                    </span>

                    {/* Driver */}
                    <span className={`text-xs font-mono truncate ${order.driverId ? "text-gray-400" : "text-gray-700"}`} title={order.driverId}>
                      {order.driverId ? `${order.driverId.slice(0, 10)}…` : "unassigned"}
                    </span>

                    {/* Elapsed */}
                    <span className={`text-xs tabular-nums ${st.text}`} suppressHydrationWarning>
                      {timeElapsed(order.timestamp)}
                    </span>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      {isActive ? (
                        <>
                          <button
                            onClick={() => setStatus(order.id!, "delivered", completeKey)}
                            disabled={actionLoading === completeKey}
                            className="text-[11px] px-2.5 py-1 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {actionLoading === completeKey ? "…" : "Manual Complete"}
                          </button>
                          <button
                            onClick={() => setStatus(order.id!, "cancelled", cancelKey)}
                            disabled={actionLoading === cancelKey}
                            className="text-[11px] px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {actionLoading === cancelKey ? "…" : "Cancel Order"}
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-700 italic">
                          {order.status === "delivered" ? "completed" : "cancelled"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* fee summary */}
        {orders.filter((o) => o.status === "delivered").length > 0 && (
          <div className="flex justify-end">
            <div className="bg-white/3 border border-white/5 rounded-xl px-5 py-4 text-right">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Delivered Revenue</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatMAD(
                  orders
                    .filter((o) => o.status === "delivered")
                    .reduce((sum, o) => sum + getDeliveryFee(o.zone), 0)
                )}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {orders.filter((o) => o.status === "delivered").length} deliveries
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

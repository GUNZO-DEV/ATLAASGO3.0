"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { getDeliveryFee, formatMAD } from "@/lib/pricing";
import type { Order, OrderStatus } from "@/types/order";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] rounded-xl bg-gray-100 animate-pulse" />
  ),
});

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending",   label: "Searching for Driver" },
  { status: "assigned",  label: "Driver Assigned" },
  { status: "picked_up", label: "On the Way" },
  { status: "delivered", label: "Delivered" },
];

const STEP_INDEX: Record<OrderStatus, number> = {
  pending:   0,
  assigned:  1,
  picked_up: 2,
  delivered: 3,
  cancelled: 0,
};

const MOSAIC_BG = "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23006747' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

function TrackerSkeleton() {
  return (
    <div className="card-moroccan flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 w-24 bg-gray-200 rounded" />
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-4 w-48 bg-gray-100 rounded" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
      {/* Map placeholder */}
      <div className="h-[280px] bg-gray-100 rounded-2xl" />
      {/* Status strip placeholder */}
      <div className="flex justify-between pt-1">
        {[0,1,2,3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-gray-200" />
            <div className="h-2.5 w-14 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  customerId: string;
  onNoActiveOrder: () => void;
}

export default function LiveTracker({ customerId, onNoActiveOrder }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [delivered, setDelivered] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const stableNoActiveOrder = useCallback(onNoActiveOrder, []);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
      where("status", "in", ["pending", "assigned", "picked_up"]),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        setOrder({ id: d.id, ...d.data() } as Order);
        setDelivered(null);
      } else {
        setOrder(null);
      }
      setLoading(false);
    });
  }, [customerId]);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
      where("status", "==", "delivered"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && !order) {
        const d = snapshot.docs[0];
        setDelivered({ id: d.id, ...d.data() } as Order);
      }
    });
  }, [customerId, order]);

  if (loading) return <TrackerSkeleton />;

  const currentStep = order ? STEP_INDEX[order.status] : 0;
  const progressPct = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <AnimatePresence mode="wait">
      {/* Celebration */}
      {delivered && !order && (
        <motion.div
          key="celebration"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-2xl p-8 text-center flex flex-col items-center gap-4 border border-gold/40 shadow-[0_2px_12px_rgba(184,151,62,0.15)]"
          style={{ backgroundImage: MOSAIC_BG }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl"
          >
            🎉
          </motion.div>
          <h2 className="text-xl font-bold text-emerald-atlaasgo">Sukran for using Atlaasgo!</h2>
          <p className="text-gray-500 text-sm">Your order has been delivered.</p>
          <p className="text-gold font-semibold">{formatMAD(getDeliveryFee(delivered.zone))}</p>
          <button onClick={stableNoActiveOrder} className="btn-primary mt-2">
            Place New Order
          </button>
        </motion.div>
      )}

      {/* Live tracker */}
      {order && (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gold/30 shadow-[0_2px_12px_rgba(184,151,62,0.12)]"
          style={{ backgroundImage: MOSAIC_BG }}
        >
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-800">Live Order</h2>
            <motion.span
              key={order.status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="text-xs bg-emerald-atlaasgo/10 text-emerald-atlaasgo font-medium px-2 py-0.5 rounded-full capitalize"
            >
              {order.status.replace("_", " ")}
            </motion.span>
          </div>
          <p className="text-sm text-gray-500 mb-1 truncate">{order.items[0]?.description}</p>
          <p className="text-sm font-semibold text-gold mb-4">
            Total: {formatMAD(getDeliveryFee(order.zone))}
          </p>

          {/* From / To */}
          {(order.pickup || order.dropoff) && (
            <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
              {order.pickup && (
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-atlaasgo text-white flex items-center justify-center text-[9px] font-bold shrink-0">A</span>
                  <span className="text-gray-700 font-medium truncate max-w-[120px]">{order.pickup.split("—")[0].trim()}</span>
                </span>
              )}
              {order.pickup && order.dropoff && <span className="text-gray-300">→</span>}
              {order.dropoff && (
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-gold text-white flex items-center justify-center text-[9px] font-bold shrink-0">B</span>
                  <span className="text-gray-700 font-medium truncate max-w-[120px]">{order.dropoff.split("—")[0].trim()}</span>
                </span>
              )}
            </div>
          )}

          {/* Map — primary visual */}
          {order.pickup && order.dropoff ? (
            <div className="mb-5 relative">
              <DeliveryMap
                pickup={order.pickup}
                dropoff={order.dropoff}
                zone={order.zone}
                status={order.status}
                height={280}
              />
            </div>
          ) : (
            <div className="mb-5 h-[280px] rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              Awaiting location details…
            </div>
          )}

          {/* Compact status strip — replaces the progress bar */}
          <div className="relative flex items-start justify-between pt-1">
            {/* connector line */}
            <div className="absolute left-3 right-3 top-3.5 h-px bg-gray-200 z-0" />
            <motion.div
              className="absolute left-3 top-3.5 h-px bg-emerald-atlaasgo z-0 origin-left"
              initial={false}
              animate={{ scaleX: progressPct / 100 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              style={{ right: 0 }}
            />
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              return (
                <div key={step.status} className="relative z-10 flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{
                      backgroundColor: done ? "#006747" : "#ffffff",
                      borderColor:     done ? "#006747" : "#d1d5db",
                      color:           done ? "#ffffff" : "#9ca3af",
                      scale: done && i === currentStep ? [1, 1.15, 1] : 1,
                    }}
                    transition={{ duration: 0.35 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-sm"
                  >
                    {done ? "✓" : i + 1}
                  </motion.div>
                  <span className={`text-[10px] text-center leading-tight w-16 transition-colors duration-300 ${done ? "text-emerald-atlaasgo font-semibold" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty — no active order and no celebration */}
      {!order && !delivered && null}
    </AnimatePresence>
  );
}

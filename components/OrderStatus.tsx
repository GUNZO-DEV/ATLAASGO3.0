"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderStatus } from "@/types/order";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending",   label: "Order Received" },
  { status: "accepted",  label: "Driver Accepted" },
  { status: "picked_up", label: "On the Way" },
  { status: "delivered", label: "Delivered" },
];

const STEP_INDEX: Record<OrderStatus, number> = {
  pending:   0,
  accepted:  1,
  picked_up: 2,
  delivered: 3,
  cancelled: 0,
  expired:   0,
};

interface Props {
  customerId: string;
}

export default function OrderStatus({ customerId }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setOrder({ id: doc.id, ...doc.data() } as Order);
      } else {
        setOrder(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [customerId]);

  if (loading) return null;

  if (!order) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gold/30 shadow-[0_2px_12px_rgba(184,151,62,0.12)]">
        <p className="text-gray-400 text-sm">No active orders yet.</p>
      </div>
    );
  }

  const currentStep = STEP_INDEX[order.status];

  return (
    <div className="bg-white rounded-2xl p-6 border border-gold/30 shadow-[0_2px_12px_rgba(184,151,62,0.12)]">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Latest Order</h2>
      <p className="text-sm text-gray-500 mb-6 truncate">
        {order.items[0]?.description}
      </p>

      <div className="relative flex items-center justify-between">
        {/* Track line */}
        <div className="absolute left-0 right-0 top-4 h-1 bg-gray-200 z-0" />
        <div
          className="absolute left-0 top-4 h-1 bg-emerald-500 z-0 transition-all duration-500"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, i) => {
          const done = i <= currentStep;
          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center gap-2 w-16">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs text-center leading-tight ${
                  done ? "text-emerald-atlaasgo font-medium" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

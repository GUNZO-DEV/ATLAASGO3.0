"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDeliveryFee, formatMAD } from "@/lib/pricing";
import type { Order } from "@/types/order";

interface Props {
  driverId: string;
}

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

export default function EarningsCard({ driverId }: Props) {
  const [daily, setDaily]   = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [count, setCount]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("driverId", "==", driverId),
      where("status", "==", "delivered")
    );

    return onSnapshot(q, async (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));

      const dayStart  = startOfDay();
      const weekStart = startOfWeek();

      const dailyOrders  = orders.filter((o) => o.timestamp >= dayStart);
      const weeklyOrders = orders.filter((o) => o.timestamp >= weekStart);

      // Prefer stored fee (captures peak-hour rate); fall back to base fee for legacy orders
      const feeOf = (o: Order) => o.fee ?? getDeliveryFee(o.zone);
      const dailyTotal  = dailyOrders.reduce((sum, o)  => sum + feeOf(o), 0);
      const weeklyTotal = weeklyOrders.reduce((sum, o) => sum + feeOf(o), 0);

      setDaily(dailyTotal);
      setWeekly(weeklyTotal);
      setCount(dailyOrders.length);
      setLoading(false);

      // Persist to driver_stats
      try {
        await setDoc(
          doc(db, "driver_stats", driverId),
          {
            driverId,
            dailyEarnings:  dailyTotal,
            weeklyEarnings: weeklyTotal,
            dailyDeliveries: dailyOrders.length,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {
        // Non-critical — stats update silently fails
      }
    });
  }, [driverId]);

  if (loading) {
    return (
      <div className="card-moroccan animate-pulse flex flex-col gap-3">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-16 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-moroccan flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* success icon */}
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-atlaasgo/10">
            <svg className="w-3.5 h-3.5 text-emerald-atlaasgo" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </span>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Earnings</h2>
        </div>
        <span className="text-xs text-gray-400">{count} deliver{count === 1 ? "y" : "ies"} today</span>
      </div>

      {/* Daily / Weekly */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-atlaasgo/5 border border-emerald-atlaasgo/20 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-medium">Today</span>
          <span className="text-2xl font-bold text-emerald-atlaasgo">{formatMAD(daily)}</span>
        </div>
        <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-medium">This Week</span>
          <span className="text-2xl font-bold text-gold">{formatMAD(weekly)}</span>
        </div>
      </div>

      {/* Cash Collected */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-atlaasgo/10 shrink-0">
            <svg className="w-4 h-4 text-emerald-atlaasgo" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-gray-700">Cash Collected</p>
            <p className="text-[11px] text-gray-400">Physical cash in your pocket today</p>
          </div>
        </div>
        <span className="text-lg font-bold text-emerald-atlaasgo tabular-nums">{formatMAD(daily)}</span>
      </div>
    </div>
  );
}

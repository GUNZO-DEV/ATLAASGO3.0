"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatMAD, getDeliveryFee } from "@/lib/pricing";
import type { Order } from "@/types/order";

interface Props {
  customerId: string;
  onReorder: (prefill: { description: string; pickup: string; dropoff: string }) => void;
}

export default function OrderHistory({ customerId, onReorder }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const q = query(
        collection(db, "orders"),
        where("customerId", "==", customerId),
        where("status", "==", "delivered"),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    };
    fetchHistory();
  }, [customerId]);

  if (loading) {
    return (
      <div className="card-moroccan flex flex-col gap-3 animate-pulse">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="flex flex-col gap-1">
              <div className="h-3 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-7 w-20 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) return null;

  return (
    <div className="card-moroccan flex flex-col gap-1">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
        Order History
      </h2>
      <ul className="flex flex-col divide-y divide-gray-100">
        {orders.map((order) => (
          <li key={order.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {order.items[0]?.description}
              </p>
              <div className="flex gap-2 text-xs text-gray-400">
                {order.pickup  && <span className="truncate max-w-[120px]">{order.pickup}</span>}
                {order.pickup && order.dropoff && <span>→</span>}
                {order.dropoff && <span className="truncate max-w-[120px]">{order.dropoff}</span>}
              </div>
              <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                <span>{new Date(order.timestamp).toLocaleDateString()}</span>
                <span className="text-gold font-medium">{formatMAD(getDeliveryFee(order.zone))}</span>
              </div>
            </div>
            <button
              onClick={() =>
                onReorder({
                  description: order.items[0]?.description ?? "",
                  pickup:  order.pickup  ?? "",
                  dropoff: order.dropoff ?? "",
                })
              }
              className="shrink-0 text-xs border border-emerald-atlaasgo text-emerald-atlaasgo hover:bg-emerald-atlaasgo hover:text-white font-medium px-3 py-1.5 rounded-lg transition"
            >
              Reorder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

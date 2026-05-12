"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import type { Order } from "@/types/order";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/register");
      } else {
        setDriverId(user.uid);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!driverId) return;
    const q = query(collection(db, "orders"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setOrders(data);
    });
    return () => unsub();
  }, [driverId]);

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    setAccepting(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "assigned",
        driverId,
      });
    } finally {
      setAccepting(null);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-atlaasgo">Pending Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Accept a delivery to get started</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-400">
            No pending orders right now.
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((order) => (
              <li key={order.id} className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4 border border-gold/30 shadow-[0_2px_12px_rgba(184,151,62,0.12)] hover:shadow-[0_4px_20px_rgba(184,151,62,0.25)] transition">
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {order.items[0]?.description}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>Zone: <span className="text-emerald-atlaasgo font-medium capitalize">{order.zone}</span></span>
                    <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => acceptOrder(order.id!)}
                  disabled={accepting === order.id}
                  className="shrink-0 btn-primary text-sm"
                >
                  {accepting === order.id ? "Accepting..." : "Accept Delivery"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

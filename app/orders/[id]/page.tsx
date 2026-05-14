// app/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import OrderTimeline from "@/components/OrderTimeline";
import type { Order, OrderItem } from "@/types/order";

interface RichOrder extends Omit<Order, "items"> {
  restaurantName?: string;
  deliveryAddress?: string;
  items?: (OrderItem & { quantity?: number; price?: number })[];
  total?: number;
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [order, setOrder]     = useState<RichOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const reviewCheckedRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      setOrder({ id: snap.id, ...snap.data() } as RichOrder);
      // Check if user can leave a review (only once per delivered order)
      const currentUser = auth.currentUser;
      if (currentUser && (snap.data() as Record<string, unknown>)?.status === "delivered" && !reviewCheckedRef.current) {
        reviewCheckedRef.current = true;
        getDoc(doc(db, "users", currentUser.uid)).then((userSnap) => {
          const reviewed: string[] = userSnap.data()?.reviewedOrderIds ?? [];
          setCanReview(!reviewed.includes(id));
        }).catch((err) => console.error("Failed to check review eligibility:", err));
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E05A23] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Order not found</p>
        <Link href="/restaurants" className="text-[#E05A23] text-sm font-medium">
          Browse restaurants
        </Link>
      </div>
    );
  }

  const isLive = ["pending", "accepted", "picked_up"].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order tracking</h1>
            {order.restaurantName && (
              <p className="text-xs text-gray-400 mt-0.5">{order.restaurantName}</p>
            )}
          </div>
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live tracking active
          </div>
        )}

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 text-sm">
            <p className="text-xs text-gray-400 mb-1">Delivering to</p>
            <p className="font-medium text-gray-800">{order.deliveryAddress}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <OrderTimeline status={order.status} statusHistory={order.statusHistory} />
        </div>

        {/* Order items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Your order</h2>
            <div className="space-y-1.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity ?? 1}x {item.name ?? item.description}
                  </span>
                  {item.price != null && (
                    <span className="text-gray-900">
                      {(item.price * (item.quantity ?? 1))} MAD
                    </span>
                  )}
                </div>
              ))}
              {order.total != null && (
                <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2 mt-1">
                  <span>Total</span>
                  <span>{order.total} MAD</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Re-order CTA */}
        {order.status === "delivered" && (
          <Link
            href="/restaurants"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E05A23] text-white rounded-2xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Order again
          </Link>
        )}
        {order.status === "delivered" && canReview && (
          <Link
            href={`/orders/${id}/review`}
            className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-[#E05A23] text-[#E05A23] rounded-2xl font-semibold text-sm hover:bg-orange-50 transition-colors mt-3"
          >
            ⭐ Rate your order
          </Link>
        )}
      </div>
    </div>
  );
}

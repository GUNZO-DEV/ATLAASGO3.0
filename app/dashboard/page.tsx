"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { identifyUser } from "@/lib/analytics";
import OrderForm from "@/components/OrderForm";
import LiveTracker from "@/components/LiveTracker";
import OrderHistory from "@/components/OrderHistory";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { useRouter } from "next/navigation";

interface Prefill {
  description: string;
  pickup: string;
  dropoff: string;
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(true);
  const [prefill, setPrefill] = useState<Prefill | undefined>();
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/register");
      else {
        setUserId(user.uid);
        identifyUser(user.uid, { role: "customer", email: user.email ?? undefined });
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const handleReorder = (data: Prefill) => {
    setPrefill(data);
    setHasActiveOrder(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto flex flex-col gap-8">
          <div className="animate-pulse">
            <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-atlaasgo">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Place and track your deliveries</p>
        </div>

        {hasActiveOrder ? (
          <div data-ph-capture-attribute-section="live-tracker">
            <LiveTracker
              customerId={userId!}
              onNoActiveOrder={() => setHasActiveOrder(false)}
            />
          </div>
        ) : (
          <div className="card-moroccan" data-ph-capture-attribute-section="order-form">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {prefill ? "Reorder" : "New Order"}
            </h2>
            <OrderForm
              customerId={userId!}
              onOrderPlaced={() => { setHasActiveOrder(true); setPrefill(undefined); }}
              prefill={prefill}
            />
          </div>
        )}

        <div data-ph-capture-attribute-section="order-history">
          <OrderHistory customerId={userId!} onReorder={handleReorder} />
        </div>
      </div>
    </main>
  );
}

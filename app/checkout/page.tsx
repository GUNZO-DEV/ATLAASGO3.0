// app/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Calendar } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useCart } from "@/contexts/CartContext";
import AddressInput from "@/components/AddressInput";
import { calculateSurgeFee } from "@/lib/pricing";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, checkOut } = useCart();

  const [userId, setUserId]             = useState<string | null>(null);
  const [address, setAddress]           = useState("");
  const [addressNote, setAddressNote]   = useState("");
  const [orderNote, setOrderNote]       = useState("");
  const [scheduleMode, setScheduleMode] = useState<"asap" | "scheduled">("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [deliveryFee, setDeliveryFee]   = useState(15);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUserId(user.uid);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!cart) { router.push("/restaurants"); return; }
    async function fetchFee() {
      const zone = "ifrane";
      const [pendingSnap, driversSnap] = await Promise.all([
        getDocs(query(collection(db, "orders"), where("status", "==", "pending"), where("zone", "==", zone))),
        getDocs(query(collection(db, "users"), where("role", "==", "driver"), where("isOnline", "==", true), where("zone", "==", zone))),
      ]);
      setDeliveryFee(calculateSurgeFee(zone, pendingSnap.size, driversSnap.size));
    }
    fetchFee();
  }, [cart, router]);

  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !userId) return;
    if (!address.trim()) { toast.error("Please enter your delivery address"); return; }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const orderRef = await addDoc(collection(db, "orders"), {
        customerId:          userId,
        restaurantId:        cart.restaurantId,
        restaurantName:      cart.restaurantName,
        cartId:              cart.id,
        items:               cart.items.map((i) => ({
          itemId: i.itemId, name: i.name, price: i.price,
          quantity: i.quantity, note: i.note ?? null,
        })),
        deliveryAddress:     address.trim(),
        deliveryAddressNote: addressNote.trim() || null,
        orderNote:           orderNote.trim() || null,
        scheduledFor:
          scheduleMode === "scheduled" && scheduledFor ? scheduledFor : null,
        status:        "pending",
        zone:          "ifrane",
        subtotal,
        fee:           deliveryFee,
        total,
        statusHistory: [{ status: "pending", timestamp: now, actorId: userId }],
        timestamp:     now,
      });

      await checkOut();
      toast.success("Order placed!");
      router.push(`/orders/${orderRef.id}`);
    } catch {
      toast.error("Failed to place order. Try again.");
      setLoading(false);
    }
  };

  if (!cart) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/restaurants/${cart.restaurantId}`}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Order from {cart.restaurantName}
            </h2>
            <div className="space-y-1.5">
              {cart.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {item.price * item.quantity} MAD
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm">Delivery address</h2>
            <AddressInput
              value={address}
              onChange={setAddress}
              placeholder="Street, building, dorm..."
            />
            <input
              type="text"
              value={addressNote}
              onChange={(e) => setAddressNote(e.target.value)}
              placeholder="Apartment, floor, landmark (optional)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
            />
          </div>

          {/* Delivery time */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Delivery time</h2>
            <div className="flex gap-2">
              {(["asap", "scheduled"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScheduleMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                    scheduleMode === mode
                      ? "border-[#E05A23] bg-orange-50 text-[#E05A23]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {mode === "asap" ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  {mode === "asap" ? "ASAP" : "Schedule"}
                </button>
              ))}
            </div>
            {scheduleMode === "scheduled" && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                required
                className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
              />
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Order notes (optional)
            </h2>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Any special requests..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23] resize-none"
            />
          </div>

          {/* Fee breakdown */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{subtotal} MAD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="text-gray-900">{deliveryFee} MAD</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-100 pt-2">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{total} MAD</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#E05A23] text-white rounded-2xl font-bold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Placing order..." : `Place order · ${total} MAD`}
          </button>
        </form>
      </div>
    </div>
  );
}

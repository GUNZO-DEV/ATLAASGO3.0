"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LANDMARKS, ZONES } from "@/constants/zones";
import { calculateSurgeFee, isSurge, getDeliveryFee, isLateNight, formatMAD } from "@/lib/pricing";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { track } from "@/lib/analytics";

interface Props {
  customerId: string;
  onOrderPlaced?: () => void;
  prefill?: { description?: string; pickup?: string; dropoff?: string };
}

function LocationField({
  label,
  zone,
  landmark,
  details,
  onLandmarkChange,
  onDetailsChange,
}: {
  label: string;
  zone: string;
  landmark: string;
  details: string;
  onLandmarkChange: (v: string) => void;
  onDetailsChange: (v: string) => void;
}) {
  const options = LANDMARKS[zone] ?? [];
  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={landmark}
        onChange={(e) => onLandmarkChange(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo text-gray-800"
      >
        <option value="">— Select a popular location —</option>
        {options.map((lm) => (
          <option key={lm} value={lm}>{lm}</option>
        ))}
      </select>
      <input
        type="text"
        value={details}
        onChange={(e) => onDetailsChange(e.target.value)}
        placeholder="Specific details (e.g. Room 204, 2nd floor, blue door)"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo text-sm"
      />
    </div>
  );
}

export default function OrderForm({ customerId, onOrderPlaced, prefill }: Props) {
  const [zone, setZone] = useState("ifrane");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [pickupLandmark, setPickupLandmark] = useState("");
  const [pickupDetails, setPickupDetails] = useState("");
  const [dropoffLandmark, setDropoffLandmark] = useState("");
  const [dropoffDetails, setDropoffDetails] = useState("");
  // Pre-fill from Phone Auth if available; otherwise blank for manual entry
  const [phone, setPhone] = useState(auth.currentUser?.phoneNumber?.replace("+", "") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [onlineDriverCount, setOnlineDriverCount] = useState(0);
  const formOpenedAt = useRef<number>(Date.now());

  const lateNight = isLateNight();
  const baseFee   = getDeliveryFee(zone);
  const totalFee = calculateSurgeFee(zone, pendingCount, onlineDriverCount);
  const surging  = isSurge(pendingCount, onlineDriverCount);

  // Fire order_form_opened once on mount
  useEffect(() => {
    track("order_form_opened", { customerId, zone });
    formOpenedAt.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch live pending order count and online driver count for surge pricing
  useEffect(() => {
    if (!zone) return;
    async function fetchCounts() {
      const [pendingSnap, driversSnap] = await Promise.all([
        getDocs(query(collection(db, "orders"), where("status", "==", "pending"), where("zone", "==", zone))),
        getDocs(query(collection(db, "users"), where("role", "==", "driver"), where("isOnline", "==", true), where("zone", "==", zone))),
      ]);
      setPendingCount(pendingSnap.size);
      setOnlineDriverCount(driversSnap.size);
    }
    fetchCounts();
  }, [zone]);

  const buildLocation = (landmark: string, details: string) =>
    details.trim() ? `${landmark} — ${details.trim()}` : landmark;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !pickupLandmark || !dropoffLandmark) return;
    setLoading(true);
    setError("");

    const pickup  = buildLocation(pickupLandmark,  pickupDetails);
    const dropoff = buildLocation(dropoffLandmark, dropoffDetails);

    track("order_started", { customerId, zone, pickup, dropoff });

    try {
      const fee = calculateSurgeFee(zone, pendingCount, onlineDriverCount);
      const ref = await addDoc(collection(db, "orders"), {
        customerId,
        items: [{ description: description.trim() }],
        pickup,
        dropoff,
        phone: phone.trim(),
        status: "pending",
        zone,
        fee,
        surgeFee: isSurge(pendingCount, onlineDriverCount) ? fee - getDeliveryFee(zone) : 0,
        statusHistory: [{
          status: "pending",
          timestamp: new Date().toISOString(),
          actorId: customerId,
        }],
        timestamp: new Date().toISOString(),
      });

      track("order_completed", { customerId, orderId: ref.id, zone, fee });

      setDescription("");
      setPickupLandmark("");
      setPickupDetails("");
      setDropoffLandmark("");
      setDropoffDetails("");
      setPhone("");
      toast.success("Order placed! Finding a driver...", { duration: 5000 });
      onOrderPlaced?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order.";
      track("order_abandoned", { customerId, step: "submit" });
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
        <div className="flex gap-2">
          {ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => {
                setZone(z.id);
                setPickupLandmark("");
                setDropoffLandmark("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                zone === z.id
                  ? "bg-emerald-atlaasgo text-white border-emerald-atlaasgo"
                  : "bg-white text-gray-600 border-gray-300 hover:border-emerald-atlaasgo"
              }`}
            >
              {z.name}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex gap-3 mb-3">
          {["🍕", "🥗", "☕", "🍔", "🧃"].map((emoji, i) => (
            <span
              key={emoji}
              className="text-xl animate-float select-none"
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What do you need?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Lunch from Crepeto — 1x Crepe Choco, 1x Jus d'Orange"
          required
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo resize-none"
        />
      </div>

      <LocationField
        label="Pickup location"
        zone={zone}
        landmark={pickupLandmark}
        details={pickupDetails}
        onLandmarkChange={setPickupLandmark}
        onDetailsChange={setPickupDetails}
      />

      <LocationField
        label="Delivery location"
        zone={zone}
        landmark={dropoffLandmark}
        details={dropoffDetails}
        onLandmarkChange={setDropoffLandmark}
        onDetailsChange={setDropoffDetails}
      />

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your WhatsApp number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 212612345678"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo"
        />
      </div>

      {/* Live pricing summary */}
      <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
        lateNight
          ? "bg-indigo-50 border-indigo-200"
          : "bg-emerald-atlaasgo/5 border-emerald-atlaasgo/20"
      }`}>
        <div className="flex flex-col gap-0.5">
          {lateNight ? (
            <>
              <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                🌙 Late Night Rate
                <span className="font-normal text-indigo-500">(11 PM – 5 AM)</span>
                {surging && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                    ⚡ Surge
                  </span>
                )}
              </span>
              <span className="text-[11px] text-indigo-500">
                Base {formatMAD(baseFee)} × 1.5 multiplier
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-emerald-atlaasgo flex items-center gap-1">
              ✓ Standard rate
              <span className="font-normal text-gray-500 capitalize">· {zone}</span>
              {surging && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                  ⚡ Surge
                </span>
              )}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xl font-bold tabular-nums ${lateNight ? "text-indigo-700" : "text-emerald-atlaasgo"}`}>
            {formatMAD(totalFee)}
          </p>
          {lateNight && (
            <p className="text-[10px] text-indigo-400 line-through">{formatMAD(baseFee)}</p>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        disabled={loading || !pickupLandmark || !dropoffLandmark}
        className="btn-primary w-full"
      >
        {loading ? "Placing order..." : `Request Delivery · ${formatMAD(totalFee)}`}
      </motion.button>
    </form>
  );
}

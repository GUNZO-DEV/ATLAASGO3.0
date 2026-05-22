"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ZONES } from "@/constants/zones";
import type { Order } from "@/types/order";

interface Props {
  customerId: string;
}

export default function QuickOrderForm({ customerId }: Props) {
  const [request, setRequest] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim() || !zone) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const order: Order = {
        customerId,
        items: [{ description: request.trim() }],
        status: "pending",
        zone,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, "orders"), order);
      setSuccess(true);
      setRequest("");
      setZone("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What do you need delivered?
        </label>
        <input
          type="text"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="e.g. Lunch from Crepeto"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delivery zone
        </label>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">-- Select city --</option>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && (
        <p className="text-emerald-atlaasgo text-sm font-medium">Order placed successfully!</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? "Placing order..." : "Place Order"}
      </button>
    </form>
  );
}

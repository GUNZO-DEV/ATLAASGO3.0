"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { track } from "@/lib/analytics";

interface Props {
  driverId: string;
  onChange: (online: boolean) => void;
}

export default function AvailabilityToggle({ driverId, onChange }: Props) {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "users", driverId));
      const status = snap.exists() ? snap.data().status : "offline";
      const isOnline = status === "online";
      setOnline(isOnline);
      onChange(isOnline);
      setLoading(false);
    };
    fetch();
  }, [driverId, onChange]);

  const toggle = async () => {
    setToggling(true);
    const next = !online;
    try {
      await setDoc(doc(db, "users", driverId), { status: next ? "online" : "offline" }, { merge: true });
      setOnline(next);
      onChange(next);
      track(next ? "driver_went_online" : "driver_went_offline", { driverId });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="card-moroccan h-20 animate-pulse" />;
  }

  return (
    <div className={`rounded-2xl p-5 flex items-center justify-between border transition-colors duration-300 ${
      online
        ? "bg-emerald-atlaasgo border-emerald-atlaasgo shadow-[0_2px_16px_rgba(0,103,71,0.2)]"
        : "bg-white border-gray-200"
    }`}>
      <div className="flex flex-col gap-0.5">
        <span className={`font-bold text-base ${online ? "text-white" : "text-gray-700"}`}>
          {online ? "Active & Ready" : "Taking a Break"}
        </span>
        <span className={`text-xs ${online ? "text-white/70" : "text-gray-400"}`}>
          {online ? "You are visible to customers" : "You won't receive new orders"}
        </span>
      </div>

      <button
        onClick={toggle}
        disabled={toggling}
        aria-label="Toggle availability"
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-atlaasgo disabled:opacity-60 ${
          online ? "bg-white/30" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-all duration-300 ${
            online ? "translate-x-7 bg-white" : "translate-x-0 bg-gray-400"
          }`}
        />
      </button>
    </div>
  );
}

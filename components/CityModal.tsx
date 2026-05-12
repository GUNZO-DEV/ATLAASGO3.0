"use client";

import { useEffect, useState } from "react";
import { ZONES } from "@/constants/zones";

export default function CityModal() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("atlaasgo_city");
    if (!saved) setOpen(true);
  }, []);

  const handleConfirm = () => {
    if (!selected) return;
    localStorage.setItem("atlaasgo_city", selected);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold text-emerald-atlaasgo">Select Your City</h2>
          <p className="text-gray-500 text-sm mt-1">Choose your delivery zone to get started.</p>
        </div>
        <div className="flex flex-col gap-2">
          {ZONES.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelected(zone.id)}
              className={`w-full py-3 px-4 rounded-lg border text-left font-medium transition ${
                selected === zone.id
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 hover:border-emerald-400 text-gray-700"
              }`}
            >
              {zone.name}
              <span className="block text-xs text-gray-400 font-normal">
                {zone.lat}°N, {zone.lng}°E
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="btn-primary w-full"
        >
          Confirm City
        </button>
      </div>
    </div>
  );
}

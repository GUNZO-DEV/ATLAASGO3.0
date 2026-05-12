"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Zone {
  id: string;
  name: string;
}

export default function CityDropdown() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const fetchZones = async () => {
      const q = query(collection(db, "zones"), where("active", "==", true));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));
      setZones(data);
    };
    fetchZones();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="city" className="text-sm font-medium text-gray-700">
        Select your city
      </label>
      <select
        id="city"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
      >
        <option value="">-- Choose a city --</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-emerald-600 text-sm font-medium">
          Delivering to: {zones.find((z) => z.id === selected)?.name}
        </p>
      )}
    </div>
  );
}

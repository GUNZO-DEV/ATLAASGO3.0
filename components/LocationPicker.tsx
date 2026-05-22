"use client";

import { useEffect, useState } from "react";
import { LANDMARKS, CUSTOM_OPTION } from "@/constants/zones";

interface Props {
  label: string;
  zone: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function LocationPicker({ label, zone, value, onChange, placeholder, required }: Props) {
  const landmarks = LANDMARKS[zone] ?? [];

  // Determine initial mode: if value matches a landmark → dropdown, else custom
  const isKnownLandmark = (v: string) => landmarks.includes(v);
  const [mode, setMode] = useState<"dropdown" | "custom">(
    value && !isKnownLandmark(value) ? "custom" : "dropdown"
  );
  const [dropdownVal, setDropdownVal] = useState(isKnownLandmark(value) ? value : "");
  const [customVal, setCustomVal] = useState(!isKnownLandmark(value) ? value : "");

  useEffect(() => {
    if (mode === "dropdown") {
      onChange(dropdownVal);
    } else {
      onChange(customVal);
    }
  }, [mode, dropdownVal, customVal]);

  const handleSelect = (val: string) => {
    if (val === CUSTOM_OPTION) {
      setMode("custom");
      setDropdownVal("");
    } else {
      setDropdownVal(val);
      onChange(val);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {mode === "dropdown" ? (
        <select
          value={dropdownVal}
          onChange={(e) => handleSelect(e.target.value)}
          required={required}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo text-gray-800"
        >
          <option value="">— Select a landmark —</option>
          {landmarks.map((lm) => (
            <option key={lm} value={lm}>{lm}</option>
          ))}
          <option value={CUSTOM_OPTION}>✏️ Enter custom location...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={customVal}
            onChange={(e) => { setCustomVal(e.target.value); onChange(e.target.value); }}
            placeholder={placeholder ?? "Type a location..."}
            required={required}
            autoFocus
            className="flex-1 border border-emerald-atlaasgo rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo"
          />
          <button
            type="button"
            onClick={() => { setMode("dropdown"); setCustomVal(""); onChange(""); }}
            className="shrink-0 text-xs text-gray-500 hover:text-emerald-atlaasgo border border-gray-300 hover:border-emerald-atlaasgo px-3 py-2 rounded-lg transition"
            title="Back to landmarks"
          >
            ↩ List
          </button>
        </div>
      )}

      {mode === "dropdown" && dropdownVal && (
        <p className="text-xs text-emerald-atlaasgo font-medium flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {dropdownVal}
        </p>
      )}
    </div>
  );
}

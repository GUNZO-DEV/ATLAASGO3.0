"use client";

import { useState } from "react";
import type { SavedAddress } from "@/hooks/useSavedAddresses";

const LABEL_OPTIONS = ["Home", "Dorm", "Office", "Other"];

interface Props {
  initial?: Partial<SavedAddress>;
  onSave: (addr: Omit<SavedAddress, "id">) => Promise<void>;
  onCancel: () => void;
}

export default function AddressForm({ initial, onSave, onCancel }: Props) {
  const [label, setLabel]         = useState(initial?.label ?? "Home");
  const [customLabel, setCustomLabel] = useState(
    initial?.label && !LABEL_OPTIONS.includes(initial.label) ? initial.label : ""
  );
  const [address, setAddress]     = useState(initial?.address ?? "");
  const [note, setNote]           = useState(initial?.note ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving]       = useState(false);

  const finalLabel = label === "Other" ? customLabel : label;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !finalLabel.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label:    finalLabel,
        address:  address.trim(),
        note:     note.trim() || undefined,
        isDefault,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      {/* Label selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Label</label>
        <div className="flex gap-2 flex-wrap">
          {LABEL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLabel(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                label === opt
                  ? "bg-[#E05A23] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {label === "Other" && (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Custom label"
            className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
            required
          />
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, building, dorm..."
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Note <span className="text-gray-300">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Room 204, 2nd floor, blue door..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A23]"
        />
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 accent-[#E05A23]"
        />
        <span className="text-sm text-gray-700">Set as default address</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 bg-[#E05A23] text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving..." : "Save address"}
        </button>
      </div>
    </form>
  );
}

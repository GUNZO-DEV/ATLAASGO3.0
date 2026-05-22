"use client";

import { useState } from "react";
import type { SavedAddress } from "@/hooks/useSavedAddresses";

const LABEL_OPTIONS = ["Maison", "Résidence", "Bureau", "Autre"];

interface Props {
  initial?: Partial<SavedAddress>;
  onSave: (addr: Omit<SavedAddress, "id">) => Promise<void>;
  onCancel: () => void;
}

export default function AddressForm({ initial, onSave, onCancel }: Props) {
  const [label, setLabel]         = useState(initial?.label ?? "Maison");
  const [customLabel, setCustomLabel] = useState(
    initial?.label && !LABEL_OPTIONS.includes(initial.label) ? initial.label : ""
  );
  const [address, setAddress]     = useState(initial?.address ?? "");
  const [note, setNote]           = useState(initial?.note ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving]       = useState(false);

  const finalLabel = label === "Autre" ? customLabel : label;

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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(27,36,64,0.06)] space-y-3">
      {/* Label selector */}
      <div>
        <label className="block text-xs font-medium text-[#6B7A9E] mb-1.5">Libellé</label>
        <div className="flex gap-2 flex-wrap">
          {LABEL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLabel(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                label === opt
                  ? "bg-[#E55A26] text-white"
                  : "bg-[#F5F0E8] text-[#1B2440] hover:bg-[#FEF0E7]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {label === "Autre" && (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Libellé personnalisé"
            className="mt-2 w-full px-3 py-2 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#1B2440] focus:border-[#E55A26]/30 focus:ring-0 focus:outline-none"
            required
          />
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-[#6B7A9E] mb-1.5">Adresse</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Rue, bâtiment, résidence..."
          required
          className="w-full px-3 py-2 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#1B2440] focus:border-[#E55A26]/30 focus:ring-0 focus:outline-none"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-[#6B7A9E] mb-1.5">
          Note <span className="text-[#6B7A9E]/50">(optionnel)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Chambre 204, 2e étage, porte bleue..."
          className="w-full px-3 py-2 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#1B2440] focus:border-[#E55A26]/30 focus:ring-0 focus:outline-none"
        />
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 accent-[#E55A26]"
        />
        <span className="text-sm text-[#1B2440]">Adresse par défaut</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-[#F5F0E8] rounded-xl text-sm font-medium text-[#1B2440] hover:bg-[#FEF0E7] cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 bg-[#E55A26] text-white rounded-xl text-sm font-medium hover:bg-[#C94D20] disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </button>
      </div>
    </form>
  );
}

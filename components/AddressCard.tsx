"use client";

import { MapPin, Pencil, Trash2, Check } from "lucide-react";
import type { SavedAddress } from "@/hooks/useSavedAddresses";

interface Props {
  address: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AddressCard({ address, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
        <MapPin className="w-4 h-4 text-[#E05A23]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 text-sm">{address.label}</p>
          {address.isDefault && (
            <span className="text-xs bg-orange-50 text-[#E05A23] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Default
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5 truncate">{address.address}</p>
        {address.note && (
          <p className="text-xs text-gray-400 mt-0.5">{address.note}</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-red-50 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

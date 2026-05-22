// components/MenuItem.tsx
"use client";

import { Plus } from "lucide-react";
import type { MenuItem as MenuItemType } from "@/types/restaurant";

interface Props {
  item: MenuItemType;
  onAdd: (item: MenuItemType) => void;
}

export default function MenuItem({ item, onAdd }: Props) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl hover:shadow-sm transition-shadow">
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          className="w-20 h-20 shrink-0 rounded-lg object-cover bg-gray-100"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold text-gray-900 text-sm">{item.price} MAD</span>
          <button
            onClick={() => onAdd(item)}
            className="flex items-center gap-1 bg-[#E05A23] text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-orange-600 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

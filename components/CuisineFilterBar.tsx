// components/CuisineFilterBar.tsx
"use client";

import { CUISINE_TYPES } from "@/lib/restaurants";

interface Props {
  selected: string[];
  onChange: (cuisines: string[]) => void;
}

export default function CuisineFilterBar({ selected, onChange }: Props) {
  const toggle = (cuisine: string) =>
    onChange(
      selected.includes(cuisine)
        ? selected.filter((c) => c !== cuisine)
        : [...selected, cuisine]
    );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onChange([])}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
          selected.length === 0
            ? "bg-[#E05A23] text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {CUISINE_TYPES.map((cuisine) => (
        <button
          key={cuisine}
          onClick={() => toggle(cuisine)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors cursor-pointer ${
            selected.includes(cuisine)
              ? "bg-[#E05A23] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cuisine.replace("-", " ")}
        </button>
      ))}
    </div>
  );
}

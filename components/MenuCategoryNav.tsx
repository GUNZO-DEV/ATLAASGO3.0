// components/MenuCategoryNav.tsx
"use client";

import { useRef, useEffect } from "react";
import type { MenuCategory } from "@/types/restaurant";

interface Props {
  categories: MenuCategory[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function MenuCategoryNav({ categories, activeCategory, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector(
      `[data-cat="${activeCategory}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCategory]);

  return (
    <div ref={ref} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          data-cat={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeCategory === cat.id
              ? "bg-[#E05A23] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

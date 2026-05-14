// components/MenuSection.tsx
"use client";

import MenuItem from "@/components/MenuItem";
import type { MenuCategory, MenuItem as MenuItemType } from "@/types/restaurant";

interface Props {
  category: MenuCategory;
  items: MenuItemType[];
  onAdd: (item: MenuItemType) => void;
}

export default function MenuSection({ category, items, onAdd }: Props) {
  if (items.length === 0) return null;
  return (
    <section id={`cat-${category.id}`} className="scroll-mt-32">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{category.name}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <MenuItem key={item.id} item={item} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

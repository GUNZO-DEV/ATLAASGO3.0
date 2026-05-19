import { useState } from 'react';
import { ScrollView } from 'react-native';
import { CategoryCard } from './CategoryCard';
import type { Category } from '../lib/types';

/**
 * High-performance scrolling grid. Tracks the pressed card and tells its
 * siblings to recede, producing a non-collision scale interaction.
 */
export function CategoryGrid({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (c: Category) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
      removeClippedSubviews
    >
      {categories.map((category, index) => (
        <CategoryCard
          key={category.id}
          category={category}
          index={index}
          active={activeId === category.id}
          receding={activeId !== null && activeId !== category.id}
          onPressIn={() => setActiveId(category.id)}
          onPressOut={() => setActiveId(null)}
          onPress={() => {
            setActiveId(null);
            onSelect(category);
          }}
        />
      ))}
    </ScrollView>
  );
}

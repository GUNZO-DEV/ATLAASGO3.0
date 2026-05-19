import { MotiView } from 'moti';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import type { Category } from '../lib/types';

/**
 * One category cell. Animates entry, scales on press, recedes when another
 * card in the same grid is the active one (handled by `receding` prop).
 */
export function CategoryCard({
  category,
  index,
  active,
  receding,
  onPressIn,
  onPressOut,
  onPress,
}: {
  category: Category;
  index: number;
  active: boolean;
  receding: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  onPress: () => void;
}) {
  /**
   * Non-collision physics:
   *  - active card scales to 1.05, neighbours recede to 0.92 and dim
   *  - we use scale only, never translate — neighbouring cards never
   *    overlap or shift into one another during the transition
   */
  const scale = active ? 1.05 : receding ? 0.92 : 1;
  const opacity = receding ? 0.55 : 1;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 24, scale: 0.96 }}
      animate={{ opacity, translateY: 0, scale }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 200,
        delay: receding ? 0 : 80 + index * 90,
      }}
      style={{
        shadowColor: category.gradient[1],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: active ? 0.35 : 0.16,
        shadowRadius: 24,
        elevation: active ? 12 : 4,
        marginBottom: 20,
      }}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${category.label} — ${category.partnerCount} partners`}
        className="rounded-3xl overflow-hidden bg-white border border-black/5"
      >
        <LinearGradient
          colors={[category.gradient[0], category.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 28, paddingVertical: 28 }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -40,
              right: -20,
              width: 180,
              height: 180,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white/80 text-[11px] uppercase tracking-[2px] font-semibold mb-2">
                {category.partnerCount} partners
              </Text>
              <Text
                className="text-white font-display text-3xl"
                style={{ letterSpacing: -0.8, fontWeight: '800' }}
              >
                {category.label}
              </Text>
              <Text className="text-white/85 mt-1.5 text-sm leading-snug">{category.tagline}</Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Text style={{ fontSize: 30 }}>{category.emoji}</Text>
            </View>
          </View>
          <View className="flex-row items-center mt-5">
            <View className="bg-white/20 rounded-full px-3 py-1.5 flex-row items-center">
              <Text className="text-white text-[11px] font-bold uppercase" style={{ letterSpacing: 1 }}>
                Browse
              </Text>
              <ChevronRight size={14} color="#fff" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </MotiView>
  );
}

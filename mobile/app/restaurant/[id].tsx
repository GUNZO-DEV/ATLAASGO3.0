import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Plus, ShoppingBag } from 'lucide-react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { useMenu } from '../../hooks/useMenu';
import { useCart } from '../../lib/cart';
import { supabase } from '../../lib/supabase';

export default function RestaurantScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sections, loading, error } = useMenu(id);
  const { add, count, total } = useCart();
  const cartCount = count();

  const [restaurant, setRestaurant] = useState<{ name: string; emoji: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    supabase
      .from('restaurants')
      .select('name, emoji')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRestaurant(data as { name: string; emoji: string | null } | null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const restaurantName = restaurant?.name ?? 'Menu';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: cartCount > 0 ? 120 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-3">
          <PressableScale onPress={() => router.back()}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center bg-white"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
            >
              <ArrowLeft size={18} color="#1A1410" />
            </View>
          </PressableScale>
          <View style={{ width: 40 }} />
        </View>

        <View className="mt-6 mb-5 flex-row items-center">
          <Text style={{ fontSize: 40, marginRight: 12 }}>{restaurant?.emoji ?? '🍽️'}</Text>
          <View className="flex-1">
            <Text
              className="font-display text-[26px]"
              style={{ fontWeight: '800', letterSpacing: -0.8, color: '#1A1410', lineHeight: 30 }}
              numberOfLines={2}
            >
              {restaurantName}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#FF5722" />
          </View>
        ) : error ? (
          <Text className="text-[13px]" style={{ color: '#B91C1C' }}>
            Couldn’t load the menu: {error}
          </Text>
        ) : sections.length === 0 ? (
          <Text className="text-[14px]" style={{ color: '#7A6F66' }}>
            This restaurant hasn’t published a menu yet.
          </Text>
        ) : (
          sections.map((section) => (
            <View key={section.categoryId} className="mb-6">
              <Text
                className="text-[12px] uppercase font-bold mb-3"
                style={{ letterSpacing: 1.4, color: '#FF5722' }}
              >
                {section.categoryName}
              </Text>
              <View style={{ gap: 10 }}>
                {section.items.map((item) => (
                  <View
                    key={item.id}
                    className="flex-row items-center bg-white rounded-2xl p-4"
                    style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-[15px] font-bold" style={{ color: '#1A1410' }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text className="text-[12px] mt-0.5" style={{ color: '#7A6F66' }} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                      <Text className="text-[13px] font-bold mt-1.5" style={{ color: '#1A1410' }}>
                        {item.priceDh} dh
                      </Text>
                    </View>
                    <PressableScale
                      onPress={() =>
                        add({
                          id: item.id,
                          restaurantId: id!,
                          restaurantName,
                          name: item.name,
                          desc: item.description ?? undefined,
                          priceDh: item.priceDh,
                        })
                      }
                    >
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#FF5722' }}
                      >
                        <Plus size={18} color="#fff" strokeWidth={2.5} />
                      </View>
                    </PressableScale>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <View style={{ position: 'absolute', left: 24, right: 24, bottom: 32 }}>
          <Pressable onPress={() => router.push('/cart')}>
            <View
              className="rounded-full py-4 px-6 flex-row items-center justify-between"
              style={{
                backgroundColor: '#FF5722',
                shadowColor: '#FF5722',
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <View className="flex-row items-center">
                <ShoppingBag size={17} color="#fff" />
                <Text className="text-white font-bold text-[15px] ml-2">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
              <Text className="text-white font-bold text-[15px]">View cart · {total()} dh</Text>
            </View>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

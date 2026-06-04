import { useMemo, useRef, useState } from 'react';
import { MotiView } from 'moti';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Receipt, ShoppingBag, Star, User } from 'lucide-react-native';
import { useCategories } from '../hooks/useCategories';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import type { CategoryKey } from '../lib/types';

export default function Home() {
  const router = useRouter();
  const { categories } = useCategories();
  const { restaurants, loading: restosLoading, error: restosError } = useRestaurants();
  const { user } = useAuth();
  const cartCount = useCart((s) => s.count());

  // Tapping a category filters the restaurant list in place (and scrolls to
  // it). Only food restaurants exist today; pharmacy/groceries are upcoming.
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('food');
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);

  const visibleRestaurants = useMemo(() => {
    // All seeded restaurants are food venues, so 'food' shows everything.
    // pharmacy/groceries have no partners yet → empty (handled below).
    return activeCategory === 'food' ? restaurants : [];
  }, [restaurants, activeCategory]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <View className="flex-1 px-6">
        {/* Top bar */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320 }}
          className="flex-row items-center justify-between pt-3"
        >
          <View className="flex-row items-center">
            <View
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{
                backgroundColor: '#FF5722',
                shadowColor: '#FF5722',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <MapPin size={16} color="#fff" strokeWidth={2.5} />
            </View>
            <View className="ml-3">
              <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: '#7A6F66' }}>
                Deliver to
              </Text>
              <Text className="text-[14px] font-bold mt-0.5" style={{ color: '#1A1410' }}>
                AUI · Building 16
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.push('/cart')}
              accessibilityRole="button"
              accessibilityLabel="Cart"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center bg-white mr-2"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
              >
                <ShoppingBag size={16} color="#1A1410" />
                {cartCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: '#FF5722',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{cartCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push('/orders')}
              accessibilityRole="button"
              accessibilityLabel="Orders"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center bg-white mr-2"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
              >
                <Receipt size={16} color="#1A1410" />
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push('/sign-in')}
              accessibilityRole="button"
              accessibilityLabel={user ? 'Account' : 'Sign in'}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: user ? '#FF5722' : '#fff',
                  borderWidth: 1,
                  borderColor: user ? '#FF5722' : 'rgba(26,20,16,0.08)',
                }}
              >
                <User size={16} color={user ? '#fff' : '#1A1410'} />
              </View>
            </Pressable>
          </View>
        </MotiView>

        {/* Heading */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 120 }}
          className="mt-7 mb-7"
        >
          <Text className="text-[12px] uppercase font-bold mb-2" style={{ letterSpacing: 1.6, color: '#FF5722' }}>
            AtlaasGo · Ifrane
          </Text>
          <Text
            className="font-display text-[34px]"
            style={{ fontWeight: '800', lineHeight: 36, letterSpacing: -1.2, color: '#1A1410' }}
          >
            What are you{'\n'}
            <Text style={{ color: '#FF5722' }}>craving</Text> today?
          </Text>
          <Text className="mt-3 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            One ecosystem. Three ways in.
          </Text>
        </MotiView>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Category chips — tap to filter the list below */}
          <View className="flex-row" style={{ gap: 10 }}>
            {categories.map((c) => {
              const active = c.id === activeCategory;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setActiveCategory(c.id as CategoryKey);
                    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 12), animated: true });
                  }}
                  className="flex-1"
                >
                  <View
                    className="rounded-2xl p-4 items-center"
                    style={{
                      backgroundColor: active ? '#FF5722' : '#fff',
                      borderWidth: 1,
                      borderColor: active ? '#FF5722' : 'rgba(26,20,16,0.08)',
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                    <Text
                      className="text-[13px] font-bold mt-1.5"
                      style={{ color: active ? '#fff' : '#1A1410' }}
                    >
                      {c.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* ── Restaurant list (filtered by category) ── */}
          <View
            className="mt-8 flex-row items-center justify-between"
            onLayout={(e) => {
              listY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text
              className="font-display text-[20px]"
              style={{ fontWeight: '800', letterSpacing: -0.6, color: '#1A1410' }}
            >
              {activeCategory === 'food' ? 'Open in Ifrane' : categories.find((c) => c.id === activeCategory)?.label}
            </Text>
            {!restosLoading && activeCategory === 'food' && (
              <Text className="text-[12px] font-bold" style={{ color: '#7A6F66' }}>
                {visibleRestaurants.length} live
              </Text>
            )}
          </View>

          {restosLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#FF5722" />
              <Text className="mt-3 text-[13px]" style={{ color: '#7A6F66' }}>
                Loading restaurants…
              </Text>
            </View>
          ) : restosError ? (
            <Text className="mt-4 text-[13px]" style={{ color: '#B91C1C' }}>
              Couldn’t reach the backend: {restosError}
            </Text>
          ) : visibleRestaurants.length === 0 ? (
            <View
              className="mt-4 rounded-3xl p-6"
              style={{ backgroundColor: '#FFF1EB', borderWidth: 1, borderColor: 'rgba(255,87,34,0.15)' }}
            >
              <Text className="font-display text-[16px]" style={{ fontWeight: '700', color: '#1A1410' }}>
                Coming soon
              </Text>
              <Text className="mt-1 text-[13px]" style={{ color: '#7A6F66', lineHeight: 18 }}>
                {categories.find((c) => c.id === activeCategory)?.label} partners are launching in Ifrane shortly. Tap Food to order now.
              </Text>
            </View>
          ) : (
            <View className="mt-4" style={{ gap: 10 }}>
              {visibleRestaurants.map((r, i) => (
                <MotiView
                  key={r.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 280, delay: Math.min(i * 40, 400) }}
                >
                  <Pressable
                    onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
                    className="flex-row items-center bg-white rounded-2xl p-3.5"
                    style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
                  >
                    <View
                      className="w-12 h-12 rounded-xl items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
                    >
                      <Text style={{ fontSize: 24 }}>{r.emoji ?? '🍽️'}</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-[15px] font-bold" style={{ color: '#1A1410' }} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text className="text-[12px] mt-0.5" style={{ color: '#7A6F66' }} numberOfLines={1}>
                        {[r.cuisine, r.time_min ? `${r.time_min} min` : null, r.fee_dh != null ? `${r.fee_dh} dh` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {r.rating != null && (
                      <View className="flex-row items-center" style={{ gap: 3 }}>
                        <Star size={13} color="#FF5722" fill="#FF5722" />
                        <Text className="text-[13px] font-bold" style={{ color: '#1A1410' }}>
                          {r.rating}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </MotiView>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

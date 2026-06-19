import { useMemo, useState } from 'react';
import { MotiView } from 'moti';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Bike, ChevronRight, MapPin, Receipt, Search, Star, User, X } from 'lucide-react-native';
import { CategoryGrid } from '../components/CategoryGrid';
import { useCategories } from '../hooks/useCategories';
import { useRestaurants } from '../hooks/useRestaurants';
import { useAuth } from '../lib/auth';

type SortKey = 'fastest' | 'top' | 'cheapest';

const SORT_CHIPS: { key: SortKey; label: string }[] = [
  { key: 'fastest', label: 'Fastest' },
  { key: 'top', label: 'Top rated' },
  { key: 'cheapest', label: 'Lowest fee' },
];

export default function Home() {
  const router = useRouter();
  const { categories } = useCategories();
  const { restaurants, loading: restosLoading, error: restosError } = useRestaurants();
  const { user } = useAuth();

  // Tapping a category hides the others and the whole screen adopts that
  // category's personality (voice + accent color). "All categories" resets.
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ? categories.find((c) => c.id === selected) ?? null : null;
  const shownCategories = selected ? categories.filter((c) => c.id === selected) : categories;

  // Food-focused search + sort (client-side; default order untouched).
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey | null>(null);

  const visibleRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? restaurants.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.cuisine ?? '').toLowerCase().includes(q),
        )
      : restaurants;
    if (sort) {
      list = [...list].sort((a, b) => {
        if (sort === 'fastest') return (a.time_min ?? Infinity) - (b.time_min ?? Infinity);
        if (sort === 'top') return (b.rating ?? -1) - (a.rating ?? -1);
        return (a.fee_dh ?? Infinity) - (b.fee_dh ?? Infinity);
      });
    }
    return list;
  }, [restaurants, query, sort]);

  function resetFoodFilters() {
    setQuery('');
    setSort(null);
  }

  // When a category is focused the whole screen takes on its soft tint.
  const screenBg = active ? active.soft : '#FBF7F2';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }} edges={['top']}>
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
              onPress={() => router.push(user ? '/account' : '/sign-in')}
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

        {/* Heading — adopts the focused category's voice + accent */}
        <MotiView
          key={active ? active.id : 'all'}
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 340 }}
          className="mt-7 mb-7"
        >
          <Text
            className="text-[12px] uppercase font-bold mb-2"
            style={{ letterSpacing: 1.6, color: active ? active.accent : '#FF5722' }}
          >
            {active ? `AtlaasGo · ${active.label}` : 'AtlaasGo · Ifrane'}
          </Text>
          {active ? (
            <Text
              className="font-display text-[34px]"
              style={{ fontWeight: '800', lineHeight: 36, letterSpacing: -1.2, color: active.accent }}
            >
              {active.headline}
            </Text>
          ) : (
            <Text
              className="font-display text-[34px]"
              style={{ fontWeight: '800', lineHeight: 36, letterSpacing: -1.2, color: '#1A1410' }}
            >
              What are you{'\n'}
              <Text style={{ color: '#FF5722' }}>craving</Text> today?
            </Text>
          )}
          <Text className="mt-3 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            {active ? active.voice : 'One ecosystem. Three ways in.'}
          </Text>
        </MotiView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* When a category is selected, show a back row to bring them all back */}
          {selected && (
            <Pressable onPress={() => { setSelected(null); resetFoodFilters(); }}>
              <View
                className="flex-row items-center mb-3 self-start rounded-full px-3.5 py-2"
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: `${active?.accent ?? '#1A1410'}33` }}
              >
                <ArrowLeft size={15} color={active?.accent ?? '#1A1410'} />
                <Text className="ml-1.5 text-[13px] font-bold" style={{ color: active?.accent ?? '#1A1410' }}>
                  All categories
                </Text>
              </View>
            </Pressable>
          )}

          <CategoryGrid
            categories={shownCategories}
            onSelect={(c) => { resetFoodFilters(); setSelected(c.id); }}
          />

          {/* ── AUI Campus courier quick card (all-categories view only) ── */}
          {!selected && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 320, delay: 200 }}
              style={{ marginTop: -28 }}
            >
              <Link href="/campus" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="AUI Campus courier"
                  className="flex-row items-center bg-white rounded-3xl p-4"
                  style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
                >
                  <View
                    className="w-11 h-11 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
                  >
                    <Bike size={20} color="#FF5722" strokeWidth={2.2} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[15px] font-bold" style={{ color: '#1A1410' }}>
                      AUI Campus courier
                    </Text>
                    <Text className="text-[12px] mt-0.5" style={{ color: '#7A6F66' }} numberOfLines={1}>
                      Send anything across campus, dorm to dorm.
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#7A6F66" />
                </Pressable>
              </Link>
            </MotiView>
          )}

          {/* ── Restaurants for the selected category ── */}
          {selected ? (
            <>
              <View className="mt-8 flex-row items-center justify-between">
                <Text
                  className="font-display text-[20px]"
                  style={{ fontWeight: '800', letterSpacing: -0.6, color: '#1A1410' }}
                >
                  {active?.sectionTitle ?? 'Open in Ifrane'}
                </Text>
                {!restosLoading && selected === 'food' && (
                  <Text className="text-[12px] font-bold" style={{ color: active?.accent ?? '#7A6F66' }}>
                    {restaurants.length} live
                  </Text>
                )}
              </View>

              {/* ── Search + sort (Food only) ── */}
              {selected === 'food' && !restosLoading && !restosError && (
                <>
                  <View
                    className="mt-4 flex-row items-center bg-white rounded-2xl px-4"
                    style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)' }}
                  >
                    <Search size={16} color="#7A6F66" />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search restaurants or cuisines"
                      placeholderTextColor="#A89E94"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      className="flex-1 ml-2.5 py-3 text-[14px]"
                      style={{ color: '#1A1410' }}
                      accessibilityLabel="Search restaurants"
                    />
                    {query.length > 0 && (
                      <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center"
                          style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}
                        >
                          <X size={12} color="#1A1410" />
                        </View>
                      </Pressable>
                    )}
                  </View>

                  <View className="mt-3 flex-row" style={{ gap: 8 }}>
                    {SORT_CHIPS.map((chip) => {
                      const on = sort === chip.key;
                      const accent = active?.accent ?? '#FF5722';
                      return (
                        <Pressable
                          key={chip.key}
                          onPress={() => setSort(on ? null : chip.key)}
                          accessibilityRole="button"
                          accessibilityLabel={`Sort by ${chip.label}`}
                        >
                          <View
                            className="rounded-full px-3.5 py-2"
                            style={{
                              backgroundColor: on ? accent : '#fff',
                              borderWidth: 1,
                              borderColor: on ? accent : 'rgba(26,20,16,0.10)',
                            }}
                          >
                            <Text className="text-[12px] font-bold" style={{ color: on ? '#fff' : '#1A1410' }}>
                              {chip.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {selected !== 'food' ? (
                <View
                  className="mt-4 rounded-3xl p-6"
                  style={{ backgroundColor: active?.soft, borderWidth: 1, borderColor: `${active?.accent}26` }}
                >
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>{active?.emoji}</Text>
                  <Text className="font-display text-[17px]" style={{ fontWeight: '800', color: active?.accent }}>
                    {active?.label} — coming soon
                  </Text>
                  <Text className="mt-1 text-[13px]" style={{ color: '#7A6F66', lineHeight: 18 }}>
                    {active?.label} partners are launching in Ifrane shortly. Tap “All categories”, then Food, to order now.
                  </Text>
                </View>
              ) : restosLoading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator color="#FF5722" />
                  <Text className="mt-3 text-[13px]" style={{ color: '#7A6F66' }}>
                    Loading live restaurants…
                  </Text>
                </View>
              ) : restosError ? (
                <Text className="mt-4 text-[13px]" style={{ color: '#B91C1C' }}>
                  Couldn’t reach the backend: {restosError}
                </Text>
              ) : visibleRestaurants.length === 0 ? (
                <View
                  className="mt-4 rounded-3xl p-6 bg-white items-center"
                  style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
                >
                  <Search size={18} color="#7A6F66" />
                  <Text className="mt-2 text-[14px] font-bold" style={{ color: '#1A1410' }}>
                    {restaurants.length === 0 ? 'No restaurants are live right now' : 'No matches'}
                  </Text>
                  <Text className="mt-1 text-[12px] text-center" style={{ color: '#7A6F66', lineHeight: 17 }}>
                    {restaurants.length === 0
                      ? 'Check back soon — kitchens open through the day.'
                      : `Nothing matches “${query.trim()}”. Try another name or cuisine.`}
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
                      style={{ backgroundColor: `${active?.accent ?? '#FF5722'}1A` }}
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
                        <Star size={13} color={active?.accent ?? '#FF5722'} fill={active?.accent ?? '#FF5722'} />
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
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

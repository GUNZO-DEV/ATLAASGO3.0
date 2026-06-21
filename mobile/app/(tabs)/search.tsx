// AtlaasGo 3.0 — Search (NATIVE).
//
// Live search over the catalog via agApi.catalog.search(q, city), which now
// returns BOTH matching restaurants (by name OR cuisine) and matching dishes
// (each carrying the store it belongs to). Empty-query state shows recent
// searches, trending dishes and a browse-by-craving grid. All reads go through
// the ag3 agApi; tapping a result resolves slug→uuid and opens the existing
// /restaurant/[id] route (menu/cart/Stripe flow untouched).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

import { agApi, type Store, type DishHit } from '../../lib/ag3/agApi';
import { useAsync } from '../../lib/ag3/useAsync';
import { supabase } from '../../lib/supabase';
import { useAg3Theme } from '../../components/ag3/theme';
import { Press, Rise, RestoRow, PhotoTile, Price, foodEm, tileFor } from '../../components/ag3/primitives';
import { ISearch, IFire, IClose, IClock } from '../../components/ag3/icons';

const CRAVING_TILES = ['tile-b', 'tile-a', 'tile-c', 'tile-d', 'tile-e', 'tile-f'] as const;
const RECENT_KEY = 'ag3-recent-searches';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Search() {
  const router = useRouter();
  const t = useAg3Theme();

  // Selected city (persisted 'ag3-city', default ifrane) — scopes the search +
  // labels the "Trending in …" eyebrow. (No CityProvider mounted app-wide.)
  const [cityId, setCityId] = useState('ifrane');
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('ag3-city').then((id) => { if (!cancelled && id) setCityId(id); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const { data: city } = useAsync(() => agApi.cities.get(cityId), [cityId]);
  const cityName = city?.name ?? '';

  const [q, setQ] = useState('');
  const query = q.trim();

  const { data: trending } = useAsync(() => agApi.catalog.trending(), []);
  const { data: categories } = useAsync(() => agApi.catalog.categories('food'), []);
  const { data: search, loading: searching } = useAsync(
    () => (query ? agApi.catalog.search(q, cityName) : Promise.resolve({ stores: [] as Store[], dishes: [] as DishHit[] })),
    [query, cityName],
  );

  const cravings = categories ?? [];
  const stores = search?.stores ?? [];
  const dishes = search?.dishes ?? [];
  const hasResults = stores.length > 0 || dishes.length > 0;

  // ── recent searches (persisted) ──
  const [recents, setRecents] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (cancelled || !raw) return;
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRecents(arr.filter((x) => typeof x === 'string').slice(0, 8));
      } catch { /* ignore corrupt cache */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const persistRecents = useCallback((next: string[]) => {
    setRecents(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }, []);
  const pushRecent = useCallback((term: string) => {
    const v = term.trim();
    if (!v) return;
    persistRecents([v, ...recents.filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 8));
  }, [recents, persistRecents]);
  const removeRecent = useCallback((term: string) => persistRecents(recents.filter((r) => r !== term)), [recents, persistRecents]);

  // Open a store by slug → resolve to the restaurant UUID the existing route
  // expects, and remember the query that led there.
  const openBySlug = useCallback(async (slug: string, term?: string) => {
    if (term) pushRecent(term);
    let id = slug;
    if (!UUID_RE.test(id)) {
      try {
        const { data } = await supabase.from('restaurants').select('id').eq('slug', slug).maybeSingle();
        if (data?.id) id = data.id as string;
      } catch { /* fall back to slug; route shows its empty state */ }
    }
    router.push({ pathname: '/restaurant/[id]', params: { id } });
  }, [router, pushRecent]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <LinearGradient
        colors={t.gradients.soft}
        start={t.gradients.start}
        end={t.gradients.end}
        style={styles.canopy}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 28, paddingTop: 8 }}
      >
        {/* header: title + search pill */}
        <Rise style={[styles.pad, { marginTop: 8 }]}>
          <Text style={[styles.disp, { fontSize: 27, color: t.colors.fg, marginBottom: 14 }]}>Search</Text>
          <View
            style={[
              styles.searchField,
              { backgroundColor: t.colors.surface, borderColor: query ? t.colors.primary : t.colors.line },
              t.shadows.card,
            ]}
          >
            <ISearch size={20} color={t.colors.primary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search dishes, restaurants, cuisines…"
              placeholderTextColor={t.colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => query && pushRecent(query)}
              style={[styles.searchInput, { color: t.colors.fg }]}
              accessibilityLabel="Search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                <View style={[styles.clearBtn, { backgroundColor: t.colors.surface2 }]}>
                  <IClose size={13} color={t.colors.fg} />
                </View>
              </Pressable>
            )}
          </View>
        </Rise>

        {/* ── empty-query state ── */}
        {!query && (
          <>
            {/* recent searches */}
            {recents.length > 0 && (
              <Rise delay={40} style={[styles.pad, { marginTop: 22 }]}>
                <View style={styles.headRow}>
                  <View style={styles.eyebrowRow}>
                    <IClock size={13} color={t.colors.muted} />
                    <Text style={[styles.eyebrow, { color: t.colors.muted }]}>Recent</Text>
                  </View>
                  <Pressable onPress={() => persistRecents([])} hitSlop={8}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.primary }}>Clear</Text>
                  </Pressable>
                </View>
                <View style={styles.chipWrap}>
                  {recents.map((term) => (
                    <View key={term} style={[styles.recentChip, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                      <Pressable onPress={() => setQ(term)} hitSlop={4} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: t.colors.fg }}>{term}</Text>
                      </Pressable>
                      <Pressable onPress={() => removeRecent(term)} hitSlop={8} accessibilityLabel={`Remove ${term}`}>
                        <IClose size={12} color={t.colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </Rise>
            )}

            {/* trending */}
            <Rise delay={80} style={[styles.pad, { marginTop: 22 }]}>
              <View style={styles.eyebrowRow}>
                <IFire size={13} color={t.colors.primary} />
                <Text style={[styles.eyebrow, { color: t.colors.primary }]}>
                  Trending{cityName ? ` in ${cityName}` : ''}
                </Text>
              </View>
              <View style={[styles.chipWrap, { marginTop: 11 }]}>
                {(trending ?? []).map((term) => (
                  <Press key={term} onPress={() => setQ(term)} scaleTo={0.95}>
                    <View style={[styles.trendChip, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: t.colors.fgSoft }}>{term}</Text>
                    </View>
                  </Press>
                ))}
              </View>
            </Rise>

            {/* browse by craving */}
            <Rise delay={140} style={[styles.pad, { marginTop: 24 }]}>
              <Text style={[styles.disp, { fontSize: 18, color: t.colors.fg, marginBottom: 12 }]}>Browse by craving</Text>
              <View style={styles.cravingGrid}>
                {cravings.map((c, i) => {
                  const colors = t.tileGradients[CRAVING_TILES[i % CRAVING_TILES.length]];
                  return (
                    <Press key={c.id} onPress={() => setQ(c.label)} scaleTo={0.97} style={styles.cravingCell}>
                      <View style={[styles.cravingTile, t.shadows.card]}>
                        <LinearGradient colors={colors} start={t.gradients.start} end={t.gradients.end} style={StyleSheet.absoluteFill} />
                        <View pointerEvents="none" style={styles.cravingSheen} />
                        <Text pointerEvents="none" style={styles.cravingEmoji}>{c.emoji}</Text>
                        <Text style={styles.cravingLabel}>{c.label}</Text>
                      </View>
                    </Press>
                  );
                })}
              </View>
            </Rise>
          </>
        )}

        {/* ── results ── */}
        {!!query && (
          <View style={[styles.pad, { marginTop: 18 }]}>
            {searching && !hasResults ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={t.colors.primary} />
              </View>
            ) : !hasResults ? (
              <View style={[styles.emptyCard, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
                <ISearch size={20} color={t.colors.muted} />
                <Text style={{ marginTop: 10, fontWeight: '800', fontSize: 15, color: t.colors.fg }}>No matches</Text>
                <Text style={{ marginTop: 4, fontSize: 12.5, color: t.colors.fgSoft, textAlign: 'center', lineHeight: 18 }}>
                  Nothing matches “{query}”{cityName ? ` in ${cityName}` : ''}. Try another dish, place or cuisine.
                </Text>
              </View>
            ) : (
              <>
                {/* dishes */}
                {dishes.length > 0 && (
                  <View style={{ marginBottom: stores.length ? 22 : 0 }}>
                    <Text style={[styles.sectitle, { color: t.colors.fg }]}>Dishes</Text>
                    <View style={{ gap: 10 }}>
                      {dishes.map((d, i) => (
                        <MotiView
                          key={d.id}
                          from={{ opacity: 0, translateY: 8 }}
                          animate={{ opacity: 1, translateY: 0 }}
                          transition={{ type: 'timing', duration: 240, delay: Math.min(i * 35, 320) }}
                        >
                          <Press onPress={() => void openBySlug(d.storeId, query)}>
                            <View style={[styles.dishRow, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
                              <PhotoTile tile={tileFor(d.storeId)} em={d.emoji || foodEm(d.id)} radius={14} style={{ width: 54, height: 54 }} />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }} numberOfLines={1}>{d.name}</Text>
                                <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }} numberOfLines={1}>{d.storeName}</Text>
                              </View>
                              <Price v={d.priceDh} />
                            </View>
                          </Press>
                        </MotiView>
                      ))}
                    </View>
                  </View>
                )}

                {/* restaurants */}
                {stores.length > 0 && (
                  <View>
                    <Text style={[styles.sectitle, { color: t.colors.fg }]}>Restaurants</Text>
                    <View style={{ gap: 12 }}>
                      {stores.map((r, i) => (
                        <MotiView
                          key={r.id}
                          from={{ opacity: 0, translateY: 8 }}
                          animate={{ opacity: 1, translateY: 0 }}
                          transition={{ type: 'timing', duration: 240, delay: Math.min(i * 35, 320) }}
                        >
                          <RestoRow r={r} onPress={() => void openBySlug(r.id, query)} />
                        </MotiView>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  canopy: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  pad: { paddingHorizontal: 20 },
  disp: { fontWeight: '800', letterSpacing: -0.5 },
  sectitle: { fontWeight: '800', letterSpacing: -0.4, fontSize: 16, marginBottom: 11 },

  searchField: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 14, borderRadius: 18, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },
  clearBtn: { width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  trendChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 14, paddingRight: 11, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },

  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, borderWidth: 1 },

  cravingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cravingCell: { width: '47.5%', flexGrow: 1 },
  cravingTile: { height: 84, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', padding: 13 },
  cravingSheen: { position: 'absolute', top: -16, right: -16, width: 120, height: 90, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.20)' },
  cravingEmoji: { position: 'absolute', right: -2, bottom: -10, fontSize: 50, lineHeight: 58, opacity: 0.9, transform: [{ rotate: '-10deg' }] },
  cravingLabel: { position: 'relative', zIndex: 2, fontWeight: '800', color: '#fff', fontSize: 16, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.34)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },

  emptyCard: { borderRadius: 26, borderWidth: 1, padding: 26, alignItems: 'center' },
});

// AtlaasGo 3.0 — Search (NATIVE).
//
// Faithful RN re-skin of the `Search` export in
//   /tmp/atlaasgo-3-0/atllasgo-3-0/project/app2/screen-tabs2.jsx
// wired to the verified data logic of
//   src/app3/screens/Search.tsx
// via the ag3 foundation (agApi / useCity / useAsync / primitives / theme).
//
// Layout (matching the prototype):
//   • "Search" display heading + pill search field + filter button
//   • when the query is empty:
//       – Trending chips      → agApi.catalog.trending()        (tap → fills query)
//       – Browse-by-craving   → agApi.catalog.categories('food') (2-col emoji tiles)
//   • when there is a query:
//       – "{n} results for …" + RestoRow list  → agApi.catalog.search(q, city.name)
//
// Native plumbing preserved / wired:
//   • Navigation uses expo-router; tapping a result opens the EXISTING
//     /restaurant/[id] route. That route resolves by restaurant UUID, but an
//     ag3 Store.id is a slug, so we resolve slug→uuid via the shared supabase
//     client at tap time (mirrors agApi's storeKey) before pushing — keeping the
//     existing menu/cart/checkout/Stripe flow on that screen fully intact.
//   • Reads go exclusively through the ag3 agApi; no payment/realtime/order code
//     is touched here.
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

import { agApi, type Store } from '../../lib/ag3/agApi';
import { useAsync } from '../../lib/ag3/useAsync';
import { supabase } from '../../lib/supabase';
import { useAg3Theme } from '../../components/ag3/theme';
import {
  Press,
  Rise,
  RestoRow,
  FilterButton,
} from '../../components/ag3/primitives';
import { ISearch, IFire, IClose } from '../../components/ag3/icons';

// Prototype rotates the same six tile gradients across the craving grid.
const CRAVING_TILES = ['tile-b', 'tile-a', 'tile-c', 'tile-d', 'tile-e', 'tile-f'] as const;

export default function Search() {
  const router = useRouter();
  const t = useAg3Theme();

  // CityProvider is not mounted app-wide (see app/order/[id].tsx), so read the
  // selected city the same way: the persisted 'ag3-city' id (default 'ifrane'),
  // resolved to a display name via agApi.cities for the "Trending in …" label
  // and to scope agApi.catalog.search by city.
  const [cityId, setCityId] = useState('ifrane');
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('ag3-city')
      .then((id) => {
        if (!cancelled && id) setCityId(id);
      })
      .catch(() => {
        /* keep the ifrane default */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const { data: city } = useAsync(() => agApi.cities.get(cityId), [cityId]);
  const cityName = city?.name ?? '';

  const [q, setQ] = useState('');
  const query = q.trim();

  // window.AG mock (prototype) → live agApi reads, exactly as src/app3 wires them.
  const { data: trending } = useAsync(() => agApi.catalog.trending(), []);
  const { data: categories } = useAsync(() => agApi.catalog.categories('food'), []);
  const { data: search, loading: searching } = useAsync(
    () => (query ? agApi.catalog.search(q, cityName) : Promise.resolve({ stores: [], items: [] as never[] })),
    [query, cityName],
  );

  const cravings = categories ?? [];
  const results: Store[] = search?.stores ?? [];

  // ag3 Store.id is a restaurant slug; the existing /restaurant/[id] route
  // resolves by UUID. Resolve slug→uuid (mirroring agApi.storeKey) before
  // pushing so the existing menu/cart/Stripe screen loads correctly.
  const openStore = useCallback(
    async (store: Store) => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let id = store.id;
      if (!UUID_RE.test(id)) {
        try {
          const { data } = await supabase
            .from('restaurants')
            .select('id')
            .eq('slug', store.id)
            .maybeSingle();
          if (data?.id) id = data.id as string;
        } catch {
          /* fall back to the slug; the route will show its empty-menu state */
        }
      }
      router.push({ pathname: '/restaurant/[id]', params: { id } });
    },
    [router],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      {/* warm sunset wash behind the header (the 3.0 canopy) */}
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
        {/* ── header: title + search pill + filter ── */}
        <Rise style={[styles.pad, { marginTop: 8 }]}>
          <Text style={[styles.disp, { fontSize: 27, color: t.colors.fg, marginBottom: 14 }]}>Search</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View
              style={[
                styles.searchField,
                { backgroundColor: t.colors.surface, borderColor: t.colors.line },
                t.shadows.card,
              ]}
            >
              <ISearch size={20} color={t.colors.primary} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search food, groceries, pharmacy"
                placeholderTextColor={t.colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.searchInput, { color: t.colors.fg }]}
                accessibilityLabel="Search food, groceries, pharmacy"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQ('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <View style={[styles.clearBtn, { backgroundColor: t.colors.surface2 }]}>
                    <IClose size={13} color={t.colors.fg} />
                  </View>
                </Pressable>
              )}
            </View>
            <FilterButton />
          </View>
        </Rise>

        {/* ── empty-query state: trending + browse by craving ── */}
        {!query && (
          <>
            {/* trending chips */}
            <Rise delay={60} style={[styles.pad, { marginTop: 22 }]}>
              <View style={styles.eyebrowRow}>
                <IFire size={13} color={t.colors.primary} />
                <Text style={[styles.eyebrow, { color: t.colors.primary }]}>
                  Trending{cityName ? ` in ${cityName}` : ''}
                </Text>
              </View>
              <View style={styles.chipWrap}>
                {(trending ?? []).map((term) => (
                  <Press key={term} onPress={() => setQ(term)} scaleTo={0.95}>
                    <View style={[styles.trendChip, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: t.colors.fgSoft }}>{term}</Text>
                    </View>
                  </Press>
                ))}
              </View>
            </Rise>

            {/* browse by craving — 2-col emoji-in-gradient tiles */}
            <Rise delay={120} style={[styles.pad, { marginTop: 24 }]}>
              <Text style={[styles.disp, { fontSize: 18, color: t.colors.fg, marginBottom: 12 }]}>
                Browse by craving
              </Text>
              <View style={styles.cravingGrid}>
                {cravings.map((c, i) => {
                  const tile = CRAVING_TILES[i % CRAVING_TILES.length];
                  const colors = t.tileGradients[tile];
                  return (
                    <Press
                      key={c.id}
                      onPress={() => setQ(c.label)}
                      scaleTo={0.97}
                      style={styles.cravingCell}
                    >
                      <View style={[styles.cravingTile, t.shadows.card]}>
                        <LinearGradient
                          colors={colors}
                          start={t.gradients.start}
                          end={t.gradients.end}
                          style={StyleSheet.absoluteFill}
                        />
                        {/* top-right sheen highlight */}
                        <View pointerEvents="none" style={styles.cravingSheen} />
                        {/* oversized rotated craving emoji bleeding off the corner */}
                        <Text pointerEvents="none" style={styles.cravingEmoji}>
                          {c.emoji}
                        </Text>
                        <Text style={styles.cravingLabel}>{c.label}</Text>
                      </View>
                    </Press>
                  );
                })}
              </View>
            </Rise>
          </>
        )}

        {/* ── results state ── */}
        {!!query && (
          <View style={[styles.pad, { marginTop: 18, gap: 12 }]}>
            <Text style={[styles.mono, { color: t.colors.muted }]}>
              {results.length} {results.length === 1 ? 'result' : 'results'} for “{query}”
            </Text>

            {searching && results.length === 0 ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <ActivityIndicator color={t.colors.primary} />
              </View>
            ) : results.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: t.colors.surface, borderColor: t.colors.line2 },
                  t.shadows.card,
                ]}
              >
                <ISearch size={18} color={t.colors.muted} />
                <Text style={{ marginTop: 8, fontWeight: '800', fontSize: 14.5, color: t.colors.fg }}>
                  No matches
                </Text>
                <Text style={{ marginTop: 3, fontSize: 12.5, color: t.colors.fgSoft, textAlign: 'center', lineHeight: 17 }}>
                  Nothing matches “{query}”{cityName ? ` in ${cityName}` : ''}. Try another dish, place, or cuisine.
                </Text>
              </View>
            ) : (
              results.map((r, i) => (
                <MotiView
                  key={r.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 280, delay: Math.min(i * 40, 360) }}
                >
                  <RestoRow r={r} onPress={() => void openStore(r)} />
                </MotiView>
              ))
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
  mono: { fontSize: 12, fontVariant: ['tabular-nums'] },

  // search pill
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },
  clearBtn: { width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  // trending
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 11 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  trendChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },

  // browse by craving grid
  cravingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cravingCell: { width: '47.5%', flexGrow: 1 },
  cravingTile: {
    height: 84,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 13,
  },
  cravingSheen: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 120,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  cravingEmoji: {
    position: 'absolute',
    right: -2,
    bottom: -10,
    fontSize: 50,
    lineHeight: 58,
    opacity: 0.9,
    transform: [{ rotate: '-10deg' }],
  },
  cravingLabel: {
    position: 'relative',
    zIndex: 2,
    fontWeight: '800',
    color: '#fff',
    fontSize: 16,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.34)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  // results empty card
  emptyCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
});

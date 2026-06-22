// AtlaasGo 3.0 — Home (immersive sunset canopy), native re-skin.
//
// LOOK: faithful RN reproduction of /tmp/.../app2/screen-home2.jsx — warm
// terracotta + amber on cream/ink, sunset-gradient canopy, glass deliver-to
// pill → city picker, weather strip, vertical switcher (gradient tiles),
// circular cuisine tokens, hero promo, campus group-order nudge, Fast-near-you
// rail, and the All-restaurants list. Built with moti / expo-linear-gradient /
// lucide via the ag3 foundation primitives + theme.
//
// DATA: ported from src/app3/screens/Home.tsx — agApi.me.get (greeting),
// agApi.cities.* (deliver-to + weather gating), agApi.catalog.verticals /
// .categories('food') / .stores({ vertical, city }). All money is integer dirham.
//
// PRESERVED native plumbing from the old index.tsx:
//   - expo-router navigation to /restaurant/[id], /orders, /account|/sign-in.
//     The restaurant route + useMenu key on the restaurant UUID, NOT the slug,
//     so we resolve slug→UUID before pushing (ag3 Store.id is a slug).
//   - pull-to-refresh + 15s focus polling (RefreshControl + useFocusEffect) so
//     new/updated restaurants surface even when the realtime socket is asleep.
//   - useAuth() drives the avatar's signed-in vs sign-in destination.
//
// NOTE: app/_layout.tsx does not mount CityProvider/Ag3CartProvider, so we read
// agApi.cities.* directly and persist the chosen city to AsyncStorage 'ag3-city'
// inline (same key/logic as lib/ag3/CityContext) instead of useCity().

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { agApi, type City, type Store, type VerticalId } from '../../lib/ag3/agApi';
import { useAsync } from '../../lib/ag3/useAsync';
import { useAg3Theme, gradients } from '../../components/ag3/theme';
import {
  Press,
  PhotoTile,
  RestoCard,
  RestoRow,
  WeatherStrip,
  BottomSheet,
  foodEm,
  tileFor,
} from '../../components/ag3/primitives';
import {
  IPin,
  IChevD,
  ISearch,
  IBolt,
  IGroup,
  IBell,
  ISlider,
  ICheck,
} from '../../components/ag3/icons';

const CITY_STORAGE_KEY = 'ag3-city';

// The three vertical tiles must divide the row evenly. Press applies its style to
// an inner MotiView (not the Pressable), so flex:1 there never sizes the
// touchable — the tiles size to content, overflow, and clip Pharmacy off the
// right edge (untappable on a real phone). An explicit width keeps all three on
// screen. Width = screen − (18×2 padding) − (11×2 gaps), divided by 3.
const VERT_W = (Dimensions.get('window').width - 58) / 3;

/* verticals carry no tile class — map one gradient tile per vertical id */
const VERTICAL_TILE: Record<string, ReturnType<typeof tileFor>> = {
  food: 'tile-b',
  grocery: 'tile-d',
  pharmacy: 'tile-f',
};

/* ── selected-city state (inline CityContext — no provider mounted) ────────── */
function useSelectedCity() {
  const { data: cities } = useAsync(() => agApi.cities.list(), []);
  const [cityId, setCityId] = useState<string | null>(null);
  const list = cities ?? [];

  // Rehydrate persisted choice once.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CITY_STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && stored) setCityId((prev) => prev ?? stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Reconcile against the loaded list (default ifrane → first).
  useEffect(() => {
    if (list.length === 0) return;
    setCityId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev;
      return (list.find((c) => c.served) ?? list.find((c) => c.id === 'ifrane') ?? list[0])?.id ?? null;
    });
  }, [list]);

  const city = useMemo(() => list.find((c) => c.id === cityId) ?? null, [list, cityId]);

  const setCity = useCallback((c: City) => {
    setCityId(c.id);
    void AsyncStorage.setItem(CITY_STORAGE_KEY, c.id).catch(() => {});
  }, []);

  return { city, cities: list, setCity };
}

export default function Home() {
  const router = useRouter();
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const { user } = useAuth();
  const { city, cities, setCity } = useSelectedCity();

  const [vert, setVert] = useState<VerticalId>('food');
  const [cat, setCat] = useState('all');
  const [pickCity, setPickCity] = useState(false);

  // Greeting + taxonomy (ported from src/app3 Home).
  const { data: me } = useAsync(() => agApi.me.get(), [user?.id]);
  const { data: verticals } = useAsync(() => agApi.catalog.verticals(), []);
  const { data: foodCats } = useAsync(() => agApi.catalog.categories('food', city?.name), [city?.id]);

  const cityName = city?.name ?? '';
  // Bump a nonce on pull-to-refresh / focus poll so stores re-fetch.
  const [nonce, setNonce] = useState(0);
  const {
    data: stores,
    loading: storesLoading,
    error: storesError,
  } = useAsync(
    () => (city ? agApi.catalog.stores({ vertical: vert, city: cityName }) : Promise.resolve([] as Store[])),
    [vert, cityName, nonce],
  );

  // slug → restaurant UUID map: the restaurant route + useMenu key on the UUID
  // `id` column, but ag3 Store.id is the slug. Resolve before navigating so the
  // existing restaurant screen keeps working unchanged.
  const { data: slugMap } = useAsync(async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('status', 'live');
    const m: Record<string, string> = {};
    for (const r of (data ?? []) as { id: string; slug: string }[]) m[r.slug] = r.id;
    return m;
  }, []);

  const openStore = useCallback(
    (s: Store) => {
      const uuid = slugMap?.[s.id] ?? s.id;
      router.push({ pathname: '/restaurant/[id]', params: { id: uuid } });
    },
    [router, slugMap],
  );

  // Pull-to-refresh.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNonce((n) => n + 1);
    // brief settle so the spinner doesn't flash off before the query resolves
    await new Promise((r) => setTimeout(r, 450));
    setRefreshing(false);
  }, []);

  // Re-fetch every 15s while focused (realtime fallback, ported from old Home).
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setNonce((n) => n + 1), 15_000);
      return () => clearInterval(id);
    }, []),
  );

  const greetingName = me?.name?.split(' ')[0] || tr('home.greetingFallback');
  const initials = me?.initials || (user ? 'A' : 'S');

  const vObj = (verticals ?? []).find((v) => v.id === vert);
  // agApi categories omit the "All" chip — prepend it (prototype parity).
  const categories = [{ id: 'all', label: tr('home.catAll'), emoji: '✦' }, ...(foodCats ?? [])];

  const inVert = stores ?? [];
  const list = vert === 'food' ? inVert.filter((r) => cat === 'all' || r.cuisineIds.includes(cat)) : inVert;
  const hero = inVert[0];
  const fast = inVert.filter((r) => r.etaMinutes[0] <= 22);

  const listTitle =
    vert !== 'food'
      ? (vObj ? tr(`home.vert_${vObj.id}`) : '')
      : cat === 'all'
        ? tr('home.allRestaurants')
        : categories.find((c) => c.id === cat)?.label ?? '';
  const countNoun = vert === 'food' ? tr('home.countOpen') : list.length === 1 ? tr('home.countStore') : tr('home.countStores');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
          />
        }
      >
        {/* ══ Canopy ══ */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 440 }}
          style={styles.canopy}
        >
          {/* faint warm wash top-right */}
          <View pointerEvents="none" style={styles.canopyWash}>
            <LinearGradient
              colors={['rgba(255,87,34,0.16)', 'rgba(255,87,34,0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* top row */}
          <View style={styles.canopyTop}>
            <Press onPress={() => setPickCity(true)} scaleTo={0.97} style={styles.deliverTo}>
              <LinearGradient
                colors={gradients.sunset}
                start={gradients.start}
                end={gradients.end}
                style={[styles.pinTile, t.shadows.glow]}
              >
                <IPin size={20} color={t.colors.onPrimary} />
              </LinearGradient>
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text style={[styles.eyebrow, { color: t.colors.primary }]} numberOfLines={1}>
                  {tr('home.deliverTo')} · {city?.name ?? '…'}
                </Text>
                <View style={styles.deliverAddr}>
                  <Text style={[styles.disp, { fontSize: 15.5, color: t.colors.fg }]} numberOfLines={1}>
                    {city?.defaultAddress ?? tr('home.pickCity')}
                  </Text>
                  <IChevD size={16} color={t.colors.fg} />
                </View>
              </View>
            </Press>

            <Press
              onPress={() => router.push('/notifications')}
              scaleTo={0.9}
              style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}
            >
              <IBell size={20} color={t.colors.fg} />
              <View style={[styles.bellDot, { backgroundColor: t.colors.primary, borderColor: t.colors.surface }]} />
            </Press>

            <Press
              onPress={() => router.push(user ? '/account' : '/sign-in')}
              scaleTo={0.9}
              style={[styles.avatar, t.shadows.glow]}
            >
              <LinearGradient
                colors={gradients.sunset}
                start={gradients.start}
                end={gradients.end}
                style={[StyleSheet.absoluteFill, styles.avatarInner]}
              >
                <Text style={styles.avatarTxt}>{initials}</Text>
              </LinearGradient>
            </Press>
          </View>

          {/* greeting */}
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{tr('home.goodAfternoon')}</Text>
            <Text style={[styles.disp, { fontSize: 27, color: t.colors.fg, marginTop: 3, lineHeight: 30 }]}>
              {tr('home.hi', { name: greetingName })} 👋
            </Text>
          </View>

          {/* search → /search */}
          <Press
            onPress={() => router.push('/search')}
            scaleTo={0.985}
            style={[styles.searchBar, { backgroundColor: t.colors.surface, borderColor: t.colors.line }, t.shadows.card]}
          >
            <ISearch size={20} color={t.colors.primary} />
            <Text style={{ flex: 1, fontSize: 14.5, color: t.colors.muted }} numberOfLines={1}>
              {tr('home.searchPlaceholder')}
            </Text>
            <View style={[styles.searchSlider, { backgroundColor: t.colors.surface2 }]}>
              <ISlider size={17} color={t.colors.fgSoft} />
            </View>
          </Press>
        </MotiView>

        {/* ══ Weather strip (only when city.weather) ══ */}
        {city?.weather ? <WeatherStripFor cityId={city.id} cityName={city.name} /> : null}

        {/* ══ Vertical switcher ══ */}
        <View style={[styles.pad, { marginTop: 22 }]}>
          <Text style={[styles.disp, { fontSize: 18, color: t.colors.fg }]}>{tr('home.whatDoYouNeed')}</Text>
        </View>
        <View style={[styles.pad, styles.vertGrid]}>
          {(verticals ?? []).map((v) => {
            const on = vert === v.id;
            return (
              <Press
                key={v.id}
                onPress={() => {
                  setVert(v.id);
                  setCat('all');
                }}
                scaleTo={0.97}
                style={{ width: VERT_W }}
              >
                <View
                  style={[
                    styles.vertCard,
                    {
                      borderColor: on ? t.colors.primary : t.colors.line2,
                      borderWidth: on ? 1.5 : 1,
                    },
                    on ? t.shadows.glow : t.shadows.card,
                  ]}
                >
                  <PhotoTile tile={VERTICAL_TILE[v.id] ?? 'tile-b'} radius={0} style={styles.vertTile}>
                    <Text style={styles.vertEmoji}>{v.emoji}</Text>
                  </PhotoTile>
                  <View style={[styles.vertBody, { backgroundColor: on ? undefined : t.colors.surface }]}>
                    {on ? (
                      <LinearGradient
                        colors={gradients.soft}
                        start={gradients.start}
                        end={gradients.end}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <Text style={[styles.disp, { fontSize: 13.5, color: on ? t.colors.primary : t.colors.fg }]}>
                      {tr(`home.vert_${v.id}`)}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: t.colors.muted }} numberOfLines={1}>
                      {tr(`home.vertBlurb_${v.id}`)}
                    </Text>
                  </View>
                </View>
              </Press>
            );
          })}
        </View>

        {/* ══ Cuisine tokens — food only ══ */}
        {vert === 'food' && (
          <>
            <View style={[styles.pad, { marginTop: 22, marginBottom: 12 }]}>
              <Text style={[styles.disp, { fontSize: 18, color: t.colors.fg }]}>{tr('home.whatCraving')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catsRow}
            >
              {categories.map((c) => {
                const on = cat === c.id;
                return (
                  <Press key={c.id} onPress={() => setCat(c.id)} scaleTo={0.93} style={styles.cat}>
                    <View style={styles.catTokenWrap}>
                      {on ? (
                        <LinearGradient
                          colors={gradients.sunset}
                          start={gradients.start}
                          end={gradients.end}
                          style={[StyleSheet.absoluteFill, styles.catTokenInner, t.shadows.glow]}
                        >
                          <Text style={styles.catEmoji}>{c.emoji}</Text>
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            styles.catTokenInner,
                            { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line },
                          ]}
                        >
                          <Text style={styles.catEmoji}>{c.emoji}</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 11.5, fontWeight: on ? '700' : '600', color: on ? t.colors.primary : t.colors.fgSoft }}
                    >
                      {c.label}
                    </Text>
                  </Press>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ══ Hero promo banner — food only ══ */}
        {vert === 'food' && hero && (
          <View style={[styles.pad, { marginTop: 20 }]}>
            <Press onPress={() => openStore(hero)} scaleTo={0.985} style={{ width: '100%' }}>
              <View style={[styles.heroCard, t.shadows.card]}>
                <PhotoTile
                  tile={VERTICAL_TILE.food}
                  em={hero.emoji || foodEm(hero.id)}
                  float
                  radius={0}
                  style={styles.heroTile}
                >
                  {hero.promo ? (
                    <View style={styles.heroBadge}>
                      <IBolt size={13} color="#fff" fill="#fff" strokeWidth={0} />
                      <Text style={styles.heroBadgeTxt}>{hero.promo}</Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  <View style={{ position: 'relative', zIndex: 2 }}>
                    <Text style={styles.heroEyebrow}>{tr('home.localLegend')}</Text>
                    <Text style={styles.heroName} numberOfLines={2}>
                      {hero.name}
                    </Text>
                    {hero.blurb ? (
                      <Text style={styles.heroBlurb} numberOfLines={2}>
                        {hero.blurb}
                      </Text>
                    ) : null}
                  </View>
                </PhotoTile>
              </View>
            </Press>
          </View>
        )}

        {/* ══ Group-order nudge — campus + food only ══ */}
        {city?.campus && vert === 'food' && (
          <View style={[styles.pad, { marginTop: 14 }]}>
            <Press scaleTo={0.985} style={{ width: '100%' }}>
              <View style={[styles.groupCard, { borderColor: 'rgba(255,87,34,0.16)' }]}>
                <LinearGradient
                  colors={gradients.soft}
                  start={gradients.start}
                  end={gradients.end}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.groupIcon, { backgroundColor: t.colors.surface }, t.shadows.card]}>
                  <IGroup size={22} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.disp, { fontSize: 14.5, color: t.colors.fg }]}>{tr('home.groupTitle')}</Text>
                  <Text style={{ fontSize: 12, color: t.colors.fgSoft }}>{tr('home.groupBody')}</Text>
                </View>
                <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>{tr('home.invite')} ›</Text>
              </View>
            </Press>
          </View>
        )}

        {/* ══ Fast near you rail — food only ══ */}
        {vert === 'food' && fast.length > 0 && (
          <>
            <View style={[styles.pad, styles.railHead]}>
              <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg }]}>{tr('home.fastNearYou')}</Text>
              <Text style={{ fontSize: 12, color: t.colors.muted, fontVariant: ['tabular-nums'] }}>{tr('home.under25')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {fast.map((r) => (
                <RestoCard key={r.id} r={r} onPress={() => openStore(r)} />
              ))}
            </ScrollView>
          </>
        )}

        {/* ══ All restaurants / stores ══ */}
        <View style={[styles.pad, styles.railHead, { marginTop: 22 }]}>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg }]}>{listTitle}</Text>
          <Text style={{ fontSize: 12.5, color: t.colors.muted, fontVariant: ['tabular-nums'] }}>
            {list.length} {countNoun}
          </Text>
        </View>

        {storesLoading && inVert.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
            <Text style={{ marginTop: 12, fontSize: 13, color: t.colors.muted }}>{tr('home.loading', { place: cityName || tr('home.nearby') })}</Text>
          </View>
        ) : storesError ? (
          <View style={[styles.pad, { marginTop: 12 }]}>
            <View style={[styles.emptyCard, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>{tr('home.errorTitle')}</Text>
              <Text style={{ marginTop: 4, fontSize: 12.5, color: t.colors.muted, textAlign: 'center' }}>
                {storesError.message}
              </Text>
            </View>
          </View>
        ) : list.length === 0 ? (
          <View style={[styles.pad, { marginTop: 12 }]}>
            <View style={[styles.emptyCard, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }]}>
              <ISearch size={20} color={t.colors.muted} />
              <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '700', color: t.colors.fg }}>
                {tr('home.emptyTitle')}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12.5, color: t.colors.muted, textAlign: 'center', lineHeight: 17 }}>
                {vert === 'food'
                  ? tr('home.emptyFood', {
                      what: cat === 'all' ? tr('home.restaurantsLower') : (listTitle || tr('home.placesLower')).toLowerCase(),
                      city: cityName || tr('home.thisCity'),
                    })
                  : tr('home.emptyStore', {
                      what: vObj ? tr(`home.vert_${vObj.id}`) : tr('home.stores'),
                      city: cityName || tr('home.thisCity'),
                    })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.pad, { marginTop: 12, gap: 12 }]}>
            {list.map((r, i) => (
              <MotiView
                key={r.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 280, delay: Math.min(i * 35, 350) }}
              >
                <RestoRow r={r} onPress={() => openStore(r)} />
              </MotiView>
            ))}
          </View>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ══ City picker sheet ══ */}
      <BottomSheet visible={pickCity} onClose={() => setPickCity(false)} title={tr('home.deliverTo')}>
        <View style={{ gap: 10 }}>
          {[...cities]
            .sort((a, b) => Number(b.served) - Number(a.served))
            .map((c) => {
            const on = c.id === city?.id;
            // Only cities we actually deliver in are selectable; the rest show a
            // "Soon" chip so nobody taps into an empty catalog.
            const disabled = !c.served;
            return (
              <Pressable
                key={c.id}
                disabled={disabled}
                onPress={() => {
                  setCity(c);
                  setPickCity(false);
                }}
                style={[
                  styles.cityRow,
                  {
                    backgroundColor: on ? 'rgba(255,87,34,0.08)' : t.colors.surface2,
                    borderColor: on ? t.colors.primary : t.colors.line,
                    opacity: disabled ? 0.55 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.cityPin,
                    { backgroundColor: on ? t.colors.primary : t.colors.surface, borderColor: t.colors.line },
                  ]}
                >
                  <IPin size={17} color={on ? t.colors.onPrimary : t.colors.fgSoft} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.disp, { fontSize: 15.5, color: t.colors.fg }]}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
                    {disabled ? tr('home.comingSoon') : c.defaultAddress}
                    {!disabled && c.campus ? ` · ${tr('home.campus')}` : ''}
                  </Text>
                </View>
                {disabled ? (
                  <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.3, color: t.colors.muted }}>{tr('home.soon')}</Text>
                  </View>
                ) : on ? (
                  <ICheck size={20} color={t.colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
          {cities.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

/* WeatherStrip wired to agApi.cities.weather (null when city.weather === false). */
function WeatherStripFor({ cityId, cityName }: { cityId: string; cityName: string }) {
  const { t: tr } = useTranslation();
  const { data: w } = useAsync(() => agApi.cities.weather(cityId), [cityId]);
  // Advisory-only: show the snow-styled strip just when weather actually slows
  // delivery (eta bump > 0). On clear/normal days a live "Partly cloudy" writes
  // eta 0, so the strip stays hidden instead of showing a snowflake in summer.
  if (!w || w.etaAddMinutes <= 0) return null;
  return (
    <View style={[styles.pad, { marginTop: 16 }]}>
      <WeatherStrip
        condition={`${w.condition} · ${tr('home.inCity', { city: cityName })}`}
        tempC={w.tempC}
        etaAddMinutes={w.etaAddMinutes}
        note={w.note}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 18 },
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  eyebrow: { fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },

  // canopy
  canopy: { position: 'relative', paddingHorizontal: 18, paddingTop: 6 },
  canopyWash: { position: 'absolute', top: -28, right: -26, width: 170, height: 170, borderRadius: 999, overflow: 'hidden' },
  canopyTop: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 11 },
  deliverTo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pinTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  deliverAddr: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 999, borderWidth: 2 },
  avatar: { width: 44, height: 44, borderRadius: 999, overflow: 'hidden' },
  avatarInner: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 16,
    marginTop: 15,
    borderWidth: 1,
  },
  searchSlider: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // vertical switcher
  vertGrid: { flexDirection: 'row', gap: 11, marginTop: 11 },
  vertCard: { borderRadius: 20, overflow: 'hidden' },
  vertTile: { height: 64, justifyContent: 'flex-end', padding: 9 },
  vertEmoji: {
    position: 'absolute',
    right: -4,
    bottom: -8,
    fontSize: 42,
    opacity: 0.92,
    transform: [{ rotate: '-10deg' }],
  },
  vertBody: { paddingVertical: 8, paddingHorizontal: 10, position: 'relative', overflow: 'hidden' },

  // cuisine tokens
  catsRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingBottom: 6 },
  cat: { width: 62, alignItems: 'center', gap: 7 },
  catTokenWrap: { width: 60, height: 60, borderRadius: 22, overflow: 'hidden' },
  catTokenInner: { alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 27 },

  // hero — design sets the ag2-card to border:none (photo bleeds edge-to-edge)
  heroCard: { borderRadius: 26, overflow: 'hidden' },
  heroTile: { height: 178, padding: 16, justifyContent: 'space-between', alignItems: 'flex-start' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,20,16,0.40)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 2,
  },
  heroBadgeTxt: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  heroEyebrow: { fontSize: 10, letterSpacing: 1.8, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  heroName: {
    fontWeight: '800',
    letterSpacing: -0.5,
    fontSize: 25,
    lineHeight: 27,
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.34)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  heroBlurb: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.94)',
    marginTop: 4,
    maxWidth: 270,
    textShadowColor: 'rgba(0,0,0,0.34)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  // group order
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  // rails / lists
  railHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  rail: { gap: 14, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  emptyCard: { borderRadius: 26, borderWidth: 1, padding: 22, alignItems: 'center' } as ViewStyle,

  // city sheet
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  cityPin: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

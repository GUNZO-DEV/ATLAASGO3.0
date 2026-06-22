// AtlaasGo 3.0 — Restaurant menu screen (native re-skin).
//
// Faithful native reproduction of the 3.0 prototype (screen-restaurant2.jsx):
//   floating emoji hero · overlapping info card · sticky cuisine tabs · menu
//   rows with 96px tiles · item BottomSheet (meta + Make-it-yours + qty stepper)
//   · favourite heart · sticky View-cart bar.
//
// Data is wired through the ag3 foundation (agApi.catalog.store / .menu via
// useAsync, agApi.me.setFavourite). Native plumbing is PRESERVED:
//   - route param `id` (useLocalSearchParams). Callers (Home, Favorites, Search)
//     push a real restaurant UUID; agApi resolves UUID-or-slug via storeKey().
//   - the existing zustand lib/cart store is the SINGLE source of truth for the
//     cart, exactly as the re-skinned app/cart.tsx + app/index.tsx expect (they
//     read lib/cart, not the ag3 cart). Adding here drives the working
//     /cart → Stripe checkout / wallet / order-create flow untouched. The
//     View-cart bar reads that store. We follow the sibling screens' pattern of
//     NOT mounting Ag3CartProvider/CityProvider (not mounted in _layout.tsx).
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { agApi, type MenuItem, type MenuSection, type Store } from '../../lib/ag3/agApi';
import { useAsync } from '../../lib/ag3/useAsync';
import { useAg3Theme, gradients } from '../../components/ag3/theme';
import {
  BottomSheet,
  Press,
  PhotoTile,
  Price,
  foodEm,
  tileFor,
  etaLabel,
  feeLabel,
} from '../../components/ag3/primitives';
import {
  IBack,
  IHeart,
  IStar,
  IClock,
  IPin,
  IPlus,
  ITruck,
  ICheck,
  IClose,
  IBag,
} from '../../components/ag3/icons';
import { useCart } from '../../lib/cart';

/* ── item sheet — kcal/rx/packSize meta + qty stepper + Add ─────────────────── */
function ItemSheet({
  item,
  store,
  visible,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  store: Store;
  visible: boolean;
  onClose: () => void;
  onAdd: (it: MenuItem, qty: number, optionIds: string[]) => void;
}) {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const [qty, setQty] = useState(1);
  const [opts, setOpts] = useState<Record<string, boolean>>({});

  // Reset the stepper/options whenever a new item opens.
  const lastId = useRef<string | null>(null);
  if (item && item.id !== lastId.current) {
    lastId.current = item.id;
    if (qty !== 1) setQty(1);
    if (Object.keys(opts).length) setOpts({});
  }

  if (!item) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const extras = item.options ?? [];
  const hasOptions = extras.length > 0;
  const extra = extras.reduce((s, e) => s + (opts[e.id] ? e.priceDh : 0), 0);
  const total = (item.priceDh + extra) * qty;
  const meta = item.kcal ? tr('restaurant.kcalMeta', { kcal: item.kcal }) : item.packSize ?? '';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={undefined} height="90%">
      {/* hero tile inside the sheet */}
      <View style={{ marginHorizontal: -18, marginTop: -10 }}>
        <PhotoTile tile={tileFor(item.id)} em={foodEm(item.id)} float radius={0} style={{ height: 178 }}>
          <Pressable onPress={onClose} hitSlop={8} style={[styles.sheetIconBtn, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
            <IClose size={19} color="#1A1410" />
          </Pressable>
        </PhotoTile>
      </View>

      <View style={{ paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <Text style={[styles.disp, { fontSize: 22, color: t.colors.fg, flex: 1 }]}>{item.name}</Text>
          <Price v={item.priceDh} big />
        </View>
        {item.description ? (
          <Text style={{ color: t.colors.fgSoft, fontSize: 14, lineHeight: 21, marginTop: 8 }}>{item.description}</Text>
        ) : null}
        {meta ? (
          <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>{meta}</Text>
        ) : null}

        {hasOptions ? (
          <>
            <Text style={[styles.eyebrow, { color: t.colors.primary, marginTop: 20, marginBottom: 10 }]}>{tr('restaurant.makeItYours')}</Text>
            <View style={{ gap: 8 }}>
              {extras.map((e) => {
                const on = !!opts[e.id];
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setOpts((o) => ({ ...o, [e.id]: !o[e.id] }))}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 13,
                      borderRadius: t.radii.md,
                      borderWidth: 1.5,
                      borderColor: on ? t.colors.primary : t.colors.line,
                      backgroundColor: on ? 'rgba(255,87,34,0.10)' : t.colors.surface,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: on ? t.colors.primary : t.colors.line,
                        backgroundColor: on ? t.colors.primary : 'transparent',
                      }}
                    >
                      {on ? <ICheck size={15} color="#fff" strokeWidth={3} /> : null}
                    </View>
                    <Text style={{ flex: 1, fontWeight: '600', fontSize: 14, color: t.colors.fg }}>{e.label}</Text>
                    <Text style={{ fontSize: 12.5, color: t.colors.muted, fontVariant: ['tabular-nums'] }}>
                      {e.priceDh ? tr('restaurant.optionPrice', { price: e.priceDh }) : tr('restaurant.free')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : item.rx || store.vertical === 'pharmacy' ? (
          <View style={[styles.noteCard, { backgroundColor: 'rgba(62,134,199,0.09)', borderColor: 'rgba(62,134,199,0.2)' }]}>
            <ICheck size={18} color={t.colors.snow} strokeWidth={2.5} />
            <Text style={{ flex: 1, fontSize: 12.5, color: t.colors.fgSoft, lineHeight: 18 }}>
              {tr('restaurant.pharmacyNote')}
            </Text>
          </View>
        ) : (
          <View style={[styles.noteCard, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <ICheck size={18} color={t.colors.ok} strokeWidth={2.5} />
            <Text style={{ flex: 1, fontSize: 12.5, color: t.colors.fgSoft, lineHeight: 18 }}>
              {tr('restaurant.stockNote')}
            </Text>
          </View>
        )}
      </View>

      {/* sticky add bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <View style={[styles.step, { borderColor: t.colors.line, backgroundColor: t.colors.surface }]}>
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={6} style={styles.stepBtn}>
            <Text style={[styles.stepGlyph, { color: t.colors.fg }]}>–</Text>
          </Pressable>
          <Text style={[styles.stepN, { color: t.colors.fg }]}>{qty}</Text>
          <Pressable onPress={() => setQty((q) => q + 1)} hitSlop={6} style={styles.stepBtn}>
            <Text style={[styles.stepGlyph, { color: t.colors.fg }]}>+</Text>
          </Pressable>
        </View>
        <Press
          onPress={() => onAdd(item, qty, extras.filter((e) => opts[e.id]).map((e) => e.id))}
          style={{ flex: 1 }}
          scaleTo={0.97}
        >
          <LinearGradient
            colors={gradients.sunset}
            start={gradients.start}
            end={gradients.end}
            style={[styles.addBtn, t.shadows.glow]}
          >
            <Text style={styles.addBtnTxt}>
              {tr('restaurant.add')} · <Text style={{ fontVariant: ['tabular-nums'], fontWeight: '800' }}>{tr('restaurant.priceDh', { price: total })}</Text>
            </Text>
          </LinearGradient>
        </Press>
      </View>
    </BottomSheet>
  );
}

/* ── single menu row — text left, 96px tile + plus badge right ──────────────── */
function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const t = useAg3Theme();
  return (
    <Press onPress={onPress} style={{ width: '100%' }} scaleTo={0.985}>
      <View style={{ flexDirection: 'row', gap: 13, paddingVertical: 14, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.disp, { fontWeight: '800', fontSize: 15.5, color: t.colors.fg }]}>{item.name}</Text>
            {item.tag ? (
              <View style={[styles.softBadge, { backgroundColor: 'rgba(255,87,34,0.12)' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: t.colors.primary }}>{item.tag}</Text>
              </View>
            ) : null}
          </View>
          {item.description ? (
            <Text style={{ fontSize: 13, color: t.colors.muted, lineHeight: 19, marginTop: 5, marginBottom: 8, maxWidth: 230 }} numberOfLines={3}>
              {item.description}
            </Text>
          ) : (
            <View style={{ height: 8 }} />
          )}
          <Price v={item.priceDh} />
        </View>
        <View style={{ position: 'relative' }}>
          <PhotoTile tile={tileFor(item.id)} em={foodEm(item.id)} radius={18} style={{ width: 96, height: 96 }} />
          <View style={[styles.plusBadge, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
            <IPlus size={20} color={t.colors.primary} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </Press>
  );
}

/* ── screen ─────────────────────────────────────────────────────────────────── */
export default function RestaurantScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = rawId ?? '';

  const { data: store, loading } = useAsync(() => agApi.catalog.store(id), [id]);
  const { data: menu } = useAsync(() => agApi.catalog.menu(id), [id]);
  const sections: MenuSection[] = useMemo(() => menu ?? [], [menu]);

  // PRESERVED native plumbing: the existing zustand cart drives the combined
  // /checkout → Stripe / wallet / order-create. It is the single source of truth
  // for the View-cart bar count/total (the combined checkout reads the same store).
  const legacyCart = useCart();
  const cartCount = legacyCart.count();
  const cartTotal = legacyCart.subtotal();

  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fav, setFav] = useState(false);
  const favSeeded = useRef(false);
  const [activeSec, setActiveSec] = useState(0);

  // seed favourite from the live store once it loads
  if (store && !favSeeded.current) {
    favSeeded.current = true;
    if (store.isFavourite !== fav) setFav(store.isFavourite);
  }

  const scrollRef = useRef<ScrollView>(null);
  const secOffsets = useRef<number[]>([]);

  function jumpTo(i: number) {
    setActiveSec(i);
    const y = secOffsets.current[i];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y + 60;
    let idx = 0;
    for (let i = 0; i < secOffsets.current.length; i++) {
      if (secOffsets.current[i] != null && secOffsets.current[i] <= y) idx = i;
    }
    if (idx !== activeSec) setActiveSec(idx);
  }

  function toggleFav() {
    if (!store) return;
    const next = !fav;
    setFav(next);
    agApi.me.setFavourite(store.id, next).catch(() => setFav(!next));
  }

  function addItem(it: MenuItem, qty: number, optionIds: string[]) {
    if (!store) return;
    const extra = (it.options ?? []).filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.priceDh, 0);
    const unitDh = it.priceDh + extra;
    // PRESERVED: write into the zustand cart that /cart + checkout + order-create
    // read. restaurantId uses the route `id` so a single-store cart keys cleanly.
    legacyCart.add(
      {
        id: it.id,
        restaurantId: id,
        restaurantName: store.name,
        name: it.name,
        desc: it.description || undefined,
        priceDh: unitDh,
      },
      qty,
    );
    setSheetOpen(false);
    setSheetItem(null);
  }

  const em = store?.emoji || foodEm(id);
  const tile = tileFor(store?.id || id);

  /* loading shell */
  if (loading && !store) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={[styles.disp, { fontSize: 19, color: t.colors.fg }]}>{tr('restaurant.unavailableTitle')}</Text>
          <Text style={{ color: t.colors.muted, marginTop: 8, textAlign: 'center' }}>
            {tr('restaurant.unavailableBody')}
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: t.colors.primary, fontWeight: '700' }}>{tr('restaurant.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const metrics = [
    { ic: <IStar size={17} color={t.colors.amber} fill={t.colors.amber} strokeWidth={0} />, top: String(store.rating || '—'), sub: tr('restaurant.reviews', { n: store.reviews }) },
    { ic: <IClock size={17} color={t.colors.primary} />, top: `${etaLabel(store)}m`, sub: tr('restaurant.delivery') },
    { ic: <ITruck size={17} color={t.colors.ok} />, top: feeLabel(store), sub: tr('restaurant.fee') },
    { ic: <IPin size={17} color={t.colors.fgSoft} />, top: store.distanceKm ? `${store.distanceKm} km` : '—', sub: tr('restaurant.away') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: cartCount ? 120 : 32 }}
        stickyHeaderIndices={[1]}
      >
        {/* ── hero + info card (index 0) ──────────────────────────────────── */}
        <View>
          <PhotoTile
            tile={tile}
            em={em}
            float
            radius={0}
            style={{ height: 226 + insets.top, paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', zIndex: 3 }}>
              <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.heroIconBtn, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                <IBack size={20} color="#1A1410" />
              </Pressable>
              <Pressable onPress={toggleFav} hitSlop={8} style={[styles.heroIconBtn, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                <IHeart size={20} color={fav ? t.colors.primary : '#1A1410'} fill={fav ? t.colors.primary : 'transparent'} />
              </Pressable>
            </View>
          </PhotoTile>

          {/* info card overlapping the hero */}
          <View style={{ paddingHorizontal: 18, marginTop: -38, zIndex: 2 }}>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 420 }}
              style={[styles.infoCard, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}
            >
              {store.tags[0] ? <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{store.tags[0]}</Text> : null}
              <Text style={[styles.disp, { fontSize: 25, color: t.colors.fg, marginTop: 6, marginBottom: 10, letterSpacing: -0.6 }]}>
                {store.name}
              </Text>
              {store.blurb ? (
                <Text style={{ color: t.colors.fgSoft, fontSize: 13.5, lineHeight: 20, marginBottom: 15 }}>{store.blurb}</Text>
              ) : null}
              <View style={{ flexDirection: 'row' }}>
                {metrics.map((m, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? StyleSheet.hairlineWidth : 0, borderLeftColor: t.colors.line }}>
                    <View style={{ marginBottom: 4 }}>{m.ic}</View>
                    <Text style={[styles.disp, { fontWeight: '800', fontSize: 15, color: t.colors.fg }]}>{m.top}</Text>
                    <Text style={{ fontSize: 10.5, color: t.colors.muted, marginTop: 1 }}>{m.sub}</Text>
                  </View>
                ))}
              </View>
            </MotiView>
          </View>

          {store.promo ? (
            <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
              <View style={[styles.promoStrip, { backgroundColor: 'rgba(255,87,34,0.12)' }]}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.colors.primary }}>🎁 {tr('restaurant.promoApplied', { promo: store.promo })}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── sticky cuisine tabs (index 1) ───────────────────────────────── */}
        <View style={{ backgroundColor: t.colors.bg, paddingTop: 14, paddingBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18 }}>
            {sections.map((s, i) => {
              const on = activeSec === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => jumpTo(i)}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 9,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: on ? t.colors.fg : t.colors.surface,
                    borderColor: on ? t.colors.fg : t.colors.line,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: on ? t.colors.bg : t.colors.fgSoft }}>{s.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── menu sections (index 2+) ────────────────────────────────────── */}
        {sections.length === 0 ? (
          <Text style={{ paddingHorizontal: 18, paddingVertical: 32, color: t.colors.muted, fontSize: 14 }}>
            {tr('restaurant.noMenu')}
          </Text>
        ) : (
          sections.map((sec, si) => (
            <View
              key={si}
              onLayout={(e) => {
                secOffsets.current[si] = e.nativeEvent.layout.y;
              }}
              style={{ paddingHorizontal: 18, marginTop: si === 0 ? 4 : 18 }}
            >
              <Text style={[styles.disp, { fontSize: 18, color: t.colors.fg }]}>{sec.title}</Text>
              <View style={{ marginTop: 2 }}>
                {sec.items.map((it, ii) => (
                  <View key={it.id}>
                    <MenuRow item={it} onPress={() => { setSheetItem(it); setSheetOpen(true); }} />
                    {ii < sec.items.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.line }} /> : null}
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── sticky View-cart bar (zustand cart = source of truth) ──────────── */}
      {cartCount > 0 ? (
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 240 }}
          style={{ position: 'absolute', left: 18, right: 18, bottom: insets.bottom ? insets.bottom + 8 : 24 }}
        >
          <Press onPress={() => router.push('/checkout')} scaleTo={0.98}>
            <LinearGradient colors={gradients.sunset} start={gradients.start} end={gradients.end} style={[styles.cartBar, t.shadows.glow]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <View style={styles.cartCountPill}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] }}>{cartCount}</Text>
                </View>
                <IBag size={17} color="#fff" />
                <Text style={styles.cartBarTxt}>{tr('restaurant.viewCart')}</Text>
              </View>
              <Text style={[styles.cartBarTxt, { fontVariant: ['tabular-nums'] }]}>{tr('restaurant.priceDh', { price: cartTotal })}</Text>
            </LinearGradient>
          </Press>
        </MotiView>
      ) : null}

      {/* ── item bottom sheet ──────────────────────────────────────────────── */}
      <ItemSheet
        item={sheetItem}
        store={store}
        visible={sheetOpen}
        onClose={() => { setSheetOpen(false); setSheetItem(null); }}
        onAdd={addItem}
      />
    </View>
  );
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },
  heroIconBtn: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sheetIconBtn: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  infoCard: { borderRadius: 26, borderWidth: 1, padding: 18 },
  promoStrip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, alignSelf: 'flex-start' },
  softBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  plusBadge: { position: 'absolute', bottom: -10, right: -8, width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  noteCard: { flexDirection: 'row', gap: 10, marginTop: 18, padding: 13, borderRadius: 20, borderWidth: 1, alignItems: 'flex-start' },
  step: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, paddingHorizontal: 4, height: 48 },
  stepBtn: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, fontWeight: '600', lineHeight: 24 },
  stepN: { fontSize: 16, fontWeight: '800', minWidth: 22, textAlign: 'center', fontVariant: ['tabular-nums'] },
  addBtn: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15.5 },
  cartBar: { height: 56, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  cartCountPill: { backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, minWidth: 26, alignItems: 'center' },
  cartBarTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

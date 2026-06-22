// AtlaasGo 3.0 — Orders. Re-skin of the Orders export in screen-tabs2.jsx:
//   • "In progress" — brand-bordered card with a live pip, a Track pill and a
//     gradient progress bar (taps through to /order/[id] for live tracking).
//   • "Past orders" — emoji-tile rows with a one-tap Reorder link.
//
// PRESERVED native plumbing from the previous mobile orders.tsx (unchanged):
//   • useOrdersList(30) — RLS-scoped realtime list + pull-to-refresh + 15s focus
//     polling so new orders / status changes appear without a restart.
//   • the batched supabase `orders.items` fetch (the list SELECT omits items) and
//     normalizeItems() tolerant parser used for the reorder seed.
//   • reorder() seeds the existing zustand cart (lib/cart) with one-store
//     semantics, then routes to /cart — the same flow the Stripe checkout uses.
//   • signed-out / no-orders / error empty states.
// Only the visuals were swapped to the 3.0 ag3 theme + primitives.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useOrdersList } from '../../hooks/useOrdersList';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { supabase } from '../../lib/supabase';
import { STAGE_LABELS } from '../../lib/theme';
import { useAg3Theme } from '../../components/ag3/theme';
import { IBack, IReceipt, IBag } from '../../components/ag3/icons';
import {
  Press,
  PhotoTile,
  Price,
  tileFor,
  foodEm,
} from '../../components/ag3/primitives';
import type { OrderStatus } from '../../lib/types';

/* ── DB status → live label key + progress fraction (mirrors the 3.0 Orders card) ─ */
const STATUS_LABEL: Record<string, string> = {
  ordered: 'orders.statusOrdered',
  preparing: 'orders.statusPreparing',
  enRoute: 'orders.statusEnRoute',
  outForDelivery: 'orders.statusOutForDelivery',
  arriving: 'orders.statusArriving',
  delivered: 'orders.statusDelivered',
  cancelled: 'orders.statusCancelled',
};
const STATUS_PROGRESS: Record<string, number> = {
  ordered: 0.1,
  preparing: 0.32,
  enRoute: 0.55,
  outForDelivery: 0.78,
  arriving: 0.94,
  delivered: 1,
  cancelled: 1,
};
const ACTIVE = new Set<OrderStatus>(['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving']);

/** One line of an order's `items` jsonb, normalised for display + reorder. */
type OrderItemLine = {
  id: string;
  name: string;
  priceDh: number;
  qty: number;
  restaurantId: string;
  restaurantName: string;
};

/**
 * The web app snapshots cart items as {id, restaurantSlug, restaurantName,
 * name, priceDh, qty}; older/other writers may use {id, name, price, qty}.
 * Accept both, drop anything unusable.
 */
function normalizeItems(raw: unknown): OrderItemLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: OrderItemLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const it = entry as Record<string, unknown>;
    const name = typeof it.name === 'string' ? it.name.trim() : '';
    if (!name) continue;
    const priceDh = Math.round(Number(it.priceDh ?? it.price ?? 0)) || 0;
    const qty = Math.max(1, Math.round(Number(it.qty ?? 1)) || 1);
    const id = typeof it.id === 'string' && it.id ? it.id : name;
    const restaurantId =
      typeof it.restaurantId === 'string' && it.restaurantId
        ? it.restaurantId
        : typeof it.restaurantSlug === 'string' && it.restaurantSlug
          ? it.restaurantSlug
          : 'reorder';
    const restaurantName =
      typeof it.restaurantName === 'string' && it.restaurantName ? it.restaurantName : 'Restaurant';
    lines.push({ id, name, priceDh, qty, restaurantId, restaurantName });
  }
  return lines;
}

/* friendly title for a card — the saved drop landmark, else a localized fallback */
function orderTitle(
  o: { driverPayload?: { headerLandmark?: string }; landmark?: string },
  fallback: string,
): string {
  return o.driverPayload?.headerLandmark || o.landmark || fallback;
}

/* "Tagine · 2 more" — first item name + remaining count (3.0 sub line) */
function itemsSub(lines: OrderItemLine[] | undefined, moreLabel: (n: number) => string): string {
  if (!lines || lines.length === 0) return '';
  const more = lines.length - 1;
  return more > 0 ? `${lines[0].name} · ${moreLabel(more)}` : lines[0].name;
}

/* short weekday like the prototype's past-order timestamp */
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Customer order history. Orders are scoped by RLS to the signed-in user. The
 * top "In progress" card tracks the latest active order live; "Past orders"
 * lists delivered/cancelled orders, each re-orderable in one tap.
 */
export default function OrdersScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { orders, loading, error, refresh } = useOrdersList(30);
  const add = useCart((s) => s.add);

  // Pull-to-refresh + focus polling so new orders and status changes show up
  // without restarting the app, even if the realtime socket has gone quiet.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => {
        void refreshRef.current();
      }, 15_000);
      return () => clearInterval(id);
    }, []),
  );

  // The list hook's SELECT doesn't include the `items` jsonb, so fetch it in
  // one batch for the visible ids (items never change after checkout). Used for
  // the past-order sub line and to seed reorders.
  const [itemsById, setItemsById] = useState<Record<string, OrderItemLine[]>>({});
  const orderIdsKey = useMemo(() => orders.map((o) => o.id).join(','), [orders]);

  useEffect(() => {
    if (!user || !orderIdsKey) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, items')
        .in('id', orderIdsKey.split(','));
      if (cancelled || !data) return;
      const map: Record<string, OrderItemLine[]> = {};
      for (const row of data as { id: string; items: unknown }[]) {
        map[row.id] = normalizeItems(row.items);
      }
      setItemsById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderIdsKey, user]);

  function reorder(orderId: string) {
    const lines = itemsById[orderId];
    if (!lines || lines.length === 0) {
      Alert.alert(tr('orders.reorderEmptyTitle'), tr('orders.reorderEmptyBody'));
      return;
    }
    // add() keeps one-restaurant-per-cart semantics: the first item replaces a
    // different restaurant's cart, same-restaurant items merge quantities.
    for (const line of lines) {
      add(
        {
          id: line.id,
          restaurantId: line.restaurantId,
          restaurantName: line.restaurantName,
          name: line.name,
          priceDh: line.priceDh,
        },
        line.qty,
      );
    }
    router.push('/checkout');
  }

  const active = useMemo(() => orders.filter((o) => ACTIVE.has(o.status)), [orders]);
  const past = useMemo(() => orders.filter((o) => !ACTIVE.has(o.status)), [orders]);
  const live = active[0];

  /* ── header (back chip + eyebrow) ──────────────────────────────────────── */
  function Header() {
    return (
      <MotiView
        from={{ opacity: 0, translateX: -8 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 240 }}
        style={styles.headerRow}
      >
        <Press onPress={() => router.replace('/')} scaleTo={0.9}>
          <View style={[styles.backChip, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
            <IBack size={20} color={t.colors.fg} />
          </View>
        </Press>
        <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{tr('orders.eyebrow')}</Text>
        <View style={{ width: 44 }} />
      </MotiView>
    );
  }

  /* ── signed-out ────────────────────────────────────────────────────────── */
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <Header />
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2 }]}>
              <IReceipt size={28} color={t.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.colors.fg }]}>{tr('orders.signedOutTitle')}</Text>
            <Text style={[styles.emptyBody, { color: t.colors.fgSoft }]}>
              {tr('orders.signedOutBody')}
            </Text>
            <Press onPress={() => router.push('/sign-in')} style={{ marginTop: 22 }}>
              <LinearGradient
                colors={t.gradients.sunset}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.primaryBtn, t.shadows.glow]}
              >
                <Text style={styles.primaryBtnTxt}>{tr('orders.signIn')}</Text>
              </LinearGradient>
            </Press>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} colors={[t.colors.primary]} />
        }
      >
        <Header />

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 90 }}
          style={{ marginTop: 18 }}
        >
          <Text style={[styles.h1, { color: t.colors.fg }]}>{tr('orders.title')}</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: t.colors.fgSoft, lineHeight: 20 }}>
            {tr('orders.subtitle')}
          </Text>
        </MotiView>

        {loading && orders.length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : error && orders.length === 0 ? (
          <View style={[styles.noticeCard, { backgroundColor: t.colors.surface, borderColor: 'rgba(185,28,28,0.25)' }]}>
            <Text style={[styles.noticeTitle, { color: t.colors.fg }]}>{tr('orders.errorTitle')}</Text>
            <Text style={[styles.noticeBody, { color: t.colors.fgSoft }]}>{error.message}</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2 }]}>
              <IBag size={28} color={t.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.colors.fg }]}>{tr('orders.emptyTitle')}</Text>
            <Text style={[styles.emptyBody, { color: t.colors.fgSoft }]}>
              {tr('orders.emptyBody')}
            </Text>
            <Press onPress={() => router.replace('/')} style={{ marginTop: 22 }}>
              <LinearGradient
                colors={t.gradients.sunset}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.primaryBtn, t.shadows.glow]}
              >
                <Text style={styles.primaryBtnTxt}>{tr('orders.browse')}</Text>
              </LinearGradient>
            </Press>
          </View>
        ) : (
          <>
            {/* ── In progress ─────────────────────────────────────────────── */}
            {live ? (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 320, delay: 120 }}
                style={{ marginTop: 22 }}
              >
                <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>{tr('orders.inProgress')}</Text>
                <Press onPress={() => router.push({ pathname: '/order/[id]', params: { id: live.id } })} style={{ width: '100%' }}>
                  <View style={[styles.liveCard, { backgroundColor: t.colors.surface, borderColor: 'rgba(255,87,34,0.26)' }, t.shadows.card]}>
                    <View style={styles.liveRow}>
                      <PhotoTile tile={tileFor(live.id)} em={foodEm(live.id)} radius={14} style={{ width: 54, height: 54 }} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.disp, { fontSize: 15.5, color: t.colors.fg }]} numberOfLines={1}>
                          {orderTitle(live, tr('orders.deliveryFallback'))}
                        </Text>
                        <View style={styles.liveLine}>
                          <Pip color={t.colors.ok} />
                          <Text style={{ fontSize: 12, color: t.colors.ok, fontWeight: '700' }} numberOfLines={1}>
                            {STATUS_LABEL[live.status] ? tr(STATUS_LABEL[live.status]) : STAGE_LABELS[live.status]?.title ?? live.status}
                          </Text>
                        </View>
                      </View>
                      <LinearGradient colors={t.gradients.sunset} start={t.gradients.start} end={t.gradients.end} style={[styles.trackPill, t.shadows.glow]}>
                        <Text style={styles.trackPillTxt}>{tr('orders.track')}</Text>
                      </LinearGradient>
                    </View>
                    {/* gradient progress bar */}
                    <View style={[styles.progressTrack, { backgroundColor: t.colors.line2 }]}>
                      <LinearGradient
                        colors={t.gradients.sunset}
                        start={t.gradients.start}
                        end={t.gradients.end}
                        style={{ width: `${Math.round((STATUS_PROGRESS[live.status] ?? 0.1) * 100)}%`, height: '100%' }}
                      />
                    </View>
                  </View>
                </Press>
              </MotiView>
            ) : null}

            {/* ── Past orders ─────────────────────────────────────────────── */}
            {past.length > 0 ? (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 320, delay: live ? 180 : 120 }}
                style={{ marginTop: 24 }}
              >
                <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>{tr('orders.pastOrders')}</Text>
                <View style={{ gap: 12 }}>
                  {past.map((o, i) => {
                    const lines = itemsById[o.id];
                    const sub = itemsSub(lines, (n) => tr('orders.moreItems', { n }));
                    const cancelled = o.status === 'cancelled';
                    return (
                      <MotiView
                        key={o.id}
                        from={{ opacity: 0, translateY: 8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 280, delay: 60 + i * 40 }}
                      >
                        <Pressable
                          onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })}
                        >
                          <View style={[styles.pastCard, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
                            <PhotoTile tile={tileFor(o.id)} em={foodEm(o.id)} radius={13} style={{ width: 50, height: 50 }} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[styles.disp, { fontSize: 14.5, color: t.colors.fg }]} numberOfLines={1}>
                                {orderTitle(o, tr('orders.deliveryFallback'))}
                              </Text>
                              <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }} numberOfLines={1}>
                                {cancelled ? tr('orders.cancelled') : sub ? `${sub} · ` : ''}
                                {cancelled ? '' : whenLabel(o.createdAt)}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Price v={o.totalDh} color={t.colors.fg} />
                              <Pressable
                                onPress={() => reorder(o.id)}
                                hitSlop={8}
                                style={{ marginTop: 4 }}
                                disabled={cancelled && (!lines || lines.length === 0)}
                              >
                                <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13 }}>{tr('orders.reorder')}</Text>
                              </Pressable>
                            </View>
                          </View>
                        </Pressable>
                      </MotiView>
                    );
                  })}
                </View>
              </MotiView>
            ) : null}

            {/* in-progress only, no past yet */}
            {past.length === 0 && live ? (
              <View style={[styles.noticeCard, { backgroundColor: t.colors.surface2, borderColor: t.colors.line2, marginTop: 24 }]}>
                <Text style={[styles.noticeBody, { color: t.colors.fgSoft }]}>
                  {tr('orders.pastPending')}
                </Text>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── pulsing live pip (the .pip dot from the prototype) ───────────────────── */
function Pip({ color }: { color: string }) {
  return (
    <View style={{ width: 8, height: 8 }}>
      <MotiView
        from={{ opacity: 0.55, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 700, loop: true }}
        style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  backChip: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  h1: { fontSize: 27, fontWeight: '800', letterSpacing: -0.8, lineHeight: 31 },

  liveCard: { borderRadius: 26, borderWidth: 1.5, overflow: 'hidden' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  liveLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  trackPill: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  trackPillTxt: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  progressTrack: { height: 5, width: '100%' },

  pastCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, borderRadius: 26, borderWidth: 1 },

  primaryBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, alignItems: 'center' },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontWeight: '800', fontSize: 20, letterSpacing: -0.4 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 280 },

  noticeCard: { borderRadius: 26, borderWidth: 1, padding: 18, marginTop: 16 },
  noticeTitle: { fontWeight: '800', fontSize: 16, letterSpacing: -0.3 },
  noticeBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});

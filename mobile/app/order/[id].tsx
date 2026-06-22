// AtlaasGo 3.0 — Live order tracking (weather-aware), native re-skin.
//
// DESIGN: /tmp/atlaasgo-3-0/.../screen-tracking2.jsx — map header, ETA hero
//   (big sunset-gradient number), courier card (call/message), 6-stage timeline,
//   order summary card, glass sheet that overlaps the map.
// LOGIC: src/app3/screens/Tracking.tsx — same stage/eta/weather shape.
//
// PRESERVED native plumbing (do NOT rip out):
//   • useOrderStatus(id)        — live order row + stage over Supabase Realtime
//   • useAssignedRider(id)      — courier name/vehicle/plate/rating/phone
//   • useRiderLiveLocation(id)  — rider GPS, streamed
//   • LiveTrackingMap           — native react-native-maps (NOT replaced by SVG)
//   • cancelOrder / reorder     — order lifecycle actions
//   • OrderChat (customer role) — realtime order chat
//   • Receipt / ReviewForm      — itemized bill + post-delivery review
//   • expo-router params, demo-order fallback, dev "view as driver"
//
// ADDED for 3.0: gradient ETA hero, restyled courier card, 3.0 timeline,
//   and the weather ETA note (fetched via agApi.cities.weather for the order's
//   city — CityProvider is not mounted app-wide, so we read it directly here).
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bike,
  ChevronRight,
  MessageCircle,
  Phone,
  RotateCcw,
  Snowflake,
  XCircle,
} from 'lucide-react-native';
import { LiveTrackingMap } from '../../components/LiveTrackingMap';
import { OrderChat } from '../../components/OrderChat';
import { Receipt, type ReceiptItem, type ReceiptOrder } from '../../components/Receipt';
import { ReviewForm } from '../../components/ReviewForm';
import { IBack, IClock, IPin, IStar } from '../../components/ag3/icons';
import { PhotoTile, Press, foodEm, tileFor } from '../../components/ag3/primitives';
import { useAg3Theme } from '../../components/ag3/theme';
import { useDemoOrderProgress, useOrderStatus } from '../../hooks/useOrderStatus';
import { useAssignedRider } from '../../hooks/useAssignedRider';
import { useRiderLiveLocation } from '../../hooks/useRiderLiveLocation';
import { agApi } from '../../lib/ag3/agApi';
import { useAsync } from '../../lib/ag3/useAsync';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { cancelOrder } from '../../lib/orderActions';
import { supabase } from '../../lib/supabase';
import { ORDER_STAGES, type OrderStage } from '../../lib/types';

/* Items snapshot on the order row also carries restaurantId (set at checkout). */
type ReceiptRowItem = ReceiptItem & { restaurantId?: string };
type ReceiptRow = Omit<ReceiptOrder, 'items'> & {
  items: ReceiptRowItem[] | null;
  is_campus: boolean | null;
  city?: string | null;
};

const RECEIPT_SELECT =
  'id, items, subtotal_dh, delivery_fee_dh, service_fee_dh, total_dh, payment_method, promotion_code, delivery_notes, created_at, is_campus, city';

/* The 3.0 six-stage timeline. Maps the live DB stage → which rows are done/now.
 * (The DB has 5 active stages + delivered; we present the spec's 6.) */
const TIMELINE: { key: OrderStage | 'delivered'; labelKey: string; subKey: string }[] = [
  { key: 'ordered', labelKey: 'stageOrderedLabel', subKey: 'stageOrderedSub' },
  { key: 'preparing', labelKey: 'stagePreparingLabel', subKey: 'stagePreparingSub' },
  { key: 'enRoute', labelKey: 'stagePickedUpLabel', subKey: 'stagePickedUpSub' },
  { key: 'outForDelivery', labelKey: 'stageOnTheWayLabel', subKey: 'stageOnTheWaySub' },
  { key: 'arriving', labelKey: 'stageArrivingLabel', subKey: 'stageArrivingSub' },
  { key: 'delivered', labelKey: 'stageDeliveredLabel', subKey: 'stageDeliveredSub' },
];

/** One-shot fetch of the receipt columns — useOrderStatus only carries the
 *  live-tracking subset, so the itemized breakdown loads separately here. */
function useReceiptRow(orderId: string | undefined) {
  const [row, setRow] = useState<ReceiptRow | null>(null);
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    supabase
      .from('orders')
      .select(RECEIPT_SELECT)
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setRow(data as ReceiptRow);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);
  return row;
}

export default function OrderScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isDemo = !id || id.startsWith('demo-');

  // ── PRESERVED live plumbing ──────────────────────────────────────────────
  const { order, stage: liveStage, loading } = useOrderStatus(isDemo ? undefined : id);
  const { stage: demoStage } = useDemoOrderProgress('ordered');
  const stage = isDemo ? demoStage : liveStage;
  const { rider } = useAssignedRider(isDemo ? undefined : id);
  const { location: riderLive } = useRiderLiveLocation(isDemo ? undefined : id);
  const receipt = useReceiptRow(isDemo ? undefined : id);

  // 3.0 weather note — fetched for the order's city (no CityProvider mounted).
  const cityId = receipt?.city ?? 'ifrane';
  const { data: weather } = useAsync(
    () => (isDemo ? Promise.resolve(null) : agApi.cities.weather(cityId)),
    [isDemo, cityId],
  );

  const addToCart = useCart((s) => s.add);
  const [chatOpen, setChatOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const status = isDemo ? stage : order?.status;
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';
  const isTerminal = isCancelled || isDelivered;
  const isMine = !!user && !!order && order.customerId === user.id;
  const canCancel = !isDemo && isMine && status === 'ordered';
  const canReorder = !isDemo && isTerminal && (receipt?.items?.length ?? 0) > 0;

  const headerLandmark = order?.driverPayload?.headerLandmark ?? tr('tracking.nearGrandMosque');

  // current stage index within the 6-stage 3.0 timeline
  const stageIdx = useMemo(() => {
    if (isDelivered) return TIMELINE.length - 1;
    const i = TIMELINE.findIndex((s) => s.key === stage);
    return i < 0 ? 0 : i;
  }, [stage, isDelivered]);
  // ETA mirrors the original derivation (4 min per remaining active stage)
  const eta = Math.max(0, (ORDER_STAGES.length - 1 - ORDER_STAGES.indexOf(stage)) * 4);
  const etaShown = isDelivered ? 0 : eta;
  const weatherAdd = weather?.etaAddMinutes ?? 0;
  const showWeatherNote = !isTerminal && !!weather && weatherAdd > 0;

  // restaurant summary (first receipt item carries the snapshot)
  const firstItem = receipt?.items?.[0];
  const storeName = firstItem?.restaurantName ?? 'AtlaasGo';
  const storeId = firstItem?.restaurantId ?? '';
  const itemCount = (receipt?.items ?? []).reduce((s, i) => s + (i.qty ?? 0), 0);
  const itemNames = (receipt?.items ?? []).map((i) => i.name).join(', ');

  const courierName = rider?.name ?? (isDelivered ? tr('tracking.orderDelivered') : tr('tracking.findingRider'));
  const courierInitial = (rider?.name ?? 'A').charAt(0).toUpperCase();
  const courierMeta =
    [rider?.vehicle, rider?.plate].filter(Boolean).join(' · ') ||
    (isDelivered ? tr('tracking.thanksForOrdering') : tr('tracking.willAssignRider'));

  function confirmCancel() {
    if (!id || cancelBusy) return;
    Alert.alert(tr('tracking.cancelConfirmTitle'), tr('tracking.cancelConfirmBody'), [
      { text: tr('tracking.keepOrder'), style: 'cancel' },
      {
        text: tr('tracking.cancelOrder'),
        style: 'destructive',
        onPress: async () => {
          setCancelBusy(true);
          const res = await cancelOrder(id);
          setCancelBusy(false);
          if (!res.ok) Alert.alert(tr('tracking.couldNotCancel'), res.error);
        },
      },
    ]);
  }

  function reorder() {
    const items = receipt?.items ?? [];
    if (items.length === 0) return;
    items.forEach((item, idx) => {
      if (!item.id || !item.restaurantId) return;
      addToCart(
        {
          id: item.id,
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName ?? '',
          name: item.name,
          priceDh: item.priceDh,
        },
        item.qty,
        idx === 0 ? !!receipt?.is_campus : undefined,
      );
    });
    router.push('/cart');
  }

  const dest = order?.coords ? { lat: order.coords.lat, lng: order.coords.lng } : null;
  const riderPt = riderLive ? { lat: riderLive.lat, lng: riderLive.lng } : null;
  const orderTag = (id ?? '—').slice(0, 6).toUpperCase();

  // ── Loading / not-found (real orders only) ───────────────────────────────
  if (!isDemo && loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }

  if (!isDemo && !loading && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <RoundBtn onPress={() => router.replace('/')} t={t}>
            <IBack size={20} color={t.colors.fg} />
          </RoundBtn>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Bike size={28} color={t.colors.muted} />
          <Text style={{ marginTop: 14, fontSize: 19, fontWeight: '800', color: t.colors.fg }}>
            {tr('tracking.notFoundTitle')}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, textAlign: 'center', color: t.colors.muted, lineHeight: 19 }}>
            {user
              ? tr('tracking.notFoundBodyAuthed')
              : tr('tracking.notFoundBodyGuest')}
          </Text>
          {!user ? (
            <Press onPress={() => router.push('/sign-in')} style={{ marginTop: 22 }}>
              <View style={{ borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: t.colors.primary }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{tr('tracking.signIn')}</Text>
              </View>
            </Press>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {/* ── Map header (native maps, sunset gradient backdrop) ─────────────── */}
      <View style={{ height: '40%', position: 'relative' }}>
        <LinearGradient
          colors={t.gradients.warm}
          start={t.gradients.start}
          end={t.gradients.end}
          style={StyleSheet.absoluteFill}
        />
        {/* falling-snow ambience when the city has weather */}
        {showWeatherNote && <SnowField />}

        {/* Real native map sits over the gradient when we have coords */}
        {!isDemo && !isTerminal && (riderPt || dest) ? (
          <View style={StyleSheet.absoluteFill}>
            <LiveTrackingMap rider={riderPt} dest={dest} height={9999} />
          </View>
        ) : null}

        {/* destination pill — top right */}
        <SafeAreaView edges={['top']} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 }}>
            <RoundBtn onPress={() => router.replace('/')} t={t}>
              <IBack size={20} color={t.colors.fg} />
            </RoundBtn>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View style={[styles.glassPill, { backgroundColor: t.colors.surface }, t.shadows.card]}>
                <IPin size={14} color={t.colors.primary} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: t.colors.fg }} numberOfLines={1}>
                  {headerLandmark}
                </Text>
              </View>
              {showWeatherNote ? (
                <View style={styles.snowBadge}>
                  <Snowflake size={13} color="#fff" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                    {weather?.tempC}° · {weather?.condition?.toLowerCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Sheet that overlaps the map ────────────────────────────────────── */}
      <View style={[styles.sheet, { backgroundColor: t.colors.bg }]}>
        <View style={[styles.grip, { backgroundColor: t.colors.line }]} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
        >
          {/* ETA hero — big sunset-gradient number */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360 }}
            style={{ alignItems: 'center', marginTop: 6 }}
          >
            <View style={styles.liveRow}>
              {!isTerminal ? <View style={[styles.pip, { backgroundColor: t.colors.ok }]} /> : null}
              <Text style={[styles.eyebrow, { color: isCancelled ? t.colors.muted : t.colors.ok }]}>
                {isCancelled ? tr('tracking.eyebrowOrder', { tag: orderTag }) : isDelivered ? tr('tracking.eyebrowDelivered', { tag: orderTag }) : tr('tracking.eyebrowLive', { tag: orderTag })}
              </Text>
            </View>
            <Text style={{ fontWeight: '800', fontSize: 16, color: t.colors.fgSoft, marginTop: 2 }}>
              {isCancelled ? tr('tracking.statusCancelled') : isDelivered ? tr('tracking.statusDelivered') : tr('tracking.statusArrivingIn')}
            </Text>

            {isCancelled ? (
              <Text style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 19, maxWidth: 280 }}>
                {tr('tracking.cancelledBody')}
              </Text>
            ) : (
              <GradientEta value={etaShown} gradient={t.gradients.sunset} start={t.gradients.start} end={t.gradients.end} />
            )}

            {!isCancelled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                {showWeatherNote ? (
                  <>
                    <Snowflake size={14} color={t.colors.snow} />
                    <Text style={{ fontSize: 12.5, color: t.colors.muted, textAlign: 'center' }}>
                      {weather?.note || tr('tracking.weatherNote', { n: weatherAdd })}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 12.5, color: t.colors.muted, textAlign: 'center' }}>
                    {isDelivered
                      ? tr('tracking.deliveredHint')
                      : rider?.vehicle
                        ? tr('tracking.courierOnWayVehicle', { vehicle: rider.vehicle })
                        : tr('tracking.courierOnWay')}
                  </Text>
                )}
              </View>
            ) : null}
          </MotiView>

          {/* Courier card */}
          {!isCancelled ? (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 90 }}
              style={{ marginTop: 18 }}
            >
              <View style={[card(t), { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13 }]}>
                {rider ? (
                  <LinearGradient
                    colors={t.gradients.sunset}
                    start={t.gradients.start}
                    end={t.gradients.end}
                    style={styles.avatar}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 21 }}>{courierInitial}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.avatar, { backgroundColor: t.colors.surface2 }]}>
                    <Bike size={22} color={t.colors.muted} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: t.colors.fg }} numberOfLines={1}>
                    {courierName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {rider?.rating != null ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <IStar size={12} color={t.colors.amber} fill={t.colors.amber} strokeWidth={0} />
                          <Text style={{ fontSize: 12, color: t.colors.fgSoft, fontWeight: '700' }}>{rider.rating}</Text>
                        </View>
                        <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: t.colors.muted }} />
                      </>
                    ) : null}
                    <Text style={{ fontSize: 12, color: t.colors.muted }} numberOfLines={1}>
                      {courierMeta}
                    </Text>
                  </View>
                </View>
                {rider && !isDemo ? (
                  <>
                    <RoundBtn onPress={() => setChatOpen(true)} t={t} tint>
                      <MessageCircle size={20} color={t.colors.primary} />
                    </RoundBtn>
                    {rider.phone ? (
                      <RoundBtn onPress={() => Linking.openURL(`tel:${rider.phone}`)} t={t} tint>
                        <Phone size={19} color={t.colors.primary} />
                      </RoundBtn>
                    ) : null}
                  </>
                ) : null}
              </View>
            </MotiView>
          ) : null}

          {/* Live tracking eyebrow (real, active orders) */}
          {!isDemo && !isTerminal && (riderPt || dest) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
              <Text style={[styles.eyebrow, { color: t.colors.muted }]}>{tr('tracking.liveTracking')}</Text>
              {riderLive ? <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{tr('tracking.liveDot')}</Text> : null}
            </View>
          ) : null}

          {/* 6-stage timeline */}
          {!isTerminal ? (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 150 }}
              style={{ marginTop: 18 }}
            >
              <View style={[card(t), { padding: 16, paddingBottom: 6 }]}>
                {TIMELINE.map((s, i) => {
                  const done = i < stageIdx;
                  const now = i === stageIdx;
                  const last = i === TIMELINE.length - 1;
                  return (
                    <View key={s.key} style={{ flexDirection: 'row', gap: 13 }}>
                      <View style={{ alignItems: 'center', width: 14 }}>
                        <View
                          style={[
                            styles.node,
                            done
                              ? { backgroundColor: t.colors.primary, borderColor: t.colors.primary }
                              : now
                                ? { backgroundColor: t.colors.bg, borderColor: t.colors.primary }
                                : { backgroundColor: t.colors.bg, borderColor: t.colors.line },
                          ]}
                        />
                        {!last ? (
                          <View
                            style={[
                              styles.bar,
                              { backgroundColor: done ? t.colors.primary : t.colors.line },
                            ]}
                          />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16, opacity: done || now ? 1 : 0.5 }}>
                        <Text
                          style={{
                            fontWeight: now ? '800' : '700',
                            fontSize: 14.5,
                            color: now ? t.colors.primary : t.colors.fg,
                          }}
                        >
                          {tr(`tracking.${s.labelKey}`)}
                        </Text>
                        <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }}>{tr(`tracking.${s.subKey}`)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </MotiView>
          ) : null}

          {/* Order summary card → tap through to the restaurant */}
          {!isDemo && receipt && itemCount > 0 ? (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 210 }}
              style={{ marginTop: 14 }}
            >
              <Press
                onPress={() => {
                  if (storeId) router.push({ pathname: '/restaurant/[id]', params: { id: storeId } });
                }}
              >
                <View style={[card(t), { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }]}>
                  <PhotoTile
                    tile={tileFor(storeId || storeName)}
                    em={foodEm(storeId)}
                    radius={14}
                    style={{ width: 46, height: 46 }}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: t.colors.fg }} numberOfLines={1}>
                      {storeName}
                    </Text>
                    <Text style={{ fontSize: 12, color: t.colors.muted }} numberOfLines={1}>
                      {tr('tracking.itemCount', { n: itemCount })} · {itemNames}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={t.colors.muted} />
                </View>
              </Press>
            </MotiView>
          ) : null}

          {/* Itemized receipt — auto-expanded when the order was cancelled */}
          {!isDemo && receipt ? (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 250 }}
              style={{ marginTop: 18 }}
            >
              <Text style={[styles.eyebrow, { color: t.colors.muted, marginBottom: 8 }]}>{tr('tracking.receipt')}</Text>
              <Receipt order={receipt} defaultOpen={isCancelled} />
            </MotiView>
          ) : null}

          {/* Cancel — only while the restaurant hasn't accepted, and only my order */}
          {canCancel ? (
            <Press onPress={confirmCancel} disabled={cancelBusy} style={{ marginTop: 14 }}>
              <View
                style={[
                  styles.actionBtn,
                  { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: 'rgba(225,29,72,0.35)', opacity: cancelBusy ? 0.5 : 1 },
                ]}
              >
                {cancelBusy ? (
                  <ActivityIndicator size="small" color="#E11D48" />
                ) : (
                  <>
                    <XCircle size={16} color="#E11D48" />
                    <Text style={{ fontWeight: '700', fontSize: 14, color: '#E11D48' }}>{tr('tracking.cancelOrder')}</Text>
                  </>
                )}
              </View>
            </Press>
          ) : null}

          {/* Order again — delivered or cancelled orders go back into the cart */}
          {canReorder ? (
            <Press onPress={reorder} style={{ marginTop: 14 }}>
              <LinearGradient
                colors={t.gradients.sunset}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.actionBtn, t.shadows.glow]}
              >
                <RotateCcw size={16} color="#fff" strokeWidth={2.5} />
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>{tr('tracking.orderAgain')}</Text>
              </LinearGradient>
            </Press>
          ) : null}

          {/* Review — once delivered, rate the restaurant (+ rider, optional) */}
          {!isDemo && isDelivered && id ? (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 290 }}
              style={{ marginTop: 18 }}
            >
              <ReviewForm orderId={id} restaurantId={storeId || null} />
            </MotiView>
          ) : null}

          {/* Chat entry row */}
          {!isDemo && order ? (
            <Press onPress={() => setChatOpen(true)} style={{ marginTop: 14 }}>
              <View style={[card(t), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }]}>
                <View style={[styles.avatarSm, { backgroundColor: 'rgba(255,87,34,0.10)' }]}>
                  <MessageCircle size={17} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>{tr('tracking.chatTitle')}</Text>
                  <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }}>
                    {tr('tracking.chatSub')}
                  </Text>
                </View>
                <ChevronRight size={18} color={t.colors.primary} />
              </View>
            </Press>
          ) : null}

          {/* Dev — view as driver */}
          {!isDemo && __DEV__ && id ? (
            <Press onPress={() => router.push({ pathname: '/driver/[id]', params: { id } })} style={{ marginTop: 18 }}>
              <View
                style={{
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: t.colors.line,
                  borderStyle: 'dashed',
                  backgroundColor: t.colors.surface2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Bike size={14} color={t.colors.muted} />
                  <Text style={[styles.eyebrow, { color: t.colors.muted }]}>{tr('tracking.devViewAsDriver')}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: t.colors.primary }}>{tr('tracking.open')}</Text>
              </View>
            </Press>
          ) : null}
        </ScrollView>
      </View>

      {/* Full-screen order chat (customer role) — PRESERVED */}
      {chatOpen && id ? (
        <OrderChat orderId={id} role="customer" onClose={() => setChatOpen(false)} />
      ) : null}
    </View>
  );
}

/* ── ETA hero number with a sunset gradient fill (RN gradient-text via mask) ── */
function GradientEta({
  value,
  gradient,
  start,
  end,
}: {
  value: number;
  gradient: readonly [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
}) {
  // RN can't clip text to a gradient without extra deps; we lay an opaque
  // gradient over the number and punch the digits out with overlap blending
  // would need MaskedView. Instead: gradient digits via a tinted Text + a
  // gradient underline accent — reads as the prototype's gradient hero.
  return (
    <View style={{ alignItems: 'center', marginTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <MaskedGradientNumber value={value} gradient={gradient} start={start} end={end} />
      </View>
    </View>
  );
}

/* Tries react-native-masked-view for true gradient text; falls back to a
 * primary-tinted number so the screen always renders even without the dep. */
let MaskedView: any = null;
try {
  MaskedView = require('@react-native-masked-view/masked-view').default;
} catch {
  MaskedView = null;
}

function MaskedGradientNumber({
  value,
  gradient,
  start,
  end,
}: {
  value: number;
  gradient: readonly [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
}) {
  const { t: tr } = useTranslation();
  const numStyle = { fontWeight: '800' as const, fontSize: 64, lineHeight: 66, letterSpacing: -2 };
  const unitStyle = { fontWeight: '800' as const, fontSize: 22 };
  if (MaskedView) {
    return (
      <MaskedView
        maskElement={
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'transparent' }}>
            <Text style={[numStyle, { color: '#000' }]}>{value}</Text>
            <Text style={[unitStyle, { color: '#000', marginBottom: 8 }]}> {tr('tracking.minUnit')}</Text>
          </View>
        }
      >
        <LinearGradient colors={gradient} start={start} end={end}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', opacity: 0 }}>
            <Text style={numStyle}>{value}</Text>
            <Text style={unitStyle}> {tr('tracking.minUnit')}</Text>
          </View>
        </LinearGradient>
      </MaskedView>
    );
  }
  // fallback: brand-tinted number
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={[numStyle, { color: gradient[0] }]}>{value}</Text>
      <Text style={[unitStyle, { color: gradient[1], marginBottom: 8 }]}> {tr('tracking.minUnit')}</Text>
    </View>
  );
}

/* ── falling snow ambience over the map gradient ────────────────────────────── */
function SnowField() {
  const flakes = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flakes.map((i) => {
        const size = 3 + (i % 3);
        return (
          <MotiView
            key={i}
            from={{ translateY: -20, opacity: 0 }}
            animate={{ translateY: 320, opacity: 0.8 }}
            transition={{
              type: 'timing',
              duration: 5000 + (i % 5) * 900,
              loop: true,
              delay: (i % 7) * 400,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: `${(i * 37) % 100}%`,
              width: size,
              height: size,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.75)',
            }}
          />
        );
      })}
    </View>
  );
}

/* ── round icon button (back / call / message) ───────────────────────────────── */
function RoundBtn({
  children,
  onPress,
  t,
  tint = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  t: ReturnType<typeof useAg3Theme>;
  tint?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.roundBtn,
        {
          backgroundColor: tint ? 'rgba(255,87,34,0.10)' : t.colors.surface,
          borderColor: t.colors.line2,
        },
        !tint ? t.shadows.card : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

function card(t: ReturnType<typeof useAg3Theme>) {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  };
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: -26,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 10,
    zIndex: 3,
    shadowColor: '#1A1410',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.14,
    shadowRadius: 44,
    elevation: 12,
  },
  grip: { alignSelf: 'center', width: 42, height: 5, borderRadius: 999, marginBottom: 4 },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    maxWidth: 200,
  },
  snowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(62,134,199,0.85)',
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pip: { width: 7, height: 7, borderRadius: 999 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },
  avatar: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  node: { width: 14, height: 14, borderRadius: 999, borderWidth: 2.5 },
  bar: { width: 2.5, flex: 1, minHeight: 18, marginVertical: 2, borderRadius: 999 },
  actionBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

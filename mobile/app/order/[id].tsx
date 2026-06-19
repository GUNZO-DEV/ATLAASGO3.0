import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bike,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  XCircle,
} from 'lucide-react-native';
import { ProgressTimeline } from '../../components/ProgressTimeline';
import { LiveTrackingMap } from '../../components/LiveTrackingMap';
import { OrderChat } from '../../components/OrderChat';
import { Receipt, type ReceiptItem, type ReceiptOrder } from '../../components/Receipt';
import { ReviewForm } from '../../components/ReviewForm';
import { PressableScale } from '../../components/primitives/PressableScale';
import { useDemoOrderProgress, useOrderStatus } from '../../hooks/useOrderStatus';
import { useAssignedRider } from '../../hooks/useAssignedRider';
import { useRiderLiveLocation } from '../../hooks/useRiderLiveLocation';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';
import { cancelOrder } from '../../lib/orderActions';
import { supabase } from '../../lib/supabase';
import { ORDER_STAGES } from '../../lib/types';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const LINE = 'rgba(26,20,16,0.08)';

/** Items snapshot on the order row also carries restaurantId (set at checkout). */
type ReceiptRowItem = ReceiptItem & { restaurantId?: string };
type ReceiptRow = Omit<ReceiptOrder, 'items'> & {
  items: ReceiptRowItem[] | null;
  is_campus: boolean | null;
};

const RECEIPT_SELECT =
  'id, items, subtotal_dh, delivery_fee_dh, service_fee_dh, total_dh, payment_method, promotion_code, delivery_notes, created_at, is_campus';

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
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isDemo = !id || id.startsWith('demo-');

  const { order, stage: liveStage, loading, error } = useOrderStatus(isDemo ? undefined : id);
  const { stage: demoStage } = useDemoOrderProgress('ordered');
  const stage = isDemo ? demoStage : liveStage;
  const { rider } = useAssignedRider(isDemo ? undefined : id);
  const { location: riderLive } = useRiderLiveLocation(isDemo ? undefined : id);
  const receipt = useReceiptRow(isDemo ? undefined : id);

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

  const headerLandmark = order?.driverPayload?.headerLandmark ?? 'Near the Grand Mosque';
  const eta = Math.max(0, (ORDER_STAGES.length - 1 - ORDER_STAGES.indexOf(stage)) * 4);

  const headline = isCancelled
    ? 'Order cancelled.'
    : isDelivered
      ? 'Delivered. Enjoy!'
      : status === 'ordered'
        ? 'Order placed.'
        : stage === 'arriving'
          ? 'Almost there.'
          : 'On its way.';
  const subline = isCancelled
    ? 'This order was cancelled — nothing was charged beyond any refund in progress.'
    : isDelivered
      ? 'Hope it hit the spot. Rate the order below.'
      : status === 'ordered'
        ? 'Waiting for the restaurant to confirm.'
        : stage === 'arriving'
          ? 'Heads up — your driver is at your landmark.'
          : `ETA ~ ${eta} min`;

  function confirmCancel() {
    if (!id || cancelBusy) return;
    Alert.alert('Cancel this order?', 'The kitchen will be told to stop. This cannot be undone.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setCancelBusy(true);
          const res = await cancelOrder(id);
          setCancelBusy(false);
          if (!res.ok) Alert.alert('Could not cancel', res.error);
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

  function Header() {
    return (
      <MotiView
        from={{ opacity: 0, translateX: -8 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 240 }}
        className="flex-row items-center justify-between pt-3"
      >
        <PressableScale onPress={() => router.replace('/')}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1, borderColor: LINE }}
          >
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>
          Order #{(id ?? '—').slice(0, 6).toUpperCase()}
        </Text>
        <View style={{ width: 40 }} />
      </MotiView>
    );
  }

  // ── Loading / not-found states (real orders only) ───────────────────
  if (!isDemo && loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <View style={{ paddingHorizontal: 24 }}>
          <Header />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isDemo && !loading && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <View style={{ paddingHorizontal: 24 }}>
          <Header />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Bike size={28} color={MUTED} />
          <Text className="mt-4 text-[19px]" style={{ fontWeight: '900', color: INK }}>
            Order not found
          </Text>
          <Text className="mt-2 text-[13px] text-center" style={{ color: MUTED, lineHeight: 19 }}>
            {error
              ? error.message
              : user
                ? 'This order does not exist or belongs to another account.'
                : 'Sign in to see your order.'}
          </Text>
          {!user ? (
            <PressableScale onPress={() => router.push('/sign-in')}>
              <View className="rounded-full px-7 py-3.5 mt-6" style={{ backgroundColor: BRAND }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sign in</Text>
              </View>
            </PressableScale>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 100 }}
          className="mt-6"
        >
          <Text
            className="font-display text-[30px]"
            style={{ fontWeight: '800', letterSpacing: -1.0, lineHeight: 32, color: INK }}
          >
            {headline}
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: MUTED }}>
            {subline}
          </Text>
        </MotiView>

        {/* Active-order tracking: landmark strip, live map, timeline */}
        {!isTerminal && (
          <>
            {/* Driver landmark strip — mirrors driverPayload.headerLandmark */}
            <MotiView
              from={{ opacity: 0, translateY: 14 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 360, delay: 160 }}
              className="mt-6 rounded-2xl p-4 flex-row items-center"
              style={{
                backgroundColor: '#FFF1EB',
                borderWidth: 1,
                borderColor: 'rgba(255,87,34,0.15)',
              }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: BRAND }}
              >
                <MapPin size={16} color="#fff" strokeWidth={2.5} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: MUTED }}>
                  Driver header
                </Text>
                <Text className="text-[14px] font-bold mt-0.5" style={{ color: INK }}>
                  {headerLandmark}
                </Text>
              </View>
            </MotiView>

            {/* Live map tracking — rider GPS vs delivery spot, updating in real time */}
            {!isDemo && (
              <MotiView
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 360, delay: 220 }}
                className="mt-6"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: MUTED }}>
                    Live tracking
                  </Text>
                  {riderLive ? (
                    <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: BRAND }}>
                      ● Live
                    </Text>
                  ) : null}
                </View>
                <LiveTrackingMap
                  rider={riderLive ? { lat: riderLive.lat, lng: riderLive.lng } : null}
                  dest={order?.coords ? { lat: order.coords.lat, lng: order.coords.lng } : null}
                />
              </MotiView>
            )}

            <View className="mt-6">
              <ProgressTimeline stage={stage} />
            </View>
          </>
        )}

        {/* Rider card — real assigned rider, or a finding-your-rider state */}
        {!isCancelled && (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 280 }}
            className="mt-6 rounded-3xl bg-white p-5 flex-row items-center"
            style={{ borderWidth: 1, borderColor: LINE }}
          >
            {rider ? (
              <>
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#FFB74D' }}
                >
                  <Text className="text-white font-display text-lg" style={{ fontWeight: '800' }}>
                    {rider.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-display text-[15px]" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {rider.name}
                  </Text>
                  <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>
                    {[rider.vehicle, rider.plate, rider.rating != null ? `${rider.rating} ★` : null]
                      .filter(Boolean)
                      .join(' · ') || 'On the way'}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {!isDemo ? (
                    <PressableScale onPress={() => setChatOpen(true)}>
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: BRAND }}
                      >
                        <MessageCircle size={16} color="#fff" />
                      </View>
                    </PressableScale>
                  ) : null}
                  {rider.phone ? (
                    <PressableScale onPress={() => Linking.openURL(`tel:${rider.phone}`)}>
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: INK }}
                      >
                        <Phone size={16} color="#fff" />
                      </View>
                    </PressableScale>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}
                >
                  <Bike size={20} color={MUTED} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-display text-[15px]" style={{ fontWeight: '700', color: INK }}>
                    {isDelivered ? 'Order delivered' : 'Finding your rider…'}
                  </Text>
                  <Text className="text-[12px] mt-0.5" style={{ color: MUTED }}>
                    {isDelivered
                      ? 'Thanks for ordering with AtlaasGo.'
                      : 'We’ll assign the nearest available rider.'}
                  </Text>
                </View>
              </>
            )}
          </MotiView>
        )}

        {/* Itemized receipt — auto-expanded when the order was cancelled */}
        {!isDemo && receipt ? (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 320 }}
            className="mt-6"
          >
            <Text
              className="text-[10px] uppercase font-bold mb-2"
              style={{ letterSpacing: 1.2, color: MUTED }}
            >
              Receipt
            </Text>
            <Receipt order={receipt} defaultOpen={isCancelled} />
          </MotiView>
        ) : null}

        {/* Cancel — only while the restaurant hasn't accepted, and only my order */}
        {canCancel && (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 360 }}
            className="mt-4"
          >
            <PressableScale onPress={confirmCancel} disabled={cancelBusy}>
              <View
                className="rounded-2xl py-4 flex-row items-center justify-center bg-white"
                style={{ borderWidth: 1, borderColor: 'rgba(225,29,72,0.35)', opacity: cancelBusy ? 0.5 : 1 }}
              >
                {cancelBusy ? (
                  <ActivityIndicator size="small" color="#E11D48" />
                ) : (
                  <>
                    <XCircle size={16} color="#E11D48" />
                    <Text className="ml-2 text-[14px]" style={{ fontWeight: '700', color: '#E11D48' }}>
                      Cancel order
                    </Text>
                  </>
                )}
              </View>
            </PressableScale>
          </MotiView>
        )}

        {/* Order again — delivered or cancelled orders go back into the cart */}
        {canReorder && (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 360 }}
            className="mt-4"
          >
            <PressableScale onPress={reorder}>
              <View
                className="rounded-2xl py-4 flex-row items-center justify-center"
                style={{ backgroundColor: BRAND }}
              >
                <RotateCcw size={16} color="#fff" strokeWidth={2.5} />
                <Text className="ml-2 text-[14px]" style={{ fontWeight: '700', color: '#fff' }}>
                  Order again
                </Text>
              </View>
            </PressableScale>
          </MotiView>
        )}

        {/* Review — once delivered, rate the restaurant (+ rider, optional) */}
        {!isDemo && isDelivered && id ? (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 400 }}
            className="mt-6"
          >
            <ReviewForm orderId={id} restaurantId={receipt?.items?.[0]?.restaurantId ?? null} />
          </MotiView>
        ) : null}

        {/* Chat entry row */}
        {!isDemo && order ? (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 440 }}
            className="mt-4"
          >
            <PressableScale onPress={() => setChatOpen(true)}>
              <View
                className="rounded-2xl bg-white px-5 py-4 flex-row items-center"
                style={{ borderWidth: 1, borderColor: LINE }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
                >
                  <MessageCircle size={17} color={BRAND} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[14px]" style={{ fontWeight: '700', color: INK }}>
                    Chat about this order
                  </Text>
                  <Text className="text-[12px] mt-0.5" style={{ color: MUTED }}>
                    Message the kitchen or your rider
                  </Text>
                </View>
                <Text className="text-[13px] font-bold" style={{ color: BRAND }}>→</Text>
              </View>
            </PressableScale>
          </MotiView>
        ) : null}

        {!isDemo && __DEV__ && (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 480 }}
            className="mt-6"
          >
            <PressableScale onPress={() => router.push({ pathname: '/driver/[id]', params: { id: id! } })}>
              <View
                className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(26,20,16,0.10)',
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(26,20,16,0.02)',
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Bike size={14} color={MUTED} />
                  <Text
                    className="ml-2 text-[11px] uppercase font-bold"
                    style={{ letterSpacing: 1.2, color: MUTED }}
                  >
                    Dev · view as driver
                  </Text>
                </View>
                <Text className="text-[12px] font-bold" style={{ color: BRAND }}>
                  Open →
                </Text>
              </View>
            </PressableScale>
          </MotiView>
        )}
      </ScrollView>

      {/* Full-screen order chat (customer role) */}
      {chatOpen && id ? (
        <OrderChat orderId={id} role="customer" onClose={() => setChatOpen(false)} />
      ) : null}
    </SafeAreaView>
  );
}

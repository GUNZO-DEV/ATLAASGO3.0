import { useEffect, useMemo, useState } from 'react';
import { MotiView } from 'moti';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Receipt, RotateCcw } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useOrdersList } from '../hooks/useOrdersList';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { supabase } from '../lib/supabase';
import { STAGE_LABELS } from '../lib/theme';

const STATUS_COLOR: Record<string, string> = {
  ordered: '#7A6F66',
  preparing: '#FF8A65',
  enRoute: '#FFB74D',
  outForDelivery: '#34D399',
  arriving: '#FF5722',
  delivered: '#7A6F66',
  cancelled: '#B91C1C',
};

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

/**
 * Customer order history. Orders are scoped by RLS to the signed-in user, so
 * each customer sees only their own. Tap an order to track it live; expand
 * "Details" for the line items; delivered orders can be re-ordered in one tap.
 */
export default function OrdersScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { orders, loading, error } = useOrdersList(30);
  const add = useCart((s) => s.add);

  // The list hook's SELECT doesn't include the `items` jsonb, so fetch it in
  // one batch for the visible ids (items never change after checkout).
  const [itemsById, setItemsById] = useState<Record<string, OrderItemLine[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
      Alert.alert('Nothing to re-add', 'This order has no saved item details.');
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
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
          >
            <ArrowLeft size={18} color="#1A1410" />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: '#FF5722' }}>
          Your orders
        </Text>
        <View style={{ width: 40 }} />
      </MotiView>
    );
  }

  // Signed-out state
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <View className="flex-1 px-6">
          <Header />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
            <Receipt size={30} color="#7A6F66" />
            <Text style={{ fontWeight: '800', fontSize: 20, color: '#1A1410', marginTop: 16 }}>
              Sign in to see orders
            </Text>
            <Text style={{ fontSize: 14, color: '#7A6F66', textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
              Your order history and live tracking appear here once you sign in.
            </Text>
            <PressableScale onPress={() => router.push('/sign-in')}>
              <View style={{ backgroundColor: '#FF5722', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
              </View>
            </PressableScale>
          </View>
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
          className="mt-6 mb-5"
        >
          <Text
            className="font-display text-[28px]"
            style={{ fontWeight: '800', letterSpacing: -0.8, color: '#1A1410', lineHeight: 32 }}
          >
            Your orders
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            Tap any order to track it live.
          </Text>
        </MotiView>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#FF5722" />
          </View>
        ) : error && orders.length === 0 ? (
          <View
            className="rounded-3xl p-6 mt-2"
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(185,28,28,0.25)' }}
          >
            <Text className="font-display text-[16px]" style={{ fontWeight: '700', color: '#1A1410' }}>
              Couldn’t load orders
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: '#7A6F66', lineHeight: 18 }}>
              {error.message}
            </Text>
          </View>
        ) : orders.length === 0 ? (
          <View
            className="rounded-3xl p-6 mt-2"
            style={{ backgroundColor: '#FFF1EB', borderWidth: 1, borderColor: 'rgba(255,87,34,0.15)' }}
          >
            <Text className="font-display text-[16px]" style={{ fontWeight: '700', color: '#1A1410' }}>
              No orders yet
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: '#7A6F66', lineHeight: 18 }}>
              When you place an order it’ll show up here with live tracking.
            </Text>
            <PressableScale onPress={() => router.replace('/')}>
              <View
                className="mt-4 self-start rounded-full px-4 py-2.5 flex-row items-center"
                style={{ backgroundColor: '#FF5722' }}
              >
                <Text className="text-white font-bold text-[13px] mr-1.5">Browse</Text>
                <ArrowRight size={13} color="#fff" />
              </View>
            </PressableScale>
          </View>
        ) : (
          orders.map((o, i) => {
            const color = STATUS_COLOR[o.status] ?? '#7A6F66';
            const isOpen = !!expanded[o.id];
            const lines = itemsById[o.id];
            return (
              <MotiView
                key={o.id}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 320, delay: 80 + i * 50 }}
                className="rounded-3xl mb-3 bg-white"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
              >
                <Pressable
                  onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })}
                  className="p-5 pb-4"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="font-mono text-[11px]" style={{ color: '#7A6F66' }}>
                      #{o.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <View
                      className="rounded-full px-2.5 py-1 flex-row items-center"
                      style={{ backgroundColor: `${color}1A` }}
                    >
                      <View
                        style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color, marginRight: 6 }}
                      />
                      <Text className="text-[10px] font-bold uppercase" style={{ color, letterSpacing: 1 }}>
                        {STAGE_LABELS[o.status]?.title ?? o.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-display text-[16px]" style={{ fontWeight: '700', color: '#1A1410' }} numberOfLines={1}>
                    {o.driverPayload?.headerLandmark || o.landmark || 'Delivery'}
                  </Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-[12px]" style={{ color: '#7A6F66' }}>
                      {new Date(o.createdAt).toLocaleDateString()} · {o.totalDh} dh
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-[12px] font-bold mr-1" style={{ color: '#FF5722' }}>
                        Track
                      </Text>
                      <ArrowRight size={13} color="#FF5722" />
                    </View>
                  </View>
                </Pressable>

                {/* Footer: expand details + (delivered) order-again */}
                <View
                  className="flex-row items-center justify-between px-5 py-3"
                  style={{ borderTopWidth: 1, borderTopColor: 'rgba(26,20,16,0.06)' }}
                >
                  <Pressable
                    onPress={() => setExpanded((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                    hitSlop={8}
                    className="flex-row items-center"
                  >
                    <Text className="text-[11px] font-bold uppercase mr-1" style={{ color: '#7A6F66', letterSpacing: 1 }}>
                      Details
                    </Text>
                    {isOpen ? <ChevronUp size={14} color="#7A6F66" /> : <ChevronDown size={14} color="#7A6F66" />}
                  </Pressable>
                  {o.status === 'delivered' ? (
                    <PressableScale onPress={() => reorder(o.id)}>
                      <View
                        accessibilityLabel="Order again"
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
                      >
                        <RotateCcw size={16} color="#FF5722" strokeWidth={2.5} />
                      </View>
                    </PressableScale>
                  ) : null}
                </View>

                {/* Expanded line items */}
                {isOpen ? (
                  <View className="px-5 pb-4" style={{ gap: 7 }}>
                    {lines === undefined ? (
                      <View className="py-2 items-center">
                        <ActivityIndicator size="small" color="#FF5722" />
                      </View>
                    ) : lines.length === 0 ? (
                      <Text className="text-[13px]" style={{ color: '#7A6F66' }}>
                        No item details saved for this order.
                      </Text>
                    ) : (
                      lines.map((line, idx) => (
                        <View key={`${line.id}-${idx}`} className="flex-row items-center justify-between">
                          <Text className="text-[13px] flex-1 pr-3" style={{ color: '#1A1410' }} numberOfLines={1}>
                            <Text style={{ fontWeight: '700' }}>{line.qty} ×</Text> {line.name}
                          </Text>
                          <Text className="text-[13px] font-bold" style={{ color: '#1A1410' }}>
                            {line.priceDh * line.qty} dh
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </MotiView>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

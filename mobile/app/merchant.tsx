import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  MessageCircle,
  Receipt,
  Store,
  Wallet,
} from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { PendingApplication } from '../components/PendingApplication';
import { OrderChat } from '../components/OrderChat';
import { useAuth } from '../lib/auth';
import { useRoles } from '../hooks/useRoles';
import { useMerchant, type MerchantTicket } from '../hooks/useMerchant';
import { markPreparing } from '../lib/orderActions';

const CREAM = '#FBF7F2';
const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const LINE = 'rgba(26,20,16,0.08)';
const URGENT = '#E11D48';

const STATUS_COLOR: Record<string, string> = {
  ordered: '#FF5722',
  preparing: '#FF8A65',
  enRoute: '#FFB74D',
  outForDelivery: '#34D399',
  arriving: '#059669',
};

function ageMinutes(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.4, color: MUTED }}>
      {children}
    </Text>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <View className="flex-1 rounded-3xl bg-white p-4" style={{ borderWidth: 1, borderColor: LINE }}>
      {icon}
      <Text className="mt-2.5 text-[10px] uppercase font-bold" style={{ letterSpacing: 1, color: MUTED }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontWeight: '900', fontSize: 20, color: INK, letterSpacing: -0.5, marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-[10px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

function TicketCard({
  ticket,
  expanded,
  onToggle,
  onMarkReady,
  marking,
  onChat,
}: {
  ticket: MerchantTicket;
  expanded: boolean;
  onToggle: () => void;
  onMarkReady: () => void;
  marking: boolean;
  onChat: () => void;
}) {
  const age = ageMinutes(ticket.createdAt);
  const urgent = age >= 12;
  const chipColor = STATUS_COLOR[ticket.status] ?? MUTED;

  return (
    <View
      className="rounded-3xl bg-white overflow-hidden"
      style={{ borderWidth: 1.5, borderColor: urgent ? 'rgba(225,29,72,0.45)' : LINE }}
    >
      {/* Header — always visible, toggles the body */}
      <Pressable onPress={onToggle}>
        <View className="flex-row items-center p-4">
          <Text style={{ fontWeight: '900', fontSize: 15, color: INK, letterSpacing: 0.3 }}>
            #{ticket.id.slice(0, 6).toUpperCase()}
          </Text>
          <View className="ml-2.5 rounded-full px-2.5 py-1" style={{ backgroundColor: `${chipColor}1F` }}>
            <Text className="text-[10px] font-bold uppercase" style={{ color: chipColor, letterSpacing: 0.8 }}>
              {ticket.status}
            </Text>
          </View>
          <View className="flex-1" />
          <View
            className="flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: urgent ? 'rgba(225,29,72,0.12)' : 'rgba(26,20,16,0.06)' }}
          >
            <Clock size={11} color={urgent ? URGENT : MUTED} />
            <Text className="ml-1 text-[11px] font-bold" style={{ color: urgent ? URGENT : MUTED }}>
              {age}m
            </Text>
          </View>
          <View className="ml-2">
            {expanded ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View className="px-4 pb-4" style={{ borderTopWidth: 1, borderTopColor: LINE }}>
          {/* Items */}
          <View className="mt-3.5">
            <SectionLabel>Items</SectionLabel>
            {ticket.items.length === 0 ? (
              <Text className="text-[13px] mt-1.5" style={{ color: MUTED }}>
                No item details on this ticket.
              </Text>
            ) : (
              <View className="mt-1.5" style={{ gap: 4 }}>
                {ticket.items.map((item, i) => (
                  <View key={i} className="flex-row items-center">
                    <Text style={{ fontWeight: '900', fontSize: 13, color: BRAND, width: 32 }}>{item.qty}×</Text>
                    <Text className="text-[14px] font-bold flex-1" style={{ color: INK }} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Delivery */}
          <View className="mt-4">
            <SectionLabel>Delivery to</SectionLabel>
            <View className="flex-row items-center mt-1.5">
              <MapPin size={13} color={BRAND} />
              <Text className="ml-1.5 text-[14px] font-bold flex-1" style={{ color: INK }} numberOfLines={2}>
                {ticket.landmark}
              </Text>
            </View>
            {!!ticket.deliveryNotes && (
              <Text className="text-[12px] mt-1.5" style={{ color: MUTED, fontStyle: 'italic' }}>
                Note: {ticket.deliveryNotes}
              </Text>
            )}
          </View>

          {/* Total */}
          <View
            className="flex-row items-center justify-between mt-4 rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'rgba(26,20,16,0.04)' }}
          >
            <Text className="text-[12px] font-bold uppercase" style={{ color: MUTED, letterSpacing: 1 }}>
              Total
            </Text>
            <Text style={{ fontWeight: '900', fontSize: 17, color: INK }}>{ticket.totalDh} dh</Text>
          </View>

          {/* Actions */}
          <PressableScale onPress={onChat}>
            <View
              className="flex-row items-center justify-center rounded-2xl py-3.5 mt-3 bg-white"
              style={{ borderWidth: 1.5, borderColor: 'rgba(26,20,16,0.14)' }}
            >
              <MessageCircle size={15} color={INK} />
              <Text className="ml-2 text-[14px] font-bold" style={{ color: INK }}>
                Chat with customer
              </Text>
            </View>
          </PressableScale>

          {ticket.status === 'ordered' && (
            <PressableScale onPress={onMarkReady} disabled={marking}>
              <View
                className="flex-row items-center justify-center rounded-2xl py-3.5 mt-2.5"
                style={{ backgroundColor: BRAND, opacity: marking ? 0.6 : 1 }}
              >
                {marking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={15} color="#fff" strokeWidth={3} />
                    <Text className="ml-2 text-white font-bold text-[14px]">Mark ready for pickup</Text>
                  </>
                )}
              </View>
            </PressableScale>
          )}
        </View>
      )}
    </View>
  );
}

export default function MerchantScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isMerchant, isAdmin, loading: rolesLoading } = useRoles();
  const { tickets, liveCount, revenueTodayDh, ticketsToday, loading, error, refresh } = useMerchant();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  // Re-render every 30s so ticket ages (and the 12-minute urgency flip) stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMarkReady(orderId: string) {
    setMarking(orderId);
    const res = await markPreparing(orderId);
    setMarking(null);
    if (!res.ok) {
      Alert.alert('Could not update', res.error);
      return;
    }
    refresh();
  }

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1, borderColor: LINE }}
          >
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <View className="flex-row items-center">
          <Store size={13} color={BRAND} />
          <Text className="ml-1.5 text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>
            Merchant
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  // Auth / roles still resolving
  if (authLoading || (user && rolesLoading)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      </SafeAreaView>
    );
  }

  // Signed out
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Store size={30} color={MUTED} />
          <Text style={{ fontWeight: '900', fontSize: 20, color: INK, marginTop: 16 }}>Merchant POS</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in with your partner account to manage live orders and your kitchen queue.
          </Text>
          <PressableScale onPress={() => router.push('/sign-in')}>
            <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  // Signed in but not a merchant/admin — show the partner application state.
  if (!isMerchant && !isAdmin) {
    return <PendingApplication kind="partner" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="mt-6">
          <Text style={{ fontWeight: '900', fontSize: 28, color: INK, letterSpacing: -0.8 }}>
            Your kitchen,{'\n'}at a glance.
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: MUTED }}>
            Live tickets and today's numbers — updates in realtime.
          </Text>
        </View>

        {/* KPI strip */}
        <View className="flex-row mt-5" style={{ gap: 10 }}>
          <KpiCard
            icon={<Wallet size={17} color={BRAND} />}
            label="Revenue"
            value={`${revenueTodayDh.toLocaleString()} dh`}
            hint="today"
          />
          <KpiCard
            icon={<Receipt size={17} color={BRAND} />}
            label="Tickets"
            value={String(ticketsToday)}
            hint="today"
          />
          <KpiCard
            icon={<ChefHat size={17} color={BRAND} />}
            label="Live"
            value={String(liveCount)}
            hint="in the queue"
          />
        </View>

        {/* KDS queue */}
        <View className="mt-8 mb-3 flex-row items-center">
          <ChefHat size={16} color={BRAND} />
          <Text className="ml-2" style={{ fontWeight: '900', fontSize: 18, color: INK, letterSpacing: -0.4 }}>
            Kitchen display
          </Text>
        </View>

        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator color={BRAND} />
          </View>
        ) : error ? (
          <View className="rounded-3xl bg-white p-5" style={{ borderWidth: 1, borderColor: 'rgba(225,29,72,0.3)' }}>
            <Text className="text-[14px] font-bold" style={{ color: URGENT }}>
              Couldn't load the queue
            </Text>
            <Text className="text-[13px] mt-1" style={{ color: MUTED }}>
              {error}
            </Text>
            <PressableScale onPress={refresh}>
              <View className="self-start rounded-full px-5 py-2.5 mt-3" style={{ backgroundColor: BRAND }}>
                <Text className="text-white font-bold text-[13px]">Retry</Text>
              </View>
            </PressableScale>
          </View>
        ) : tickets.length === 0 ? (
          <View className="rounded-3xl bg-white p-6" style={{ borderWidth: 1, borderColor: LINE }}>
            <ChefHat size={26} color={MUTED} />
            <Text style={{ fontWeight: '900', fontSize: 17, color: INK, marginTop: 12 }}>Queue empty</Text>
            <Text className="mt-1.5 text-[13px]" style={{ color: MUTED, lineHeight: 19 }}>
              New tickets land here in realtime as customers order. Nothing to prep right now.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {tickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                expanded={expandedIds.has(t.id)}
                onToggle={() => toggleExpanded(t.id)}
                onMarkReady={() => handleMarkReady(t.id)}
                marking={marking === t.id}
                onChat={() => setChatOrderId(t.id)}
              />
            ))}
          </View>
        )}

        {/* Orders — compact list linking to tracking */}
        {!loading && !error && tickets.length > 0 && (
          <>
            <View className="mt-8 mb-3 flex-row items-center">
              <Receipt size={16} color={BRAND} />
              <Text className="ml-2" style={{ fontWeight: '900', fontSize: 18, color: INK, letterSpacing: -0.4 }}>
                Orders
              </Text>
            </View>
            <View className="rounded-3xl bg-white overflow-hidden" style={{ borderWidth: 1, borderColor: LINE }}>
              {tickets.map((o, i) => {
                const chipColor = STATUS_COLOR[o.status] ?? MUTED;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })}
                  >
                    <View
                      className="flex-row items-center px-4 py-3.5"
                      style={i > 0 ? { borderTopWidth: 1, borderTopColor: LINE } : undefined}
                    >
                      <Text style={{ fontWeight: '900', fontSize: 13, color: INK, width: 72 }}>
                        #{o.id.slice(0, 6).toUpperCase()}
                      </Text>
                      <Text className="text-[13px] flex-1 mr-2" style={{ color: MUTED }} numberOfLines={1}>
                        {o.landmark}
                      </Text>
                      <Text className="text-[10px] font-bold uppercase mr-2" style={{ color: chipColor, letterSpacing: 0.8 }}>
                        {o.status}
                      </Text>
                      <ArrowRight size={14} color={MUTED} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Customer chat overlay */}
      {chatOrderId !== null && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
        >
          <OrderChat orderId={chatOrderId} role="merchant" onClose={() => setChatOrderId(null)} />
        </View>
      )}
    </SafeAreaView>
  );
}

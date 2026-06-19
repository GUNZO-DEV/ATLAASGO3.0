import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bike, Receipt, ShieldX, Store, Wallet, X } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useRoles } from '../hooks/useRoles';
import {
  useAdminOrders,
  useApplications,
  useAvailableRiders,
  type AdminOrder,
  type AdminOrderFilter,
} from '../hooks/useAdmin';
import { markPreparing, cancelOrder, assignRider } from '../lib/orderActions';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const ADMIN = '#7C3AED';

const STATUS_COLOR: Record<string, { c: string; bg: string }> = {
  ordered: { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)' },
  preparing: { c: '#C66B1F', bg: 'rgba(255,138,101,0.16)' },
  enRoute: { c: '#C66B1F', bg: 'rgba(255,138,101,0.16)' },
  outForDelivery: { c: '#059669', bg: 'rgba(16,185,129,0.12)' },
  arriving: { c: '#FF5722', bg: 'rgba(255,87,34,0.12)' },
  delivered: { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)' },
  cancelled: { c: '#B91C1C', bg: 'rgba(239,68,68,0.10)' },
};

const FILTERS: AdminOrderFilter[] = ['live', 'all', 'ordered', 'preparing', 'outForDelivery', 'arriving', 'delivered', 'cancelled'];

function label(s: string) {
  return s.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());
}

export default function AdminScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [tab, setTab] = useState<'orders' | 'applications'>('orders');
  const [filter, setFilter] = useState<AdminOrderFilter>('live');
  const { orders, loading: ordersLoading } = useAdminOrders(filter);
  const { rider: riderApps, restaurant: restoApps, loading: appsLoading, decide } = useApplications();

  const [assignFor, setAssignFor] = useState<string | null>(null);

  const stats = useMemo(() => {
    const live = orders.filter((o) => ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'].includes(o.status));
    const today = orders.filter((o) => new Date(o.createdAt).toDateString() === new Date().toDateString());
    const revenue = today.reduce((acc, o) => acc + o.totalDh, 0);
    const openApps = [...riderApps, ...restoApps].filter((a) => a.status === 'submitted' || a.status === 'reviewing').length;
    return { live: live.length, today: today.length, revenue, openApps };
  }, [orders, riderApps, restoApps]);

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View className="w-10 h-10 rounded-full items-center justify-center bg-white" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}>
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: ADMIN }}>Admin</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  // Auth / role gate
  if (authLoading || rolesLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={ADMIN} /></View>
      </SafeAreaView>
    );
  }
  if (!user || !isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <ShieldX size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Admins only</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            You don’t have access to the admin panel.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mt-6 mb-5">
          <Text className="font-display text-[28px]" style={{ fontWeight: '800', letterSpacing: -0.8, color: INK }}>
            Platform control
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: MUTED }}>Orders & applications — the levers that matter.</Text>
        </View>

        {/* KPIs */}
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <Kpi icon={<Bike size={16} color={BRAND} />} label="Live orders" value={`${stats.live}`} />
          <Kpi icon={<Receipt size={16} color={ADMIN} />} label="Orders today" value={`${stats.today}`} />
          <Kpi icon={<Wallet size={16} color="#059669" />} label="Revenue today" value={`${stats.revenue} dh`} />
          <Kpi icon={<Store size={16} color="#C66B1F" />} label="Open apps" value={`${stats.openApps}`} />
        </View>

        {/* Tabs */}
        <View className="flex-row mt-6 mb-4" style={{ gap: 8 }}>
          {(['orders', 'applications'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1 }}>
              <View className="py-2.5 rounded-full items-center" style={{ backgroundColor: tab === t ? INK : '#fff', borderWidth: 1, borderColor: tab === t ? INK : 'rgba(26,20,16,0.10)' }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: tab === t ? '#fff' : INK }}>
                  {t === 'orders' ? 'Orders' : 'Applications'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {tab === 'orders' ? (
          <>
            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 8 }}>
              {FILTERS.map((f) => (
                <Pressable key={f} onPress={() => setFilter(f)}>
                  <View className="px-3.5 py-2 rounded-full" style={{ backgroundColor: filter === f ? BRAND : '#fff', borderWidth: 1, borderColor: filter === f ? BRAND : 'rgba(26,20,16,0.10)' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: filter === f ? '#fff' : MUTED }}>
                      {f === 'live' ? 'Live' : f === 'all' ? 'All' : label(f)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {ordersLoading ? (
              <View className="py-10 items-center"><ActivityIndicator color={BRAND} /></View>
            ) : orders.length === 0 ? (
              <Text className="text-[14px]" style={{ color: MUTED }}>No orders match this filter.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {orders.map((o) => (
                  <AdminOrderRow key={o.id} order={o} onAssign={() => setAssignFor(o.id)} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={{ gap: 22 }}>
            <ApplicationsBlock title="Rider applications" loading={appsLoading} items={riderApps} onDecide={(id, n) => decide('rider', id, n)} />
            <ApplicationsBlock title="Restaurant applications" loading={appsLoading} items={restoApps} onDecide={(id, n) => decide('restaurant', id, n)} />
          </View>
        )}
      </ScrollView>

      {/* Assign-rider modal */}
      <AssignRiderModal orderId={assignFor} onClose={() => setAssignFor(null)} />
    </SafeAreaView>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="bg-white rounded-2xl p-4" style={{ width: '47.5%', borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
      <View className="w-8 h-8 rounded-full items-center justify-center mb-2" style={{ backgroundColor: 'rgba(26,20,16,0.05)' }}>{icon}</View>
      <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 0.6, color: MUTED }}>{label}</Text>
      <Text className="font-display mt-1 text-[22px]" style={{ fontWeight: '800', color: INK, letterSpacing: -0.5 }}>{value}</Text>
    </View>
  );
}

function AdminOrderRow({ order, onAssign }: { order: AdminOrder; onAssign: () => void }) {
  const sty = STATUS_COLOR[order.status] ?? { c: MUTED, bg: 'rgba(0,0,0,0.06)' };
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    const res = await markPreparing(order.id);
    setBusy(false);
    if (!res.ok) Alert.alert('Could not accept', res.error);
  }
  async function cancel() {
    setBusy(true);
    const res = await cancelOrder(order.id);
    setBusy(false);
    if (!res.ok) Alert.alert('Could not cancel', res.error);
  }

  return (
    <View className="bg-white rounded-2xl p-4" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[11px]" style={{ color: MUTED }}>
          #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: sty.bg }}>
          <Text className="text-[10px] font-bold uppercase" style={{ color: sty.c, letterSpacing: 0.8 }}>{label(order.status)}</Text>
        </View>
      </View>
      <Text className="text-[15px] font-bold mt-2" style={{ color: INK }} numberOfLines={1}>
        {order.title} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
      </Text>
      <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>{order.landmark}</Text>
      <View className="flex-row items-center justify-between mt-3">
        <Text className="font-display text-[16px]" style={{ fontWeight: '800', color: BRAND }}>{order.totalDh} dh</Text>
        <View className="flex-row" style={{ gap: 8 }}>
          {order.status === 'ordered' && <ActionBtn label="Accept" onPress={accept} busy={busy} kind="primary" />}
          {order.status === 'preparing' && <ActionBtn label="Assign" onPress={onAssign} kind="primary" />}
          {['ordered', 'preparing'].includes(order.status) && <ActionBtn label="Cancel" onPress={cancel} busy={busy} kind="danger" />}
        </View>
      </View>
    </View>
  );
}

function ActionBtn({ label, onPress, busy, kind }: { label: string; onPress: () => void; busy?: boolean; kind: 'primary' | 'danger' | 'ghost' }) {
  const bg = kind === 'primary' ? BRAND : kind === 'danger' ? 'transparent' : '#fff';
  const fg = kind === 'danger' ? '#B91C1C' : kind === 'primary' ? '#fff' : INK;
  return (
    <Pressable onPress={onPress} disabled={busy}>
      <View className="rounded-full px-3.5 py-2" style={{ backgroundColor: bg, borderWidth: kind === 'danger' ? 1 : 0, borderColor: 'rgba(185,28,28,0.3)', opacity: busy ? 0.6 : 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{busy ? '…' : label}</Text>
      </View>
    </Pressable>
  );
}

function ApplicationsBlock({
  title,
  loading,
  items,
  onDecide,
}: {
  title: string;
  loading: boolean;
  items: { id: string; primary: string; secondary: string; contact: string; status: string }[];
  onDecide: (id: string, next: 'approved' | 'rejected') => Promise<{ ok: boolean; error?: string }>;
}) {
  return (
    <View>
      <Text className="font-display text-[17px] mb-3" style={{ fontWeight: '800', color: INK }}>{title}</Text>
      {loading ? (
        <View className="py-6 items-center"><ActivityIndicator color={ADMIN} /></View>
      ) : items.length === 0 ? (
        <Text className="text-[13px]" style={{ color: MUTED }}>No applications.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((it) => (
            <AppCard key={it.id} item={it} onDecide={onDecide} />
          ))}
        </View>
      )}
    </View>
  );
}

function AppCard({
  item,
  onDecide,
}: {
  item: { id: string; primary: string; secondary: string; contact: string; status: string };
  onDecide: (id: string, next: 'approved' | 'rejected') => Promise<{ ok: boolean; error?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const decided = item.status === 'approved' || item.status === 'rejected';
  const statusColor = item.status === 'approved' ? '#059669' : item.status === 'rejected' ? '#B91C1C' : '#C66B1F';

  async function act(next: 'approved' | 'rejected') {
    setBusy(true);
    const res = await onDecide(item.id, next);
    setBusy(false);
    if (!res.ok) Alert.alert('Failed', res.error ?? 'Could not update application');
  }

  return (
    <View className="bg-white rounded-2xl p-4" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[15px] font-bold" style={{ color: INK }} numberOfLines={1}>{item.primary}</Text>
          <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>{item.secondary}</Text>
          <Text className="font-mono text-[11px] mt-1" style={{ color: MUTED }} numberOfLines={1}>{item.contact}</Text>
        </View>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${statusColor}1A` }}>
          <Text className="text-[10px] font-bold uppercase" style={{ color: statusColor, letterSpacing: 0.6 }}>{item.status}</Text>
        </View>
      </View>
      {!decided && (
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <ActionBtn label="Approve" onPress={() => act('approved')} busy={busy} kind="primary" />
          <ActionBtn label="Reject" onPress={() => act('rejected')} busy={busy} kind="danger" />
        </View>
      )}
    </View>
  );
}

function AssignRiderModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const { riders } = useAvailableRiders();
  const [assigning, setAssigning] = useState<string | null>(null);

  async function pick(riderUserId: string) {
    if (!orderId) return;
    setAssigning(riderUserId);
    const res = await assignRider(orderId, riderUserId);
    setAssigning(null);
    if (!res.ok) {
      Alert.alert('Could not assign', res.error);
      return;
    }
    onClose();
    Alert.alert('Rider assigned', 'They’ll see it in Driver mode and can accept the trip.');
  }

  return (
    <Modal visible={!!orderId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: '#FBF7F2', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '70%' }}>
          <View className="flex-row items-center justify-between mb-5">
            <Text style={{ fontWeight: '800', fontSize: 20, color: INK }}>Assign a rider</Text>
            <PressableScale onPress={onClose}>
              <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}>
                <X size={16} color={INK} />
              </View>
            </PressableScale>
          </View>
          {riders.length === 0 ? (
            <Text className="text-[13px]" style={{ color: MUTED, lineHeight: 19 }}>
              No riders are online right now. A rider must toggle online before they appear here. (They can also self-claim
              open orders from the pool in Driver mode.)
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 10 }}>
              <View style={{ gap: 10 }}>
                {riders.map((r) => (
                  <Pressable key={r.userId} onPress={() => pick(r.userId)} disabled={assigning === r.userId}>
                    <View className="bg-white rounded-2xl p-4 flex-row items-center justify-between" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)', opacity: assigning === r.userId ? 0.6 : 1 }}>
                      <View className="flex-row items-center flex-1">
                        <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(255,87,34,0.12)' }}>
                          <Bike size={16} color={BRAND} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[14px] font-bold" style={{ color: INK }} numberOfLines={1}>{r.vehicle ?? 'Rider'} · {r.plate ?? '—'}</Text>
                          <Text className="text-[12px] mt-0.5" style={{ color: MUTED }}>⭐ {r.rating.toFixed(1)} · {r.totalTrips} trips</Text>
                        </View>
                      </View>
                      {assigning === r.userId ? <ActivityIndicator color={BRAND} /> : <Text className="text-[13px] font-bold" style={{ color: BRAND }}>Assign</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

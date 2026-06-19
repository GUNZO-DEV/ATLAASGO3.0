import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CheckCircle2,
  History,
  Lock,
  MapPin,
  Navigation,
  Star,
  TrendingUp,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { PendingApplication } from '../../components/PendingApplication';
import { useAuth } from '../../lib/auth';
import { useRoles } from '../../hooks/useRoles';
import { useDriverAssignments } from '../../hooks/useDriverAssignments';
import { useAvailableOrders } from '../../hooks/useAvailableOrders';
import { useRiderProfile, useRiderStats, type RiderStatus } from '../../hooks/useRiderProfile';
import { acceptAssignment, claimOrder, rejectAssignment } from '../../lib/orderActions';
import { STAGE_LABELS } from '../../lib/theme';

const INK = '#0E0A07';
const CREAM = '#FBF7F2';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const GREEN = '#34D399';
const AMBER = '#FFB74D';

const STAGE_COLOR: Record<string, string> = {
  ordered: '#7A6F66',
  preparing: '#FF8A65',
  enRoute: '#FFB74D',
  outForDelivery: '#34D399',
  arriving: '#FF5722',
};

// The three states the rider can set themselves. 'busy' is dispatch-set while
// a trip runs — we render it as Online in the toggle but flag it in the pill.
const STATUS_OPTIONS: { key: RiderStatus; label: string; color: string }[] = [
  { key: 'online', label: 'Online', color: GREEN },
  { key: 'on_break', label: 'Break', color: AMBER },
  { key: 'offline', label: 'Offline', color: MUTED },
];

function statusMeta(status: RiderStatus | undefined): { label: string; color: string } {
  switch (status) {
    case 'online': return { label: 'Online', color: GREEN };
    case 'busy': return { label: 'On a trip', color: AMBER };
    case 'on_break': return { label: 'On break', color: AMBER };
    default: return { label: 'Offline', color: MUTED };
  }
}

function SectionLabel({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <View className="mt-8 mb-3 flex-row items-center">
      {icon}
      <Text className={icon ? 'ml-1.5 font-display text-[18px]' : 'font-display text-[18px]'} style={{ fontWeight: '800', color: CREAM }}>
        {title}
      </Text>
    </View>
  );
}

function KpiCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <View
      className="rounded-2xl p-4"
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {icon}
      <Text className="mt-2.5 text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: MUTED }}>
        {label}
      </Text>
      <Text className="font-display mt-1 text-[20px]" style={{ fontWeight: '800', color: CREAM, letterSpacing: -0.4 }}>
        {value}
      </Text>
      {trend ? (
        <Text className="mt-0.5 text-[11px]" style={{ color: MUTED }}>{trend}</Text>
      ) : null}
    </View>
  );
}

export default function DriverDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isRider, loading: rolesLoading } = useRoles();
  const { jobs, loading, error } = useDriverAssignments();
  const { orders: pool, loading: poolLoading, refresh: refreshPool } = useAvailableOrders();
  const { profile, loading: profileLoading, setStatus } = useRiderProfile();
  const { todayDh, weekDh, tripsToday, history, loading: statsLoading } = useRiderStats();

  const [claiming, setClaiming] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  // Pending = admin assigned, rider hasn't accepted yet (rejected assignments
  // get is_active=false, so active+unaccepted is exactly the pending set).
  const pendingJobs = useMemo(() => jobs.filter((j) => !j.acceptedAt), [jobs]);
  const activeJobs = useMemo(() => jobs.filter((j) => !!j.acceptedAt), [jobs]);

  const currentStatus: RiderStatus = profile?.status ?? 'offline';
  const pill = statusMeta(profileLoading ? undefined : currentStatus);

  async function handleStatus(next: RiderStatus) {
    if (statusBusy || next === currentStatus) return;
    setStatusBusy(true);
    const res = await setStatus(next);
    setStatusBusy(false);
    if (!res.ok) Alert.alert('Could not update status', res.error);
  }

  async function handleClaim(orderId: string) {
    if (!user) return;
    setClaiming(orderId);
    const res = await claimOrder(orderId, user.id);
    setClaiming(null);
    if (!res.ok) {
      Alert.alert('Could not claim', res.error);
      return;
    }
    // The order now has an active assignment, so it moves into "Your deliveries"
    // via the realtime subscription. Refresh the pool to drop it from here.
    refreshPool();
    Alert.alert('Trip claimed', 'It’s now in “Your deliveries” — tap it to manage and advance the order.');
  }

  async function handleAccept(orderId: string) {
    if (!user || accepting) return;
    setAccepting(orderId);
    const res = await acceptAssignment(orderId, user.id);
    setAccepting(null);
    if (!res.ok) {
      Alert.alert('Could not accept', res.error);
      return;
    }
    Alert.alert('Trip accepted', 'Head to the restaurant — it’s now in “Your deliveries”.');
  }

  async function handleDeclineConfirm() {
    const orderId = declineTarget;
    const reason = declineReason.trim();
    if (!user || !orderId || !reason || declining) return;
    setDeclining(true);
    const res = await rejectAssignment(orderId, user.id, reason);
    setDeclining(false);
    if (!res.ok) {
      Alert.alert('Could not decline', res.error);
      return;
    }
    setDeclineTarget(null);
    setDeclineReason('');
    // The order has no active assignment anymore → back to the dispatch pool.
    refreshPool();
  }

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3">
        <PressableScale onPress={() => router.back()}>
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={18} color={CREAM} />
          </View>
        </PressableScale>
        <View className="flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: `${pill.color}1F` }}>
          <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: pill.color, marginRight: 7 }} />
          <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.5, color: pill.color }}>
            Driver · {pill.label}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  // Signed-out
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: INK }} edges={['top']}>
        <View className="px-6 flex-1">
          <Header />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
            <Navigation size={30} color="#FF8A65" />
            <Text style={{ color: CREAM, fontWeight: '800', fontSize: 20, marginTop: 16 }}>Sign in to drive</Text>
            <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
              Sign in with your rider account to see delivery assignments.
            </Text>
            <PressableScale onPress={() => router.push('/sign-in')}>
              <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Signed in but NOT an approved rider — show their application status (in
  // review / rejected / needs info), or the pitch + apply CTA when they have
  // no application on file. Mirrors the web RoleGate behavior.
  if (!authLoading && !rolesLoading && user && !isRider) {
    return <PendingApplication kind="rider" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: INK }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Header />

        <View className="mt-6">
          <Text className="font-display text-[28px]" style={{ fontWeight: '800', letterSpacing: -0.8, color: CREAM }}>
            Drive & earn
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: MUTED }}>
            {currentStatus === 'online' || currentStatus === 'busy'
              ? 'You’re visible to dispatch. New trips land below in real time.'
              : currentStatus === 'on_break'
                ? 'On break — dispatch won’t send you new trips until you go online.'
                : 'You’re offline. Go online to start receiving trips from dispatch.'}
          </Text>
        </View>

        {/* Online / Break / Offline toggle — writes riders.status, which is
            what admin dispatch filters on when handing out orders. */}
        <View
          className="mt-5 flex-row rounded-2xl p-1.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = opt.key === currentStatus || (opt.key === 'online' && currentStatus === 'busy');
            return (
              <Pressable key={opt.key} onPress={() => handleStatus(opt.key)} disabled={statusBusy} style={{ flex: 1 }}>
                <View
                  className="rounded-xl py-2.5 flex-row items-center justify-center"
                  style={{ backgroundColor: active ? `${opt.color}26` : 'transparent', opacity: statusBusy ? 0.6 : 1 }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: active ? opt.color : 'rgba(255,255,255,0.18)', marginRight: 6 }} />
                  <Text className="text-[12px] font-bold" style={{ color: active ? opt.color : MUTED, letterSpacing: 0.3 }}>
                    {opt.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* KPI grid */}
        <View className="mt-4" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <KpiCard
            icon={<Wallet size={16} color="#FF8A65" />}
            label="Today"
            value={statsLoading ? '—' : `${todayDh} dh`}
            trend={statsLoading ? undefined : tripsToday > 0 ? `${tripsToday} ${tripsToday === 1 ? 'delivery' : 'deliveries'}` : 'Get rolling'}
          />
          <KpiCard
            icon={<TrendingUp size={16} color={GREEN} />}
            label="This week"
            value={statsLoading ? '—' : `${weekDh} dh`}
            trend="Last 7 days"
          />
          <KpiCard
            icon={<Star size={16} color={AMBER} />}
            label="Rating"
            value={profileLoading ? '—' : (profile?.rating ?? 5.0).toFixed(1)}
            trend={profileLoading ? undefined : `${profile?.totalTrips ?? 0} lifetime trips`}
          />
          <KpiCard
            icon={<Bike size={16} color={BRAND} />}
            label="Total earned"
            value={profileLoading ? '—' : `${profile?.totalEarningsDh ?? 0} dh`}
            trend="All time"
          />
        </View>

        {/* Pending requests — assigned by dispatch, awaiting accept/decline */}
        <SectionLabel icon={<Zap size={15} color={BRAND} />} title={`Pending requests${pendingJobs.length > 0 ? ` (${pendingJobs.length})` : ''}`} />
        {loading ? (
          <View className="py-6 items-center"><ActivityIndicator color={BRAND} /></View>
        ) : pendingJobs.length === 0 ? (
          <Text className="text-[13px]" style={{ color: MUTED, lineHeight: 19 }}>
            No pending requests. When dispatch assigns you an order it shows up here to accept or decline.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {pendingJobs.map((job) => (
              <View
                key={job.assignmentId}
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'rgba(255,87,34,0.08)', borderWidth: 1, borderColor: 'rgba(255,87,34,0.35)' }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="rounded-full px-2.5 py-1 flex-row items-center" style={{ backgroundColor: 'rgba(255,87,34,0.18)' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: BRAND, marginRight: 6 }} />
                    <Text className="text-[10px] font-bold uppercase" style={{ color: '#FF8A65', letterSpacing: 1 }}>
                      Assigned to you
                    </Text>
                  </View>
                  <Text className="text-[15px] font-bold" style={{ color: '#FF8A65' }}>{job.totalDh} dh</Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <MapPin size={15} color="#FF8A65" />
                  <Text className="ml-1.5 text-[15px] font-bold flex-1" style={{ color: CREAM }} numberOfLines={1}>
                    {job.landmark}
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 8 }}>
                  <Pressable onPress={() => handleAccept(job.orderId)} disabled={accepting === job.orderId} style={{ flex: 1 }}>
                    <View className="rounded-full py-3 items-center flex-row justify-center" style={{ backgroundColor: GREEN, opacity: accepting === job.orderId ? 0.6 : 1 }}>
                      {accepting === job.orderId ? (
                        <ActivityIndicator color={INK} />
                      ) : (
                        <>
                          <CheckCircle2 size={15} color={INK} strokeWidth={2.5} />
                          <Text className="ml-1.5 font-bold text-[14px]" style={{ color: INK }}>Accept</Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => { setDeclineTarget(job.orderId); setDeclineReason(''); }}
                    disabled={accepting === job.orderId}
                    style={{ flex: 1 }}
                  >
                    <View className="rounded-full py-3 items-center flex-row justify-center" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                      <XCircle size={15} color="#FCA5A5" />
                      <Text className="ml-1.5 font-bold text-[14px]" style={{ color: '#FCA5A5' }}>Decline</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Assigned / active jobs */}
        <SectionLabel icon={<Bike size={15} color={GREEN} />} title="Your deliveries" />
        {loading ? (
          <View className="py-6 items-center"><ActivityIndicator color={BRAND} /></View>
        ) : error ? (
          <Text className="text-[13px]" style={{ color: '#FCA5A5' }}>Couldn’t load assignments: {error}</Text>
        ) : activeJobs.length === 0 ? (
          <View
            className="rounded-3xl p-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <Bike size={26} color="#FF8A65" />
            <Text className="font-display text-[17px] mt-3" style={{ fontWeight: '800', color: CREAM }}>
              No active deliveries
            </Text>
            <Text className="mt-1.5 text-[13px]" style={{ color: MUTED, lineHeight: 19 }}>
              Accept a pending request above, or claim an open trip from the pool below. Active trips show
              here in real time — tap one to manage and advance it.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {activeJobs.map((job) => {
              const color = STAGE_COLOR[job.status] ?? MUTED;
              return (
                <Pressable key={job.assignmentId} onPress={() => router.push({ pathname: '/driver/[id]', params: { id: job.orderId } })}>
                  <View className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="rounded-full px-2.5 py-1 flex-row items-center" style={{ backgroundColor: `${GREEN}26` }}>
                        <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: GREEN, marginRight: 6 }} />
                        <Text className="text-[10px] font-bold uppercase" style={{ color: GREEN, letterSpacing: 1 }}>
                          In progress
                        </Text>
                      </View>
                      <Text className="text-[15px] font-bold" style={{ color: '#FF8A65' }}>{job.totalDh} dh</Text>
                    </View>
                    <View className="flex-row items-center">
                      <MapPin size={15} color="#FF8A65" />
                      <Text className="ml-1.5 text-[15px] font-bold flex-1" style={{ color: CREAM }} numberOfLines={1}>
                        {job.landmark}
                      </Text>
                      <ArrowRight size={16} color={MUTED} />
                    </View>
                    <Text className="mt-1.5 text-[11px] uppercase font-bold" style={{ color, letterSpacing: 1 }}>
                      {STAGE_LABELS[job.status]?.title ?? job.status}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Available pool */}
        <SectionLabel icon={<Zap size={15} color={AMBER} />} title="Available now" />
        {poolLoading ? (
          <View className="py-6 items-center"><ActivityIndicator color={AMBER} /></View>
        ) : pool.length === 0 ? (
          <Text className="text-[13px]" style={{ color: MUTED, lineHeight: 19 }}>
            No open trips in the pool right now. This updates in real time — sit tight.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {pool.map((o) => (
              <View key={o.id} className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,183,77,0.22)' }}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] uppercase font-bold" style={{ color: AMBER, letterSpacing: 1 }}>
                    #{o.id.slice(0, 6).toUpperCase()} · pool
                  </Text>
                  <Text className="text-[15px] font-bold" style={{ color: '#FF8A65' }}>{o.totalDh} dh</Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <MapPin size={15} color={AMBER} />
                  <Text className="ml-1.5 text-[15px] font-bold flex-1" style={{ color: CREAM }} numberOfLines={1}>
                    {o.landmark}
                  </Text>
                </View>
                <Pressable onPress={() => handleClaim(o.id)} disabled={claiming === o.id}>
                  <View className="rounded-full py-3 items-center flex-row justify-center" style={{ backgroundColor: BRAND, opacity: claiming === o.id ? 0.6 : 1 }}>
                    {claiming === o.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text className="text-white font-bold text-[14px]">Claim this trip</Text>
                        <ArrowRight size={15} color="#fff" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* History — last 20 closed assignments */}
        <SectionLabel icon={<History size={15} color={MUTED} />} title="History" />
        {statsLoading ? (
          <View className="py-6 items-center"><ActivityIndicator color={MUTED} /></View>
        ) : history.length === 0 ? (
          <Text className="text-[13px]" style={{ color: MUTED, lineHeight: 19 }}>
            No closed trips yet — deliveries you complete (or decline) land here.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {history.map((h) => {
              const delivered = !!h.deliveredAt;
              const when = new Date(h.deliveredAt ?? h.rejectedAt ?? h.assignedAt);
              return (
                <View
                  key={h.assignmentId}
                  className="flex-row items-center rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: delivered ? `${GREEN}1F` : 'rgba(252,165,165,0.12)' }}>
                    {delivered ? <CheckCircle2 size={16} color={GREEN} /> : <XCircle size={16} color="#FCA5A5" />}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-bold" style={{ color: CREAM }} numberOfLines={1}>{h.landmark}</Text>
                    <Text className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                      {when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {delivered ? 'Delivered' : 'Declined'}
                    </Text>
                  </View>
                  <Text className="text-[14px] font-bold" style={{ color: delivered ? GREEN : MUTED }}>
                    {delivered ? `+${h.feeDh} dh` : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Decline-reason modal — a reason is required before confirming. */}
      <Modal
        visible={declineTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!declining) { setDeclineTarget(null); setDeclineReason(''); } }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View style={{ backgroundColor: '#17110C', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ fontWeight: '800', fontSize: 22, color: CREAM, letterSpacing: -0.5 }}>Decline trip</Text>
              <PressableScale onPress={() => { setDeclineTarget(null); setDeclineReason(''); }}>
                <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <X size={16} color={CREAM} />
                </View>
              </PressableScale>
            </View>
            <Text className="text-[13px] mb-5" style={{ color: MUTED, lineHeight: 19 }}>
              Tell dispatch why you’re passing — the order goes back to the pool.
            </Text>
            <Text className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: 0.8, color: MUTED }}>
              Reason (required)
            </Text>
            <TextInput
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="Too far, busy, vehicle issue…"
              placeholderTextColor={MUTED}
              autoFocus
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: CREAM,
                marginBottom: 18,
              }}
            />
            <Pressable onPress={handleDeclineConfirm} disabled={declining || !declineReason.trim()}>
              <View
                className="rounded-2xl py-4 items-center"
                style={{ backgroundColor: '#E11D48', opacity: declining || !declineReason.trim() ? 0.5 : 1 }}
              >
                {declining
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm decline</Text>
                }
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

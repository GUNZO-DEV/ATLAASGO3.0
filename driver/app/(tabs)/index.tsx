// AtlaasDriver 3.0 — DRIVE screen (home tab).
// Ports the working dashboard logic (online toggle, KPIs, week-earned hero,
// active deliveries, new requests, available-now pool with city filter, all the
// accept/decline/pickup/arriving/delivered/claim handlers + location broadcast
// + pull-to-refresh + focus polling) onto the 3.0 cockpit look. The active
// delivery uses the slide-to-confirm flow whose stages map to the real actions.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import {
  Power, Wallet, Package, Star, MapPin, LogOut, Bike, XCircle, ArrowRight, Zap, TrendingUp, Navigation,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { useRiderProfile, useRiderStats, type RiderStatus } from '../../hooks/useRiderProfile';
import { useDriverAssignments, type DriverJob } from '../../hooks/useDriverAssignments';
import { useAvailableOrders, type PoolOrder } from '../../hooks/useAvailableOrders';
import { useBroadcastLocation } from '../../hooks/useBroadcastLocation';
import { acceptAssignment, rejectAssignment, markPickedUp, markArriving, markDelivered, claimOrder } from '../../lib/orderActions';
import {
  BG, CARD, LINE, EMERALD, GLOW, CREAM, MUTED, AMBER, DANGER,
  Enter, Tappable, LiveDot, StatTile, RouteSummary, SlideConfirm, Section, ActionBtn,
} from '../../components/dr/ui';
import { OfferSheet } from '../../components/dr/OfferSheet';

const STATUS_LABEL: Record<RiderStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  on_break: 'On break',
  busy: 'On a trip',
};

export default function DriveScreen() {
  const router = useRouter();
  const { signOut: clerkSignOut } = useClerkAuth();
  const { user } = useAuth();
  const { profile, setStatus } = useRiderProfile();
  const { todayDh, weekDh, tripsToday, refresh: refreshStats } = useRiderStats();
  const { jobs, loading: jobsLoading, refresh: refreshJobs } = useDriverAssignments();
  const { orders: pool, refresh: refreshPool } = useAvailableOrders();

  const [toggling, setToggling] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>('All');
  // Offers (assigned, not yet accepted) the rider dismissed this session — so a
  // declined ping never re-surfaces while it lingers in the assignments feed.
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);

  const status: RiderStatus = profile?.status ?? 'offline';
  const isOnline = status === 'online' || status === 'busy';
  const pending = useMemo(() => jobs.filter((j) => !j.acceptedAt), [jobs]);
  const active = useMemo(() => jobs.filter((j) => !!j.acceptedAt), [jobs]);

  // Surface the first non-dismissed pending job as the incoming OFFER ping.
  const offer = useMemo(
    () => pending.find((j) => !dismissedOffers.includes(j.assignmentId)) ?? null,
    [pending, dismissedOffers],
  );

  // Distinct cities present in the current pool, "All" first.
  const cities = useMemo(() => {
    const seen = new Set<string>();
    for (const o of pool) if (o.city) seen.add(o.city);
    return ['All', ...Array.from(seen).sort((a, b) => a.localeCompare(b))];
  }, [pool]);

  // Filter the "Available now" pool by the selected city.
  const visiblePool = useMemo(
    () => (cityFilter === 'All' ? pool : pool.filter((o) => o.city === cityFilter)),
    [pool, cityFilter],
  );

  // If the selected city disappears from the pool, fall back to "All".
  useEffect(() => {
    if (cityFilter !== 'All' && !cities.includes(cityFilter)) setCityFilter('All');
  }, [cities, cityFilter]);

  // Guaranteed refresh path that does not depend on the realtime socket.
  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refreshPool(), refreshJobs(), refreshStats()]);
  }, [refreshPool, refreshJobs, refreshStats]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  // Focus-aware polling: while this screen is focused, re-fetch every 15s as a
  // fallback for dropped realtime updates. Cleared on blur/unmount. Keep the
  // latest refreshAll in a ref so the interval never closes over a stale fn.
  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => {
        void refreshAllRef.current();
      }, 15000);
      return () => clearInterval(id);
    }, []),
  );

  useBroadcastLocation(profile?.userId, isOnline && active.length > 0);

  async function toggleOnline() {
    if (toggling) return;
    setToggling(true);
    const res = await setStatus(isOnline ? 'offline' : 'online');
    if (!res.ok) Alert.alert('Could not update status', res.error);
    setToggling(false);
  }
  async function run(id: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>, failTitle: string) {
    if (busyId) return;
    setBusyId(id);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) Alert.alert(failTitle, res.error);
  }
  const onAccept = (j: DriverJob) => user && run(j.orderId, () => acceptAssignment(j.orderId, user.id), 'Could not accept');
  const onDecline = (j: DriverJob) =>
    user &&
    Alert.alert('Decline this trip?', 'It goes back to dispatch.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => run(j.orderId, () => rejectAssignment(j.orderId, user.id, 'Declined by rider'), 'Could not decline') },
    ]);
  const onPickup = (j: DriverJob) => user && run(j.orderId, () => markPickedUp(j.orderId, user.id), 'Could not update');
  const onArriving = (j: DriverJob) => run(j.orderId, () => markArriving(j.orderId), 'Could not update');
  const onDelivered = (j: DriverJob) => user && run(j.orderId, () => markDelivered(j.orderId, user.id), 'Could not update');
  const onClaim = async (orderId: string) => {
    if (!user) return;
    await run(orderId, () => claimOrder(orderId, user.id), 'Could not claim');
    refreshPool();
  };

  // OFFER ping — accept opens the full-screen delivery flow; decline (incl. the
  // 18s auto-timeout) sends it back to dispatch and hides it for this session.
  const onOfferAccept = async (j: DriverJob) => {
    if (!user || busyId) return;
    setBusyId(j.orderId);
    const res = await acceptAssignment(j.orderId, user.id);
    setBusyId(null);
    if (!res.ok) {
      Alert.alert('Could not accept', res.error);
      return;
    }
    setDismissedOffers((d) => (d.includes(j.assignmentId) ? d : [...d, j.assignmentId]));
    router.push(`/delivery/${j.orderId}`);
  };
  const onOfferDecline = (j: DriverJob) => {
    setDismissedOffers((d) => (d.includes(j.assignmentId) ? d : [...d, j.assignmentId]));
    if (user) void rejectAssignment(j.orderId, user.id, 'Declined');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 46 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={EMERALD}
            colors={[EMERALD]}
            progressBackgroundColor={BG}
          />
        }
      >
        {/* Header */}
        <Enter>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 1.8, color: EMERALD }}>ATLAASGO · DRIVER</Text>
              <Text style={{ fontSize: 27, fontWeight: '800', color: CREAM, letterSpacing: -0.6, marginTop: 3 }}>Drive & earn</Text>
            </View>
            <Pressable
              onPress={() => clerkSignOut()}
              hitSlop={12}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={18} color={MUTED} />
            </Pressable>
          </View>
        </Enter>

        {/* Online toggle hero */}
        <Enter delay={80}>
          <Tappable onPress={toggleOnline} disabled={toggling}>
            <View style={{ marginTop: 18, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: isOnline ? 'rgba(52,211,153,0.45)' : LINE }}>
              <LinearGradient
                colors={isOnline ? ['#0E7C5A', '#0A5E44'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                    {isOnline &&
                      [0, 1].map((i) => (
                        <MotiView
                          key={i}
                          from={{ opacity: 0.5, scale: 0.8 }}
                          animate={{ opacity: 0, scale: 1.9 }}
                          transition={{ type: 'timing', duration: 2000, loop: true, repeatReverse: false, delay: i * 1000 }}
                          style={{ position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: GLOW }}
                        />
                      ))}
                    <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: isOnline ? GLOW : 'rgba(255,255,255,0.07)' }}>
                      <Power size={24} color={isOnline ? '#04140D' : CREAM} />
                    </View>
                  </View>
                  <View style={{ marginLeft: 16 }}>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: CREAM, letterSpacing: -0.3 }}>{STATUS_LABEL[status]}</Text>
                    <Text style={{ fontSize: 12.5, color: isOnline ? 'rgba(234,243,238,0.8)' : MUTED, marginTop: 2 }}>
                      {isOnline ? 'Receiving requests' : 'Tap to go online'}
                    </Text>
                  </View>
                </View>
                {toggling ? <ActivityIndicator color={isOnline ? '#04140D' : EMERALD} /> : isOnline ? <LiveDot size={9} /> : null}
              </LinearGradient>
            </View>
          </Tappable>
        </Enter>

        {/* KPIs */}
        <Enter delay={150}>
          <View style={{ flexDirection: 'row', gap: 11, marginTop: 14 }}>
            <StatTile icon={<Wallet size={15} color={GLOW} />} value={`${todayDh}`} unit="dh" label="Today" />
            <StatTile icon={<Package size={15} color={GLOW} />} value={`${tripsToday}`} label="Trips" />
            <StatTile icon={<Star size={15} color={AMBER} />} value={(profile?.rating ?? 5).toFixed(1)} label="Rating" />
          </View>
        </Enter>

        {/* Week earnings hero */}
        <Enter delay={210}>
          <LinearGradient
            colors={['rgba(16,185,129,0.16)', 'rgba(16,185,129,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ marginTop: 11, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(52,211,153,0.18)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 11.5, color: MUTED, fontWeight: '600' }}>Earned this week</Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: CREAM, letterSpacing: -1, marginTop: 2 }}>
                {weekDh} <Text style={{ fontSize: 15, color: MUTED }}>dh</Text>
              </Text>
            </View>
            <TrendingUp size={30} color={GLOW} />
          </LinearGradient>
        </Enter>

        {/* Your delivery (active) — slide-to-confirm flow */}
        {active.length > 0 && (
          <>
            <Section icon={<Bike size={14} color={GLOW} />} title="Your delivery" />
            {active.map((j, i) => (
              <Enter key={j.assignmentId} delay={60 * i}>
                <ActiveCard
                  job={j}
                  busy={busyId === j.orderId}
                  onOpen={() => router.push(`/delivery/${j.orderId}`)}
                  onPickup={() => onPickup(j)}
                  onArriving={() => onArriving(j)}
                  onDelivered={() => onDelivered(j)}
                />
              </Enter>
            ))}
          </>
        )}

        {/* New requests (assigned) */}
        {pending.length > 0 && (
          <>
            <Section icon={<Zap size={14} color={EMERALD} />} title={`New requests (${pending.length})`} />
            {pending.map((j, i) => (
              <Enter key={j.assignmentId} delay={60 * i}>
                <View style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(52,211,153,0.28)', padding: 16, marginBottom: 11 }}>
                  <JobRow job={j} />
                  <View style={{ flexDirection: 'row', gap: 9, marginTop: 13 }}>
                    <ActionBtn primary label="Accept" icon={<Navigation size={15} color="#04140D" />} busy={busyId === j.orderId} onPress={() => onAccept(j)} />
                    <ActionBtn label="Decline" icon={<XCircle size={15} color={DANGER} />} tint={DANGER} onPress={() => onDecline(j)} disabled={busyId === j.orderId} />
                  </View>
                </View>
              </Enter>
            ))}
          </>
        )}

        {/* Available now (pool) */}
        <Section icon={<Zap size={14} color={AMBER} />} title="Available now" badge={visiblePool.length || undefined} />

        {/* City filter */}
        {cities.length > 1 && <CityFilter cities={cities} selected={cityFilter} onSelect={setCityFilter} />}

        {jobsLoading && pool.length === 0 ? (
          <ActivityIndicator color={EMERALD} style={{ marginTop: 12 }} />
        ) : visiblePool.length === 0 ? (
          pool.length === 0 ? (
            <Empty online={isOnline} />
          ) : (
            <EmptyCity city={cityFilter} />
          )
        ) : (
          visiblePool.map((o, i) => (
            <Enter key={o.id} delay={50 * i}>
              <PoolCard order={o} busy={busyId === o.id} onClaim={() => onClaim(o.id)} />
            </Enter>
          ))
        )}

        <Text style={{ fontSize: 11.5, color: MUTED, textAlign: 'center', marginTop: 24, lineHeight: 17 }}>
          Claim a trip, deliver it, get paid — the customer sees every step live.
        </Text>
      </ScrollView>

      {/* Incoming OFFER ping — one at a time, over the dashboard. */}
      {offer && (
        <OfferSheet
          job={offer}
          busy={busyId === offer.orderId}
          onAccept={() => onOfferAccept(offer)}
          onDecline={() => onOfferDecline(offer)}
        />
      )}
    </SafeAreaView>
  );
}

// Active delivery card — route rail + the slide-to-confirm that maps to the
// real lifecycle action for the current stage.
function ActiveCard({
  job,
  busy,
  onOpen,
  onPickup,
  onArriving,
  onDelivered,
}: {
  job: DriverJob;
  busy: boolean;
  onOpen: () => void;
  onPickup: () => void;
  onArriving: () => void;
  onDelivered: () => void;
}) {
  const pickedUp = !!job.pickedUpAt;
  const arriving = job.status === 'arriving';

  // Stage resolves which real action the slider fires.
  const stage: 'pickup' | 'arriving' | 'deliver' = !pickedUp ? 'pickup' : !arriving ? 'arriving' : 'deliver';
  const slide =
    stage === 'pickup'
      ? { label: 'Slide — order collected', onConfirm: onPickup }
      : stage === 'arriving'
        ? { label: 'Slide — arriving', onConfirm: onArriving }
        : { label: 'Slide — mark delivered', onConfirm: onDelivered };
  const stageLabel = stage === 'pickup' ? 'Heading to pickup' : stage === 'arriving' ? 'Delivering' : 'Arriving';

  return (
    <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(52,211,153,0.30)', padding: 16, marginBottom: 11 }}>
      {/* Tapping the card body opens the full-screen delivery flow (live map). */}
      <Tappable onPress={onOpen}>
        {/* stage chip + payout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 7 }}>
              <LiveDot size={7} />
            </View>
            <View style={{ backgroundColor: 'rgba(52,211,153,0.14)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: GLOW, letterSpacing: 0.4 }}>{stageLabel.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 11.5, color: MUTED, marginLeft: 8 }}>#{job.orderId.slice(0, 8)}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: GLOW }}>{job.totalDh} dh</Text>
        </View>

        {/* route rail */}
        <RouteSummary
          pickup={{ name: 'Restaurant', area: pickedUp ? 'Collected' : 'Collect the order' }}
          dropoff={{ name: job.landmark, area: 'Customer drop-off' }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 5 }}>
          <Navigation size={12} color={EMERALD} />
          <Text style={{ fontSize: 11.5, color: EMERALD, fontWeight: '700' }}>Tap for live map</Text>
        </View>
      </Tappable>

      {/* slide to confirm the current stage */}
      <View style={{ marginTop: 14, opacity: busy ? 0.6 : 1 }}>
        <SlideConfirm label={slide.label} onConfirm={slide.onConfirm} resetKey={stage} disabled={busy} />
      </View>
    </View>
  );
}

function JobRow({ job }: { job: DriverJob }) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MapPin size={16} color={GLOW} />
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: CREAM, marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {job.landmark}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: GLOW }}>{job.totalDh} dh</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9 }}>
        <View style={{ backgroundColor: 'rgba(52,211,153,0.14)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: GLOW, letterSpacing: 0.4 }}>NEW REQUEST</Text>
        </View>
        <Text style={{ fontSize: 11.5, color: MUTED, marginLeft: 8 }}>#{job.orderId.slice(0, 8)}</Text>
      </View>
    </>
  );
}

function PoolCard({ order, busy, onClaim }: { order: PoolOrder; busy: boolean; onClaim: () => void }) {
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(251,191,36,0.26)', padding: 16, marginBottom: 11 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MapPin size={16} color={AMBER} />
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: CREAM, marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {order.landmark}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: GLOW }}>{order.totalDh} dh</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <View style={{ backgroundColor: 'rgba(251,191,36,0.14)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: AMBER, letterSpacing: 0.4 }}>{order.city.toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ marginTop: 13 }}>
        <ActionBtn primary label="Claim this trip" icon={<ArrowRight size={15} color="#04140D" />} busy={busy} onPress={onClaim} />
      </View>
    </View>
  );
}

function CityFilter({ cities, selected, onSelect }: { cities: string[]; selected: string; onSelect: (c: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2, marginBottom: 14 }}>
      {cities.map((c) => {
        const on = c === selected;
        return (
          <Pressable key={c} onPress={() => onSelect(c)} hitSlop={6}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 14,
                backgroundColor: on ? 'rgba(52,211,153,0.16)' : CARD,
                borderWidth: 1,
                borderColor: on ? 'rgba(52,211,153,0.55)' : LINE,
              }}
            >
              {c !== 'All' && <MapPin size={12} color={on ? GLOW : MUTED} />}
              <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2, marginLeft: c !== 'All' ? 5 : 0, color: on ? GLOW : MUTED }}>{c}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function EmptyCity({ city }: { city: string }) {
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE, padding: 24, alignItems: 'center' }}>
      <MapPin size={24} color={MUTED} />
      <Text style={{ color: MUTED, marginTop: 10, fontSize: 13.5, textAlign: 'center', lineHeight: 20 }}>
        No open orders in {city} right now — switch to “All” to see every available trip.
      </Text>
    </View>
  );
}

function Empty({ online }: { online: boolean }) {
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE, padding: 24, alignItems: 'center' }}>
      <MotiView from={{ translateY: 0 }} animate={{ translateY: -6 }} transition={{ type: 'timing', duration: 1400, loop: true }}>
        <Package size={26} color={MUTED} />
      </MotiView>
      <Text style={{ color: MUTED, marginTop: 10, fontSize: 13.5, textAlign: 'center', lineHeight: 20 }}>
        {online
          ? 'No open orders right now — new ones drop in here the moment a customer checks out.'
          : 'Go online to see orders you can claim.'}
      </Text>
    </View>
  );
}

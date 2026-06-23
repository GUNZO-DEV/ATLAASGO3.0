// AtlaasDriver 3.0 — DRIVE screen (home tab).
// Ports the working dashboard logic (online toggle, KPIs, active deliveries,
// new requests, available-now pool with city filter, all the
// accept/decline/pickup/arriving/delivered/claim handlers + location broadcast
// + pull-to-refresh + focus polling) onto the 3.0 LIGHT cockpit look. The active
// delivery uses the slide-to-confirm flow whose stages map to the real actions.
//
// Wired to the real Phase-1 hooks: useRiderShift drives the online window +
// online-time / per-hour KPIs, useNearestCity drives the AUTO order-zone, and
// useCityWeather drives the snow-boost banner (rendered only when a boost is on).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Svg, { G, Path, Rect, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import {
  Power, Wallet, Package, MapPin, LogOut, Bike, XCircle, ArrowRight, Zap, Navigation,
  TrendingUp, Snowflake, Flame, MapPinned, Bell, Clock,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { useRiderProfile, useRiderStats, type RiderStatus } from '../../hooks/useRiderProfile';
import { useDriverAssignments, type DriverJob } from '../../hooks/useDriverAssignments';
import { useAvailableOrders, type PoolOrder } from '../../hooks/useAvailableOrders';
import { useBroadcastLocation } from '../../hooks/useBroadcastLocation';
import { useNearestCity } from '../../hooks/useNearestCity';
import { useCityWeather } from '../../hooks/useCityWeather';
import { useRiderShift } from '../../hooks/useRiderShift';
import { acceptAssignment, rejectAssignment, markPickedUp, markArriving, markDelivered, claimOrder } from '../../lib/orderActions';
import {
  BG, CARD, LINE, LINE2, EMERALD, GLOW, CREAM, MUTED, AMBER, DANGER, SNOW, ONLINE, BG2, FG_SOFT,
  Enter, Tappable, LiveDot, StatTile, RouteSummary, SlideConfirm, Section, ActionBtn, SecHead,
} from '../../components/dr/ui';
import { OfferSheet } from '../../components/dr/OfferSheet';

const STATUS_LABEL: Record<RiderStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  on_break: 'On break',
  busy: 'On a trip',
};

// Greeting that tracks the local time of day.
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Format an elapsed-seconds shift duration as "Hh Mm" (e.g. "4h 12m").
function formatOnline(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Derive a friendly first name + initials from the real Supabase user (email or
// metadata). Falls back to "Driver" so the header never renders blank.
function nameParts(email?: string | null, metaName?: string | null) {
  const raw =
    (metaName && metaName.trim()) ||
    (email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '') ||
    'Driver';
  const words = raw.split(/\s+/).filter(Boolean);
  const first = words[0] ? words[0][0].toUpperCase() + words[0].slice(1) : 'Driver';
  const initials =
    (words[0]?.[0] ?? 'D').toUpperCase() + (words[1]?.[0] ?? '').toUpperCase();
  return { first, initials: initials || 'D' };
}

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

  // AUTO order-zone — the rider's nearest SERVED city (GPS → public.cities), and
  // its live weather/surcharge for the snow-boost banner.
  const { city: detectedCity, cityId, locating } = useNearestCity();
  const weather = useCityWeather(cityId || null);
  // Online window + online-time / per-hour KPIs (opens/closes the shift).
  const { onlineSeconds, perHourDh } = useRiderShift(isOnline);

  const { first, initials } = useMemo(
    () => nameParts(user?.email, (user?.user_metadata?.full_name as string | undefined) ?? null),
    [user?.email, user?.user_metadata],
  );

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

  // Broadcast location the WHOLE time the rider is online (idle cadence) so
  // dispatch always has a fresh fix; tighten the cadence while a delivery runs.
  useBroadcastLocation(isOnline ? profile?.userId : undefined, active.length > 0);

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

  // The pool city the rider is currently scoped to (drives the "Finding orders
  // in …" subline). Honours the manual filter, then the AUTO-detected city, then
  // the most-represented pool city.
  const zoneCity = useMemo(() => {
    if (cityFilter !== 'All') return cityFilter;
    if (detectedCity) return detectedCity;
    const counts = new Map<string, number>();
    for (const o of pool) if (o.city) counts.set(o.city, (counts.get(o.city) ?? 0) + 1);
    let best: string | null = null;
    let bestN = 0;
    for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
    return best;
  }, [pool, cityFilter, detectedCity]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 46 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={EMERALD}
            colors={[EMERALD]}
            progressBackgroundColor={CARD}
          />
        }
      >
        {/* Greeting header — avatar initials + greeting + name + bell + logout */}
        <Enter>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
            <LinearGradient
              colors={[EMERALD, GLOW]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
                shadowColor: EMERALD, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.38, shadowRadius: 34, elevation: 6,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 17, color: '#fff', letterSpacing: 0.5 }}>{initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 12.5, color: MUTED, fontWeight: '500' }}>{greeting()}</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: CREAM, letterSpacing: -0.3, marginTop: 1 }} numberOfLines={1}>
                {first}
              </Text>
            </View>
            {/* notification bell (decorative for now — no notifications source yet) */}
            <Pressable
              hitSlop={12}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={18} color={MUTED} />
            </Pressable>
            <Pressable
              onPress={() => clerkSignOut()}
              hitSlop={12}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={18} color={MUTED} />
            </Pressable>
          </View>
        </Enter>

        {/* Big online power-toggle */}
        <Enter delay={70}>
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <Tappable onPress={toggleOnline} disabled={toggling}>
              <View
                style={{
                  borderRadius: 26,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  borderWidth: 1,
                  borderColor: isOnline ? 'rgba(47,163,107,0.40)' : LINE,
                  backgroundColor: isOnline ? '#EAF6EF' : CARD,
                  shadowColor: '#1A1410',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 18,
                  elevation: 2,
                }}
              >
                {/* power knob — green w/ ping when online, sand when offline */}
                <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
                  {isOnline &&
                    [0, 1].map((i) => (
                      <MotiView
                        key={i}
                        from={{ opacity: 0.4, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.7 }}
                        transition={{ type: 'timing', duration: 1800, loop: true, repeatReverse: false, delay: i * 900 }}
                        style={{ position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: ONLINE }}
                      />
                    ))}
                  <View
                    style={{
                      width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isOnline ? ONLINE : BG2,
                      ...(isOnline
                        ? { shadowColor: ONLINE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 }
                        : null),
                    }}
                  >
                    <Power size={26} color={isOnline ? '#fff' : MUTED} />
                  </View>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: CREAM, letterSpacing: -0.3 }}>
                    {isOnline ? "You're online" : "You're offline"}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }} numberOfLines={1}>
                    {isOnline
                      ? locating
                        ? 'Locating your zone…'
                        : zoneCity
                          ? `Finding orders in ${zoneCity}…`
                          : 'Receiving requests'
                      : 'Go online to start receiving orders'}
                  </Text>
                </View>

                {/* track switch */}
                {toggling ? (
                  <ActivityIndicator color={isOnline ? ONLINE : EMERALD} />
                ) : (
                  <View
                    style={{
                      width: 56, height: 32, borderRadius: 16, justifyContent: 'center',
                      backgroundColor: isOnline ? ONLINE : BG2,
                      borderWidth: 1, borderColor: isOnline ? 'transparent' : LINE,
                    }}
                  >
                    <View
                      style={{
                        width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
                        marginLeft: isOnline ? 29 : 3,
                        shadowColor: '#1A1410', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 3,
                      }}
                    />
                  </View>
                )}
              </View>
            </Tappable>
          </View>
        </Enter>

        {/* Auto order-zone card (AUTO badge) — driven by useNearestCity() */}
        <Enter delay={130}>
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13,
                backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2,
                shadowColor: '#1A1410', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2,
              }}
            >
              <LinearGradient
                colors={[EMERALD, GLOW]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <MapPin size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.6, color: MUTED, textTransform: 'uppercase' }}>
                    Order zone
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, backgroundColor: 'rgba(255,87,34,0.12)' }}>
                    <MotiView
                      from={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: 'timing', duration: 1400, loop: true }}
                      style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ONLINE }}
                    />
                    <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: EMERALD }}>AUTO</Text>
                  </View>
                </View>
                <Text style={{ fontWeight: '800', fontSize: 17, marginTop: 3, color: locating && !detectedCity ? MUTED : CREAM }} numberOfLines={1}>
                  {locating && !detectedCity ? 'Locating…' : detectedCity || 'Atlas region'}
                </Text>
                <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>Set from your location · Atlas region</Text>
              </View>
            </View>
          </View>
        </Enter>

        {/* Snow-boost banner — rendered ONLY when the city carries a live boost */}
        {weather.isBoost && (
          <Enter delay={180}>
            <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13,
                  borderRadius: 18, backgroundColor: '#EAF3FB',
                  borderWidth: 1, borderColor: 'rgba(90,169,230,0.35)',
                }}
              >
                <LinearGradient
                  colors={[SNOW, '#2A6FA8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Snowflake size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: CREAM }}>Snow boost active</Text>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }} numberOfLines={2}>
                    {weather.note ?? 'Higher payouts while it snows in the Atlas'}
                  </Text>
                </View>
                {weather.surchargeDh > 0 ? (
                  <Text style={{ fontSize: 17, fontWeight: '800', color: SNOW }}>+{weather.surchargeDh} dh</Text>
                ) : null}
              </View>
            </View>
          </Enter>
        )}

        {/* Today — 4-stat grid */}
        <Enter delay={230}>
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <SecHead title="Today" action="Earnings ›" onAction={() => router.push('/earnings')} />
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <StatTile icon={<Wallet size={15} color={EMERALD} />} value={`${todayDh}`} unit="DH" label="Earned" />
              <StatTile icon={<Package size={15} color={EMERALD} />} value={`${tripsToday}`} label="Deliveries" />
            </View>
            <View style={{ flexDirection: 'row', gap: 11, marginTop: 11 }}>
              {/* Online time — from the open shift; falls back to this-week total. */}
              {onlineSeconds != null ? (
                <StatTile icon={<Clock size={15} color={EMERALD} />} value={formatOnline(onlineSeconds)} label="Online time" />
              ) : (
                <StatTile icon={<TrendingUp size={15} color={EMERALD} />} value={`${weekDh}`} unit="DH" label="This week" />
              )}
              {/* Per hour — from the shift; falls back to the live star rating. */}
              {perHourDh != null ? (
                <StatTile icon={<TrendingUp size={15} color={EMERALD} />} value={`${perHourDh}`} unit="DH/h" label="Per hour" />
              ) : (
                <StatTile icon={<TrendingUp size={15} color={AMBER} />} value={(profile?.rating ?? 5).toFixed(1)} label="Rating" />
              )}
            </View>
          </View>
        </Enter>

        {/* Demand near you — stylized heat-zone decoration (not a real map) */}
        <Enter delay={280}>
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <SecHead title="Demand near you" />
            <ZoneMap poolCount={pool.length} />
          </View>
        </Enter>

        {/* Your delivery (active) — slide-to-confirm flow */}
        {active.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <Section icon={<Bike size={14} color={EMERALD} />} title="Your delivery" />
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
          </View>
        )}

        {/* New requests (assigned) */}
        {pending.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <Section icon={<Zap size={14} color={EMERALD} />} title={`New requests (${pending.length})`} />
            {pending.map((j, i) => (
              <Enter key={j.assignmentId} delay={60 * i}>
                <View style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,87,34,0.28)', padding: 16, marginBottom: 11 }}>
                  <JobRow job={j} />
                  <View style={{ flexDirection: 'row', gap: 9, marginTop: 13 }}>
                    <ActionBtn primary label="Accept" icon={<Navigation size={15} color="#fff" />} busy={busyId === j.orderId} onPress={() => onAccept(j)} />
                    <ActionBtn label="Decline" icon={<XCircle size={15} color={DANGER} />} tint={DANGER} onPress={() => onDecline(j)} disabled={busyId === j.orderId} />
                  </View>
                </View>
              </Enter>
            ))}
          </View>
        )}

        {/* Available now (pool) */}
        <View style={{ paddingHorizontal: 20 }}>
          <Section icon={<Zap size={14} color={AMBER} />} title="Available now" badge={visiblePool.length || undefined} />

          {/* City filter */}
          {cities.length > 1 && <CityFilter cities={cities} selected={cityFilter} onSelect={setCityFilter} />}

          {jobsLoading && pool.length === 0 ? (
            <ActivityIndicator color={EMERALD} style={{ marginTop: 12 }} />
          ) : visiblePool.length === 0 ? (
            // Empty pool doubles as the "Looking for orders…" / break state.
            <SearchState online={isOnline} onGoOnline={toggleOnline} busy={toggling} city={cityFilter} hasPool={pool.length > 0} />
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
        </View>
      </ScrollView>

      {/* Incoming OFFER ping — one at a time, over the dashboard. Passes the rich
          DriverJob so the sheet can read the real payout / drop / route. */}
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

// Stylized hot-zone decoration — a faux street grid + radial sunset heat blobs.
// Purely decorative (NOT a real map); the live map lives in the delivery flow.
// The legend count is driven by the real available-pool size.
function ZoneMap({ poolCount }: { poolCount: number }) {
  const zones = [
    { x: 28, y: 32, heat: 2 },
    { x: 66, y: 26, heat: 3 },
    { x: 44, y: 58, heat: 3 },
    { x: 78, y: 66, heat: 1 },
    { x: 18, y: 70, heat: 2 },
  ];
  const hotZones = zones.filter((z) => z.heat === 3).length;
  const legend =
    poolCount > 0
      ? `${poolCount} open ${poolCount === 1 ? 'order' : 'orders'} near you`
      : `${hotZones} hot zones near you`;
  return (
    <View
      style={{
        height: 168, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: LINE2,
        backgroundColor: '#DDE8EC',
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          {zones.map((z, i) => (
            <RadialGradient key={i} id={`heat${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FF5722" stopOpacity={0.12 + z.heat * 0.14} />
              <Stop offset="70%" stopColor="#FF5722" stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {/* faint street grid + blocks */}
        <G stroke="rgba(26,20,16,.10)" strokeWidth={2.4} strokeLinecap="round">
          <Path d="M-5 40 H 105" />
          <Path d="M-5 70 H 105" />
          <Path d="M30 -5 V 105" />
          <Path d="M70 -5 V 105" />
        </G>
        <G fill="rgba(26,20,16,.06)">
          <Rect x={36} y={44} width={28} height={20} rx={3} />
          <Rect x={8} y={8} width={16} height={22} rx={3} />
          <Rect x={76} y={74} width={18} height={20} rx={3} />
        </G>
        {/* heat blobs */}
        {zones.map((z, i) => {
          const d = 16 + z.heat * 16;
          return <Circle key={i} cx={z.x} cy={z.y} r={d / 2} fill={`url(#heat${i})`} />;
        })}
        {/* hot pins on the strongest zones */}
        {zones.filter((z) => z.heat === 3).map((z, i) => (
          <Circle key={`p${i}`} cx={z.x} cy={z.y} r={2.4} fill="#FF5722" stroke="#fff" strokeWidth={1.4} />
        ))}
        {/* you marker (snow blue) */}
        <Circle cx={48} cy={50} r={3.2} fill="#5AA9E6" stroke="#fff" strokeWidth={2} />
      </Svg>
      {/* legend chip */}
      <View
        style={{
          position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: CARD, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11,
          shadowColor: '#1A1410', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 3,
        }}
      >
        <Flame size={14} color={EMERALD} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: CREAM }}>{legend}</Text>
      </View>
    </View>
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
    <View
      style={{
        backgroundColor: '#EAF6EF', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(47,163,107,0.30)', padding: 16, marginBottom: 11,
      }}
    >
      {/* Tapping the card body opens the full-screen delivery flow (live map). */}
      <Tappable onPress={onOpen}>
        {/* stage chip + payout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 7 }}>
              <LiveDot size={7} color={ONLINE} />
            </View>
            <View style={{ backgroundColor: 'rgba(47,163,107,0.14)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: ONLINE, letterSpacing: 0.4 }}>{stageLabel.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 11.5, color: MUTED, marginLeft: 8 }}>#{job.orderId.slice(0, 8)}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: CREAM }}>{job.payoutDh} dh</Text>
        </View>

        {/* route rail — real pickup restaurant + customer drop landmark */}
        <RouteSummary
          pickup={{ name: job.pickupName, area: pickedUp ? 'Collected' : job.pickupArea || 'Collect the order' }}
          dropoff={{ name: job.dropName, area: job.dropArea || 'Customer drop-off' }}
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
          <MapPin size={16} color={EMERALD} />
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: CREAM, marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {job.dropName}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: CREAM }}>{job.payoutDh} dh</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9 }}>
        <View style={{ backgroundColor: 'rgba(255,87,34,0.12)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: EMERALD, letterSpacing: 0.4 }}>NEW REQUEST</Text>
        </View>
        <Text style={{ fontSize: 11.5, color: MUTED, marginLeft: 8 }}>#{job.orderId.slice(0, 8)}</Text>
      </View>
    </>
  );
}

function PoolCard({ order, busy, onClaim }: { order: PoolOrder; busy: boolean; onClaim: () => void }) {
  return (
    <View
      style={{
        backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2, padding: 16, marginBottom: 11,
        shadowColor: '#1A1410', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MapPin size={16} color={AMBER} />
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: CREAM, marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {order.landmark}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: CREAM }}>{order.totalDh} dh</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <View style={{ backgroundColor: 'rgba(255,183,77,0.18)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#A8731F', letterSpacing: 0.4 }}>{order.city.toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ marginTop: 13 }}>
        <ActionBtn primary label="Claim this trip" icon={<ArrowRight size={15} color="#fff" />} busy={busy} onPress={onClaim} />
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
                backgroundColor: on ? 'rgba(255,87,34,0.12)' : CARD,
                borderWidth: 1,
                borderColor: on ? 'rgba(255,87,34,0.45)' : LINE,
              }}
            >
              {c !== 'All' && <MapPin size={12} color={on ? EMERALD : MUTED} />}
              <Text style={{ fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2, marginLeft: c !== 'All' ? 5 : 0, color: on ? EMERALD : FG_SOFT }}>{c}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// "Looking for orders…" (online) / "Taking a break" (offline) state — also the
// empty-pool placeholder. Mirrors the design's searching/break card.
function SearchState({
  online,
  onGoOnline,
  busy,
  city,
  hasPool,
}: {
  online: boolean;
  onGoOnline: () => void;
  busy: boolean;
  city: string;
  hasPool: boolean;
}) {
  // Pool has trips but the selected city is empty → nudge back to "All".
  if (online && hasPool && city !== 'All') {
    return (
      <View style={{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2, padding: 24, alignItems: 'center', shadowColor: '#1A1410', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2 }}>
        <MapPinned size={24} color={MUTED} />
        <Text style={{ color: MUTED, marginTop: 10, fontSize: 13.5, textAlign: 'center', lineHeight: 20 }}>
          No open orders in {city} right now — switch to “All” to see every available trip.
        </Text>
      </View>
    );
  }

  if (online) {
    return (
      <View
        style={{
          backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2, padding: 18,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          shadowColor: '#1A1410', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2,
        }}
      >
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <MotiView
            from={{ opacity: 0.45, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            transition={{ type: 'timing', duration: 1800, loop: true, repeatReverse: false }}
            style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: EMERALD }}
          />
          <LinearGradient
            colors={[EMERALD, GLOW]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 28, height: 28, borderRadius: 14 }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: CREAM }}>Looking for orders…</Text>
          <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>Stay near a hot zone for faster offers</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2, padding: 18, alignItems: 'center',
        shadowColor: '#1A1410', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '800', color: CREAM, marginBottom: 4 }}>You're taking a break</Text>
      <Text style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, textAlign: 'center', lineHeight: 18 }}>
        Flip the switch above to come online and earn the snow boost.
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <ActionBtn primary label="Go online" icon={<Power size={15} color="#fff" />} busy={busy} onPress={onGoOnline} />
      </View>
    </View>
  );
}

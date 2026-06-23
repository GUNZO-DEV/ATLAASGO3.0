// AtlaasDriver 3.0 — Earnings screen.
// Real data: useRiderStats() → todayDh / weekDh / lastWeekDh / tripsToday /
// tipsToday / week[] (with the snow-boost split) / history.
// Light cream surface, sunset-orange accents. Translation of screen-earnings.jsx.
//
// Cash-out calls the real rider_cash_out RPC (a 'requested' rider_payouts row).

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, TrendingUp, ArrowUpRight, ArrowUp } from 'lucide-react-native';
import { useRiderStats, type RiderHistoryEntry, type WeekDay as StatWeekDay } from '../../hooks/useRiderProfile';
import { cashOut } from '../../lib/orderActions';
import {
  BG,
  CARD,
  LINE2,
  EMERALD,
  GLOW,
  CREAM,
  MUTED,
  BG2,
  SNOW,
  ONLINE,
  Enter,
  Section,
  SecHead,
  StatTile,
  WeekBars,
  Tappable,
} from '../../components/dr/ui';

// One-letter day labels, Monday-first (matches the design's Mon–Sun rail).
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type WeekDay = { d: string; amt: number; boost?: number; today?: boolean };

// Re-shape the hook's Sun-first week[] (real delivered fee + boost split per
// weekday) into the design's Mon→Sun rail, marking today's column. No fabricated
// numbers — only a re-ordering of the real per-day totals.
function toMondayWeek(week: StatWeekDay[]): WeekDay[] {
  // hook week[] is indexed Sun(0)..Sat(6); remap to Mon(0)..Sun(6).
  const sunFirst = week.length === 7 ? week : [0, 1, 2, 3, 4, 5, 6].map(() => ({ d: '', amt: 0, boost: 0 }));
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun → Sun-first indices
  const todaySunIdx = new Date().getDay(); // 0=Sun..6=Sat
  const todayMonIdx = (todaySunIdx + 6) % 7; // 0=Mon..6=Sun
  return order.map((sunIdx, i) => ({
    d: DAY_LETTERS[i],
    amt: Math.round(sunFirst[sunIdx]?.amt ?? 0),
    boost: Math.round(sunFirst[sunIdx]?.boost ?? 0),
    today: i === todayMonIdx,
  }));
}

// White cash-out button that sits on the dark hero (design: bg #fff / ink text).
function CashOutButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return (
    <Tappable onPress={onPress} disabled={busy}>
      <View
        style={{
          borderRadius: 13,
          paddingVertical: 13,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          opacity: busy ? 0.65 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color={CREAM} />
        ) : (
          <>
            <ArrowUpRight size={18} color={CREAM} strokeWidth={2.5} />
            <Text style={{ fontWeight: '800', fontSize: 14, marginLeft: 7, color: CREAM }}>
              Cash out instantly
            </Text>
          </>
        )}
      </View>
    </Tappable>
  );
}

// Short "delivered at" label, e.g. "Today 14:05" / "Mon 09:30".
function tripWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return `Today ${time}`;
  const day = d.toLocaleDateString([], { weekday: 'short' });
  return `${day} ${time}`;
}

// One delivered-trip row — landmark, delivered time, payout (design .dr-trip).
// The green "+N tip" line renders only when a real per-trip tip is present.
function TripRow({ entry }: { entry: RiderHistoryEntry & { tipDh?: number } }) {
  const tip = entry.tipDh ?? 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 13,
        paddingHorizontal: 14,
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LINE2,
        shadowColor: CREAM,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 2,
      }}
    >
      <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: ONLINE }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: '700', fontSize: 13.5, color: CREAM }} numberOfLines={1}>
          {entry.landmark}
        </Text>
        <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }} numberOfLines={1}>
          {tripWhen(entry.deliveredAt)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontWeight: '800', fontSize: 14, color: CREAM, letterSpacing: -0.3 }}>
          +{entry.feeDh}
          <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED }}> dh</Text>
        </Text>
        {tip > 0 ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: ONLINE, marginTop: 1 }}>+{tip} tip</Text>
        ) : null}
      </View>
    </View>
  );
}

// 3-tile metric row for "Today": Earned / Tips / Trips.
function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LINE2,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: CREAM,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: CREAM, letterSpacing: -0.6 }}>{value}</Text>
      <Text style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 1, color: MUTED, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export default function EarningsScreen() {
  const { todayDh, weekDh, lastWeekDh, tripsToday, tipsToday, week: statWeek, history, refresh } = useRiderStats();
  const [refreshing, setRefreshing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const week = useMemo(() => toMondayWeek(statWeek), [statWeek]);
  const hasDailyBreakdown = useMemo(() => week.some((w) => w.amt > 0), [week]);
  // Trend vs last week — only shown when there's a real prior-week baseline.
  const trendPct = useMemo(
    () => (lastWeekDh > 0 ? Math.round(((weekDh - lastWeekDh) / lastWeekDh) * 100) : null),
    [weekDh, lastWeekDh],
  );
  // Only delivered trips belong on an earnings screen (skip rejected).
  const deliveredTrips = useMemo(
    () => history.filter((h) => h.deliveredAt).slice(0, 6),
    [history],
  );

  function onCashOut() {
    if (cashingOut) return;
    if (weekDh <= 0) {
      Alert.alert('Nothing to cash out', 'Complete a few deliveries first — your balance settles here.');
      return;
    }
    Alert.alert(
      'Cash out instantly',
      `Request a payout of ${weekDh} dh to your account? Payouts are processed by dispatch.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cash out',
          onPress: async () => {
            setCashingOut(true);
            const res = await cashOut(weekDh);
            setCashingOut(false);
            if (res.ok) {
              Alert.alert('Payout requested', `${weekDh} dh is on its way. You'll be notified once it's processed.`);
              void refresh();
            } else {
              Alert.alert('Could not cash out', res.error);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 46 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={EMERALD}
            colors={[EMERALD]}
            progressBackgroundColor={BG}
          />
        }
      >
        {/* Header */}
        <Enter>
          <View>
            <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 1.8, color: EMERALD }}>
              ATLAASGO · DRIVER
            </Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: CREAM, letterSpacing: -0.8, marginTop: 3 }}>
              Earnings
            </Text>
          </View>
        </Enter>

        {/* Balance / cash-out hero — dark ink card with a sunset orb glow */}
        <Enter delay={80}>
          <View
            style={{
              marginTop: 18,
              borderRadius: 26,
              padding: 22,
              backgroundColor: CREAM, // dark ink (--fg)
              overflow: 'hidden',
            }}
          >
            {/* Sunset orb (--grad) bleeding out of the top-right corner */}
            <LinearGradient
              colors={[EMERALD, GLOW]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 999,
                opacity: 0.9,
              }}
            />
            <View>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(251,247,242,0.8)' }}>
                Available to cash out
              </Text>
              <Text style={{ fontSize: 46, fontWeight: '800', color: BG, letterSpacing: -1.4, marginTop: 6 }}>
                {weekDh}
                <Text style={{ fontSize: 20, fontWeight: '700', color: 'rgba(251,247,242,0.7)' }}> dh</Text>
              </Text>
              <View style={{ marginTop: 16 }}>
                <CashOutButton onPress={onCashOut} busy={cashingOut} />
              </View>
            </View>
          </View>
        </Enter>

        {/* This week */}
        <Section icon={<TrendingUp size={14} color={EMERALD} />} title="This week" />
        <Enter delay={120}>
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: LINE2,
              padding: 18,
              shadowColor: CREAM,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.06,
              shadowRadius: 18,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: CREAM, letterSpacing: -0.6 }}>
                  {weekDh}
                  <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED }}> dh</Text>
                </Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Mon – Sun</Text>
              </View>
              {/* +N% vs last week — only with a real prior-week baseline */}
              {trendPct != null ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: trendPct >= 0 ? 'rgba(47,163,107,0.12)' : 'rgba(225,29,72,0.10)',
                  }}
                >
                  <ArrowUp
                    size={13}
                    color={trendPct >= 0 ? ONLINE : '#E11D48'}
                    style={{ transform: [{ rotate: trendPct >= 0 ? '0deg' : '180deg' }] }}
                  />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: trendPct >= 0 ? ONLINE : '#E11D48' }}>
                    {trendPct >= 0 ? '+' : ''}{trendPct}% vs last week
                  </Text>
                </View>
              ) : null}
            </View>
            <WeekBars week={week} />
            {/* Legend — base/tips vs snow boost (drives the blue boost overlay) */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: BG2 }} />
                <Text style={{ fontSize: 11.5, color: MUTED, fontWeight: '600' }}>Base + tips</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: SNOW }} />
                <Text style={{ fontSize: 11.5, color: MUTED, fontWeight: '600' }}>Snow boost</Text>
              </View>
            </View>
            {!hasDailyBreakdown && (
              <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 14, lineHeight: 17 }}>
                Your daily earnings appear here as you complete trips this week.
              </Text>
            )}
          </View>
        </Enter>

        {/* Today — 3 metrics: Earned / Tips / Trips */}
        <Section icon={<Wallet size={14} color={EMERALD} />} title="Today" />
        <Enter delay={160}>
          <View style={{ flexDirection: 'row', gap: 11 }}>
            <MetricTile value={`${todayDh}`} label="EARNED · DH" />
            <MetricTile value={`${tipsToday}`} label="TIPS · DH" />
            <MetricTile value={`${tripsToday}`} label="TRIPS" />
          </View>
        </Enter>

        {/* Recent trips — real delivered history (landmark · time · fee) */}
        <SecHead title="Recent trips" action={deliveredTrips.length > 0 ? 'See all' : undefined} />
        {deliveredTrips.length > 0 ? (
          <Enter delay={200}>
            <View style={{ gap: 10 }}>
              {deliveredTrips.map((tr) => (
                <TripRow key={tr.assignmentId} entry={tr} />
              ))}
            </View>
          </Enter>
        ) : (
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: LINE2,
              padding: 18,
            }}
          >
            <Text style={{ fontSize: 12.5, color: MUTED, lineHeight: 18 }}>
              Trips you deliver show up here with their payout.
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 11.5, color: MUTED, textAlign: 'center', marginTop: 24, lineHeight: 17 }}>
          Every delivered trip adds to your balance — settled with dispatch each cycle.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

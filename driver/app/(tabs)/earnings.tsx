// AtlaasDriver 3.0 — Earnings screen.
// Real data: useRiderStats() → todayDh / weekDh / tripsToday / history.
// Light cream surface, sunset-orange accents. Translation of screen-earnings.jsx.

import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Package, TrendingUp, ArrowUpRight } from 'lucide-react-native';
import { useRiderStats, type RiderHistoryEntry } from '../../hooks/useRiderProfile';
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
  StatTile,
  WeekBars,
  Tappable,
} from '../../components/dr/ui';

// One-letter day labels, Monday-first (matches the design's Mon–Sun rail).
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type WeekDay = { d: string; amt: number; boost?: number; today?: boolean };

// Build a real Mon→Sun breakdown from delivered history.
// We only have delivery_fee_dh per delivered assignment (no boost split), so
// bucket each delivered fee into its weekday — no fabricated daily numbers.
function buildWeek(history: RiderHistoryEntry[]): WeekDay[] {
  const now = new Date();
  // Monday of the current week (local time), at 00:00.
  const monday = new Date(now);
  const dow = (monday.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  monday.setDate(monday.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  const todayIdx = dow;
  const amounts = [0, 0, 0, 0, 0, 0, 0];

  for (const h of history) {
    if (!h.deliveredAt) continue;
    const d = new Date(h.deliveredAt);
    const diffDays = Math.floor((d.getTime() - monday.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7) amounts[diffDays] += h.feeDh;
  }

  return DAY_LETTERS.map((d, i) => ({
    d,
    amt: Math.round(amounts[i]),
    today: i === todayIdx,
  }));
}

// White cash-out button that sits on the dark hero (design: bg #fff / ink text).
function CashOutButton({ onPress }: { onPress: () => void }) {
  return (
    <Tappable onPress={onPress}>
      <View
        style={{
          borderRadius: 13,
          paddingVertical: 13,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <ArrowUpRight size={18} color={CREAM} strokeWidth={2.5} />
        <Text style={{ fontWeight: '800', fontSize: 14, marginLeft: 7, color: CREAM }}>
          Cash out instantly
        </Text>
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
function TripRow({ entry }: { entry: RiderHistoryEntry }) {
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
      <Text style={{ fontWeight: '800', fontSize: 14, color: CREAM, letterSpacing: -0.3 }}>
        +{entry.feeDh}
        <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED }}> dh</Text>
      </Text>
    </View>
  );
}

export default function EarningsScreen() {
  const { todayDh, weekDh, tripsToday, history, refresh } = useRiderStats();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const week = useMemo(() => buildWeek(history), [history]);
  const hasDailyBreakdown = useMemo(() => week.some((w) => w.amt > 0), [week]);
  // Only delivered trips belong on an earnings screen (skip rejected).
  const deliveredTrips = useMemo(
    () => history.filter((h) => h.deliveredAt).slice(0, 6),
    [history],
  );

  function onCashOut() {
    // No payout backend exists yet — surface an honest "coming soon" notice
    // rather than inventing a transfer flow.
    Alert.alert(
      'Cash out',
      'Instant payouts are coming soon. Your earnings are tracked here and settled with dispatch in the meantime.',
      [{ text: 'Got it' }],
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
                <CashOutButton onPress={onCashOut} />
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
            </View>
            <WeekBars week={week} />
            {/* Legend — base/tips vs snow boost (visual key, no fabricated data) */}
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

        {/* Today */}
        <Section icon={<Wallet size={14} color={EMERALD} />} title="Today" />
        <Enter delay={160}>
          <View style={{ flexDirection: 'row', gap: 11 }}>
            <StatTile
              icon={<Wallet size={15} color={EMERALD} />}
              value={`${todayDh}`}
              unit="dh"
              label="Earned today"
            />
            <StatTile
              icon={<Package size={15} color={EMERALD} />}
              value={`${tripsToday}`}
              label="Trips today"
            />
          </View>
        </Enter>

        {/* Recent trips — real delivered history (landmark · time · fee) */}
        <Section icon={<Package size={14} color={EMERALD} />} title="Recent trips" />
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

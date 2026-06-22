// AtlaasDriver 3.0 — Earnings screen.
// Real data: useRiderStats() → todayDh / weekDh / tripsToday / history.
// Dark cockpit surface, emerald accents. Translation of screen-earnings.jsx.

import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Package, TrendingUp, ArrowUpRight } from 'lucide-react-native';
import { useRiderStats, type RiderHistoryEntry } from '../../hooks/useRiderProfile';
import {
  BG,
  CARD,
  LINE,
  EMERALD,
  GLOW,
  CREAM,
  MUTED,
  Enter,
  Section,
  StatTile,
  WeekBars,
  ActionBtn,
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

        {/* Balance / cash-out hero */}
        <Enter delay={80}>
          <LinearGradient
            colors={['#0E7C5A', '#0A5E44']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              marginTop: 18,
              borderRadius: 26,
              padding: 22,
              borderWidth: 1,
              borderColor: 'rgba(52,211,153,0.45)',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(234,243,238,0.8)' }}>
              Available to cash out
            </Text>
            <Text style={{ fontSize: 46, fontWeight: '800', color: CREAM, letterSpacing: -1.4, marginTop: 6 }}>
              {weekDh}
              <Text style={{ fontSize: 20, fontWeight: '700', color: 'rgba(234,243,238,0.7)' }}> dh</Text>
            </Text>
            <View style={{ marginTop: 16 }}>
              <ActionBtn
                primary
                label="Cash out instantly"
                icon={<ArrowUpRight size={18} color="#04140D" strokeWidth={2.5} />}
                onPress={onCashOut}
              />
            </View>
          </LinearGradient>
        </Enter>

        {/* This week */}
        <Section icon={<TrendingUp size={14} color={GLOW} />} title="This week" />
        <Enter delay={120}>
          <View style={{ backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: LINE, padding: 18 }}>
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
            {!hasDailyBreakdown && (
              <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 14, lineHeight: 17 }}>
                Your daily earnings appear here as you complete trips this week.
              </Text>
            )}
          </View>
        </Enter>

        {/* Today */}
        <Section icon={<Wallet size={14} color={GLOW} />} title="Today" />
        <Enter delay={160}>
          <View style={{ flexDirection: 'row', gap: 11 }}>
            <StatTile
              icon={<Wallet size={15} color={GLOW} />}
              value={`${todayDh}`}
              unit="dh"
              label="Earned today"
            />
            <StatTile
              icon={<Package size={15} color={GLOW} />}
              value={`${tripsToday}`}
              label="Trips today"
            />
          </View>
        </Enter>

        <Text style={{ fontSize: 11.5, color: MUTED, textAlign: 'center', marginTop: 24, lineHeight: 17 }}>
          Every delivered trip adds to your balance — settled with dispatch each cycle.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

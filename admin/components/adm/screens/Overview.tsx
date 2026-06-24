// Admin · Overview — live-ops pulse, KPI grid, weekly orders, "needs attention",
// quick actions, recent activity. All from useAdminOverview() (real aggregates).
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import { useAdminOverview } from '../../../hooks/useAdminOverview';
import { StatCard, LiveOpsCard, ListRow, ActivityRow, Press } from '../ui';
import { fmtDh } from '../tokens';
import { ABell, AMoney, AMerchants, ARider, APin, AActivity, AStats, type AdmIcon } from '../icons';

function rel(iso?: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Overview({ go }: { go: (t: 'approvals' | 'merchants' | 'cities') => void; onToast: (m: string) => void }) {
  const t = useAg3Theme();
  const { kpis, week, pending, citiesLive, activity, loading } = useAdminOverview();
  const pendingTotal = pending.drivers + pending.merchants;
  const maxWeek = Math.max(1, ...week.map((w) => w.count));

  const sectionTitle = (s: string) => (
    <Text style={{ fontSize: 17, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.3, marginBottom: 12 }}>{s}</Text>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 22 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.primary, letterSpacing: 0.4 }}>ATLAASGO · ADMIN</Text>
            <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5, marginTop: 2 }}>Overview</Text>
            <Text style={{ fontSize: 13, color: t.colors.muted, marginTop: 1 }}>Morocco · all cities</Text>
          </View>
          <View>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <ABell size={20} color={t.colors.fg} />
            </View>
            {pendingTotal > 0 ? (
              <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 999, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.bg }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{pendingTotal > 99 ? '99+' : pendingTotal}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* live ops */}
        <LiveOpsCard
          stats={[
            { label: 'orders in flight', value: kpis.inFlight },
            { label: 'live drivers', value: kpis.liveDrivers },
            { label: 'cities live', value: citiesLive },
          ]}
        />

        {/* KPI grid */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label="Orders today" value={kpis.ordersToday} icon={AStats} deltaPct={kpis.ordersWowPct} />
            <StatCard label="GMV today" value={fmtDh(kpis.gmvTodayDh)} unit="dh" icon={AMoney} deltaPct={kpis.gmvWowPct} accent={t.colors.ok} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label="Live drivers" value={kpis.liveDrivers} icon={ARider} accent={t.colors.snow} />
            <StatCard label="Open merchants" value={kpis.openMerchants} icon={AMerchants} accent={t.colors.primary} />
          </View>
        </View>

        {/* weekly orders */}
        <View>
          {sectionTitle('Orders this week')}
          <View style={{ backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line2, borderRadius: 22, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: 8 }}>
              {(week.length ? week : Array.from({ length: 7 }, () => ({ d: '·', count: 0 }))).map((w, i) => {
                const h = Math.max(6, (w.count / maxWeek) * 104);
                const today = i === week.length - 1;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: t.colors.muted }}>{w.count}</Text>
                    <View style={{ width: '70%', height: h, borderRadius: 7, backgroundColor: today ? t.colors.primary : t.colors.line }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: today ? t.colors.fg : t.colors.muted }}>{w.d}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* needs attention */}
        <View>
          {sectionTitle('Needs your attention')}
          <View style={{ gap: 10 }}>
            <ListRow icon={ARider} title="Driver applications" subtitle="Verify docs · accept couriers" onPress={() => go('approvals')} trailing={<CountPill n={pending.drivers} t={t} />} />
            <ListRow icon={AMerchants} title="Merchant onboarding" subtitle="Review & publish merchants" onPress={() => go('approvals')} trailing={<CountPill n={pending.merchants} t={t} />} />
          </View>
        </View>

        {/* quick actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction t={t} icon={AMerchants} label="Add merchant" onPress={() => go('merchants')} />
          <QuickAction t={t} icon={APin} label="Launch a city" onPress={() => go('cities')} />
        </View>

        {/* recent activity */}
        {activity.length ? (
          <View>
            {sectionTitle('Recent activity')}
            <View>
              {activity.slice(0, 8).map((a, i, arr) => (
                <ActivityRow
                  key={a.id}
                  text={a.text}
                  when={rel(a.when)}
                  icon={a.kind === 'rider_app' || a.kind === 'driver_online' ? ARider : a.kind === 'merchant_app' ? AMerchants : AActivity}
                  accent={a.kind === 'driver_online' ? t.colors.ok : t.colors.primary}
                  last={i === Math.min(8, arr.length) - 1}
                />
              ))}
            </View>
          </View>
        ) : !loading ? (
          <Text style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center' }}>No recent activity yet.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CountPill({ n, t }: { n: number; t: ReturnType<typeof useAg3Theme> }) {
  const on = n > 0;
  return (
    <View style={{ minWidth: 28, height: 28, paddingHorizontal: 9, borderRadius: 999, backgroundColor: on ? t.colors.primary : t.colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: on ? '#fff' : t.colors.muted }}>{n}</Text>
    </View>
  );
}

function QuickAction({ t, icon: Icon, label, onPress }: { t: ReturnType<typeof useAg3Theme>; icon: AdmIcon; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line2, borderRadius: 18, padding: 16, gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.primary + '1F', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={t.colors.primary} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>{label}</Text>
      </View>
    </Press>
  );
}

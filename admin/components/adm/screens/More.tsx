// Admin · More — entry points to Promos + Payouts, the admin identity, and the
// super-admin capability matrix (informational; every capability is enforced
// server-side by admin-gated RLS / SECURITY DEFINER RPCs).
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import { useRoles } from '../../../hooks/useRoles';
import { ListRow } from '../ui';
import { admCard } from '../tokens';
import { APromo, APayout, AMerchants, ACities, AApprovals, AShield, type AdmIcon } from '../icons';

const CAPS: { icon: AdmIcon; title: string; sub: string }[] = [
  { icon: AMerchants, title: 'Merchants', sub: 'Onboard, edit, pause, remove' },
  { icon: ACities, title: 'Cities & delivery fees', sub: 'Launch cities, set per-city fees' },
  { icon: APayout, title: 'Payouts', sub: 'Settle driver & merchant payouts' },
  { icon: APromo, title: 'Promotions', sub: 'Promo codes & discount campaigns' },
  { icon: AApprovals, title: 'Approvals', sub: 'Verify drivers & merchants' },
];

export default function More({ go }: { go: (t: 'promos' | 'payouts') => void; onToast: (m: string) => void }) {
  const t = useAg3Theme();
  const { has } = useRoles();
  const roleLabel = has('super_admin') ? 'Super Admin' : 'Admin';

  const sectionTitle = (s: string) => (
    <Text style={{ fontSize: 13, fontWeight: '800', color: t.colors.muted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>{s}</Text>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 }}>More</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 24 }} showsVerticalScrollIndicator={false}>
        {/* identity */}
        <View style={[admCard(t), { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
          <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: t.colors.primary + '1F', alignItems: 'center', justifyContent: 'center' }}>
            <AShield size={24} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: t.colors.fg }}>{roleLabel}</Text>
            <Text style={{ fontSize: 12.5, color: t.colors.muted }}>AtlaasGo · all cities</Text>
          </View>
        </View>

        {/* operations */}
        <View>
          {sectionTitle('Operations')}
          <View style={{ gap: 10 }}>
            <ListRow icon={APromo} title="Promotions" subtitle="Promo-code campaigns" onPress={() => go('promos')} showChevron />
            <ListRow icon={APayout} title="Payouts" subtitle="Driver & merchant settlements" onPress={() => go('payouts')} showChevron />
          </View>
        </View>

        {/* capabilities */}
        <View>
          {sectionTitle('What you can manage')}
          <View style={{ gap: 10 }}>
            {CAPS.map((c) => (
              <ListRow key={c.title} icon={c.icon} title={c.title} subtitle={c.sub} />
            ))}
          </View>
          <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 14, lineHeight: 16 }}>
            Every admin action is enforced server-side — only admin / super-admin roles can write, via RLS and SECURITY DEFINER RPCs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

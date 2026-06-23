// AtlaasGo ADMIN — the 5-tab back-office console (Overview · Approvals ·
// Merchants · Cities · More, with Promos + Payouts inside More). Role-gated to
// admin / super_admin; every write is admin-gated server-side (RLS + SECURITY
// DEFINER RPCs). Built on the shared adm/ui module + the Phase-1 data hooks.
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAg3Theme } from '../components/ag3/theme';
import { useAuth } from '../lib/auth';
import { useRoles } from '../hooks/useRoles';
import { useApplications } from '../hooks/useAdmin';
import { AdmNav, Toast, type AdmTabKey, type AdmNavTab } from '../components/adm/ui';
import { AOverview, AApprovals, AMerchants, ACities, AMore, AShield } from '../components/adm/icons';
import Overview from '../components/adm/screens/Overview';
import Approvals from '../components/adm/screens/Approvals';
import Merchants from '../components/adm/screens/Merchants';
import Cities from '../components/adm/screens/Cities';
import More from '../components/adm/screens/More';
import Promos from '../components/adm/screens/Promos';
import Payouts from '../components/adm/screens/Payouts';

export type AdmScreenKey = AdmTabKey | 'promos' | 'payouts';
// Screens type `go` with their own narrower unions, so keep the param `string`
// and narrow at the one call site — keeps every screen prop assignable.
export type Go = (tab: string) => void;
export type Toaster = (msg: string, variant?: 'ok' | 'error' | 'info') => void;
export type AdmScreenProps = { go: Go; onToast: Toaster };

const NAV_TABS: AdmNavTab[] = [
  { key: 'overview', label: 'Overview', icon: AOverview },
  { key: 'approvals', label: 'Approvals', icon: AApprovals },
  { key: 'merchants', label: 'Merchants', icon: AMerchants },
  { key: 'cities', label: 'Cities', icon: ACities },
  { key: 'more', label: 'More', icon: AMore },
];

export default function AdminScreen() {
  const t = useAg3Theme();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [tab, setTab] = useState<AdmScreenKey>('overview');
  const [toast, setToast] = useState<{ msg: string; variant: 'ok' | 'error' | 'info' } | null>(null);

  // One applications instance feeds both the nav badge and the Approvals screen.
  const apps = useApplications();
  const pendingBadge = apps.rider.length + apps.restaurant.length;

  const go: Go = (next) => setTab(next as AdmScreenKey);
  const onToast: Toaster = (msg, variant = 'ok') => setToast({ msg, variant });

  if (authLoading || rolesLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <AShield size={46} color={t.colors.muted} />
        <Text style={{ fontSize: 19, fontWeight: '800', color: t.colors.fg }}>Admins only</Text>
        <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', maxWidth: 280 }}>
          This console is restricted to AtlaasGo administrators.
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: t.colors.primary, fontWeight: '800', marginTop: 8 }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const navActive: AdmTabKey = tab === 'promos' || tab === 'payouts' ? 'more' : tab;

  let content: React.ReactNode;
  switch (tab) {
    case 'overview': content = <Overview go={go} onToast={onToast} />; break;
    case 'approvals': content = <Approvals go={go} onToast={onToast} apps={apps} />; break;
    case 'merchants': content = <Merchants go={go} onToast={onToast} />; break;
    case 'cities': content = <Cities go={go} onToast={onToast} />; break;
    case 'more': content = <More go={go} onToast={onToast} />; break;
    case 'promos': content = <Promos go={go} onToast={onToast} />; break;
    case 'payouts': content = <Payouts go={go} onToast={onToast} />; break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1 }}>{content}</View>
      <AdmNav tabs={NAV_TABS} active={navActive} onSelect={(k) => setTab(k)} pendingBadge={pendingBadge} />
      <Toast message={toast?.msg ?? ''} visible={!!toast} variant={toast?.variant} onDone={() => setToast(null)} />
    </View>
  );
}

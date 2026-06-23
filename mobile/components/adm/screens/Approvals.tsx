// Admin · Approvals — pending Driver + Merchant queues with Approve / Reject.
// decide() updates the application status; the DB approval triggers grant the
// role + bootstrap the rider/restaurant profile atomically. (No Users queue —
// there is no backing pending-users source.)
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import type { useApplications } from '../../../hooks/useAdmin';
import { SegTabs, ApproveRejectButtons } from '../ui';
import { admCard } from '../tokens';
import { ARider, AMerchants, AOk } from '../icons';

type AppsApi = ReturnType<typeof useApplications>;
type Kind = 'rider' | 'restaurant';

export default function Approvals({
  apps,
  onToast,
}: {
  go: (t: string) => void;
  onToast: (m: string, v?: 'ok' | 'error' | 'info') => void;
  apps: AppsApi;
}) {
  const t = useAg3Theme();
  const [tab, setTab] = useState<Kind>('rider');
  const [busy, setBusy] = useState<string | null>(null);

  const list = tab === 'rider' ? apps.rider : apps.restaurant;

  async function act(id: string, name: string, next: 'approved' | 'rejected') {
    setBusy(id);
    const res = await apps.decide(tab, id, next);
    setBusy(null);
    if (res.ok) {
      onToast(`${name} ${next === 'approved' ? 'approved' : 'rejected'}`, next === 'approved' ? 'ok' : 'info');
    } else {
      onToast(res.error ?? 'Could not save', 'error');
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6, gap: 14 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 }}>Approvals</Text>
        <SegTabs<Kind>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'rider', label: 'Drivers', badge: apps.rider.length },
            { key: 'restaurant', label: 'Merchants', badge: apps.restaurant.length },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 12 }} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 10 }}>
            <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: t.colors.ok + '1F', alignItems: 'center', justifyContent: 'center' }}>
              <AOk size={26} color={t.colors.ok} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: t.colors.fg }}>All clear</Text>
            <Text style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center', maxWidth: 240 }}>
              No pending {tab === 'rider' ? 'driver' : 'merchant'} applications right now.
            </Text>
          </View>
        ) : (
          list.map((a) => (
            <View key={a.id} style={[admCard(t), { padding: 16, gap: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: t.colors.surface2, borderWidth: 1, borderColor: t.colors.line2, alignItems: 'center', justifyContent: 'center' }}>
                  {tab === 'rider' ? <ARider size={20} color={t.colors.fgSoft} /> : <AMerchants size={20} color={t.colors.fgSoft} />}
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: t.colors.fg }} numberOfLines={1}>{a.primary || 'Applicant'}</Text>
                  <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>{a.secondary}</Text>
                  {a.contact ? <Text style={{ fontSize: 11.5, color: t.colors.muted }} numberOfLines={1}>{a.contact}</Text> : null}
                </View>
              </View>
              <ApproveRejectButtons
                busy={busy === a.id}
                onApprove={() => void act(a.id, a.primary || 'Applicant', 'approved')}
                onReject={() => void act(a.id, a.primary || 'Applicant', 'rejected')}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Admin · Payouts — driver + merchant settlement queues. Pay advances
// pending→processing→paid via the admin-gated process_payout RPC; "Generate
// this week" creates pending rows from REAL delivered data. From usePayouts().
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import { usePayouts, type Payout, type PayoutKind } from '../../../hooks/usePayouts';
import { PayoutBar, SegTabs, LiveOpsCard, Press } from '../ui';
import { fmtDh } from '../tokens';
import { ARider, AMerchants } from '../icons';

function day(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Payouts({ onToast }: { go: (t: string) => void; onToast: (m: string, v?: 'ok' | 'error' | 'info') => void }) {
  const t = useAg3Theme();
  const { drivers, merchants, summary, pay, payAll, generate } = usePayouts();
  const [tab, setTab] = useState<PayoutKind>('rider');
  const [busy, setBusy] = useState<string | null>(null);

  const list = tab === 'rider' ? drivers : merchants;
  const pendingInTab = list.filter((p) => p.status === 'pending' || p.status === 'processing');

  async function one(p: Payout) {
    setBusy(p.id);
    const res = await pay(tab, p.id);
    setBusy(null);
    if (res.ok) onToast(`${p.name} · ${p.status === 'processing' ? 'paid' : 'processing'}`);
    else onToast(res.error ?? 'Failed', 'error');
  }
  async function all() {
    setBusy('all');
    const res = await payAll(tab);
    setBusy(null);
    if (res.ok) onToast('All settled');
    else onToast(res.error ?? 'Failed', 'error');
  }
  async function gen() {
    setBusy('gen');
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const s = new Date(now);
    s.setDate(now.getDate() - 6);
    const start = s.toISOString().slice(0, 10);
    const res = await generate(tab, start, end);
    setBusy(null);
    if (res.ok) onToast('Generated this week’s payouts');
    else onToast(res.error ?? 'Failed', 'error');
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6, gap: 14 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 }}>Payouts</Text>
        <LiveOpsCard
          title="Pending settlements"
          online={summary.count > 0}
          stats={[
            { label: 'pending', value: `${fmtDh(summary.pendingDh)} dh` },
            { label: 'payouts', value: summary.count },
            { label: 'this tab', value: pendingInTab.length },
          ]}
        />
        <SegTabs<PayoutKind>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'rider', label: 'Drivers', badge: drivers.filter((p) => p.status !== 'paid').length },
            { key: 'merchant', label: 'Merchants', badge: merchants.filter((p) => p.status !== 'paid').length },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ActionBtn t={t} label="Generate this week" tone="ghost" disabled={busy === 'gen'} onPress={() => void gen()} />
          <ActionBtn t={t} label={`Pay all (${pendingInTab.length})`} tone="solid" disabled={pendingInTab.length === 0 || busy === 'all'} onPress={() => void all()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130, gap: 10 }} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <Text style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center', paddingVertical: 48 }}>
            No {tab === 'rider' ? 'driver' : 'merchant'} payouts. Tap “Generate this week”.
          </Text>
        ) : (
          list.map((p) => (
            <PayoutBar
              key={p.id}
              name={p.name}
              meta={`${p.orders ? `${p.orders} orders · ` : ''}${day(p.periodStart)}–${day(p.periodEnd)}`}
              amountDh={p.amountDh}
              status={p.status}
              icon={tab === 'rider' ? ARider : AMerchants}
              paying={busy === p.id}
              onPay={() => void one(p)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionBtn({ t, label, tone, disabled, onPress }: { t: ReturnType<typeof useAg3Theme>; label: string; tone: 'solid' | 'ghost'; disabled?: boolean; onPress: () => void }) {
  const solid = tone === 'solid';
  return (
    <Press onPress={onPress} disabled={disabled} style={{ flex: 1 }}>
      <View style={{ alignItems: 'center', paddingVertical: 13, borderRadius: 14, borderWidth: 1, opacity: disabled ? 0.5 : 1, backgroundColor: solid ? t.colors.primary : t.colors.surface, borderColor: solid ? t.colors.primary : t.colors.line }}>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: solid ? '#fff' : t.colors.fgSoft }}>{label}</Text>
      </View>
    </Press>
  );
}

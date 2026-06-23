// Admin · Promos — promo-code campaigns with budget bars; create / activate /
// pause. From usePromotionsAdmin() → promotions (admin-write RLS, code = PK).
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import { usePromotionsAdmin, type AdminPromo, type PromoKind } from '../../../hooks/usePromotionsAdmin';
import { PromoCard, SegTabs, TextField, MoneyField, AddSheet, Fab } from '../ui';
import { fmtDh } from '../tokens';

function detailOf(p: AdminPromo): string {
  const v =
    p.kind === 'percent_off' ? `${p.percentOff ?? 0}% off`
    : p.kind === 'flat_off' ? `${p.flatOffDh ?? 0} dh off`
    : p.kind === 'free_delivery' ? 'Free delivery'
    : 'Buy one get one';
  return p.scope && p.scope !== 'all' ? `${v} · ${p.scope}` : v;
}

const KINDS: { key: PromoKind; label: string }[] = [
  { key: 'percent_off', label: '% off' },
  { key: 'flat_off', label: 'dh off' },
  { key: 'free_delivery', label: 'Free deliv.' },
];

export default function Promos({ onToast }: { go: (t: string) => void; onToast: (m: string, v?: 'ok' | 'error' | 'info') => void }) {
  const t = useAg3Theme();
  const { promos, createPromo, togglePromo } = usePromotionsAdmin();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', kind: 'percent_off' as PromoKind, value: '', budget: '' });
  const [busy, setBusy] = useState(false);

  const active = promos.filter((p) => p.isActive).length;
  const spend = promos.reduce((a, p) => a + p.spentDh, 0);

  async function toggle(p: AdminPromo) {
    const res = await togglePromo(p.code, !p.isActive);
    if (res.ok) onToast(`${p.code} ${p.isActive ? 'paused' : 'activated'}`, p.isActive ? 'info' : 'ok');
    else onToast(res.error ?? 'Failed', 'error');
  }

  async function create() {
    if (!form.code.trim() || !form.name.trim()) return;
    setBusy(true);
    const val = Number(form.value) || 0;
    const res = await createPromo({
      code: form.code,
      name: form.name.trim(),
      kind: form.kind,
      percentOff: form.kind === 'percent_off' ? val : null,
      flatOffDh: form.kind === 'flat_off' ? val : null,
      budgetDh: Number(form.budget) || 0,
      isActive: true,
    });
    setBusy(false);
    if (res.ok) {
      onToast(`Campaign “${form.code.toUpperCase()}” launched`);
      setOpen(false);
      setForm({ name: '', code: '', kind: 'percent_off', value: '', budget: '' });
    } else onToast(res.error ?? 'Could not create', 'error');
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 }}>Promotions</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MiniStat t={t} label="Active" value={String(active)} />
          <MiniStat t={t} label="Spend" value={`${fmtDh(spend)} dh`} />
          <MiniStat t={t} label="Campaigns" value={String(promos.length)} />
        </View>

        {promos.length === 0 ? (
          <Text style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center', paddingVertical: 40 }}>No campaigns yet — launch one below.</Text>
        ) : (
          promos.map((p) => (
            <PromoCard
              key={p.code}
              name={p.name}
              code={p.code}
              detail={detailOf(p)}
              active={p.isActive}
              spentDh={p.spentDh}
              budgetDh={p.budgetDh}
              onToggle={() => void toggle(p)}
            />
          ))
        )}
      </ScrollView>

      <Fab label="New campaign" onPress={() => setOpen(true)} />

      <AddSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="New campaign"
        submitLabel="Launch campaign"
        onSubmit={create}
        submitDisabled={!form.code.trim() || !form.name.trim()}
        submitting={busy}
        height="74%"
      >
        <TextField label="Name" placeholder="Winter free delivery" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <TextField label="Code" placeholder="ATLAS20" value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))} autoCapitalize="characters" />
        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.fgSoft, marginBottom: 7 }}>Discount type</Text>
          <SegTabs<PromoKind> value={form.kind} onChange={(v) => setForm((f) => ({ ...f, kind: v }))} tabs={KINDS} />
        </View>
        {form.kind !== 'free_delivery' ? (
          <MoneyField label={form.kind === 'percent_off' ? 'Percent off' : 'Amount off'} value={form.value} onChangeText={(v) => setForm((f) => ({ ...f, value: v }))} />
        ) : null}
        <MoneyField label="Budget" hint="0 = uncapped" value={form.budget} onChangeText={(v) => setForm((f) => ({ ...f, budget: v }))} />
      </AddSheet>
    </SafeAreaView>
  );
}

function MiniStat({ t, label, value }: { t: ReturnType<typeof useAg3Theme>; label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line2, borderRadius: 16, padding: 13, gap: 3 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.4 }}>{value}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: t.colors.muted }}>{label}</Text>
    </View>
  );
}

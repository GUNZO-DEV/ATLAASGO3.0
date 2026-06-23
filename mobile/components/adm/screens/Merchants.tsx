// Admin · Merchants — every restaurant with vertical/city/status/orders, plus
// add / edit / pause-resume / remove. All writes go through useAdminMerchants()
// → restaurants (admin-write RLS).
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import { useAdminMerchants, type AdminMerchant, type MerchantVertical } from '../../../hooks/useAdminMerchants';
import { ListRow, StatusPill, VerticalTag, SegTabs, TextField, MoneyField, Fab, AddSheet, Press } from '../ui';
import type { AdmStatus } from '../tokens';
import { APause, APlay, ATrash } from '../icons';

function pillStatus(s: string): AdmStatus {
  if (s === 'live') return 'live';
  if (s === 'paused') return 'paused';
  if (s === 'rejected') return 'off';
  return 'pending';
}

const VERTICALS: { key: MerchantVertical; label: string; emoji: string }[] = [
  { key: 'food', label: 'Food', emoji: '🍽️' },
  { key: 'grocery', label: 'Grocery', emoji: '🛒' },
  { key: 'pharmacy', label: 'Pharmacy', emoji: '💊' },
];

type Sheet = null | { mode: 'add' } | { mode: 'edit'; m: AdminMerchant };

export default function Merchants({ onToast }: { go: (t: string) => void; onToast: (m: string, v?: 'ok' | 'error' | 'info') => void }) {
  const t = useAg3Theme();
  const { merchants, createMerchant, updateMerchant, removeMerchant } = useAdminMerchants();

  const [query, setQuery] = useState('');
  const [vf, setVf] = useState<'all' | MerchantVertical>('all');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [form, setForm] = useState({ name: '', city: '', fee: '', vertical: 'food' as MerchantVertical });
  const [busy, setBusy] = useState(false);

  const liveCount = merchants.filter((m) => m.status === 'live').length;
  const filtered = useMemo(
    () =>
      merchants.filter(
        (m) =>
          (vf === 'all' || m.vertical === vf) &&
          (!query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [merchants, vf, query],
  );

  function openAdd() {
    setForm({ name: '', city: '', fee: '', vertical: 'food' });
    setSheet({ mode: 'add' });
  }
  function openEdit(m: AdminMerchant) {
    setForm({ name: m.name, city: m.city ?? '', fee: String(m.feeDh), vertical: m.vertical });
    setSheet({ mode: 'edit', m });
  }

  async function submit() {
    if (!sheet || !form.name.trim()) return;
    setBusy(true);
    const payload = { name: form.name.trim(), city: form.city.trim() || null, feeDh: Number(form.fee) || 0, vertical: form.vertical };
    const res = sheet.mode === 'add' ? await createMerchant(payload) : await updateMerchant(sheet.m.id, payload);
    setBusy(false);
    if (res.ok) {
      onToast(sheet.mode === 'add' ? `${payload.name} added` : `${payload.name} saved`);
      setSheet(null);
    } else onToast(res.error ?? 'Save failed', 'error');
  }

  async function togglePause(m: AdminMerchant) {
    const next = m.status === 'live' ? 'paused' : 'live';
    const res = await updateMerchant(m.id, { status: next });
    if (res.ok) onToast(`${m.name} ${next === 'live' ? 'resumed' : 'paused'}`, next === 'live' ? 'ok' : 'info');
    else onToast(res.error ?? 'Failed', 'error');
    setSheet(null);
  }

  function confirmRemove(m: AdminMerchant) {
    Alert.alert('Remove merchant', `Remove “${m.name}” from every city catalog? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const res = await removeMerchant(m.id);
            if (res.ok) onToast(`${m.name} removed`, 'info');
            else onToast(res.error ?? 'Failed', 'error');
            setSheet(null);
          })();
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 }}>Merchants</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.muted }}>{liveCount} live</Text>
        </View>
        <TextField placeholder="Search merchants" value={query} onChangeText={setQuery} autoCapitalize="none" />
        <SegTabs<'all' | MerchantVertical>
          value={vf}
          onChange={setVf}
          tabs={[{ key: 'all', label: 'All' }, ...VERTICALS.map((v) => ({ key: v.key, label: v.label }))]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130, gap: 10 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center', paddingVertical: 48 }}>No merchants match.</Text>
        ) : (
          filtered.map((m) => (
            <ListRow
              key={m.id}
              emoji={m.emoji}
              title={m.name}
              subtitle={`${m.city ?? '—'} · ${m.orderCount} orders · ★ ${m.rating.toFixed(1)}`}
              onPress={() => openEdit(m)}
              trailing={
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusPill status={pillStatus(m.status)} />
                  <VerticalTag vertical={m.vertical} />
                </View>
              }
            />
          ))
        )}
      </ScrollView>

      <Fab label="Add" onPress={openAdd} />

      <AddSheet
        visible={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet?.mode === 'edit' ? 'Manage merchant' : 'Add merchant'}
        submitLabel={sheet?.mode === 'edit' ? 'Save changes' : 'Publish merchant'}
        onSubmit={submit}
        submitDisabled={!form.name.trim()}
        submitting={busy}
        height="78%"
      >
        <TextField label="Name" placeholder="Café Atlas Lumière" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.fgSoft, marginBottom: 7 }}>Vertical</Text>
          <SegTabs<MerchantVertical>
            value={form.vertical}
            onChange={(v) => setForm((f) => ({ ...f, vertical: v }))}
            tabs={VERTICALS.map((v) => ({ key: v.key, label: v.label }))}
          />
        </View>
        <TextField label="City" placeholder="Ifrane" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />
        <MoneyField label="Delivery fee" hint="0 = use the city default" value={form.fee} onChangeText={(v) => setForm((f) => ({ ...f, fee: v }))} />

        {sheet?.mode === 'edit' ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
            <Press onPress={() => void togglePause(sheet.m)} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: t.colors.line, backgroundColor: t.colors.surface2 }}>
                {sheet.m.status === 'live' ? <APause size={16} color={t.colors.fgSoft} /> : <APlay size={16} color={t.colors.ok} />}
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: t.colors.fgSoft }}>{sheet.m.status === 'live' ? 'Pause' : 'Resume'}</Text>
              </View>
            </Press>
            <Press onPress={() => confirmRemove(sheet.m)} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: (t.isDark ? '#F87171' : '#E11D48') + '40', backgroundColor: (t.isDark ? '#F87171' : '#E11D48') + '14' }}>
                <ATrash size={16} color={t.isDark ? '#F87171' : '#E11D48'} />
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: t.isDark ? '#F87171' : '#E11D48' }}>Remove</Text>
              </View>
            </Press>
          </View>
        ) : null}
      </AddSheet>
    </SafeAreaView>
  );
}

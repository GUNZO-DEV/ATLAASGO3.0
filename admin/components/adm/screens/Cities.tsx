// Admin · Cities — served-city roster + per-city delivery-fee editor (drives
// cart_quote), launch-city, and the served toggle. From useCities() →
// cities / city_fees (admin-write RLS).
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../ag3/theme';
import { useCities, type AdminCity, type CityFee } from '../../../hooks/useCities';
import { ListRow, StatusPill, FeeRow, TextField, AddSheet, Fab } from '../ui';
import { ASnow } from '../icons';

type FeeForm = Record<keyof CityFee, string>;

function feeToForm(f: CityFee): FeeForm {
  return {
    base: String(f.base),
    perKm: String(f.perKm),
    freeOver: String(f.freeOver),
    priority: String(f.priority),
    smallCart: String(f.smallCart),
    weather: String(f.weather),
  };
}
function formToFee(f: FeeForm): CityFee {
  const n = (s: string) => Number(s) || 0;
  return { base: n(f.base), perKm: n(f.perKm), freeOver: n(f.freeOver), priority: n(f.priority), smallCart: n(f.smallCart), weather: n(f.weather) };
}

export default function Cities({ onToast }: { go: (t: string) => void; onToast: (m: string, v?: 'ok' | 'error' | 'info') => void }) {
  const t = useAg3Theme();
  const { cities, toggleServed, saveFee, addCity } = useCities();

  const [edit, setEdit] = useState<AdminCity | null>(null);
  const [fee, setFee] = useState<FeeForm | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', campus: false, weather: false, served: true });
  const [busy, setBusy] = useState(false);

  function openFee(c: AdminCity) {
    setEdit(c);
    setFee(feeToForm(c.fee));
  }
  const setF = (k: keyof CityFee, v: string) => setFee((p) => (p ? { ...p, [k]: v } : p));

  async function save() {
    if (!edit || !fee) return;
    setBusy(true);
    const res = await saveFee(edit.id, formToFee(fee));
    setBusy(false);
    if (res.ok) {
      onToast(`${edit.name} fees saved`);
      setEdit(null);
    } else onToast(res.error ?? 'Save failed', 'error');
  }

  async function launch() {
    const id = newCity.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!id) return;
    setBusy(true);
    const res = await addCity({ id, name: newCity.name.trim(), campus: newCity.campus, weather: newCity.weather, served: newCity.served });
    setBusy(false);
    if (res.ok) {
      onToast(`${newCity.name} ${newCity.served ? 'is now live' : 'added'}`);
      setAddOpen(false);
      setNewCity({ name: '', campus: false, weather: false, served: true });
    } else onToast(res.error ?? 'Could not add', 'error');
  }

  async function flip(c: AdminCity, served: boolean) {
    const res = await toggleServed(c.id, served);
    if (res.ok) onToast(`${c.name} ${served ? 'live' : 'paused'}`, served ? 'ok' : 'info');
    else onToast(res.error ?? 'Failed', 'error');
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 }}>Cities</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130, gap: 10 }} showsVerticalScrollIndicator={false}>
        {cities.map((c) => (
          <ListRow
            key={c.id}
            icon={undefined}
            emoji={c.campus ? '🎓' : '🏙'}
            title={c.name}
            subtitle={`${c.merchantCount} merchants${c.weather ? ' · ❄ weather zone' : ''}`}
            onPress={() => openFee(c)}
            trailing={
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <StatusPill status={c.served ? 'live' : 'paused'} label={c.served ? 'Live' : 'Off'} />
                <Switch
                  value={c.served}
                  onValueChange={(v) => void flip(c, v)}
                  trackColor={{ true: t.colors.primary, false: t.colors.line }}
                  thumbColor="#fff"
                />
              </View>
            }
          />
        ))}
      </ScrollView>

      <Fab label="Launch city" onPress={() => setAddOpen(true)} />

      {/* fee editor */}
      <AddSheet
        visible={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `${edit.name} · delivery fees` : 'Fees'}
        submitLabel="Save fees"
        onSubmit={save}
        submitting={busy}
        height="80%"
      >
        {fee ? (
          <View>
            <FeeRow label="Base delivery fee" hint="Flat fee on every order" value={fee.base} onChangeText={(v) => setF('base', v)} />
            <FeeRow label="Per-km rate" hint="Added per km from merchant" value={fee.perKm} onChangeText={(v) => setF('perKm', v)} />
            <FeeRow label="Free delivery over" hint="Waive the fee above this subtotal" value={fee.freeOver} onChangeText={(v) => setF('freeOver', v)} />
            <FeeRow label="Priority surcharge" hint="Express / rush add-on" value={fee.priority} onChangeText={(v) => setF('priority', v)} />
            <FeeRow label="Small-cart fee" hint="Orders below the free threshold" value={fee.smallCart} onChangeText={(v) => setF('smallCart', v)} />
            {edit?.weather ? (
              <FeeRow label="Weather surcharge" hint="Snow / storm — display only (live weather drives the quote)" value={fee.weather} onChangeText={(v) => setF('weather', v)} />
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <ASnow size={14} color={t.colors.snow} />
              <Text style={{ fontSize: 11.5, color: t.colors.muted, flex: 1 }}>
                Base + priority feed the live customer quote immediately. Per-km / free-over are display-only until a distance feed lands.
              </Text>
            </View>
          </View>
        ) : null}
      </AddSheet>

      {/* launch city */}
      <AddSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Launch a city"
        submitLabel="Launch"
        onSubmit={launch}
        submitDisabled={!newCity.name.trim()}
        submitting={busy}
      >
        <TextField label="City name" placeholder="Marrakech" value={newCity.name} onChangeText={(v) => setNewCity((c) => ({ ...c, name: v }))} />
        <ToggleRow t={t} label="Campus city" value={newCity.campus} onChange={(v) => setNewCity((c) => ({ ...c, campus: v }))} />
        <ToggleRow t={t} label="Weather zone (Atlas snow)" value={newCity.weather} onChange={(v) => setNewCity((c) => ({ ...c, weather: v }))} />
        <ToggleRow t={t} label="Go live now" value={newCity.served} onChange={(v) => setNewCity((c) => ({ ...c, served: v }))} />
      </AddSheet>
    </SafeAreaView>
  );
}

function ToggleRow({ t, label, value, onChange }: { t: ReturnType<typeof useAg3Theme>; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontSize: 14.5, fontWeight: '600', color: t.colors.fg }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.colors.primary, false: t.colors.line }} thumbColor="#fff" />
    </View>
  );
}

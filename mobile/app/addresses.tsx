// AtlaasGo 3.0 — Saved delivery addresses (campus-precise drop).
//
// Native re-skin of the prototype address-book, faithful to the 3.0 look
// (warm terracotta + amber on cream/ink, sunset gradients, pin tiles, rounded
// cards, gradient "Add address" CTA). Built on the ag3 foundation:
//   theme.ts (useAg3Theme), icons.tsx, components/ag3/primitives (Press, Rise).
//
// DATA / PLUMBING PRESERVED ───────────────────────────────────────────────────
//   • useAddresses() owns the live CRUD: add / update / remove / setDefault all
//     hit the Supabase `addresses` table (RLS-scoped) and re-load. None of that
//     is touched — only the presentation around it.
//   • useLocation().capture() still drives the GPS pin (expo-location permission
//     + getCurrentPositionAsync), gated by gpsStatus / surfaced via gpsError.
//   • The add/edit form keeps every field (label, line1, landmark, building,
//     room), the AUI campus toggle + 68-building quick-pick, and the landmark
//     ≥3-char validation Alert. Submit still routes to update(editingId) vs
//     add() exactly as before.
//   • Auth gating (useAuth) → signed-out CTA to /sign-in is preserved.
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react-native';

import { useAg3Theme } from '../components/ag3/theme';
import { IBack, IPin, IPlus, ICheck } from '../components/ag3/icons';
import { Press, Rise } from '../components/ag3/primitives';
import { useAuth } from '../lib/auth';
import { useAddresses, type Address } from '../hooks/useAddresses';
import { useLocation } from '../hooks/useLocation';
import type { Coords } from '../lib/types';

type Theme = ReturnType<typeof useAg3Theme>;

// AUI quick-pick buildings — copied from the web Addresses page
// (src/pages/Addresses.tsx): 60 numbered dorms + named campus spots.
const AUI_DORMS = Array.from({ length: 60 }, (_, i) => ({
  label: `Dorm ${i + 1}`,
  building: `${i + 1}`,
  line1: 'AUI Campus, Ifrane',
}));

const AUI_OTHER = [
  { label: 'SSE', building: 'SSE', line1: 'School of Science & Engineering, AUI' },
  { label: 'SBA', building: 'SBA', line1: 'School of Business Administration, AUI' },
  { label: 'SHSS', building: 'SHSS', line1: 'School of Humanities & Social Sciences, AUI' },
  { label: 'Library', building: 'Library', line1: 'Mohammed VI Library, AUI' },
  { label: 'Student Center', building: 'Student Center', line1: 'AUI Campus, Ifrane' },
  { label: 'Dining Hall', building: 'Dining Hall', line1: 'AUI Campus, Ifrane' },
  { label: 'Sports Complex', building: 'Sports Complex', line1: 'AUI Campus, Ifrane' },
  { label: 'Main Gate', building: 'Main Gate', line1: 'AUI Main Entrance, Ifrane' },
];

const AUI_BUILDINGS = [...AUI_DORMS, ...AUI_OTHER];

export default function AddressesScreen() {
  const t = useAg3Theme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addresses, loading, add, update, remove, setDefault } = useAddresses();
  const { status: gpsStatus, error: gpsError, capture } = useLocation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [landmark, setLandmark] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [isCampus, setIsCampus] = useState(false);
  const [pin, setPin] = useState<Coords | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setLabel(''); setLine1(''); setLandmark(''); setBuilding(''); setRoom('');
    setIsCampus(false);
    setPin(null);
  }

  function startAdd() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(a: Address) {
    setEditingId(a.id);
    setLabel(a.label ?? '');
    setLine1(a.line1 ?? '');
    setLandmark(a.landmark ?? '');
    setBuilding(a.building ?? '');
    setRoom(a.room ?? '');
    setIsCampus(a.isCampus);
    setPin(a.coords ?? null);
    setFormOpen(true);
  }

  async function capturePin() {
    const next = await capture();
    if (next) setPin(next);
  }

  async function submit() {
    if (landmark.trim().length < 3) {
      Alert.alert('Add a landmark', 'A landmark helps your driver find you (min 3 characters).');
      return;
    }
    setBusy(true);
    const input = { label, line1, landmark, building, room, isCampus, coords: pin };
    const err = editingId ? await update(editingId, input) : await add(input);
    setBusy(false);
    if (err) {
      Alert.alert('Could not save', err);
    } else {
      resetForm();
    }
  }

  // ── Signed-out state ────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header t={t} onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IPin size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>
            Saved addresses
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to save home, the dorm, or the café you camp at.
          </Text>
          <Press onPress={() => router.push('/sign-in')}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.browseBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>Sign in</Text>
            </LinearGradient>
          </Press>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <Header t={t} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* eyebrow + title */}
        <Rise>
          <View style={[styles.pad, { marginTop: 6, marginBottom: 4 }]}>
            <Text style={[styles.eyebrow, { color: t.colors.primary }]}>WHERE WE DROP</Text>
            <Text style={[styles.disp, { fontSize: 27, color: t.colors.fg }]}>Delivery addresses</Text>
          </View>
        </Rise>

        {/* address list */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : (
          <Rise style={[styles.pad, { marginTop: 14, gap: 11 }]}>
            {addresses.map((a) => (
              <View key={a.id} style={[card(t), { padding: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  {/* pin tile — gradient for default, soft surface otherwise */}
                  {a.isDefault ? (
                    <LinearGradient
                      colors={t.gradients.sunset}
                      start={t.gradients.start}
                      end={t.gradients.end}
                      style={[styles.pinTile, t.shadows.glow]}
                    >
                      {a.isCampus ? <GraduationCap size={21} color="#fff" /> : <IPin size={21} color="#fff" />}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.pinTile, { backgroundColor: 'rgba(255,87,34,0.10)' }]}>
                      {a.isCampus
                        ? <GraduationCap size={20} color={t.colors.primary} />
                        : <IPin size={20} color={t.colors.primary} />}
                    </View>
                  )}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: t.colors.fg }} numberOfLines={1}>
                        {a.label || 'Address'}
                      </Text>
                      {a.isDefault && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(47,163,107,0.14)' }]}>
                          <ICheck size={12} color={t.colors.ok} />
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: t.colors.ok }}>DEFAULT</Text>
                        </View>
                      )}
                      {a.isCampus && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(255,87,34,0.12)' }]}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: t.colors.primary }}>CAMPUS</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12.5, color: t.colors.muted, marginTop: 2 }} numberOfLines={1}>
                      {[a.line1, a.landmark, a.building && `Bldg ${a.building}`, a.room && `Rm ${a.room}`].filter(Boolean).join(' · ')}
                    </Text>
                    {a.coords && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <IPin size={11} color={t.colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: t.colors.primary, fontVariant: ['tabular-nums'] }}>
                          GPS · {a.coords.lat.toFixed(5)}, {a.coords.lng.toFixed(5)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* row actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 }}>
                  {!a.isDefault && (
                    <Pressable onPress={() => setDefault(a.id)}>
                      <View style={[styles.actionPill, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                        <ICheck size={13} color={t.colors.fgSoft} />
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.fgSoft }}>Set default</Text>
                      </View>
                    </Pressable>
                  )}
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => startEdit(a)} hitSlop={6}>
                    <View style={[styles.iconChip, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                      <Pencil size={16} color={t.colors.fgSoft} />
                    </View>
                  </Pressable>
                  <Pressable onPress={() => remove(a.id)} hitSlop={6}>
                    <View style={[styles.iconChip, { backgroundColor: 'rgba(225,29,72,0.10)', borderColor: 'rgba(225,29,72,0.20)' }]}>
                      <Trash2 size={16} color="#E0526D" />
                    </View>
                  </Pressable>
                </View>
              </View>
            ))}

            {addresses.length === 0 && !formOpen && (
              <View style={[card(t), { padding: 22, alignItems: 'center' }]}>
                <View style={[styles.emptyIcon, { width: 54, height: 54, backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                  <IPin size={24} color={t.colors.muted} />
                </View>
                <Text style={{ fontSize: 14, color: t.colors.fgSoft, textAlign: 'center', lineHeight: 20, marginTop: 14 }}>
                  No saved addresses yet — add your first delivery spot in under 20 seconds.
                </Text>
              </View>
            )}
          </Rise>
        )}

        {/* ── add / edit form ── */}
        {formOpen ? (
          <Rise style={[styles.pad, { marginTop: 18 }]}>
            <View style={[card(t), { padding: 18, borderRadius: t.radii.lg }]}>
              <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg, marginBottom: 14 }]}>
                {editingId ? 'Edit address' : 'New address'}
              </Text>

              <Field t={t} value={label} onChangeText={setLabel} placeholder="Label (Home · Dorm · Studio)" />
              <Field t={t} value={line1} onChangeText={setLine1} placeholder="Address (Avenue Mohammed V, Ifrane)" />
              <Field t={t} value={landmark} onChangeText={setLandmark} placeholder="Landmark (e.g. Near AUI gate)" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field t={t} value={building} onChangeText={setBuilding} placeholder="Building" style={{ flex: 1 }} />
                <Field t={t} value={room} onChangeText={setRoom} placeholder="Room" style={{ flex: 1 }} />
              </View>

              {/* AUI campus toggle */}
              <Pressable
                onPress={() => {
                  const next = !isCampus;
                  setIsCampus(next);
                  if (next && !line1) setLine1('AUI Campus, Ifrane');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isCampus ? t.colors.primary : t.colors.surface2,
                      borderColor: isCampus ? t.colors.primary : t.colors.line,
                    },
                  ]}
                >
                  {isCampus && <ICheck size={14} color="#fff" strokeWidth={3} />}
                </View>
                <Text style={{ marginLeft: 11, fontSize: 14, fontWeight: '700', color: t.colors.fg }}>
                  AUI campus delivery
                </Text>
              </Pressable>

              {/* Quick-pick chips (campus only) */}
              {isCampus && (
                <View style={{ marginTop: 8, marginBottom: 6 }}>
                  <Text style={[styles.eyebrow, { color: t.colors.muted, marginBottom: 9 }]}>QUICK PICK A BUILDING</Text>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {AUI_BUILDINGS.map((b) => {
                        const active = building === b.building;
                        return (
                          <Pressable
                            key={b.building}
                            onPress={() => {
                              setBuilding(b.building);
                              setLine1(b.line1);
                              setLabel(b.label);
                            }}
                          >
                            <View
                              style={{
                                paddingHorizontal: 13,
                                paddingVertical: 7,
                                borderRadius: 999,
                                backgroundColor: active ? 'rgba(255,87,34,0.10)' : t.colors.surface2,
                                borderWidth: active ? 1.5 : 1,
                                borderColor: active ? t.colors.primary : t.colors.line,
                              }}
                            >
                              <Text style={{ fontSize: 12.5, color: active ? t.colors.primary : t.colors.fgSoft, fontWeight: active ? '700' : '600' }}>
                                {b.label}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* GPS pin capture */}
              <View style={[styles.gpsRow, { backgroundColor: 'rgba(255,87,34,0.08)', borderColor: 'rgba(255,87,34,0.16)' }]}>
                <LinearGradient
                  colors={t.gradients.sunset}
                  start={t.gradients.start}
                  end={t.gradients.end}
                  style={[styles.gpsTile, t.shadows.glow]}
                >
                  <IPin size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.eyebrow, { color: t.colors.muted, marginBottom: 1 }]}>GPS PIN</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                    {pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'Tap to capture'}
                  </Text>
                </View>
                <Press onPress={capturePin}>
                  <View style={[styles.gpsBtn, { backgroundColor: t.colors.primary, opacity: gpsStatus === 'requesting' ? 0.6 : 1 }]}>
                    {gpsStatus === 'requesting'
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>{pin ? 'Update' : 'Capture'}</Text>}
                  </View>
                </Press>
              </View>
              {gpsError && (
                <Text style={{ fontSize: 12, color: '#E0526D', marginTop: 6 }}>{gpsError}</Text>
              )}

              {/* save */}
              <Press onPress={submit} disabled={busy} style={{ marginTop: 16 }}>
                <LinearGradient
                  colors={t.gradients.sunset}
                  start={t.gradients.start}
                  end={t.gradients.end}
                  style={[styles.saveBtn, t.shadows.glow, { opacity: busy ? 0.7 : 1 }]}
                >
                  {busy
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{editingId ? 'Save changes' : 'Save address'}</Text>}
                </LinearGradient>
              </Press>
              <Pressable onPress={resetForm} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.colors.muted }}>Cancel</Text>
              </Pressable>
            </View>
          </Rise>
        ) : (
          <Rise style={[styles.pad, { marginTop: 18 }]}>
            <Press onPress={startAdd}>
              <LinearGradient
                colors={t.gradients.sunset}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.addBtn, t.shadows.glow]}
              >
                <IPlus size={18} color={t.colors.onPrimary} />
                <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>
                  {addresses.length === 0 ? 'Add address' : 'Add another address'}
                </Text>
              </LinearGradient>
            </Press>
          </Rise>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── sub-components ───────────────────────────────────────────────────────── */

function Header({ t, onBack }: { t: Theme; onBack: () => void }) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 }}
    >
      <Press onPress={onBack} scaleTo={0.9}>
        <View style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }]}>
          <IBack size={20} color={t.colors.fg} />
        </View>
      </Press>
      <Text style={[styles.disp, { fontWeight: '800', fontSize: 20, color: t.colors.fg }]}>Addresses</Text>
    </MotiView>
  );
}

function Field({
  t,
  value,
  onChangeText,
  placeholder,
  style,
}: {
  t: Theme;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  style?: object;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.colors.muted}
      style={[
        styles.input,
        { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg },
        style,
      ]}
    />
  );
}

/* ── shared card base ─────────────────────────────────────────────────────── */
function card(t: Theme) {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  } as const;
}

/* ── styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },
  pad: { paddingHorizontal: 18 },

  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  browseBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24 },

  pinTile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },

  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  iconChip: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  checkbox: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  input: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 11 },

  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, marginTop: 6 },
  gpsTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  gpsBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', minWidth: 74 },

  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 999, paddingVertical: 16 },
});

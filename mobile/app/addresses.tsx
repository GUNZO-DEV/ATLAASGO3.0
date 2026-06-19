import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, GraduationCap, MapPin, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useAddresses, type Address } from '../hooks/useAddresses';
import { useLocation } from '../hooks/useLocation';
import type { Coords } from '../lib/types';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';

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

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View className="w-10 h-10 rounded-full items-center justify-center bg-white" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}>
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>Addresses</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MapPin size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Saved addresses</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to save home, the dorm, or the café you camp at.
          </Text>
          <PressableScale onPress={() => router.push('/sign-in')}>
            <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 20 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const inputStyle = {
    backgroundColor: '#FBF7F2',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.10)',
    color: INK,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text className="mt-6 mb-4 font-display text-[28px]" style={{ fontWeight: '800', letterSpacing: -0.8, color: INK }}>
          Delivery addresses
        </Text>

        {loading ? (
          <View className="py-8 items-center"><ActivityIndicator color={BRAND} /></View>
        ) : (
          <View style={{ gap: 10 }}>
            {addresses.map((a) => (
              <View key={a.id} className="bg-white rounded-2xl p-4" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}>
                    {a.isCampus
                      ? <GraduationCap size={16} color={BRAND} />
                      : <MapPin size={16} color={BRAND} />}
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text className="text-[15px] font-bold" style={{ color: INK }}>{a.label || 'Address'}</Text>
                      {a.isDefault && (
                        <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}>
                          <Text className="text-[10px] font-bold" style={{ color: '#059669' }}>DEFAULT</Text>
                        </View>
                      )}
                      {a.isCampus && (
                        <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}>
                          <Text className="text-[10px] font-bold" style={{ color: BRAND }}>CAMPUS</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>
                      {[a.line1, a.landmark, a.building && `Bldg ${a.building}`, a.room && `Rm ${a.room}`].filter(Boolean).join(' · ')}
                    </Text>
                    {a.coords && (
                      <Text className="text-[11px] mt-0.5" style={{ color: BRAND }}>
                        GPS pin · {a.coords.lat.toFixed(5)}, {a.coords.lng.toFixed(5)}
                      </Text>
                    )}
                  </View>
                  <PressableScale onPress={() => startEdit(a)}>
                    <View className="w-9 h-9 items-center justify-center"><Pencil size={16} color={MUTED} /></View>
                  </PressableScale>
                  <PressableScale onPress={() => remove(a.id)}>
                    <View className="w-9 h-9 items-center justify-center"><Trash2 size={16} color={MUTED} /></View>
                  </PressableScale>
                </View>
                {!a.isDefault && (
                  <Pressable onPress={() => setDefault(a.id)} className="mt-2 self-start">
                    <View className="flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)' }}>
                      <Check size={12} color={MUTED} />
                      <Text className="ml-1 text-[12px] font-bold" style={{ color: MUTED }}>Set as default</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            ))}
            {addresses.length === 0 && !formOpen && (
              <Text className="text-[14px]" style={{ color: MUTED }}>No saved addresses yet — add your first delivery spot in under 20 seconds.</Text>
            )}
          </View>
        )}

        {/* Add / edit form */}
        {formOpen ? (
          <View className="mt-5 bg-white rounded-3xl p-5" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
            <Text className="font-display text-[16px] mb-3" style={{ fontWeight: '800', color: INK }}>
              {editingId ? 'Edit address' : 'New address'}
            </Text>
            <TextInput value={label} onChangeText={setLabel} placeholder="Label (Home · Dorm · Studio)" placeholderTextColor="#A89E94" className="rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            <TextInput value={line1} onChangeText={setLine1} placeholder="Address (Avenue Mohammed V, Ifrane)" placeholderTextColor="#A89E94" className="rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            <TextInput value={landmark} onChangeText={setLandmark} placeholder="Landmark (e.g. Near AUI gate)" placeholderTextColor="#A89E94" className="rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            <View className="flex-row" style={{ gap: 10 }}>
              <TextInput value={building} onChangeText={setBuilding} placeholder="Building" placeholderTextColor="#A89E94" className="flex-1 rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
              <TextInput value={room} onChangeText={setRoom} placeholder="Room" placeholderTextColor="#A89E94" className="flex-1 rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            </View>

            {/* AUI campus toggle */}
            <Pressable
              onPress={() => {
                const next = !isCampus;
                setIsCampus(next);
                if (next && !line1) setLine1('AUI Campus, Ifrane');
              }}
              className="flex-row items-center mb-3"
            >
              <View
                className="w-6 h-6 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: isCampus ? BRAND : '#FBF7F2',
                  borderWidth: 1,
                  borderColor: isCampus ? BRAND : 'rgba(26,20,16,0.15)',
                }}
              >
                {isCampus && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text className="ml-2.5 text-[14px] font-bold" style={{ color: INK }}>AUI campus delivery</Text>
            </Pressable>

            {/* Quick-pick chips (campus only) */}
            {isCampus && (
              <View className="mb-3">
                <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Quick pick a building
                </Text>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap" style={{ gap: 6 }}>
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
                            className="rounded-full px-3 py-1.5"
                            style={{
                              backgroundColor: active ? 'rgba(255,87,34,0.08)' : '#FBF7F2',
                              borderWidth: active ? 1.5 : 1,
                              borderColor: active ? BRAND : 'rgba(26,20,16,0.10)',
                            }}
                          >
                            <Text className="text-[12px]" style={{ color: active ? BRAND : MUTED, fontWeight: active ? '700' : '500' }}>
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
            <View className="flex-row items-center rounded-2xl p-3.5 mb-1" style={{ backgroundColor: '#FFF1EB' }}>
              <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: BRAND }}>
                <MapPin size={16} color="#fff" />
              </View>
              <View className="ml-3 flex-1">
                <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                  GPS pin
                </Text>
                <Text className="text-[14px] font-bold" style={{ color: INK }}>
                  {pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'Tap to capture'}
                </Text>
              </View>
              <PressableScale onPress={capturePin}>
                <View className="rounded-full px-4 py-2" style={{ backgroundColor: BRAND, opacity: gpsStatus === 'requesting' ? 0.6 : 1 }}>
                  {gpsStatus === 'requesting'
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text className="text-white font-bold text-[12px]">{pin ? 'Update' : 'Capture'}</Text>}
                </View>
              </PressableScale>
            </View>
            {gpsError && (
              <Text className="text-[12px] mb-1" style={{ color: '#E11D48' }}>{gpsError}</Text>
            )}

            <Pressable onPress={submit} disabled={busy} className="mt-3">
              <View className="rounded-2xl py-3.5 items-center" style={{ backgroundColor: BRAND, opacity: busy ? 0.6 : 1 }}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">{editingId ? 'Save changes' : 'Save address'}</Text>}
              </View>
            </Pressable>
            <Pressable onPress={resetForm} className="mt-3 items-center">
              <Text className="text-[13px]" style={{ color: MUTED }}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <PressableScale onPress={startAdd}>
            <View className="flex-row items-center justify-center mt-5 rounded-2xl py-3.5" style={{ borderWidth: 1.5, borderColor: BRAND, borderStyle: 'dashed' }}>
              <Plus size={16} color={BRAND} />
              <Text className="ml-2 text-[14px] font-bold" style={{ color: BRAND }}>
                {addresses.length === 0 ? 'Add address' : 'Add another address'}
              </Text>
            </View>
          </PressableScale>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

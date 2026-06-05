import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Trash2, Check } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useAddresses } from '../hooks/useAddresses';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';

export default function AddressesScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addresses, loading, add, remove, setDefault } = useAddresses();

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [landmark, setLandmark] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function submit() {
    if (landmark.trim().length < 3) {
      Alert.alert('Add a landmark', 'A landmark helps your driver find you (min 3 characters).');
      return;
    }
    setBusy(true);
    const err = await add({ label, landmark, building, room });
    setBusy(false);
    if (err) {
      Alert.alert('Could not save', err);
    } else {
      setAdding(false);
      setLabel(''); setLandmark(''); setBuilding(''); setRoom('');
    }
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <MapPin size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Saved addresses</Text>
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
                    <MapPin size={16} color={BRAND} />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-[15px] font-bold" style={{ color: INK }}>{a.label || 'Address'}</Text>
                      {a.isDefault && (
                        <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}>
                          <Text className="text-[10px] font-bold" style={{ color: '#059669' }}>DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>
                      {[a.landmark, a.building && `Bldg ${a.building}`, a.room && `Rm ${a.room}`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
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
            {addresses.length === 0 && (
              <Text className="text-[14px]" style={{ color: MUTED }}>No saved addresses yet.</Text>
            )}
          </View>
        )}

        {/* Add form */}
        {adding ? (
          <View className="mt-5 bg-white rounded-3xl p-5" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
            <Text className="font-display text-[16px] mb-3" style={{ fontWeight: '800', color: INK }}>New address</Text>
            <TextInput value={label} onChangeText={setLabel} placeholder="Label (Home, Dorm…)" placeholderTextColor="#A89E94" className="rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            <TextInput value={landmark} onChangeText={setLandmark} placeholder="Landmark (e.g. Near AUI gate)" placeholderTextColor="#A89E94" className="rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            <View className="flex-row" style={{ gap: 10 }}>
              <TextInput value={building} onChangeText={setBuilding} placeholder="Building" placeholderTextColor="#A89E94" className="flex-1 rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
              <TextInput value={room} onChangeText={setRoom} placeholder="Room" placeholderTextColor="#A89E94" className="flex-1 rounded-2xl px-4 py-3 text-[15px] mb-3" style={inputStyle} />
            </View>
            <Pressable onPress={submit} disabled={busy}>
              <View className="rounded-2xl py-3.5 items-center" style={{ backgroundColor: BRAND, opacity: busy ? 0.6 : 1 }}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">Save address</Text>}
              </View>
            </Pressable>
            <Pressable onPress={() => setAdding(false)} className="mt-3 items-center">
              <Text className="text-[13px]" style={{ color: MUTED }}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <PressableScale onPress={() => setAdding(true)}>
            <View className="flex-row items-center justify-center mt-5 rounded-2xl py-3.5" style={{ borderWidth: 1.5, borderColor: BRAND, borderStyle: 'dashed' }}>
              <Plus size={16} color={BRAND} />
              <Text className="ml-2 text-[14px] font-bold" style={{ color: BRAND }}>Add address</Text>
            </View>
          </PressableScale>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

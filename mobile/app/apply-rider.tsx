import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Bike, CheckCircle2 } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const CREAM = '#FBF7F2';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: MUTED,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A89E94"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'phone-pad' ? 'none' : 'words'}
        style={{
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: 'rgba(26,20,16,0.10)',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: INK,
        }}
      />
    </View>
  );
}

export default function ApplyRiderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || !fullName.trim() || !phone.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('rider_applications').insert({
      applicant_id: user?.id ?? null,
      full_name: fullName.trim(),
      contact_phone: phone.trim(),
      email: user?.email ?? null,
      vehicle: vehicle.trim() || null,
      plate: plate.trim() || null,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  }

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
          >
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>
          Drive with us
        </Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  // Success panel replaces the form once the application lands.
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}
          >
            <CheckCircle2 size={30} color="#059669" />
          </View>
          <Text style={{ fontWeight: '900', fontSize: 22, color: INK, marginTop: 18, letterSpacing: -0.5 }}>
            Application submitted
          </Text>
          <Text
            style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 8 }}
          >
            Our team will review your details and reach out within 48 hours. Track status in your
            account.
          </Text>
          <PressableScale onPress={() => router.replace('/')}>
            <View
              className="flex-row items-center rounded-full"
              style={{ backgroundColor: BRAND, paddingVertical: 14, paddingHorizontal: 28, marginTop: 26 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Back home</Text>
              <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} />
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top']}>
      <Header />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center mt-7">
            <Bike size={16} color={BRAND} />
            <Text
              className="ml-2 text-[11px] uppercase font-bold"
              style={{ letterSpacing: 1.2, color: BRAND }}
            >
              Become a rider
            </Text>
          </View>
          <Text style={{ fontWeight: '900', fontSize: 28, color: INK, letterSpacing: -1, marginTop: 8 }}>
            Become an AtlaasGo rider
          </Text>
          <Text style={{ fontSize: 14, color: MUTED, lineHeight: 21, marginTop: 8, marginBottom: 24 }}>
            60–90 dh/hour average, daily payouts, full SOS support. Apply in 60 seconds.
          </Text>

          <View
            className="rounded-3xl p-5 bg-white"
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
          >
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Youssef Benali" />
            <Field
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+212 6 12 34 56 78"
              keyboardType="phone-pad"
            />
            <Field
              label="Vehicle (optional)"
              value={vehicle}
              onChangeText={setVehicle}
              placeholder="Honda CG 125, scooter, bicycle…"
            />
            <Field label="Plate (optional)" value={plate} onChangeText={setPlate} placeholder="9123-A-42" />

            {!user && (
              <Text
                style={{
                  fontSize: 12,
                  color: MUTED,
                  backgroundColor: 'rgba(255,87,34,0.08)',
                  padding: 12,
                  borderRadius: 12,
                  lineHeight: 17,
                  marginBottom: 12,
                  overflow: 'hidden',
                }}
              >
                You can submit without an account. We&apos;ll match it when you sign up later.
              </Text>
            )}

            {error && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</Text>
            )}

            <Pressable onPress={submit} disabled={busy || !fullName.trim() || !phone.trim()}>
              <View
                className="rounded-2xl py-4 items-center flex-row justify-center"
                style={{
                  backgroundColor: BRAND,
                  opacity: busy || !fullName.trim() || !phone.trim() ? 0.5 : 1,
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Submit application
                    </Text>
                    <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

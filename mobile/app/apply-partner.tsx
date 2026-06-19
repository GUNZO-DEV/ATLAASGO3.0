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
import { ArrowLeft, ArrowRight, CheckCircle2, Store } from 'lucide-react-native';
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
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
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
        autoCapitalize={autoCapitalize ?? 'words'}
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

export default function ApplyPartnerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !busy && !!name.trim() && (!!email.trim() || !!user?.email);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('restaurant_applications').insert({
      applicant_id: user?.id ?? null,
      business_name: name.trim(),
      contact_email: email.trim() || user?.email || '',
      contact_phone: phone.trim() || null,
      cuisine: cuisine.trim() || null,
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
          Partner with us
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
          <Text style={{ fontWeight: '900', fontSize: 22, color: INK, marginTop: 18, letterSpacing: -0.5, textAlign: 'center' }}>
            Welcome — application received
          </Text>
          <Text
            style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 8 }}
          >
            Our partnerships team will reach out by phone within 24 hours.
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
            <Store size={16} color={BRAND} />
            <Text
              className="ml-2 text-[11px] uppercase font-bold"
              style={{ letterSpacing: 1.2, color: BRAND }}
            >
              For restaurants
            </Text>
          </View>
          <Text style={{ fontWeight: '900', fontSize: 28, color: INK, letterSpacing: -1, marginTop: 8 }}>
            Bring your restaurant to AtlaasGo
          </Text>
          <Text style={{ fontSize: 14, color: MUTED, lineHeight: 21, marginTop: 8, marginBottom: 24 }}>
            14-day free trial. Tablet + POS included. We onboard you in under a week.
          </Text>

          <View
            className="rounded-3xl p-5 bg-white"
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
          >
            <Field label="Business name" value={name} onChangeText={setName} placeholder="Café Hassan" />
            <Field
              label={user?.email ? 'Contact email (optional)' : 'Contact email'}
              value={email}
              onChangeText={setEmail}
              placeholder={user?.email ?? 'owner@example.ma'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Contact phone (optional)"
              value={phone}
              onChangeText={setPhone}
              placeholder="+212 5 35 ..."
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <Field
              label="Cuisine (optional)"
              value={cuisine}
              onChangeText={setCuisine}
              placeholder="Moroccan · Tagines · Patisserie"
            />

            {error && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</Text>
            )}

            <Pressable onPress={submit} disabled={!canSubmit}>
              <View
                className="rounded-2xl py-4 items-center flex-row justify-center"
                style={{ backgroundColor: BRAND, opacity: canSubmit ? 1 : 0.5 }}
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

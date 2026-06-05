import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Wallet as WalletIcon,
  MapPin,
  Heart,
  Bell,
  Crown,
  LogOut,
  ChevronRight,
  Receipt,
  User as UserIcon,
} from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const p = data as { display_name?: string; phone?: string } | null;
        setName(p?.display_name ?? '');
        setPhone(p?.phone ?? '');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name.trim() || null, phone: phone.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) Alert.alert('Could not save', error.message);
    else Alert.alert('Saved', 'Your profile is up to date.');
  }

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3">
        <PressableScale onPress={() => router.back()}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
          >
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>
          Account
        </Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <View className="flex-1 px-6">
          <Header />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
            <UserIcon size={30} color={MUTED} />
            <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Your account</Text>
            <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
              Sign in to manage your profile, wallet, addresses and more.
            </Text>
            <PressableScale onPress={() => router.push('/sign-in')}>
              <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const links: { icon: typeof WalletIcon; label: string; sub: string; href: string; color: string }[] = [
    { icon: Receipt, label: 'Orders', sub: 'Track & re-order', href: '/orders', color: '#1A1410' },
    { icon: WalletIcon, label: 'Wallet', sub: 'Balance & top-ups', href: '/wallet', color: '#FF5722' },
    { icon: Crown, label: 'Prime', sub: 'Free delivery membership', href: '/prime', color: '#C66B1F' },
    { icon: MapPin, label: 'Addresses', sub: 'Saved delivery spots', href: '/addresses', color: '#059669' },
    { icon: Heart, label: 'Favorites', sub: 'Your saved restaurants', href: '/favorites', color: '#E11D48' },
    { icon: Bell, label: 'Notifications', sub: 'Order updates & promos', href: '/notifications', color: '#2563EB' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Header />

        <View className="mt-6 mb-6">
          <Text className="font-display text-[28px]" style={{ fontWeight: '800', letterSpacing: -0.8, color: INK }}>
            Your account
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: MUTED }}>
            {user?.email ?? 'Signed in'}
          </Text>
        </View>

        {/* Profile fields */}
        {loading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color={BRAND} />
          </View>
        ) : (
          <View className="bg-white rounded-3xl p-5" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
            <Text className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: 0.6, color: MUTED }}>
              Display name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#A89E94"
              className="rounded-2xl px-4 py-3 text-[15px] mb-4"
              style={{ backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)', color: INK }}
            />
            <Text className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: 0.6, color: MUTED }}>
              Phone
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+212…"
              placeholderTextColor="#A89E94"
              className="rounded-2xl px-4 py-3 text-[15px] mb-4"
              style={{ backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)', color: INK }}
            />
            <Pressable onPress={save} disabled={saving}>
              <View className="rounded-2xl py-3.5 items-center" style={{ backgroundColor: BRAND, opacity: saving ? 0.6 : 1 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">Save profile</Text>}
              </View>
            </Pressable>
          </View>
        )}

        {/* Link rows */}
        <View className="mt-5" style={{ gap: 10 }}>
          {links.map((l) => (
            <PressableScale key={l.href} onPress={() => router.push(l.href as never)}>
              <View
                className="flex-row items-center bg-white rounded-2xl p-4"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${l.color}1A` }}>
                  <l.icon size={18} color={l.color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold" style={{ color: INK }}>{l.label}</Text>
                  <Text className="text-[12px] mt-0.5" style={{ color: MUTED }}>{l.sub}</Text>
                </View>
                <ChevronRight size={18} color={MUTED} />
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Sign out */}
        <PressableScale onPress={() => signOut()}>
          <View
            className="flex-row items-center justify-center mt-6 rounded-2xl py-3.5"
            style={{ borderWidth: 1, borderColor: 'rgba(225,29,72,0.25)' }}
          >
            <LogOut size={16} color="#E11D48" />
            <Text className="ml-2 text-[14px] font-bold" style={{ color: '#E11D48' }}>Sign out</Text>
          </View>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

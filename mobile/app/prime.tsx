import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Check } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { usePrime, PRIME_TIERS } from '../hooks/usePrime';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const GOLD = '#C66B1F';

export default function PrimeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { sub, loading, refresh } = usePrime();
  const [buyingTier, setBuyingTier] = useState<string | null>(null);

  async function buyTier(tier: string) {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setBuyingTier(tier);
    try {
      // Stripe-hosted Checkout (one-time payment), then activation by session id —
      // same create-prime-checkout / activate-prime edge functions the web uses.
      const { data, error } = await supabase.functions.invoke('create-prime-checkout', {
        body: { tier, userId: user.id, customerEmail: user.email ?? undefined, siteUrl: 'https://atlaasgo.com' },
      });
      if (error || !data?.url || !data?.sessionId) throw new Error(error?.message ?? 'Could not start checkout');
      await WebBrowser.openBrowserAsync(data.url as string);
      // Browser dismissed — try to activate. Fails cleanly if payment wasn't completed.
      const { data: act, error: actErr } = await supabase.functions.invoke('activate-prime', {
        body: { sessionId: data.sessionId },
      });
      if (actErr || !act?.ok) {
        Alert.alert(
          'Payment not finished',
          "If you completed the payment, your membership activates within a minute — pull back into this screen to refresh.",
        );
      } else {
        await refresh();
        Alert.alert('Welcome to Prime 👑', 'Your membership is active.');
      }
    } catch (e) {
      Alert.alert('Could not start checkout', (e as Error).message);
    } finally {
      setBuyingTier(null);
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
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: GOLD }}>Prime</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF7EC' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="mt-6 mb-6 items-center">
          <View className="w-16 h-16 rounded-3xl items-center justify-center" style={{ backgroundColor: GOLD }}>
            <Crown size={30} color="#fff" />
          </View>
          <Text className="font-display text-[30px] mt-4" style={{ fontWeight: '800', letterSpacing: -1, color: INK }}>
            AtlaasGo Prime
          </Text>
          <Text className="mt-2 text-[14px] text-center" style={{ color: MUTED, lineHeight: 20 }}>
            Free delivery on every order, exclusive promos, priority support.
          </Text>
        </View>

        {/* Current status */}
        {loading ? (
          <View className="py-6 items-center"><ActivityIndicator color={GOLD} /></View>
        ) : sub ? (
          <View className="rounded-3xl p-5 mb-6" style={{ backgroundColor: INK }}>
            <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)' }}>
              Active membership
            </Text>
            <Text className="font-display text-[20px] mt-1" style={{ fontWeight: '800', color: '#fff' }}>
              {PRIME_TIERS.find((t) => t.id === sub.tier)?.name ?? sub.tier}
            </Text>
            {sub.expiresAt && (
              <Text className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Renews {new Date(sub.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        ) : null}

        {/* Tiers */}
        <View style={{ gap: 12 }}>
          {PRIME_TIERS.map((t) => {
            const current = sub?.tier === t.id;
            return (
              <View
                key={t.id}
                className="rounded-3xl p-5 bg-white"
                style={{ borderWidth: current ? 2 : 1, borderColor: current ? GOLD : 'rgba(26,20,16,0.08)' }}
              >
                <View className="flex-row items-baseline justify-between">
                  <Text className="font-display text-[18px]" style={{ fontWeight: '800', color: INK }}>{t.name}</Text>
                  <Text className="font-display text-[20px]" style={{ fontWeight: '800', color: GOLD }}>
                    {t.priceDh}<Text className="text-[13px]" style={{ color: MUTED }}> dh{t.period}</Text>
                  </Text>
                </View>
                <View className="mt-3" style={{ gap: 8 }}>
                  {t.perks.map((p) => (
                    <View key={p} className="flex-row items-center">
                      <Check size={15} color={GOLD} />
                      <Text className="ml-2 text-[13px]" style={{ color: INK }}>{p}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => buyTier(t.id)} disabled={current || buyingTier !== null}>
                  <View
                    className="rounded-2xl py-3.5 items-center mt-4"
                    style={{ backgroundColor: current ? 'rgba(26,20,16,0.06)' : GOLD, opacity: buyingTier && buyingTier !== t.id ? 0.5 : 1 }}
                  >
                    {buyingTier === t.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-bold text-[15px]" style={{ color: current ? MUTED : '#fff' }}>
                        {current ? 'Current plan' : `Choose ${t.name}`}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

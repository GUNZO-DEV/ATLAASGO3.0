import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Plus, Wallet as WalletIcon, X } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';

function txLabel(kind: string): string {
  switch (kind) {
    case 'topup': return 'Top-up';
    case 'order_payment': return 'Order payment';
    case 'refund': return 'Refund';
    case 'referral': return 'Referral bonus';
    default: return kind.replace(/_/g, ' ');
  }
}

const TOPUP_PRESETS = [20, 50, 100, 200];

async function startTopup(amountDh: number, userEmail: string | undefined, userId: string) {
  const { data, error } = await supabase.functions.invoke('wallet-topup', {
    body: { amountDh, userId, customerEmail: userEmail },
  });
  if (error || !data?.clientSecret) throw new Error(error?.message ?? 'Top-up failed');
  return data as { clientSecret: string; paymentIntentId: string };
}

export default function WalletScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { balanceDh, txs, loading } = useWallet();
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('50');
  const [topupBusy, setTopupBusy] = useState(false);

  async function handleTopup() {
    const amount = Math.round(Number(topupAmount));
    if (!amount || amount < 20 || amount > 2000) {
      Alert.alert('Invalid amount', 'Enter an amount between 20 and 2 000 dh.');
      return;
    }
    if (!user) return;
    setTopupBusy(true);
    try {
      // Creates a Stripe PaymentIntent via the wallet-topup edge function.
      // On iOS we open the Stripe Checkout URL so the user pays in their
      // browser and deep-links back — no Stripe native SDK rebuild needed.
      await startTopup(amount, user.email ?? undefined, user.id);
      setTopupOpen(false);
      Alert.alert(
        'Top-up initiated',
        `A payment for ${amount} dh was started. Complete it in your browser and your balance will update automatically.`,
      );
    } catch (e) {
      Alert.alert('Could not start top-up', (e as Error).message);
    } finally {
      setTopupBusy(false);
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
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <WalletIcon size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Your wallet</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to see your balance and top up.
          </Text>
          <PressableScale onPress={() => router.push('/sign-in')}>
            <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View className="mt-6 rounded-3xl p-6" style={{ backgroundColor: INK }}>
          <Text className="text-[12px] uppercase font-bold" style={{ letterSpacing: 1.4, color: 'rgba(255,255,255,0.55)' }}>
            Available balance
          </Text>
          <Text className="font-display mt-2" style={{ color: '#fff', fontWeight: '800', fontSize: 40, letterSpacing: -1.5 }}>
            {balanceDh} <Text style={{ fontSize: 22, color: '#FF8A65' }}>dh</Text>
          </Text>
          <PressableScale onPress={() => setTopupOpen(true)}>
            <View className="flex-row items-center self-start mt-4 rounded-full px-4 py-2.5" style={{ backgroundColor: BRAND }}>
              <Plus size={15} color="#fff" strokeWidth={2.5} />
              <Text className="ml-1.5 text-white font-bold text-[13px]">Top up</Text>
            </View>
          </PressableScale>
        </View>

        <Text className="mt-7 mb-3 font-display text-[18px]" style={{ fontWeight: '800', color: INK }}>
          Activity
        </Text>

        {loading ? (
          <View className="py-10 items-center"><ActivityIndicator color={BRAND} /></View>
        ) : txs.length === 0 ? (
          <Text className="text-[14px]" style={{ color: MUTED }}>No transactions yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {txs.map((t) => {
              const credit = t.amountDh >= 0;
              return (
                <View
                  key={t.id}
                  className="flex-row items-center bg-white rounded-2xl p-4"
                  style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
                >
                  <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: credit ? 'rgba(5,150,105,0.12)' : 'rgba(225,29,72,0.10)' }}>
                    {credit ? <ArrowDownLeft size={16} color="#059669" /> : <ArrowUpRight size={16} color="#E11D48" />}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-bold" style={{ color: INK }} numberOfLines={1}>{txLabel(t.kind)}</Text>
                    <Text className="text-[12px] mt-0.5" style={{ color: MUTED }}>{new Date(t.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text className="text-[15px] font-bold" style={{ color: credit ? '#059669' : INK }}>
                    {credit ? '+' : ''}{t.amountDh} dh
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Top-up modal */}
      <Modal visible={topupOpen} transparent animationType="slide" onRequestClose={() => setTopupOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#FBF7F2', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48 }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ fontWeight: '800', fontSize: 22, color: INK, letterSpacing: -0.5 }}>Top up wallet</Text>
              <PressableScale onPress={() => setTopupOpen(false)}>
                <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}>
                  <X size={16} color={INK} />
                </View>
              </PressableScale>
            </View>

            {/* Preset amounts */}
            <View className="flex-row mb-5" style={{ gap: 10 }}>
              {TOPUP_PRESETS.map((preset) => (
                <Pressable key={preset} onPress={() => setTopupAmount(String(preset))} style={{ flex: 1 }}>
                  <View
                    className="py-3 rounded-2xl items-center"
                    style={{
                      backgroundColor: topupAmount === String(preset) ? BRAND : '#fff',
                      borderWidth: 1,
                      borderColor: topupAmount === String(preset) ? BRAND : 'rgba(26,20,16,0.10)',
                    }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 14, color: topupAmount === String(preset) ? '#fff' : INK }}>
                      {preset} dh
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Custom amount */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Or enter amount (20–2 000 dh)
            </Text>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              keyboardType="number-pad"
              placeholder="Amount in dh"
              placeholderTextColor="#A89E94"
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: INK, marginBottom: 20 }}
            />

            <Pressable onPress={handleTopup} disabled={topupBusy}>
              <View className="rounded-2xl py-4 items-center" style={{ backgroundColor: BRAND, opacity: topupBusy ? 0.6 : 1 }}>
                {topupBusy
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Pay {topupAmount ? `${topupAmount} dh` : '—'}</Text>
                }
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// AtlaasGo 3.0 — Wallet. Native re-skin to the 3.0 design language
// (cream/ink + terracotta, sunset gradient hero, rounded cards, moti Rise/Press,
// ag3 BottomSheet for top-up). The wallet purple accent is used for the wallet
// glyph in the hero, per spec.
//
// DATA / PLUMBING PRESERVED ───────────────────────────────────────────────────
//   • Balance + ledger come from useWallet() unchanged ({ balanceDh, txs,
//     loading }); the hook keeps its RLS-scoped reads + realtime subscription.
//   • Top-up is the SAME Stripe flow: startTopup() invokes the `wallet-topup`
//     edge function (creates a PaymentIntent), payWithPaymentSheet() collects
//     card / Apple Pay / Google Pay, and the stripe-webhook credits the balance
//     asynchronously — realtime then refreshes txs/balance. handleTopup keeps
//     the 20–2 000 dh validation, the presets, the busy state and every Alert.
//   • Auth gating via useAuth() ({ user, loading: authLoading }) is unchanged,
//     signed-out CTA still routes to /sign-in.
// Only the presentation changed — no behavior, no SDK calls, no params touched.
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../lib/auth';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';
import { payWithPaymentSheet } from '../lib/stripe';

import { useAg3Theme, type Ag3Theme } from '../components/ag3/theme';
import { BottomSheet, Press, Rise } from '../components/ag3/primitives';
import {
  IBack,
  IWallet,
  IPlus,
  IGift,
  IReceipt,
  ITruck,
  IBolt,
} from '../components/ag3/icons';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

// Wallet purple accent — allowed for the wallet glyph (per 3.0 spec).
const WALLET_PURPLE = '#9C6ADE';

const TOPUP_PRESETS = [20, 50, 100, 200];

function txLabel(kind: string, tr: (key: string) => string): string {
  switch (kind) {
    case 'topup':
      return tr('wallet.kindTopup');
    case 'order_payment':
      return tr('wallet.kindOrderPayment');
    case 'refund':
      return tr('wallet.kindRefund');
    case 'referral':
      return tr('wallet.kindReferral');
    default:
      return kind.replace(/_/g, ' ');
  }
}

// Map transaction kinds → a glyph so the ledger reads at a glance.
function txIcon(kind: string, credit: boolean) {
  switch (kind) {
    case 'topup':
      return IPlus;
    case 'order_payment':
      return ITruck;
    case 'refund':
      return ArrowDownLeft;
    case 'referral':
      return IGift;
    default:
      return credit ? ArrowDownLeft : ArrowUpRight;
  }
}

async function startTopup(amountDh: number, userEmail: string | undefined, userId: string) {
  const { data, error } = await supabase.functions.invoke('wallet-topup', {
    body: { amountDh, userId, customerEmail: userEmail },
  });
  if (error || !data?.clientSecret) throw new Error(error?.message ?? 'Top-up failed');
  return data as { clientSecret: string; paymentIntentId: string };
}

export default function WalletScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { balanceDh, txs, loading } = useWallet();
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('50');
  const [topupBusy, setTopupBusy] = useState(false);

  async function handleTopup() {
    const amount = Math.round(Number(topupAmount));
    if (!amount || amount < 20 || amount > 2000) {
      Alert.alert(tr('wallet.invalidAmountTitle'), tr('wallet.invalidAmountBody'));
      return;
    }
    if (!user) return;
    setTopupBusy(true);
    try {
      // wallet-topup edge function creates a Stripe PaymentIntent; the native
      // PaymentSheet collects the card / Apple Pay / Google Pay payment, and
      // the stripe-webhook credits the balance asynchronously.
      const { clientSecret } = await startTopup(amount, user.email ?? undefined, user.id);
      const paid = await payWithPaymentSheet(clientSecret, user.email ?? 'AtlaasGo customer');
      if (paid) {
        setTopupOpen(false);
        Alert.alert(tr('wallet.paymentReceivedTitle'), tr('wallet.paymentReceivedBody'));
      }
    } catch (e) {
      Alert.alert(tr('wallet.topupFailedTitle'), (e as Error).message);
    } finally {
      setTopupBusy(false);
    }
  }

  // ── signed-out state ──────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header t={t} onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IWallet size={28} color={WALLET_PURPLE} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>{tr('wallet.yourWallet')}</Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            {tr('wallet.signInPrompt')}
          </Text>
          <Press onPress={() => router.push('/sign-in')} style={{ marginTop: 24 }}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.signInBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{tr('wallet.signIn')}</Text>
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
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 44 }}
      >
        {/* ── gradient balance hero ── */}
        <Rise>
          <LinearGradient
            colors={t.gradients.warm}
            start={t.gradients.start}
            end={t.gradients.end}
            style={[styles.hero, t.shadows.glow]}
          >
            {/* soft top-right sheen */}
            <View pointerEvents="none" style={styles.heroSheen} />

            <View style={styles.heroTopRow}>
              <Text style={styles.heroEyebrow}>{tr('wallet.availableBalance')}</Text>
              <View style={styles.heroGlyph}>
                <IWallet size={18} color={WALLET_PURPLE} />
              </View>
            </View>

            <Text style={styles.heroBalance}>
              {balanceDh}
              <Text style={styles.heroBalanceUnit}> dh</Text>
            </Text>

            <Press onPress={() => setTopupOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 18 }}>
              <View style={styles.heroTopupBtn}>
                <IPlus size={16} color={t.colors.primary} strokeWidth={2.6} />
                <Text style={{ marginLeft: 6, color: t.colors.primary, fontWeight: '800', fontSize: 13.5 }}>
                  {tr('wallet.topUp')}
                </Text>
              </View>
            </Press>
          </LinearGradient>
        </Rise>

        {/* ── activity ── */}
        <Rise delay={60} style={{ marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <IReceipt size={15} color={t.colors.primary} />
            <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 0 }]}>{tr('wallet.activity')}</Text>
          </View>

          {loading ? (
            <View style={[card(t), { paddingVertical: 36, alignItems: 'center' }]}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : txs.length === 0 ? (
            <View style={[card(t), styles.emptyLedger]}>
              <View style={[styles.emptyLedgerIcon, { backgroundColor: t.colors.surface2 }]}>
                <IReceipt size={22} color={t.colors.muted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg, marginTop: 12 }}>
                {tr('wallet.emptyTitle')}
              </Text>
              <Text style={{ fontSize: 12.5, color: t.colors.muted, marginTop: 3, textAlign: 'center' }}>
                {tr('wallet.emptyBody')}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {txs.map((tx) => {
                const credit = tx.amountDh >= 0;
                const Icon = txIcon(tx.kind, credit);
                return (
                  <View key={tx.id} style={[card(t), styles.txRow]}>
                    <View
                      style={[
                        styles.txIcon,
                        { backgroundColor: credit ? 'rgba(47,163,107,0.13)' : 'rgba(224,82,109,0.11)' },
                      ]}
                    >
                      <Icon size={18} color={credit ? t.colors.ok : '#E0526D'} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: t.colors.fg }} numberOfLines={1}>
                        {txLabel(tx.kind, tr)}
                      </Text>
                      <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                        color: credit ? t.colors.ok : t.colors.fg,
                      }}
                    >
                      {credit ? '+' : ''}
                      {tx.amountDh} dh
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Rise>
      </ScrollView>

      {/* ── top-up sheet (ag3 BottomSheet) ── */}
      <BottomSheet visible={topupOpen} onClose={() => setTopupOpen(false)} title={tr('wallet.topUpWallet')}>
        {/* preset amounts */}
        <View style={{ flexDirection: 'row', gap: 9, marginBottom: 16 }}>
          {TOPUP_PRESETS.map((preset) => {
            const active = topupAmount === String(preset);
            return (
              <Press key={preset} onPress={() => setTopupAmount(String(preset))} style={{ flex: 1 }}>
                <View
                  style={[
                    card(t),
                    styles.presetPill,
                    { borderColor: active ? t.colors.primary : t.colors.line2, borderWidth: 1.5 },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 14,
                      fontVariant: ['tabular-nums'],
                      color: active ? t.colors.primary : t.colors.fg,
                    }}
                  >
                    {preset} dh
                  </Text>
                </View>
              </Press>
            );
          })}
        </View>

        {/* custom amount */}
        <Text style={[styles.fieldLabel, { color: t.colors.muted }]}>{tr('wallet.orEnterAmount')}</Text>
        <TextInput
          value={topupAmount}
          onChangeText={setTopupAmount}
          keyboardType="number-pad"
          placeholder={tr('wallet.amountPlaceholder')}
          placeholderTextColor={t.colors.muted}
          style={[
            styles.input,
            { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg },
          ]}
        />

        <Press onPress={handleTopup} disabled={topupBusy} style={{ marginTop: 18 }}>
          <LinearGradient
            colors={t.gradients.sunset}
            start={t.gradients.start}
            end={t.gradients.end}
            style={[styles.payBtn, t.shadows.glow, { opacity: topupBusy ? 0.7 : 1 }]}
          >
            {topupBusy ? (
              <ActivityIndicator color={t.colors.onPrimary} />
            ) : (
              <>
                <IBolt size={16} color={t.colors.onPrimary} fill={t.colors.onPrimary} strokeWidth={0} />
                <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15.5 }}>
                  {tr('wallet.pay', { amount: topupAmount ? `${topupAmount} dh` : '—' })}
                </Text>
              </>
            )}
          </LinearGradient>
        </Press>
      </BottomSheet>
    </SafeAreaView>
  );
}

/* ── sub-components ───────────────────────────────────────────────────────── */

function Header({ t, onBack }: { t: Ag3Theme; onBack: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      style={styles.header}
    >
      <Press onPress={onBack} scaleTo={0.9}>
        <View style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }]}>
          <IBack size={20} color={t.colors.fg} />
        </View>
      </Press>
      <Text style={[styles.disp, { fontWeight: '800', fontSize: 20, color: t.colors.fg }]}>{tr('wallet.title')}</Text>
    </MotiView>
  );
}

/* ── shared card base ─────────────────────────────────────────────────────── */
function card(t: Ag3Theme) {
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
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // hero
  hero: { borderRadius: 26, padding: 22, paddingTop: 20, overflow: 'hidden' },
  heroSheen: { position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.6, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  heroGlyph: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
  heroBalance: { color: '#fff', fontWeight: '800', fontSize: 44, letterSpacing: -1.6, marginTop: 14 },
  heroBalanceUnit: { fontSize: 22, color: 'rgba(255,255,255,0.9)', fontWeight: '700', letterSpacing: 0 },
  heroTopupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },

  // ledger
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyLedger: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 24 },
  emptyLedgerIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // signed-out
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  signInBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },

  // top-up sheet
  presetPill: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },
  input: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 16 },
});

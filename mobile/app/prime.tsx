// AtlaasGo 3.0 — AtlaasGo+ membership. Native re-skin of the Prime screen,
// matched to the 3.0 design language (warm terracotta + amber on cream/ink,
// sunset gradients, rounded cards via card(t), section eyebrows, sticky CTA,
// moti Rise/Press) — built on the ag3 foundation (useAg3Theme + icons +
// primitives), the same look as the AtlaasGo+ banner on the 3.0 account screen.
//
// LOGIC / PLUMBING PRESERVED ────────────────────────────────────────────────
//   • usePrime() — the RLS-scoped prime_subscriptions read (sub/loading/refresh).
//   • PRIME_TIERS — the three real tiers (student / standard / campus_pass) with
//     their priceDh / period / perks, rendered as gradient-hero + benefit rows.
//   • buyTier(tier) — the EXACT Stripe-hosted Checkout flow the web uses:
//       create-prime-checkout edge fn → WebBrowser.openBrowserAsync(url) →
//       activate-prime edge fn → refresh() + Alert. Signed-out users are still
//       bounced to /sign-in. None of this changed — only the presentation did.
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { usePrime, PRIME_TIERS } from '../hooks/usePrime';

import { useAg3Theme } from '../components/ag3/theme';
import { IBack, ICheck, IBolt, IClock } from '../components/ag3/icons';
import { Press, Rise } from '../components/ag3/primitives';

type Theme = ReturnType<typeof useAg3Theme>;

// The lead tier the hero + sticky CTA key off — the AUI-centric student plan,
// matching the "49 dh/month" winter-membership framing on the account banner.
const LEAD_TIER = PRIME_TIERS[0];

const HERO_PERKS = [
  'Free delivery on every order, all winter',
  'Exclusive promos & member-only pricing',
  'Priority support when you need it',
] as const;

export default function PrimeScreen() {
  const t = useAg3Theme();
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
        Alert.alert('Welcome to AtlaasGo+ ✦', 'Your membership is active.');
      }
    } catch (e) {
      Alert.alert('Could not start checkout', (e as Error).message);
    } finally {
      setBuyingTier(null);
    }
  }

  const activeTier = sub ? PRIME_TIERS.find((x) => x.id === sub.tier) : undefined;
  const leadIsActive = sub?.tier === LEAD_TIER.id;
  const stickyLabel = leadIsActive
    ? 'You’re a member'
    : sub
      ? `Switch to ${LEAD_TIER.name}`
      : 'Try free for a month';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <Header t={t} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        {/* ── membership hero ── */}
        <Rise style={styles.pad}>
          <View style={[styles.hero, t.shadows.lift]}>
            <LinearGradient colors={['#1A1410', '#3A2A1E']} start={t.gradients.start} end={t.gradients.end} style={StyleSheet.absoluteFill} />
            {/* sunset glow blob (top-right) — matches the account AtlaasGo+ banner */}
            <View style={styles.heroGlow}>
              <LinearGradient colors={t.gradients.sunset} start={t.gradients.start} end={t.gradients.end} style={StyleSheet.absoluteFill} />
            </View>

            <View style={styles.eyebrowRow}>
              <IBolt size={14} color={t.colors.amber} fill={t.colors.amber} strokeWidth={0} />
              <Text style={[styles.eyebrow, { color: t.colors.amber, marginBottom: 0 }]}>AtlaasGo+</Text>
            </View>

            <Text style={[styles.disp, { fontSize: 28, color: '#fff', marginTop: 10 }]}>
              Free delivery, all winter.
            </Text>
            <Text style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 6, lineHeight: 19 }}>
              Skip every delivery fee from {LEAD_TIER.priceDh} dh/month · cancel anytime.
            </Text>

            {/* benefit rows with check icons */}
            <View style={{ marginTop: 16, gap: 11 }}>
              {HERO_PERKS.map((p) => (
                <View key={p} style={styles.perkRow}>
                  <View style={styles.perkCheck}>
                    <ICheck size={13} color="#fff" strokeWidth={3} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13.5, color: 'rgba(255,255,255,0.92)', lineHeight: 19 }}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        </Rise>

        {/* ── active membership status ── */}
        {loading ? (
          <View style={{ paddingVertical: 26, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : sub ? (
          <Rise style={[styles.pad, { marginTop: 16 }]}>
            <View style={[card(t), styles.statusCard]}>
              <LinearGradient colors={t.gradients.sunset} start={t.gradients.start} end={t.gradients.end} style={[styles.statusIcon, t.shadows.glow]}>
                <IBolt size={22} color="#fff" fill="#fff" strokeWidth={0} />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.eyebrow, { color: t.colors.ok }]}>Active membership</Text>
                <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg, marginTop: 2 }]} numberOfLines={1}>
                  {activeTier?.name ?? sub.tier}
                </Text>
                {sub.expiresAt && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <IClock size={13} color={t.colors.muted} />
                    <Text style={{ fontSize: 12.5, color: t.colors.muted }}>
                      Renews {new Date(sub.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Rise>
        ) : null}

        {/* ── plans ── */}
        <View style={[styles.pad, { marginTop: 24 }]}>
          <Text style={[styles.eyebrow, { color: t.colors.primary, marginLeft: 2 }]}>Choose your plan</Text>
          <View style={{ marginTop: 12, gap: 12 }}>
            {PRIME_TIERS.map((tier, i) => {
              const current = sub?.tier === tier.id;
              const busy = buyingTier === tier.id;
              const dimmed = buyingTier != null && !busy;
              return (
                <Rise key={tier.id} delay={i * 70}>
                  <View
                    style={[
                      card(t),
                      styles.planCard,
                      {
                        borderColor: current ? t.colors.primary : t.colors.line2,
                        borderWidth: current ? 2 : 1,
                        opacity: dimmed ? 0.55 : 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg }]}>{tier.name}</Text>
                        {current && (
                          <View style={[styles.pill, { backgroundColor: 'rgba(47,163,107,0.14)', marginTop: 6 }]}>
                            <ICheck size={12} color={t.colors.ok} strokeWidth={3} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: t.colors.ok }}>Current plan</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.disp, { fontSize: 22, color: t.colors.primary, fontVariant: ['tabular-nums'] }]}>
                        {tier.priceDh}
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.muted }}> dh{tier.period}</Text>
                      </Text>
                    </View>

                    <View style={{ marginTop: 13, gap: 9 }}>
                      {tier.perks.map((p) => (
                        <View key={p} style={styles.perkRow}>
                          <View style={[styles.perkCheckLite, { backgroundColor: 'rgba(255,87,34,0.12)' }]}>
                            <ICheck size={12} color={t.colors.primary} strokeWidth={3} />
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: t.colors.fgSoft, lineHeight: 18 }}>{p}</Text>
                        </View>
                      ))}
                    </View>

                    <Press
                      onPress={() => buyTier(tier.id)}
                      disabled={current || buyingTier !== null}
                      style={{ marginTop: 16 }}
                    >
                      {current ? (
                        <View style={[styles.planBtn, { backgroundColor: t.colors.surface2, borderWidth: 1, borderColor: t.colors.line }]}>
                          <Text style={{ fontWeight: '800', fontSize: 14.5, color: t.colors.muted }}>Current plan</Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={t.gradients.sunset}
                          start={t.gradients.start}
                          end={t.gradients.end}
                          style={[styles.planBtn, t.shadows.glow]}
                        >
                          {busy ? (
                            <ActivityIndicator color={t.colors.onPrimary} />
                          ) : (
                            <Text style={{ fontWeight: '800', fontSize: 14.5, color: t.colors.onPrimary }}>
                              Choose {tier.name}
                            </Text>
                          )}
                        </LinearGradient>
                      )}
                    </Press>
                  </View>
                </Rise>
              );
            })}
          </View>

          <Text style={{ fontSize: 11.5, color: t.colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 17 }}>
            Billed securely via Stripe · cancel anytime from your account.
          </Text>
        </View>
      </ScrollView>

      {/* ── sticky membership CTA ── */}
      <View style={[styles.sticky, { backgroundColor: t.colors.bg, borderColor: t.colors.line }]}>
        <Press
          onPress={() => buyTier(LEAD_TIER.id)}
          disabled={leadIsActive || buyingTier !== null}
        >
          {leadIsActive ? (
            <View style={[styles.stickyBtn, { backgroundColor: t.colors.surface2, borderWidth: 1, borderColor: t.colors.line }]}>
              <ICheck size={17} color={t.colors.ok} strokeWidth={3} />
              <Text style={{ color: t.colors.fg, fontWeight: '800', fontSize: 15.5 }}>{stickyLabel}</Text>
            </View>
          ) : (
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.stickyBtn, t.shadows.glow, { opacity: buyingTier != null ? 0.7 : 1 }]}
            >
              {buyingTier === LEAD_TIER.id ? (
                <ActivityIndicator color={t.colors.onPrimary} />
              ) : (
                <>
                  <IBolt size={16} color={t.colors.onPrimary} fill={t.colors.onPrimary} strokeWidth={0} />
                  <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15.5 }}>{stickyLabel}</Text>
                </>
              )}
            </LinearGradient>
          )}
        </Press>
        {!leadIsActive && (
          <Text style={{ fontSize: 11.5, color: t.colors.muted, textAlign: 'center', marginTop: 9 }}>
            {LEAD_TIER.priceDh} dh{LEAD_TIER.period} · cancel anytime
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ── header ───────────────────────────────────────────────────────────────── */
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
      <Text style={[styles.disp, { fontWeight: '800', fontSize: 20, color: t.colors.fg }]}>AtlaasGo+</Text>
    </MotiView>
  );
}

/* ── shared card base ─────────────────────────────────────────────────────── */
function card(t: Theme) {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  } as const;
}

/* ── styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pad: { paddingHorizontal: 18 },

  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  hero: { borderRadius: 30, padding: 22, overflow: 'hidden', marginTop: 4 },
  heroGlow: { position: 'absolute', right: -34, top: -34, width: 170, height: 170, borderRadius: 999, opacity: 0.5 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  perkCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 0.5,
  },
  perkCheckLite: { width: 20, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 0.5 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  statusIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  planCard: { padding: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  planBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 16, paddingVertical: 14 },

  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1 },
  stickyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22 },
});

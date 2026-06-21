import type { ReactNode } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  Clock,
  Inbox,
  Store,
} from 'lucide-react-native';
import { PressableScale } from './primitives/PressableScale';
import { useMyApplications, type ApplicationKind } from '../hooks/useMyApplications';

/**
 * Application-status gate for the driver/merchant screens. When a signed-in
 * user lacks the role, this explains where their application stands instead
 * of dead-ending them — mirrors the web's PendingApplication component.
 */
const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const CREAM = '#FBF7F2';

const COPY: Record<
  ApplicationKind,
  {
    emoji: string;
    reviewTitle: string;
    reviewSub: string;
    eta: string;
    perks: string[];
    pitchTitle: string;
    pitchSub: string;
    pitchCta: string;
  }
> = {
  rider: {
    emoji: '🏍',
    reviewTitle: 'Your rider application is in review',
    reviewSub:
      'Our operations team is verifying your details. Most applications are decided within 48 hours.',
    eta: '48 hours',
    perks: [
      'Daily payouts straight to your wallet',
      'Performance bonuses (50-trip badge = +200 dh)',
      'SOS support · 24/7',
    ],
    pitchTitle: 'Become an AtlaasGo rider',
    pitchSub: '60–90 dh/hour average, daily payouts, full SOS support. Get in touch to join.',
    pitchCta: 'Email us to apply',
  },
  partner: {
    emoji: '🏪',
    reviewTitle: 'Your partner application is in review',
    reviewSub:
      "Our partnerships team is reviewing your business. We'll reach out by phone within 24 hours.",
    eta: '24 hours',
    perks: [
      'Tablet + POS shipped to you',
      '14-day free trial · no setup fees',
      'Real-time kitchen display + analytics',
    ],
    pitchTitle: 'Bring your restaurant to AtlaasGo',
    pitchSub: '14-day free trial. Tablet + POS included. We onboard you in under a week.',
    pitchCta: 'Email us to apply',
  },
};

function SupportEmail() {
  return (
    <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 14 }}>
      Questions? Email{' '}
      <Text
        style={{ color: BRAND, fontWeight: '700' }}
        onPress={() => Linking.openURL('mailto:support@atlaasgo.com')}
      >
        support@atlaasgo.com
      </Text>
    </Text>
  );
}

function Card({ children, borderColor }: { children: ReactNode; borderColor?: string }) {
  return (
    <View
      className="rounded-3xl bg-white"
      style={{
        borderWidth: 1,
        borderColor: borderColor ?? 'rgba(26,20,16,0.08)',
        padding: 28,
        marginTop: 24,
      }}
    >
      {children}
    </View>
  );
}

export function PendingApplication({ kind }: { kind: ApplicationKind }) {
  const router = useRouter();
  const { apps, loading } = useMyApplications();
  const copy = COPY[kind];

  // apps are newest-first, so the first match is the latest of this kind.
  const app = apps.find((a) => a.kind === kind) ?? null;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }

  // No application on file → pitch card with a CTA to apply.
  if (!app) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: CREAM }}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View className="items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
            >
              {kind === 'rider' ? <Bike size={26} color={BRAND} /> : <Store size={26} color={BRAND} />}
            </View>
            <Text
              style={{
                fontWeight: '900',
                fontSize: 22,
                color: INK,
                letterSpacing: -0.5,
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              {copy.pitchTitle}
            </Text>
            <Text style={{ fontSize: 14, color: MUTED, lineHeight: 21, textAlign: 'center', marginTop: 8 }}>
              {copy.pitchSub}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: MUTED,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginTop: 22,
              marginBottom: 10,
            }}
          >
            What you&apos;ll unlock
          </Text>
          <View style={{ gap: 10 }}>
            {copy.perks.map((p) => (
              <View key={p} className="flex-row" style={{ gap: 10 }}>
                <Check size={16} color={BRAND} style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 14, color: INK, flex: 1, lineHeight: 20 }}>{p}</Text>
              </View>
            ))}
          </View>

          <PressableScale onPress={() => Linking.openURL('mailto:support@atlaasgo.com?subject=AtlaasGo%20application')}>
            <View
              className="rounded-2xl py-4 items-center flex-row justify-center"
              style={{ backgroundColor: BRAND, marginTop: 24 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{copy.pitchCta}</Text>
              <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} />
            </View>
          </PressableScale>
        </Card>
      </ScrollView>
    );
  }

  // Rejected → explain, surface reviewer notes + support contact.
  if (app.status === 'rejected') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: CREAM }}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View className="items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}
            >
              <Inbox size={26} color={MUTED} />
            </View>
            <Text
              style={{
                fontWeight: '900',
                fontSize: 22,
                color: INK,
                letterSpacing: -0.5,
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              Your application wasn&apos;t approved this time
            </Text>
            <Text style={{ fontSize: 14, color: MUTED, lineHeight: 21, textAlign: 'center', marginTop: 10 }}>
              {app.reviewer_notes ??
                "Our team reviewed your application but couldn't move forward right now."}
            </Text>
            <SupportEmail />
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Needs more info → show the reviewer's notes.
  if (app.status === 'needs_info') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: CREAM }}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Card borderColor="rgba(245,158,11,0.35)">
          <View className="items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
            >
              <AlertTriangle size={26} color="#D97706" />
            </View>
            <Text
              style={{
                fontWeight: '900',
                fontSize: 22,
                color: INK,
                letterSpacing: -0.5,
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              We need more info
            </Text>
            <Text style={{ fontSize: 14, color: MUTED, lineHeight: 21, textAlign: 'center', marginTop: 10 }}>
              {app.reviewer_notes ??
                'Our team needs a few more details before we can approve your application.'}
            </Text>
            <SupportEmail />
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Approved but the role hasn't propagated to this screen yet — rare gap
  // while roles sync; don't show a misleading "in review" card.
  if (app.status === 'approved') {
    return (
      <View style={{ flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <CheckCircle2 size={30} color="#059669" />
        <Text style={{ fontWeight: '900', fontSize: 20, color: INK, marginTop: 14, textAlign: 'center' }}>
          You&apos;re approved
        </Text>
        <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 8 }}>
          Your access is being activated — pull this screen up again in a moment.
        </Text>
      </View>
    );
  }

  // submitted / reviewing → "In review" card with age + ETA.
  const ageHours = Math.floor((Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CREAM }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero card */}
      <View className="rounded-3xl p-6" style={{ backgroundColor: INK, marginTop: 24 }}>
        <View className="items-center">
          <Text style={{ fontSize: 56, lineHeight: 64 }}>{copy.emoji}</Text>
          <View
            className="rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 5, paddingHorizontal: 14, marginTop: 10 }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {app.status === 'reviewing' ? 'In review' : 'Submitted'}
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontWeight: '900',
            fontSize: 22,
            color: '#fff',
            letterSpacing: -0.5,
            textAlign: 'center',
            marginTop: 18,
          }}
        >
          {copy.reviewTitle}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 21,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {copy.reviewSub}
        </Text>
      </View>

      {/* Age + ETA */}
      <View
        className="flex-row items-center rounded-2xl p-4"
        style={{
          backgroundColor: 'rgba(255,87,34,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,87,34,0.18)',
          marginTop: 14,
          gap: 12,
        }}
      >
        <Clock size={18} color={BRAND} />
        <Text style={{ fontSize: 13, color: INK, flex: 1, lineHeight: 19 }}>
          <Text style={{ fontWeight: '800' }}>
            Submitted {ageHours < 1 ? 'just now' : `${ageHours}h ago`}
          </Text>
          <Text style={{ color: MUTED }}> · Typical decision within {copy.eta}</Text>
        </Text>
      </View>

      {/* Perks */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: MUTED,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 24,
          marginBottom: 10,
        }}
      >
        What you&apos;ll unlock
      </Text>
      <View style={{ gap: 10 }}>
        {copy.perks.map((p) => (
          <View key={p} className="flex-row" style={{ gap: 10 }}>
            <Check size={16} color={BRAND} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 14, color: INK, flex: 1, lineHeight: 20 }}>{p}</Text>
          </View>
        ))}
      </View>

      <PressableScale onPress={() => router.push('/')}>
        <View
          className="rounded-2xl py-4 items-center flex-row justify-center"
          style={{ backgroundColor: BRAND, marginTop: 26 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            Browse food while you wait
          </Text>
          <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} />
        </View>
      </PressableScale>

      <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, marginTop: 16 }}>
        We&apos;ll notify you in the app as soon as your application is approved.
      </Text>
    </ScrollView>
  );
}

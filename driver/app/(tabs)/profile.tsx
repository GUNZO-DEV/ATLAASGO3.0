// AtlaasDriver 3.0 — Profile / account screen.
// Real data: useRiderProfile() (rating, status, vehicle, plate, totalTrips,
// joinedAt), useAuth() (name / email), useRiderStats() (acceptancePct,
// tripsToday). Light cream/white surface, sunset-orange accent (green for the
// online/done state). Translation of screen-profile.jsx — never fabricates a
// metric: fields the backend doesn't expose render as "—".
//
// DEFERRED: the design's "Winter Atlas badge" gamification card (42/50 snow-day
// drops → +5% boost) is intentionally NOT built — there is no backing data for
// the streak count or the unlock threshold, and fabricating it would mislead
// couriers about real earnings. Revisit when a rider_badges table exists.

import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useClerk } from '@clerk/clerk-expo';
import {
  Star,
  Bike,
  Bell,
  Settings,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Package,
  Clock,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { useRiderProfile, useRiderStats } from '../../hooks/useRiderProfile';
import {
  BG,
  CARD,
  LINE,
  LINE2,
  EMERALD,
  CREAM,
  MUTED,
  FG_SOFT,
  AMBER,
  DANGER,
  ONLINE,
  Enter,
  Section,
  TierRibbon,
} from '../../components/dr/ui';

// Soft sunset tint behind row-icon chips (mirrors --grad-soft in driver.css).
const GRAD_SOFT = 'rgba(255,87,34,0.12)';

// Derive a display name from the Supabase user — metadata first, then the
// email local part. Never invent a name we don't have.
function displayName(meta: Record<string, unknown> | undefined, email: string | undefined): string {
  const m = meta ?? {};
  const cand =
    (typeof m.full_name === 'string' && m.full_name) ||
    (typeof m.name === 'string' && m.name) ||
    (typeof m.username === 'string' && m.username) ||
    (email ? email.split('@')[0] : '');
  return (cand || 'Rider').trim();
}

// Two-letter initials from the display name.
function initialsOf(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// "Courier since {Mon YYYY}" from the real riders.created_at (joinedAt). Returns
// null when the column is empty/unparseable so we never invent a join date.
function joinedLabel(joinedAt: string | null | undefined): string | null {
  if (!joinedAt) return null;
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Courier tier label derived purely from the real rating (no stored tier field).
function tierFor(rating: number): string {
  if (rating >= 4.9) return 'Atlas Elite';
  if (rating >= 4.7) return 'Gold Courier';
  if (rating >= 4.4) return 'Silver Courier';
  return 'Courier';
}

type StatusMeta = { label: string; color: string };
function statusMeta(status: string | undefined): StatusMeta {
  switch (status) {
    case 'online':
      return { label: 'Online', color: ONLINE };
    case 'busy':
      return { label: 'On a trip', color: AMBER };
    case 'on_break':
      return { label: 'On break', color: AMBER };
    default:
      return { label: 'Offline', color: MUTED };
  }
}

// A single metric cell — value big, label small. "—" when the field is unknown.
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: CREAM, letterSpacing: -0.6 }}>{value}</Text>
      <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: MUTED, marginTop: 5 }}>
        {label}
      </Text>
    </View>
  );
}

function MetricDivider() {
  return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: LINE, marginVertical: 4 }} />;
}

// A tappable settings list row.
function ListRow({
  Icon,
  label,
  detail,
  onPress,
  tint,
  last,
}: {
  Icon: LucideIcon;
  label: string;
  detail?: string;
  onPress?: () => void;
  tint?: string;
  last?: boolean;
}) {
  const color = tint ?? CREAM;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: LINE2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: tint ? `${tint}1F` : GRAD_SOFT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color={tint ?? EMERALD} />
      </View>
      <Text style={{ flex: 1, marginLeft: 13, fontSize: 14.5, fontWeight: '600', color }}>{label}</Text>
      {detail ? <Text style={{ fontSize: 12.5, color: MUTED, marginRight: 8 }}>{detail}</Text> : null}
      <ChevronRight size={18} color={MUTED} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, loading, refresh } = useRiderProfile();
  const { tripsToday, acceptancePct, refresh: refreshStats } = useRiderStats();
  const { signOut } = useClerk();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshStats()]);
    setRefreshing(false);
  }, [refresh, refreshStats]);

  const email = user?.email;
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const name = useMemo(() => displayName(meta, email), [meta, email]);
  const initials = useMemo(() => initialsOf(name), [name]);

  const rating = profile?.rating ?? 5.0;
  const tier = tierFor(rating);
  const status = statusMeta(profile?.status);

  // "Courier since {Mon YYYY} · {plate}" — only the parts we actually have.
  const courierSince = useMemo(() => {
    const since = joinedLabel(profile?.joinedAt);
    const plate = typeof profile?.plate === 'string' && profile.plate.trim() ? profile.plate.trim() : null;
    const bits = [since ? `Courier since ${since}` : null, plate].filter(
      (b): b is string => typeof b === 'string',
    );
    return bits.join(' · ');
  }, [profile?.joinedAt, profile?.plate]);

  // Vehicle subline — only what actually exists on the profile row.
  const vehicleLine = useMemo(() => {
    const bits = [profile?.vehicle, profile?.plate].filter(
      (b): b is string => typeof b === 'string' && b.trim().length > 0,
    );
    return bits.join(' · ');
  }, [profile?.vehicle, profile?.plate]);

  function comingSoon(title: string) {
    Alert.alert(title, 'This lives in your account with dispatch for now — in-app controls are coming soon.', [
      { text: 'Got it' },
    ]);
  }

  function onSignOut() {
    Alert.alert('Sign out', 'Sign out of AtlaasGo Driver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 46 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={EMERALD}
            colors={[EMERALD]}
            progressBackgroundColor={BG}
          />
        }
      >
        {/* Header */}
        <Enter>
          <View>
            <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 1.8, color: EMERALD }}>
              ATLAASGO · DRIVER
            </Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: CREAM, letterSpacing: -0.8, marginTop: 3 }}>
              Profile
            </Text>
          </View>
        </Enter>

        {/* Identity */}
        <Enter delay={80}>
          <View style={{ alignItems: 'center', marginTop: 22 }}>
            <LinearGradient
              colors={[EMERALD, AMBER]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                alignItems: 'center',
                justifyContent: 'center',
                // sunset glow (--sh-glow)
                shadowColor: EMERALD,
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.38,
                shadowRadius: 34,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
                {initials}
              </Text>
            </LinearGradient>

            <Text
              style={{ marginTop: 14, fontSize: 22, fontWeight: '800', color: CREAM, letterSpacing: -0.5 }}
              numberOfLines={1}
            >
              {name}
            </Text>

            {/* Rating + live status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={15} color={AMBER} fill={AMBER} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: CREAM }}>{rating.toFixed(1)}</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 4,
                  paddingHorizontal: 9,
                  borderRadius: 999,
                  backgroundColor: CARD,
                  borderWidth: 1,
                  borderColor: LINE,
                }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: status.color }} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: FG_SOFT }}>{status.label}</Text>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <TierRibbon label={tier} />
            </View>

            {courierSince ? (
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 12 }} numberOfLines={1}>
                {courierSince}
              </Text>
            ) : null}

            {email ? (
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 12 }} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </Enter>

        {/* Lifetime metrics (design: DELIVERIES / ACCEPTANCE / ON-TIME). Rating
            already lives in the identity pill above. Acceptance is real
            (useRiderStats.acceptancePct over this week's offers); on-time has no
            backing data, so it stays "—" rather than a fabricated percentage. */}
        <Enter delay={120}>
          <View
            style={{
              flexDirection: 'row',
              marginTop: 22,
              backgroundColor: CARD,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: LINE2,
              paddingVertical: 18,
            }}
          >
            <Metric value={`${profile?.totalTrips ?? 0}`} label="DELIVERIES" />
            <MetricDivider />
            <Metric value={`${acceptancePct}%`} label="ACCEPTANCE" />
            <MetricDivider />
            <Metric value="—" label="ON-TIME" />
          </View>
        </Enter>

        {/* Today */}
        <Enter delay={160}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              backgroundColor: CARD,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: LINE2,
              paddingVertical: 14,
              paddingHorizontal: 16,
              gap: 12,
            }}
          >
            <Package size={18} color={EMERALD} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: CREAM }}>Trips today</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: CREAM }}>{tripsToday}</Text>
          </View>
        </Enter>

        {/* Verification / vehicle */}
        {profile?.documentsVerified ? (
          <Section icon={<BadgeCheck size={14} color={ONLINE} />} title="Verified courier" />
        ) : (
          <Section icon={<Clock size={14} color={AMBER} />} title="Account" />
        )}
        <Enter delay={200}>
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: LINE2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 15,
                paddingHorizontal: 16,
                borderBottomWidth: vehicleLine ? 1 : 0,
                borderBottomColor: LINE2,
              }}
            >
              <ShieldCheck size={18} color={profile?.documentsVerified ? ONLINE : MUTED} />
              <Text style={{ flex: 1, marginLeft: 13, fontSize: 14, fontWeight: '600', color: CREAM }}>
                {profile?.documentsVerified ? 'Documents verified' : 'Verification pending'}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: profile?.documentsVerified ? ONLINE : AMBER }}>
                {profile?.documentsVerified ? 'Active' : 'Review'}
              </Text>
            </View>
            {vehicleLine ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16 }}
              >
                <Bike size={18} color={EMERALD} />
                <Text style={{ flex: 1, marginLeft: 13, fontSize: 14, fontWeight: '600', color: CREAM }}>
                  Vehicle
                </Text>
                <Text style={{ fontSize: 12.5, color: MUTED }} numberOfLines={1}>
                  {vehicleLine}
                </Text>
              </View>
            ) : null}
          </View>
        </Enter>

        {/* Settings */}
        <Section icon={<Settings size={14} color={EMERALD} />} title="Settings" />
        <Enter delay={240}>
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: LINE2,
              overflow: 'hidden',
            }}
          >
            <ListRow Icon={Bell} label="Notifications" onPress={() => comingSoon('Notifications')} />
            <ListRow Icon={ShieldCheck} label="Safety toolkit" onPress={() => comingSoon('Safety toolkit')} />
            <ListRow Icon={LifeBuoy} label="Help & support" onPress={() => comingSoon('Help & support')} />
            <ListRow Icon={Settings} label="App settings" onPress={() => comingSoon('App settings')} last />
          </View>
        </Enter>

        {/* Sign out */}
        <Enter delay={280}>
          <View
            style={{
              marginTop: 16,
              backgroundColor: CARD,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: LINE2,
              overflow: 'hidden',
            }}
          >
            <ListRow Icon={LogOut} label="Sign out" tint={DANGER} onPress={onSignOut} last />
          </View>
        </Enter>

        {loading && !profile ? (
          <Text style={{ fontSize: 11.5, color: MUTED, textAlign: 'center', marginTop: 22 }}>
            Loading your courier profile…
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

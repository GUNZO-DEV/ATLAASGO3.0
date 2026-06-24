// AtlaasDriver 3.0 — Profile / account screen. Faithful translation of the
// design screen-profile.jsx: identity-first (no page header), rating + tier
// chip, "Courier since {Mon YYYY} · {plate}", the DELIVERIES/ACCEPTANCE/ON-TIME
// metric row, the Winter Atlas badge progress card, one flat settings list, and
// a ghost "Sign out" button. Light cream/white + sunset accent.
//
// Real data: useRiderProfile() (rating, status, vehicle, plate, totalTrips,
// joinedAt, documentsVerified), useAuth() (name/email), useRiderStats()
// (acceptancePct). Never fabricates: on-time has no backing column → "—"; the
// Atlas-badge progress is driven by the REAL totalTrips toward a 50-delivery
// milestone (no invented "snow-drop counter" or fake boost reward).

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
  BadgeCheck,
  Wallet,
  Snowflake,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useRiderProfile, useRiderStats } from '../../hooks/useRiderProfile';
import {
  BG,
  CARD,
  LINE,
  LINE2,
  EMERALD,
  CREAM,
  MUTED,
  AMBER,
  SNOW,
  BG2,
  ONLINE,
  DANGER,
  Enter,
  TierRibbon,
} from '../../components/dr/ui';

// Soft sunset tint behind row-icon chips (mirrors --grad-soft in driver.css).
const GRAD_SOFT = 'rgba(255,87,34,0.12)';

function displayName(meta: Record<string, unknown> | undefined, email: string | undefined): string {
  const m = meta ?? {};
  const cand =
    (typeof m.full_name === 'string' && m.full_name) ||
    (typeof m.name === 'string' && m.name) ||
    (typeof m.username === 'string' && m.username) ||
    (email ? email.split('@')[0] : '');
  return (cand || 'Rider').trim();
}

function initialsOf(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function joinedLabel(joinedAt: string | null | undefined): string | null {
  if (!joinedAt) return null;
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function tierFor(rating: number): string {
  if (rating >= 4.9) return 'Atlas Elite';
  if (rating >= 4.7) return 'Gold Courier';
  if (rating >= 4.4) return 'Silver Courier';
  return 'Courier';
}

// A single metric cell — value big, label small. "—" when the field is unknown.
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: CREAM, letterSpacing: -0.6 }}>{value}</Text>
      <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: MUTED, marginTop: 5 }}>{label}</Text>
    </View>
  );
}
function MetricDivider() {
  return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: LINE, marginVertical: 4 }} />;
}

// A settings list row (icon chip · label · optional detail · chevron).
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
      <Text style={{ flex: 1, marginLeft: 13, fontSize: 14.5, fontWeight: '600', color: CREAM }}>{label}</Text>
      {detail ? <Text style={{ fontSize: 12.5, color: MUTED, marginRight: 8 }} numberOfLines={1}>{detail}</Text> : null}
      <ChevronRight size={18} color={MUTED} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, loading, refresh } = useRiderProfile();
  const { acceptancePct, refresh: refreshStats } = useRiderStats();
  const { signOut } = useClerk();
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const totalTrips = profile?.totalTrips ?? 0;

  const courierSince = useMemo(() => {
    const since = joinedLabel(profile?.joinedAt);
    const plate = typeof profile?.plate === 'string' && profile.plate.trim() ? profile.plate.trim() : null;
    return [since ? `Courier since ${since}` : null, plate].filter((b): b is string => typeof b === 'string').join(' · ');
  }, [profile?.joinedAt, profile?.plate]);

  const vehicleLine = useMemo(() => {
    return [profile?.vehicle, profile?.plate]
      .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
      .join(' · ');
  }, [profile?.vehicle, profile?.plate]);

  // Atlas-badge progress from REAL deliveries toward the next 50-delivery tier.
  const GOAL = 50;
  const done = totalTrips === 0 ? 0 : totalTrips % GOAL === 0 ? GOAL : totalTrips % GOAL;
  const remaining = GOAL - done;
  const badgePct = Math.min(1, done / GOAL);

  function comingSoon(title: string) {
    Alert.alert(title, 'This lives in your account with dispatch for now — in-app controls are coming soon.', [
      { text: 'Got it' },
    ]);
  }

  function onSignOut() {
    Alert.alert('Sign out', 'Sign out of AtlaasGo Driver?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  // In-app account deletion (Google Play User-Data policy). Calls the deployed
  // 'delete-account' edge function — same flow as the customer app — then signs
  // the courier out. Two-step Alert so deletion is never a single mis-tap.
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw new Error(error.message);
      await signOut();
    } catch (e) {
      Alert.alert('Could not delete account', (e as Error).message || 'Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function onDeleteAccount() {
    Alert.alert('Delete account', 'This permanently deletes your courier account and data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: () => void handleDeleteAccount() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 46 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EMERALD} colors={[EMERALD]} progressBackgroundColor={BG} />
        }
      >
        {/* Identity (design is identity-first — no page header) */}
        <Enter delay={40}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
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
                shadowColor: EMERALD,
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.38,
                shadowRadius: 34,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>{initials}</Text>
            </LinearGradient>

            <Text style={{ marginTop: 13, fontSize: 23, fontWeight: '900', color: CREAM, letterSpacing: -0.5 }} numberOfLines={1}>
              {name}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={15} color={AMBER} fill={AMBER} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: CREAM }}>{rating.toFixed(1)}</Text>
              </View>
              <TierRibbon label={tier} />
            </View>

            {courierSince ? (
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 9 }} numberOfLines={1}>
                {courierSince}
              </Text>
            ) : null}
          </View>
        </Enter>

        {/* Lifetime metrics: DELIVERIES / ACCEPTANCE / ON-TIME (on-time = "—", no data) */}
        <Enter delay={90}>
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
            <Metric value={`${totalTrips}`} label="DELIVERIES" />
            <MetricDivider />
            <Metric value={`${acceptancePct}%`} label="ACCEPTANCE" />
            <MetricDivider />
            <Metric value="—" label="ON-TIME" />
          </View>
        </Enter>

        {/* Winter Atlas badge — design's progress card, driven by real deliveries */}
        <Enter delay={130}>
          <View style={{ marginTop: 16, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <Snowflake size={18} color={SNOW} />
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: CREAM }}>Winter Atlas badge</Text>
              <View
                style={{
                  marginLeft: 'auto',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 3,
                  paddingHorizontal: 9,
                  borderRadius: 999,
                  backgroundColor: 'rgba(90,169,230,0.14)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: SNOW, fontVariant: ['tabular-nums'] }}>{done} / {GOAL}</Text>
              </View>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: BG2, overflow: 'hidden' }}>
              <LinearGradient
                colors={[SNOW, '#2A6FA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: `${Math.round(badgePct * 100)}%`, borderRadius: 999 }}
              />
            </View>
            <Text style={{ fontSize: 12, color: MUTED, marginTop: 9 }}>
              {remaining} more deliver{remaining === 1 ? 'y' : 'ies'} to your next Atlas badge tier.
            </Text>
          </View>
        </Enter>

        {/* Settings — one flat list (design order), with the real verification row first */}
        <Enter delay={170}>
          <View style={{ marginTop: 20, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: LINE2, overflow: 'hidden' }}>
            <ListRow
              Icon={BadgeCheck}
              label={profile?.documentsVerified ? 'Verified courier' : 'Verification pending'}
              detail={profile?.documentsVerified ? 'Active' : 'In review'}
              tint={profile?.documentsVerified ? ONLINE : AMBER}
              onPress={() => comingSoon('Verification')}
            />
            <ListRow Icon={Bike} label="Vehicle & winter kit" detail={vehicleLine || undefined} onPress={() => comingSoon('Vehicle & winter kit')} />
            <ListRow Icon={Wallet} label="Payout method" detail="Set up" onPress={() => comingSoon('Payout method')} />
            <ListRow Icon={Bell} label="Notifications" detail="On" onPress={() => comingSoon('Notifications')} />
            <ListRow Icon={ShieldCheck} label="Safety toolkit" onPress={() => comingSoon('Safety toolkit')} />
            <ListRow Icon={LifeBuoy} label="Help & support" onPress={() => comingSoon('Help & support')} />
            <ListRow Icon={Settings} label="Settings" onPress={() => comingSoon('Settings')} last />
          </View>
        </Enter>

        {/* Sign out — ghost button (design), sunset accent */}
        <Enter delay={210}>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => ({
              marginTop: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              paddingVertical: 15,
              borderRadius: 16,
              backgroundColor: CARD,
              borderWidth: 1,
              borderColor: LINE,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <LogOut size={18} color={EMERALD} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: EMERALD }}>Sign out</Text>
          </Pressable>
        </Enter>

        {/* Delete account — in-app deletion (Google Play User-Data policy), danger-tinted */}
        <Enter delay={240}>
          <Pressable
            onPress={onDeleteAccount}
            disabled={deleting}
            style={({ pressed }) => ({
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 13,
              opacity: deleting ? 0.5 : pressed ? 0.6 : 1,
            })}
          >
            <Trash2 size={15} color={DANGER} />
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: DANGER }}>
              {deleting ? 'Deleting…' : 'Delete account'}
            </Text>
          </Pressable>
        </Enter>

        {loading && !profile ? (
          <Text style={{ fontSize: 11.5, color: MUTED, textAlign: 'center', marginTop: 22 }}>Loading your courier profile…</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

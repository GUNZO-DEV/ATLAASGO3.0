// AtlaasGo 3.0 — Account hub. Native re-skin of the Profile export in
// screen-tabs2.jsx, wired to the live ag3 foundation (agApi + useAg3Theme).
//
// Logic ported from src/app3/screens/Profile.tsx: identity header + stats
// (agApi.me.get / .wallet), Appearance dark-mode toggle, Language segmented
// control (en/fr/ar via agApi.me.setLanguage), AtlaasGo+ banner, action rows
// (Wallet / Addresses / Favourites / Promos / Group-orders on campus).
//
// PRESERVED native plumbing from the previous account.tsx (no global
// ThemeProvider / i18n / CityProvider exists in this app, so this screen is
// self-contained):
//   - profiles display_name/phone read + save (supabase.from('profiles'))
//   - sign out (useAuth().signOut + Clerk signOut)
//   - delete-account edge function (App Store 5.1.1(v))
//   - role-gated entry points (Driver / Restaurant POS / Admin) via useRoles
//   - rider/partner application status via useMyApplications
//   - signed-out CTA → /sign-in
// New state (theme + language) is persisted to AsyncStorage and mirrored to the
// server via agApi.me.setTheme / setLanguage; both ignore failures when signed
// out, exactly like the web port.
import { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useClerk } from '@clerk/clerk-expo';
import { Bike, Shield, Store, Trash2, LogOut } from 'lucide-react-native';

import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../hooks/useRoles';
import { useMyApplications } from '../../hooks/useMyApplications';

import { agApi, type City, type Lang } from '../../lib/ag3/agApi';
import { useAsync } from '../../lib/ag3/useAsync';
import { useAg3Theme, gradients, type Scheme } from '../../components/ag3/theme';
import { Press, Rise } from '../../components/ag3/primitives';
import {
  IWallet,
  IPin,
  IHeart,
  IGift,
  IGroup,
  IReceipt,
  IChevR,
  IGlobe,
  ISun,
  IMoon,
  IUser,
  IBolt,
  type AgIcon,
} from '../../components/ag3/icons';

const THEME_KEY = 'ag3-theme';
const LANG_KEY = 'ag_lang';

const LANGS: [Lang, string][] = [
  ['en', 'English'],
  ['fr', 'Français'],
  ['ar', 'العربية'],
];

type RowData = {
  icon: AgIcon;
  title: string;
  sub: string;
  color?: string;
  href?: string;
};

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { isRider, isAdmin, isMerchant } = useRoles();
  const { apps: myApps } = useMyApplications();

  // ── Appearance: self-contained dark-mode override (no global ThemeProvider).
  // null = follow system until rehydrated; once set we pin the ag3 scheme.
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const t = useAg3Theme(scheme ?? undefined);
  const dark = t.isDark;

  // ── Language: self-contained segmented control (no global i18n provider).
  const [lang, setLangState] = useState<Lang>('en');

  // ── Editable profile fields (preserved from the old screen).
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Live 3.0 data via the ag3 foundation.
  const { data: me } = useAsync(() => agApi.me.get(), [user?.id]);
  const { data: wallet } = useAsync(() => agApi.me.wallet(), [user?.id]);
  const { data: addresses } = useAsync(() => agApi.me.addresses(), [user?.id]);
  const { data: favourites } = useAsync(() => agApi.me.favourites(), [user?.id]);
  const { data: promos } = useAsync(() => agApi.me.promos(), [user?.id]);
  const { data: cities } = useAsync(() => agApi.cities.list(), []);
  const city: City | null =
    cities?.find((c) => c.id === (me?.campusId ?? 'ifrane')) ?? cities?.find((c) => c.id === 'ifrane') ?? cities?.[0] ?? null;

  // Rehydrate persisted theme + language. Seed from the server profile too so a
  // returning user keeps their saved appearance/language.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet([THEME_KEY, LANG_KEY])
      .then((pairs) => {
        if (cancelled) return;
        const map = Object.fromEntries(pairs);
        const savedTheme = map[THEME_KEY];
        const savedLang = map[LANG_KEY];
        if (savedTheme === 'dark' || savedTheme === 'light') setScheme(savedTheme);
        if (savedLang === 'en' || savedLang === 'fr' || savedLang === 'ar') setLangState(savedLang);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    // Only adopt the server values if the user hasn't already chosen locally.
    setScheme((prev) => prev ?? me.theme);
    setLangState((prev) => prev ?? me.language);
  }, [me]);

  // Editable profile (display_name + phone) — unchanged Supabase plumbing.
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
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
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggleTheme() {
    const next: Scheme = dark ? 'light' : 'dark';
    setScheme(next);
    void AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
    // mirror to the server profile; ignore when signed out (web parity)
    agApi.me.setTheme(next).catch(() => {});
  }

  function setLanguage(next: Lang) {
    setLangState(next);
    void AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
    agApi.me.setLanguage(next).catch(() => {});
  }

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

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      // Server-authoritative: deletes the Clerk user, all Supabase data, and the
      // auth identity. The caller is identified by their own JWT.
      const { error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw new Error(error.message);
      try { await clerkSignOut(); } catch {}
      try { await signOut(); } catch {}
      router.replace('/');
    } catch (e) {
      Alert.alert('Could not delete account', (e as Error).message ?? 'Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your AtlaasGo account — your profile, orders, wallet balance, addresses, and saved data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: handleDeleteAccount },
      ],
    );
  }

  // ── Signed-out state ──────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.surface2,
            }}
          >
            <IUser size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 22, color: t.colors.fg, marginTop: 18 }]}>Your account</Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to manage your profile, wallet, addresses and more.
          </Text>
          <Press onPress={() => router.push('/sign-in')} style={{ marginTop: 24 }}>
            <LinearGradient
              colors={gradients.sunset}
              start={gradients.start}
              end={gradients.end}
              style={[styles.signInBtn, t.shadows.glow]}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Sign in</Text>
            </LinearGradient>
          </Press>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived identity / stats (spec-faithful, mirrors Profile.tsx) ─────────
  const fullName = me?.name || name || 'Guest';
  const initials = me?.initials || fullName.trim().charAt(0).toUpperCase() || 'A';
  const parts = fullName.split(' ');
  const firstName = parts[0] + (parts[1] ? ` ${parts[1].charAt(0)}.` : '');
  const ordersCount = me?.stats.orders ?? 0;
  const favCount = me?.stats.favourites ?? favourites?.length ?? 0;
  const walletDh = wallet?.balanceDh ?? me?.stats.walletDh ?? 0;
  const memberSince = me?.memberSince ?? new Date().getFullYear();

  const defaultAddr = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const addrCount = addresses?.length ?? 0;
  const addrMore = addrCount > 1 ? ` · ${addrCount - 1} more` : '';
  const addrLabel = defaultAddr
    ? `${defaultAddr.building || defaultAddr.label}${addrMore}`
    : city?.defaultAddress ?? 'No saved address';

  const activePromos = (promos ?? []).filter((p) => p.active);
  const promoSub = activePromos.length
    ? `${activePromos.length} active · ${activePromos[0].label}`
    : 'No active promos';

  const identitySub = city?.campus
    ? `AUI · ${defaultAddr?.building || city.defaultAddress} · since ${memberSince}`
    : `${city?.name ?? 'Ifrane'} · since ${memberSince}`;

  const rows1: RowData[] = [
    { icon: IWallet, title: 'AtlaasGo Wallet', sub: `${walletDh} dh balance`, color: t.colors.primary, href: '/wallet' },
    { icon: IPin, title: 'Saved addresses', sub: addrLabel, color: t.colors.fgSoft, href: '/addresses' },
    { icon: IHeart, title: 'Favourites', sub: `${favCount} place${favCount === 1 ? '' : 's'}`, color: '#E0526D', href: '/favorites' },
    { icon: IGift, title: 'Promos & credits', sub: promoSub, color: t.colors.amber, href: '/prime' },
  ];
  const rows2: RowData[] = [
    ...(city?.campus ? [{ icon: IGroup, title: 'Group orders', sub: city.defaultAddressSub || city.defaultAddress, href: '/campus' }] : []),
    { icon: IReceipt, title: 'Order history', sub: `${ordersCount} order${ordersCount === 1 ? '' : 's'}`, href: '/orders' },
    { icon: IUser, title: 'Notifications', sub: 'Order updates & promos', color: '#3E86C7', href: '/notifications' },
  ];

  // ── Role-gated + growth entries (preserved) ───────────────────────────────
  const roleRows: RowData[] = [];
  if (isRider) roleRows.push({ icon: Bike, title: 'Driver mode', sub: 'Your delivery assignments', href: '/driver', color: t.colors.fg });
  if (isMerchant) roleRows.push({ icon: Store, title: 'Restaurant POS', sub: 'Live orders & kitchen display', href: '/merchant', color: '#0891B2' });
  if (isAdmin) roleRows.push({ icon: Shield, title: 'Admin', sub: 'Orders, riders & applications', href: '/admin', color: '#7C3AED' });

  const Row = ({ r }: { r: RowData }) => {
    const Icon = r.icon;
    return (
      <Press onPress={r.href ? () => router.push(r.href as never) : undefined}>
        <View style={[card(t), styles.row]}>
          <View style={[styles.rowIcon, { backgroundColor: t.colors.surface2 }]}>
            <Icon size={20} color={r.color || t.colors.fgSoft} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }}>{r.title}</Text>
            <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }} numberOfLines={1}>{r.sub}</Text>
          </View>
          <IChevR size={20} color={t.colors.muted} />
        </View>
      </Press>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 44, paddingTop: 8 }}>
        <Rise>
          {/* ── identity ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 6 }}>
            <LinearGradient
              colors={gradients.sunset}
              start={gradients.start}
              end={gradients.end}
              style={[styles.avatar, t.shadows.glow]}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 28 }}>{initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.disp, { fontSize: 22, color: t.colors.fg }]} numberOfLines={1}>{firstName}</Text>
              <Text style={{ fontSize: 13, color: t.colors.muted, marginTop: 2 }} numberOfLines={1}>{identitySub}</Text>
            </View>
          </View>

          {/* ── stats ── */}
          <View style={[card(t), styles.stats]}>
            {(
              [
                [String(ordersCount), 'orders'],
                [String(favCount), 'favourites'],
                [String(walletDh), 'dh wallet'],
              ] as [string, string][]
            ).map(([v, label], i) => (
              <View
                key={label}
                style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: t.colors.line }}
              >
                <Text style={[styles.disp, { fontSize: 19, color: t.colors.fg }]}>{v}</Text>
                <Text style={{ fontSize: 11, color: t.colors.muted, marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>
        </Rise>

        {/* ── editable profile (preserved native save) ── */}
        <View style={{ marginTop: 18 }}>
          <Text style={[styles.eyebrow, { color: t.colors.primary }]}>Profile</Text>
          {profileLoading ? (
            <View style={[card(t), { padding: 18, alignItems: 'center', marginTop: 10 }]}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : (
            <View style={[card(t), { padding: 16, marginTop: 10, gap: 4 }]}>
              <Text style={[styles.fieldLabel, { color: t.colors.muted }]}>Display name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={t.colors.muted}
                style={[styles.input, { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg }]}
              />
              <Text style={[styles.fieldLabel, { color: t.colors.muted, marginTop: 12 }]}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+212…"
                placeholderTextColor={t.colors.muted}
                style={[styles.input, { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg }]}
              />
              <Press onPress={save} disabled={saving} style={{ marginTop: 14 }}>
                <LinearGradient colors={gradients.sunset} start={gradients.start} end={gradients.end} style={[styles.saveBtn, t.shadows.glow, { opacity: saving ? 0.7 : 1 }]}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save profile</Text>}
                </LinearGradient>
              </Press>
            </View>
          )}
        </View>

        {/* ── appearance: dark-mode toggle ── */}
        <View style={{ marginTop: 18 }}>
          <View style={styles.eyebrowRow}>
            {dark ? <IMoon size={13} color={t.colors.primary} /> : <ISun size={13} color={t.colors.primary} />}
            <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 0 }]}>Appearance</Text>
          </View>
          <Press onPress={toggleTheme} style={{ marginTop: 10 }}>
            <View style={[card(t), styles.row]}>
              {dark ? (
                <LinearGradient colors={gradients.sunset} start={gradients.start} end={gradients.end} style={[styles.rowIcon, t.shadows.glow]}>
                  <IMoon size={20} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={[styles.rowIcon, { backgroundColor: t.colors.surface2 }]}>
                  <ISun size={20} color={t.colors.amber} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }}>Dark mode</Text>
                <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }}>
                  {dark ? 'On · easy on the eyes' : 'Off · follow the sun'}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: dark ? t.colors.primary : t.colors.line }]}>
                <View style={[styles.knob, { left: dark ? 23 : 3 }]} />
              </View>
            </View>
          </Press>
        </View>

        {/* ── language segmented control ── */}
        <View style={{ marginTop: 18 }}>
          <View style={styles.eyebrowRow}>
            <IGlobe size={13} color={t.colors.primary} />
            <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 0 }]}>Language</Text>
          </View>
          <View style={[styles.seg, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            {LANGS.map(([k, label]) => {
              const active = lang === k;
              return (
                <Pressable key={k} onPress={() => setLanguage(k)} style={{ flex: 1 }}>
                  <View style={[styles.segBtn, active && [{ backgroundColor: t.colors.surface }, t.shadows.card]]}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: active ? t.colors.fg : t.colors.muted }}>{label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── AtlaasGo+ banner ── */}
        <View style={{ marginTop: 16 }}>
          <View style={[styles.plusBanner, t.shadows.lift]}>
            <LinearGradient colors={['#1A1410', '#3A2A1E']} start={gradients.start} end={gradients.end} style={StyleSheet.absoluteFill} />
            <View style={styles.plusGlow}>
              <LinearGradient colors={gradients.sunset} start={gradients.start} end={gradients.end} style={StyleSheet.absoluteFill} />
            </View>
            <View>
              <View style={styles.eyebrowRow}>
                <IBolt size={13} color={t.colors.amber} fill={t.colors.amber} strokeWidth={0} />
                <Text style={[styles.eyebrow, { color: t.colors.amber, marginBottom: 0 }]}>AtlaasGo+</Text>
              </View>
              <Text style={[styles.disp, { fontSize: 19, color: '#fff', marginTop: 6 }]}>Free delivery, all winter.</Text>
              <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', marginTop: 3 }}>
                Skip every fee for 49 dh/month · cancel anytime
              </Text>
              <Press onPress={() => router.push('/prime')} style={{ marginTop: 14, alignSelf: 'flex-start' }}>
                <View style={styles.plusCta}>
                  <Text style={{ color: '#1A1410', fontWeight: '800', fontSize: 14 }}>Try free for a month</Text>
                </View>
              </Press>
            </View>
          </View>
        </View>

        {/* ── action rows ── */}
        <View style={{ marginTop: 18, gap: 10 }}>
          {rows1.map((r) => <Row key={r.title} r={r} />)}
        </View>
        <View style={{ marginTop: 12, gap: 10 }}>
          {rows2.map((r) => <Row key={r.title} r={r} />)}
        </View>

        {/* ── role-gated + growth entries (preserved) ── */}
        {roleRows.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.eyebrow, { color: t.colors.muted }]}>More</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {roleRows.map((r) => <Row key={r.href} r={r} />)}
            </View>
          </View>
        )}

        {/* ── application status (preserved web parity) ── */}
        {myApps.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={[styles.eyebrow, { color: t.colors.muted }]}>Applications</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {myApps.map((a) => {
                const pill =
                  a.status === 'approved'
                    ? { label: 'Approved', bg: 'rgba(47,163,107,0.14)', fg: t.colors.ok }
                    : a.status === 'rejected'
                      ? { label: 'Not approved', bg: 'rgba(225,29,72,0.12)', fg: '#E0526D' }
                      : a.status === 'needs_info'
                        ? { label: 'Needs info', bg: 'rgba(232,169,59,0.16)', fg: t.colors.warn }
                        : a.status === 'reviewing'
                          ? { label: 'In review', bg: 'rgba(232,169,59,0.16)', fg: t.colors.warn }
                          : { label: 'Submitted', bg: 'rgba(62,134,199,0.14)', fg: t.colors.snow };
                return (
                  <View key={`${a.kind}-${a.id}`} style={[card(t), { padding: 14 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>
                        {a.kind === 'rider' ? 'Rider application' : 'Partner application'}
                      </Text>
                      <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: pill.bg }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: pill.fg }}>{pill.label}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 4 }}>
                      Submitted {new Date(a.created_at).toLocaleDateString()}
                    </Text>
                    {!!a.reviewer_notes && (
                      <Text style={{ fontSize: 12, color: t.colors.fgSoft, marginTop: 8, lineHeight: 18 }}>
                        “{a.reviewer_notes}”
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── sign out (preserved) ── */}
        <Press onPress={() => signOut()} style={{ marginTop: 22 }}>
          <View style={[styles.signOut, { borderColor: 'rgba(225,29,72,0.28)' }]}>
            <LogOut size={16} color="#E0526D" />
            <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '700', color: '#E0526D' }}>Sign out</Text>
          </View>
        </Press>

        {/* ── delete account (App Store 5.1.1(v), preserved) ── */}
        <Pressable onPress={confirmDeleteAccount} disabled={deleting} style={{ marginTop: 18, alignItems: 'center' }}>
          {deleting ? (
            <ActivityIndicator color="#B91C1C" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trash2 size={14} color="#B91C1C" />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#B91C1C' }}>Delete account</Text>
            </View>
          )}
        </Pressable>
        <Text style={{ fontSize: 11, textAlign: 'center', marginTop: 6, color: t.colors.muted }}>
          Permanently removes your account and all your data.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function card(t: ReturnType<typeof useAg3Theme>) {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  };
}

const styles = StyleSheet.create({
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 70, height: 70, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', marginTop: 16, paddingVertical: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  rowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '700' },
  input: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginTop: 6 },
  saveBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  signInBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  track: { width: 50, height: 30, borderRadius: 999, justifyContent: 'center' },
  knob: { position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 999, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, borderWidth: 1, marginTop: 10 },
  segBtn: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 999, alignItems: 'center' },
  plusBanner: { borderRadius: 26, padding: 18, overflow: 'hidden' },
  plusGlow: { position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: 999, opacity: 0.5 },
  plusCta: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 14, borderWidth: 1 },
});

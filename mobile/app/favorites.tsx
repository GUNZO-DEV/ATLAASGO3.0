// AtlaasGo 3.0 — Favourites (saved restaurants).
//
// Native re-skin to the 3.0 look (warm terracotta + amber on cream/ink, sunset
// gradient header pin, rounded cards, RestoRow-style rows, moti Rise/Press).
// Built on the ag3 foundation: theme.ts (useAg3Theme), icons.tsx, and
// components/ag3/primitives (PhotoTile, Press, Rise, foodEm, tileFor, Stars).
//
// DATA / PLUMBING PRESERVED ───────────────────────────────────────────────────
//   • The saved list, loading flag and unfavourite mutation all come from the
//     EXISTING useFavorites() hook (Supabase `favorites` table, RLS-scoped to the
//     user). { restaurants, loading, toggle } are used verbatim — no query,
//     mutation or RLS behaviour is touched.
//   • Auth gating still keys off useAuth() ({ user, loading }); signed-out users
//     get the sign-in prompt and the same router.push('/sign-in').
//   • Tapping a row still navigates to /restaurant/[id] with the same params.
//   • The heart still calls toggle(r.id) to unfavourite, which re-loads the list.
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAg3Theme } from '../components/ag3/theme';
import { IBack, IHeart, IStar, IChevR } from '../components/ag3/icons';
import { PhotoTile, Press, Rise, Stars, Dot, foodEm, tileFor } from '../components/ag3/primitives';
import { useAuth } from '../lib/auth';
import { useFavorites, type FavoriteRestaurant } from '../hooks/useFavorites';

type Theme = ReturnType<typeof useAg3Theme>;

export default function FavoritesScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { restaurants, loading, toggle } = useFavorites();

  // ── signed-out: sign-in prompt (preserves /sign-in route) ──
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header t={t} onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IHeart size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>
            {tr('favorites.title')}
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            {tr('favorites.signInBody')}
          </Text>
          <Press onPress={() => router.push('/sign-in')}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.cta, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{tr('favorites.signIn')}</Text>
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
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
      >
        {/* title */}
        <Rise style={{ marginTop: 8, marginBottom: 16 }}>
          <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{tr('favorites.eyebrow')}</Text>
          <Text style={[styles.disp, { fontSize: 27, color: t.colors.fg }]}>{tr('favorites.title')}</Text>
          {!loading && restaurants.length > 0 ? (
            <Text style={{ fontSize: 13, color: t.colors.muted, marginTop: 4 }}>
              {tr('favorites.countLine', { n: restaurants.length })}
            </Text>
          ) : null}
        </Rise>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : restaurants.length === 0 ? (
          <Rise>
            <View style={[card(t), styles.emptyCard]}>
              <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                <IHeart size={26} color={t.colors.muted} />
              </View>
              <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg, marginTop: 14 }]}>
                {tr('favorites.emptyTitle')}
              </Text>
              <Text style={{ fontSize: 13, color: t.colors.muted, marginTop: 5, textAlign: 'center', lineHeight: 19 }}>
                {tr('favorites.emptyBody')}
              </Text>
              <Press onPress={() => router.replace('/')}>
                <LinearGradient
                  colors={t.gradients.sunset}
                  start={t.gradients.start}
                  end={t.gradients.end}
                  style={[styles.cta, t.shadows.glow]}
                >
                  <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{tr('favorites.browseSpots')}</Text>
                </LinearGradient>
              </Press>
            </View>
          </Rise>
        ) : (
          <View style={{ gap: 11 }}>
            {restaurants.map((r, i) => (
              <Rise key={r.id} delay={i * 50}>
                <FavRow
                  t={t}
                  r={r}
                  onOpen={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
                  onUnfav={() => toggle(r.id)}
                />
              </Rise>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── header — sunset pin + title ──────────────────────────────────────────── */
function Header({ t, onBack }: { t: Theme; onBack: () => void }) {
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
      <Text style={[styles.disp, { fontSize: 20, color: t.colors.fg }]}>{tr('favorites.headerTitle')}</Text>
      <LinearGradient
        colors={t.gradients.sunset}
        start={t.gradients.start}
        end={t.gradients.end}
        style={[styles.headerPin, t.shadows.glow]}
      >
        <IHeart size={18} color="#fff" fill="#fff" strokeWidth={0} />
      </LinearGradient>
    </MotiView>
  );
}

/* ── saved-restaurant row — RestoRow look on the favourites data shape ──────── */
function FavRow({
  t,
  r,
  onOpen,
  onUnfav,
}: {
  t: Theme;
  r: FavoriteRestaurant;
  onOpen: () => void;
  onUnfav: () => void;
}) {
  const { t: tr } = useTranslation();
  const em = r.emoji || foodEm(r.id);
  return (
    <Press onPress={onOpen} style={{ width: '100%' }}>
      <View style={[card(t), styles.row]}>
        <PhotoTile tile={tileFor(r.id)} em={em} radius={18} style={{ width: 84, minHeight: 84 }} />

        <View style={{ flex: 1, minWidth: 0, gap: 5, paddingVertical: 2 }}>
          <Text style={[styles.disp, { fontSize: 16, color: t.colors.fg }]} numberOfLines={1}>
            {r.name}
          </Text>
          {r.cuisine ? (
            <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
              {r.cuisine}
            </Text>
          ) : null}
          {r.rating != null ? (
            <View style={[styles.metaRow, { marginTop: 'auto' }]}>
              <Stars value={r.rating} size={12} />
              <Dot color={t.colors.muted} />
              <Text style={{ fontSize: 12.5, color: t.colors.fgSoft, fontWeight: '600' }}>{tr('favorites.saved')}</Text>
            </View>
          ) : (
            <View style={[styles.metaRow, { marginTop: 'auto' }]}>
              <IStar size={12} color={t.colors.muted} />
              <Text style={{ fontSize: 12.5, color: t.colors.fgSoft, fontWeight: '600' }}>{tr('favorites.saved')}</Text>
            </View>
          )}
        </View>

        {/* heart to unfavourite */}
        <Press onPress={onUnfav} scaleTo={0.85} hitSlop={8} style={styles.heartWrap}>
          <View style={[styles.heartBtn, { backgroundColor: 'rgba(255,87,34,0.12)' }]}>
            <IHeart size={19} color={t.colors.primary} fill={t.colors.primary} strokeWidth={0} />
          </View>
        </Press>

        <IChevR size={18} color={t.colors.muted} style={styles.chev} />
      </View>
    </Press>
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
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerPin: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  row: { flexDirection: 'row', gap: 13, padding: 11, alignItems: 'center' },
  heartWrap: { alignSelf: 'center' },
  heartBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chev: { marginLeft: -2 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyCard: { alignItems: 'center', padding: 28, marginTop: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cta: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 22 },
});

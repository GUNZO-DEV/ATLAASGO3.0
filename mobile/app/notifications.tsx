// AtlaasGo 3.0 — Notifications. Native re-skin of the notifications feed, wired
// to the live ag3 foundation (useAg3Theme) and faithful to the 3.0 look (warm
// terracotta + amber on cream/ink, sunset gradients, rounded cards, kind icons,
// unread dot, relative time, empty state).
//
// DATA / PLUMBING PRESERVED ───────────────────────────────────────────────────
//   • useNotifications() — the realtime, RLS-scoped feed (supabase channel +
//     mark-as-read). items / unread / loading / markRead / markAllRead all keep
//     their exact contract; the unread badge stays in lock-step.
//   • useAuth() signed-out gate → /sign-in CTA (unchanged behaviour).
//   • iconFor(kind) / timeAgo(iso) helpers preserved verbatim (only the icon set
//     swapped to the ag3 I-names so the screen reads like the rest of 3.0).
//   • Row tap: marks the row read if unread (markRead), and — when the
//     notification carries payload.orderId — deep-links to live tracking
//     (/order/[id]) via expo-router, exactly as before.
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAg3Theme } from '../components/ag3/theme';
import {
  IBack,
  IBell,
  IChevR,
  IReceipt,
  IGift,
  IWallet,
  IMsg,
  ITruck,
  IStar,
  type AgIcon,
} from '../components/ag3/icons';
import { Press, Rise } from '../components/ag3/primitives';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../hooks/useNotifications';

type Theme = ReturnType<typeof useAg3Theme>;

// Per-kind icon + accent. Colours intentionally match the 3.0 palette family.
function iconFor(kind: string): { Icon: AgIcon; color: string } {
  switch (kind) {
    case 'order_status': return { Icon: IReceipt, color: '#FF5722' };
    case 'promo': return { Icon: IGift, color: '#C66B1F' };
    case 'wallet': return { Icon: IWallet, color: '#2FA36B' };
    case 'chat_message': return { Icon: IMsg, color: '#3E86C7' };
    case 'rider_assignment': return { Icon: ITruck, color: '#FF5722' };
    case 'review_request': return { Icon: IStar, color: '#C66B1F' };
    default: return { Icon: IBell, color: '#8C7C6E' };
  }
}

function timeAgo(iso: string, tr: (key: string, opts?: Record<string, unknown>) => string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return tr('notifications.justNow');
  if (s < 3600) return tr('notifications.minutesAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return tr('notifications.hoursAgo', { n: Math.floor(s / 3600) });
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { items, unread, loading, markRead, markAllRead } = useNotifications();

  // ── Signed-out state ──────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header t={t} unread={0} onBack={() => router.back()} onReadAll={markAllRead} />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IBell size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>{tr('notifications.title')}</Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            {tr('notifications.signedOutBody')}
          </Text>
          <Press onPress={() => router.push('/sign-in')} style={{ marginTop: 24 }}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.signInBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{tr('notifications.signIn')}</Text>
            </LinearGradient>
          </Press>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <Header t={t} unread={unread} onBack={() => router.back()} onReadAll={markAllRead} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 44 }}
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.caughtUp}>
            <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
              <IBell size={26} color={t.colors.muted} />
            </View>
            <Text style={[styles.disp, { fontSize: 18, color: t.colors.fg, marginTop: 16 }]}>
              {tr('notifications.emptyTitle')}
            </Text>
            <Text style={{ fontSize: 13, color: t.colors.muted, marginTop: 6, textAlign: 'center' }}>
              {tr('notifications.emptyBody')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            {items.map((n, i) => {
              const { Icon, color } = iconFor(n.kind);
              // Notifications about an order carry payload.orderId — tapping
              // them opens live tracking (and still marks the row as read).
              const orderId = n.payload?.orderId;
              const linkedOrderId =
                typeof orderId === 'string' || typeof orderId === 'number' ? String(orderId) : null;
              const unreadRow = !n.readAt;
              return (
                <Rise key={n.id} delay={Math.min(i, 8) * 36}>
                  <Press
                    scaleTo={0.985}
                    onPress={() => {
                      if (!n.readAt) void markRead(n.id);
                      if (linkedOrderId) {
                        router.push({ pathname: '/order/[id]', params: { id: linkedOrderId } });
                      }
                    }}
                  >
                    <View
                      style={[
                        card(t),
                        styles.notif,
                        unreadRow && {
                          backgroundColor: t.isDark ? 'rgba(255,87,34,0.10)' : '#FFF1EB',
                          borderColor: 'rgba(255,87,34,0.22)',
                        },
                      ]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
                        <Icon size={18} color={color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.titleRow}>
                          <Text
                            style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg, flex: 1 }}
                            numberOfLines={1}
                          >
                            {n.title}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: t.colors.muted, marginLeft: 8 }}>
                            {timeAgo(n.createdAt, tr)}
                          </Text>
                        </View>
                        {n.body ? (
                          <Text style={{ fontSize: 13, color: t.colors.fgSoft, lineHeight: 18, marginTop: 3 }}>
                            {n.body}
                          </Text>
                        ) : null}
                      </View>
                      {unreadRow ? (
                        <View style={[styles.unreadDot, { backgroundColor: t.colors.primary }]} />
                      ) : linkedOrderId ? (
                        <IChevR size={18} color={t.colors.muted} />
                      ) : null}
                    </View>
                  </Press>
                </Rise>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── header ───────────────────────────────────────────────────────────────── */
function Header({
  t,
  unread,
  onBack,
  onReadAll,
}: {
  t: Theme;
  unread: number;
  onBack: () => void;
  onReadAll: () => void;
}) {
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

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.disp, { fontSize: 20, color: t.colors.fg }]}>{tr('notifications.title')}</Text>
        {unread > 0 ? (
          <Text style={{ fontSize: 12, color: t.colors.primary, fontWeight: '700', marginTop: 1 }}>
            {tr('notifications.unreadCount', { n: unread })}
          </Text>
        ) : null}
      </View>

      {unread > 0 ? (
        <Pressable onPress={onReadAll} hitSlop={8}>
          <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>{tr('notifications.readAll')}</Text>
        </Pressable>
      ) : null}
    </MotiView>
  );
}

/* ── shared card base ─────────────────────────────────────────────────────── */
function card(t: Theme) {
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  notif: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 9, height: 9, borderRadius: 999, marginLeft: 4 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  caughtUp: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 90 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  signInBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30 },
});

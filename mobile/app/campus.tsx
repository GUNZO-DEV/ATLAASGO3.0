// AtlaasGo 3.0 — Campus / dorm group-order surface (AUI · Ifrane).
//
// Native re-skin of the AUIER campus courier screen, brought onto the ag3 3.0
// design language (warm terracotta + amber on cream/ink, sunset LinearGradient
// header + tiles, rounded cards, moti Rise/Press, sticky bottom CTA) — matching
// cart.tsx / account.tsx.
//
// DATA / LOGIC PRESERVED ──────────────────────────────────────────────────────
//   • useAuth() gate (authLoading / signed-out CTA → /sign-in).
//   • useCreateOrder().create(...) called with the EXACT same payload: one flat-
//     priced "campus drop" line item (FIXED_PRICE_DH), building + room folded
//     into the landmark, DELIVERY_FEE_DH courier fee, AUI_COORDS, isCampus flag.
//   • canSubmit validation (what >= 3 chars && building chosen && !submitting).
//   • Submitted success state + redirectTimer → router.replace(`/order/${id}`).
//   • AUI_BUILDINGS catalogue, QUICK_PICKS, fixed pricing constants — unchanged.
// Only the presentation changed. Campus-only framing (the AUIER badge / "free
// campus delivery" line) is gated on city.campus, resolved via agApi.cities.get
// the same way cart.tsx does (no CityProvider is mounted at the root).
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAg3Theme, type Ag3Theme } from '../components/ag3/theme';
import {
  IBack,
  IBolt,
  ICheck,
  IChevD,
  IPin,
  ISearch,
  IClock,
} from '../components/ag3/icons';
import { Press, Rise, BottomSheet } from '../components/ag3/primitives';
import { useAuth } from '../lib/auth';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { agApi } from '../lib/ag3/agApi';
import { useAsync } from '../lib/ag3/useAsync';

// AUI building list — copied from the web Campus page (src/pages/Campus.tsx).
const AUI_BUILDINGS: Record<string, string[]> = {
  'Residence Halls': [
    "Building 1 — Men's Dorm",
    "Building 2 — Men's Dorm",
    "Building 3 — Men's Dorm",
    "Building 4 — Men's Dorm",
    "Building 5 — Men's Dorm",
    "Building 6 — Men's Dorm",
    "Building 7 — Men's Dorm",
    "Building 8 — Men's Dorm",
    "Building 9 — Women's Dorm",
    "Building 10 — Women's Dorm",
    "Building 11 — Women's Dorm",
    "Building 12 — Women's Dorm",
    "Building 13 — Women's Dorm",
    "Building 14 — Women's Dorm",
    "Building 15 — Women's Dorm",
    'Building 16 — Mixed Dorm',
    'Building 17 — Graduate Housing',
    'Building 18 — Graduate Housing',
    'Building 19 — Faculty Housing',
    'Building 20 — Faculty Housing',
    'Atlas Residence',
    'International Student House',
  ],
  'Academic Buildings': [
    'Main Academic Building (MAB)',
    'Engineering & Sciences (ESB)',
    'School of Business (SBA)',
    'Library — Old Wing',
    'Library — New Wing',
    'Student Center',
    'Amphitheater',
  ],
  Facilities: [
    'AUI Cafeteria (Main)',
    'Sports Complex',
    'Health Center',
    'Admin Building',
    'Gate / Security Post',
    'Parking Area A',
    'Parking Area B',
  ],
};

// Map the AUI_BUILDINGS group keys (kept in English so they double as React keys
// and match the web data shape) to their i18n labels.
const BUILDING_GROUP_KEYS: Record<string, string> = {
  'Residence Halls': 'campus.groupResidence',
  'Academic Buildings': 'campus.groupAcademic',
  Facilities: 'campus.groupFacilities',
};

const QUICK_PICKS = [
  'Café Hassan tagine',
  'Boulangerie croissant',
  'Snack Atlas brochettes',
  'Bab Mansour café',
  'Cold medicine',
  'Groceries from souk',
];

// Same pricing as the web Campus page: flat 15 dh item + 20 dh courier fee.
const FIXED_PRICE_DH = 15;
const DELIVERY_FEE_DH = 20;
const AUI_COORDS = { lat: 33.535, lng: -5.1106 }; // AUI default

// The campus courier is AUI / Ifrane-centric — gate the campus framing on the
// city flag, resolved directly from agApi (CityProvider isn't mounted at root).
const CITY_ID = 'ifrane';

export default function CampusScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { create, submitting, error } = useCreateOrder();

  // ── city (campus gating) — same source as cart.tsx ──
  const { data: city } = useAsync(() => agApi.cities.get(CITY_ID), []);
  const isCampus = city ? !!city.campus : true; // default to campus framing for AUI

  const [what, setWhat] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const canSubmit = what.trim().length >= 3 && !!building && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    // Built exactly like the web Campus page (src/pages/Campus.tsx): one
    // flat-priced "campus drop" line item, building+room in the landmark,
    // 20 dh courier fee, is_campus flag on the row.
    const orderId = await create({
      customerId: user.id,
      coords: AUI_COORDS,
      landmark: `${building}${room.trim() ? `, Room/Suite ${room.trim()}` : ''}`,
      items: [
        {
          id: `campus-${Date.now()}`,
          restaurantId: 'aui-cafeteria',
          restaurantName: 'AUIER Campus Drop',
          name: what.trim(),
          priceDh: FIXED_PRICE_DH,
          qty: 1,
        },
      ],
      subtotalDh: FIXED_PRICE_DH,
      deliveryFeeDh: DELIVERY_FEE_DH,
      serviceFeeDh: 0,
      totalDh: FIXED_PRICE_DH + DELIVERY_FEE_DH,
      deliveryNotes: notes.trim() || undefined,
      isCampus: true,
    });
    if (orderId) {
      setSubmitted(true);
      redirectTimer.current = setTimeout(() => router.replace(`/order/${orderId}`), 1200);
    }
  }

  // ── shared header (sunset eyebrow + back) ──
  const header = (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      style={styles.header}
    >
      <Press onPress={() => router.back()} scaleTo={0.9}>
        <View style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }]}>
          <IBack size={20} color={t.colors.fg} />
        </View>
      </Press>
      <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{tr('campus.eyebrow')}</Text>
      <View style={{ width: 42 }} />
    </MotiView>
  );

  // ── auth loading ──
  if (authLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── signed-out CTA ──
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        {header}
        <View style={[styles.center, { padding: 32 }]}>
          <LinearGradient
            colors={t.gradients.sunset}
            start={t.gradients.start}
            end={t.gradients.end}
            style={[styles.bigTile, t.shadows.glow]}
          >
            <Text style={{ fontSize: 34 }}>🎓</Text>
          </LinearGradient>
          <Text style={[styles.disp, { fontSize: 22, color: t.colors.fg, marginTop: 18 }]}>
            {tr('campus.gateTitle')}
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            {tr('campus.gateBody')}
          </Text>
          <Press onPress={() => router.push('/sign-in')} style={{ marginTop: 24 }}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.signInBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{tr('campus.signIn')}</Text>
            </LinearGradient>
          </Press>
        </View>
      </SafeAreaView>
    );
  }

  // ── submitted success ──
  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        {header}
        <View style={[styles.center, { padding: 32 }]}>
          <MotiView
            from={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 13, stiffness: 180 }}
          >
            <View style={[styles.okBubble, { backgroundColor: 'rgba(47,163,107,0.14)' }]}>
              <ICheck size={32} color={t.colors.ok} strokeWidth={3} />
            </View>
          </MotiView>
          <Text style={[styles.disp, { fontSize: 26, color: t.colors.fg, marginTop: 20 }]}>{tr('campus.successTitle')}</Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8 }}>
            {tr('campus.successHeadingTo')} <Text style={{ fontWeight: '800', color: t.colors.fg }}>{building}</Text>
            {room.trim() ? `, ${tr('campus.room')} ${room.trim()}` : ''}.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 }}>
            <ActivityIndicator size="small" color={t.colors.muted} />
            <Text style={{ fontSize: 13, color: t.colors.muted }}>{tr('campus.redirecting')}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const ctaLabel = !building
    ? tr('campus.ctaSelectBuilding')
    : what.trim().length < 3
      ? tr('campus.ctaDescribe')
      : tr('campus.ctaRequest', { price: FIXED_PRICE_DH });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      {header}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 168 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── hero ── */}
        <Rise>
          {isCampus && (
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,87,34,0.10)' }]}>
              <IBolt size={12} color={t.colors.primary} />
              <Text style={[styles.heroBadgeTxt, { color: t.colors.primary }]}>
                {tr('campus.heroBadge')}
              </Text>
            </View>
          )}
          <Text style={[styles.hero, { color: t.colors.fg }]}>
            {tr('campus.heroLine1')}{'\n'}
            <Text style={{ color: t.colors.primary }}>{tr('campus.heroLine2')}</Text>
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: t.colors.muted, lineHeight: 20 }}>
            {tr('campus.heroSubtitle', { price: FIXED_PRICE_DH })}
          </Text>
        </Rise>

        {/* ── form card ── */}
        <Rise delay={60}>
          <View style={[card(t), { padding: 18, marginTop: 22 }]}>
            {/* what do you need */}
            <View style={styles.labelRow}>
              <ISearch size={13} color={t.colors.muted} />
              <Text style={[styles.fieldLabel, { color: t.colors.muted }]}>{tr('campus.whatLabel')}</Text>
            </View>
            <TextInput
              value={what}
              onChangeText={setWhat}
              multiline
              numberOfLines={3}
              placeholder={tr('campus.whatPlaceholder')}
              placeholderTextColor={t.colors.muted}
              style={[
                styles.input,
                { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg, minHeight: 86, textAlignVertical: 'top', paddingTop: 12 },
              ]}
            />
            <View style={styles.chipWrap}>
              {QUICK_PICKS.map((s) => {
                const active = what === s;
                return (
                  <Press key={s} onPress={() => setWhat(s)} scaleTo={0.95}>
                    <View
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: active ? 'rgba(255,87,34,0.10)' : t.colors.surface2,
                          borderColor: active ? t.colors.primary : t.colors.line,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? t.colors.primary : t.colors.fgSoft }}>
                        {s}
                      </Text>
                    </View>
                  </Press>
                );
              })}
            </View>

            {/* building selector */}
            <View style={[styles.labelRow, { marginTop: 18 }]}>
              <IPin size={13} color={t.colors.muted} />
              <Text style={[styles.fieldLabel, { color: t.colors.muted }]}>{tr('campus.buildingLabel')}</Text>
            </View>
            <Press onPress={() => setPickerOpen(true)} scaleTo={0.985}>
              <View
                style={[
                  styles.selectRow,
                  { backgroundColor: t.colors.surface2, borderColor: building ? t.colors.primary : t.colors.line },
                ]}
              >
                <Text
                  style={{ flex: 1, fontSize: 15, fontWeight: building ? '700' : '400', color: building ? t.colors.fg : t.colors.muted }}
                  numberOfLines={1}
                >
                  {building || tr('campus.buildingPlaceholder')}
                </Text>
                <IChevD size={16} color={t.colors.muted} />
              </View>
            </Press>

            {/* room number */}
            <View style={[styles.labelRow, { marginTop: 18 }]}>
              <IPin size={13} color={t.colors.muted} />
              <Text style={[styles.fieldLabel, { color: t.colors.muted }]}>{tr('campus.roomLabel')}</Text>
            </View>
            <TextInput
              value={room}
              onChangeText={setRoom}
              placeholder={tr('campus.roomPlaceholder')}
              placeholderTextColor={t.colors.muted}
              style={[styles.input, { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg }]}
            />

            {/* rider notes */}
            <View style={[styles.labelRow, { marginTop: 18 }]}>
              <Text style={[styles.fieldLabel, { color: t.colors.muted, marginLeft: 0 }]}>
                {tr('campus.notesLabel')}
              </Text>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={tr('campus.notesPlaceholder')}
              placeholderTextColor={t.colors.muted}
              style={[styles.input, { backgroundColor: t.colors.surface2, borderColor: t.colors.line, color: t.colors.fg }]}
            />

            {/* fixed price strip */}
            <View style={[styles.priceStrip, { backgroundColor: 'rgba(255,87,34,0.08)', borderColor: 'rgba(255,87,34,0.18)' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: t.colors.fg }}>{tr('campus.priceTitle')}</Text>
                <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 1 }}>{tr('campus.priceSubtitle')}</Text>
              </View>
              <Text style={[styles.disp, { fontSize: 22, color: t.colors.primary, fontVariant: ['tabular-nums'] }]}>
                {tr('campus.priceValue', { price: FIXED_PRICE_DH })}
              </Text>
            </View>

            {error && (
              <Text style={{ fontSize: 13, marginTop: 12, color: '#E0526D' }}>{error.message}</Text>
            )}
          </View>
        </Rise>

        {/* ── how it works ── */}
        <Rise delay={120}>
          <View style={styles.stepsRow}>
            {[tr('campus.step1'), tr('campus.step2'), tr('campus.step3')].map((step, i) => (
              <View key={step} style={styles.stepItem}>
                <View style={[styles.stepNum, { backgroundColor: 'rgba(255,87,34,0.10)' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: t.colors.primary }}>{i + 1}</Text>
                </View>
                <Text style={{ marginLeft: 7, fontSize: 11, fontWeight: '600', color: t.colors.muted, flex: 1 }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </Rise>
      </ScrollView>

      {/* ── sticky request CTA ── */}
      <View style={[styles.sticky, { backgroundColor: t.colors.bg, borderColor: t.colors.line }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', marginBottom: 9 }}>
          <IClock size={14} color={t.colors.muted} />
          <Text style={{ fontSize: 12, color: t.colors.muted }}>
            {tr('campus.etaPrefix')} <Text style={{ fontWeight: '800', color: t.colors.fg }}>{tr('campus.etaWindow')}</Text> {tr('campus.etaSuffix')}
          </Text>
        </View>
        <Press onPress={handleSubmit} disabled={!canSubmit}>
          <LinearGradient
            colors={t.gradients.sunset}
            start={t.gradients.start}
            end={t.gradients.end}
            style={[styles.placeBtn, t.shadows.glow, { opacity: canSubmit ? 1 : 0.45 }]}
          >
            {submitting ? (
              <ActivityIndicator color={t.colors.onPrimary} />
            ) : (
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15.5 }}>{ctaLabel}</Text>
            )}
          </LinearGradient>
        </Press>
      </View>

      {/* ── building picker (3.0 BottomSheet) ── */}
      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title={tr('campus.buildingLabel')}>
        {Object.entries(AUI_BUILDINGS).map(([group, buildings]) => (
          <View key={group} style={{ marginBottom: 16 }}>
            <Text style={[styles.eyebrow, { color: t.colors.muted, marginBottom: 8 }]}>
              {tr(BUILDING_GROUP_KEYS[group] ?? '', { defaultValue: group })}
            </Text>
            <View style={{ gap: 8 }}>
              {buildings.map((b) => {
                const active = building === b;
                return (
                  <Press
                    key={b}
                    onPress={() => {
                      setBuilding(b);
                      setPickerOpen(false);
                    }}
                    scaleTo={0.98}
                  >
                    <View
                      style={[
                        styles.pickRow,
                        {
                          backgroundColor: active ? 'rgba(255,87,34,0.08)' : t.colors.surface,
                          borderColor: active ? t.colors.primary : t.colors.line,
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                    >
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: active ? '700' : '500', color: active ? t.colors.primary : t.colors.fg }}>
                        {b}
                      </Text>
                      {active && <ICheck size={16} color={t.colors.primary} strokeWidth={3} />}
                    </View>
                  </Press>
                );
              })}
            </View>
          </View>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

/* ── shared card base ─────────────────────────────────────────────────────── */
function card(t: Ag3Theme) {
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
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigTile: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  okBubble: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  signInBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 18,
  },
  heroBadgeTxt: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '800' },
  hero: { marginTop: 12, fontWeight: '900', fontSize: 34, letterSpacing: -1, lineHeight: 38 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', fontWeight: '700' },
  input: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  quickChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },

  selectRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },

  priceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginTop: 18,
  },

  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 2 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepNum: { width: 24, height: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1 },
  placeBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },

  pickRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 13 },
});

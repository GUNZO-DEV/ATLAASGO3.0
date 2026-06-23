// AtlaasGo ADMIN — shared UI primitives, built ON the ag3 customer design system.
//
// Reuses ag3's theme (useAg3Theme), motion (Press, Rise), sheet (BottomSheet) and
// tokens (radii/shadows/gradients) — NOTHING is re-derived. Admin-only extras
// (coral primary, status hues, ink hero gradient, card base) live in ./tokens.
//
// ACTION COMPONENTS expose onPress/onSubmit/onChange/onChangeText props ONLY — they
// hold no data and own no fetching. Phase-2 data agents bind hooks to these props.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useAg3Theme, gradients } from '../ag3/theme';
import { Press, Rise, BottomSheet } from '../ag3/primitives';
import {
  admCard,
  admStatus,
  admVertical,
  fmtDh,
  inkGradient,
  ADM,
  type AdmStatus,
  type AdmVertical,
} from './tokens';
import {
  ATrendUp,
  ATrendDown,
  AChevR,
  ACheck,
  AClose,
  APlus,
  AActivity,
  type AdmIcon,
} from './icons';

/* ════════════════════════════════════════════════════════════════════════════
   StatCard — KPI tile (label, big value, optional WoW delta + icon)
   ════════════════════════════════════════════════════════════════════════════ */
export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  deltaPct,
  accent,
  style,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: AdmIcon;
  /** week-over-week % (positive = up). Omit to hide the delta row. */
  deltaPct?: number;
  /** override the icon tint (defaults to coral). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const tint = accent ?? t.colors.primary;
  const hasDelta = typeof deltaPct === 'number' && Number.isFinite(deltaPct);
  const up = (deltaPct ?? 0) >= 0;
  const DeltaIcon = up ? ATrendUp : ATrendDown;
  const deltaColor = up ? t.colors.ok : t.isDark ? ADM.redDark : ADM.red;
  return (
    <View style={[admCard(t), styles.statCard, style]}>
      <View style={styles.statTop}>
        <Text style={[styles.statLabel, { color: t.colors.muted }]} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? (
          <View style={[styles.statIcon, { backgroundColor: tint + '1F' }]}>
            <Icon size={15} color={tint} />
          </View>
        ) : null}
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: t.colors.fg }]} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={[styles.statUnit, { color: t.colors.muted }]}>{unit}</Text> : null}
      </View>
      {hasDelta ? (
        <View style={styles.statDelta}>
          <DeltaIcon size={13} color={deltaColor} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: deltaColor }}>
            {up ? '+' : ''}
            {Math.round((deltaPct ?? 0) * 10) / 10}%
          </Text>
          <Text style={{ fontSize: 11.5, color: t.colors.muted }}>vs last week</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   StatusPill — live / pending / paused / off
   ════════════════════════════════════════════════════════════════════════════ */
export function StatusPill({
  status,
  label,
  dot = true,
}: {
  status: AdmStatus;
  /** override the default label (Live/Pending/Paused/Off). */
  label?: string;
  dot?: boolean;
}) {
  const t = useAg3Theme();
  const s = admStatus(t, status);
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      {dot ? <View style={[styles.pillDot, { backgroundColor: s.fg }]} /> : null}
      <Text style={[styles.pillTxt, { color: s.fg }]}>{label ?? s.label}</Text>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   VerticalTag — food / grocery / pharmacy
   ════════════════════════════════════════════════════════════════════════════ */
export function VerticalTag({ vertical, emoji = true }: { vertical: AdmVertical; emoji?: boolean }) {
  const t = useAg3Theme();
  const v = admVertical(t, vertical);
  return (
    <View style={[styles.vtag, { backgroundColor: v.bg }]}>
      {emoji ? <Text style={{ fontSize: 11.5 }}>{v.emoji}</Text> : null}
      <Text style={[styles.vtagTxt, { color: v.fg }]}>{v.label}</Text>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Field / TextField / MoneyField — labeled inputs (controlled via onChangeText)
   ════════════════════════════════════════════════════════════════════════════ */
export function Field({
  label,
  hint,
  error,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={[styles.fieldLabel, { color: t.colors.fgSoft }]}>{label}</Text> : null}
      {children}
      {error ? (
        <Text style={[styles.fieldHint, { color: t.isDark ? ADM.redDark : ADM.red }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.fieldHint, { color: t.colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  hint,
  error,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  icon: Icon,
  style,
}: {
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  icon?: AdmIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} style={style}>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: t.colors.surface2,
            borderColor: error
              ? t.isDark
                ? ADM.redDark
                : ADM.red
              : focused
                ? t.colors.primary
                : t.colors.line,
          },
          multiline && { minHeight: 92, alignItems: 'flex-start', paddingVertical: 12 },
        ]}
      >
        {Icon ? <Icon size={17} color={focused ? t.colors.primary : t.colors.muted} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: t.colors.fg }, multiline && { height: 72, textAlignVertical: 'top' }]}
        />
      </View>
    </Field>
  );
}

export function MoneyField({
  label,
  hint,
  error,
  value,
  onChangeText,
  placeholder = '0',
  style,
}: {
  label?: string;
  hint?: string;
  error?: string;
  /** raw numeric string the parent owns (e.g. "15"). */
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const [focused, setFocused] = useState(false);
  // Strip to digits + single dot — keeps the field numeric without owning state.
  const handle = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    onChangeText?.(cleaned);
  };
  return (
    <Field label={label} hint={hint} error={error} style={style}>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: t.colors.surface2,
            borderColor: error
              ? t.isDark
                ? ADM.redDark
                : ADM.red
              : focused
                ? t.colors.primary
                : t.colors.line,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={handle}
          placeholder={placeholder}
          placeholderTextColor={t.colors.muted}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, styles.moneyInput, { color: t.colors.fg }]}
        />
        <Text style={[styles.moneyUnit, { color: t.colors.muted }]}>dh</Text>
      </View>
    </Field>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ListRow — generic admin list row (leading icon/emoji, title, sub, trailing)
   ════════════════════════════════════════════════════════════════════════════ */
export function ListRow({
  title,
  subtitle,
  emoji,
  icon: Icon,
  trailing,
  right,
  onPress,
  showChevron,
  style,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  icon?: AdmIcon;
  /** right-aligned content (pill, price, switch…). */
  trailing?: ReactNode;
  /** secondary right line under trailing (rarely used). */
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const body = (
    <View style={[admCard(t), styles.listRow, style]}>
      {emoji || Icon ? (
        <View style={[styles.listLeading, { backgroundColor: t.colors.surface2, borderColor: t.colors.line2 }]}>
          {emoji ? <Text style={{ fontSize: 20 }}>{emoji}</Text> : Icon ? <Icon size={18} color={t.colors.fgSoft} /> : null}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.listTitle, { color: t.colors.fg }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.listTrailing}>{trailing}</View> : null}
      {right ? <View>{right}</View> : null}
      {showChevron ? <AChevR size={18} color={t.colors.muted} /> : null}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} style={{ width: '100%' }}>
      {body}
    </Press>
  ) : (
    body
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SegTabs — segmented control (e.g. Drivers | Merchants)
   ════════════════════════════════════════════════════════════════════════════ */
export function SegTabs<T extends string>({
  tabs,
  value,
  onChange,
  style,
}: {
  tabs: { key: T; label: string; badge?: number }[];
  value: T;
  onChange?: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  return (
    <View style={[styles.seg, { backgroundColor: t.colors.surface2, borderColor: t.colors.line2 }, style]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange?.(tab.key)}
            style={[styles.segItem, active && { backgroundColor: t.colors.surface, ...t.shadows.card }]}
          >
            <Text style={{ fontSize: 13.5, fontWeight: active ? '800' : '600', color: active ? t.colors.fg : t.colors.muted }}>
              {tab.label}
            </Text>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <View style={[styles.segBadge, { backgroundColor: t.colors.primary }]}>
                <Text style={styles.segBadgeTxt}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   AdmNav — bottom nav: Overview / Approvals / Merchants / Cities / More
   ════════════════════════════════════════════════════════════════════════════ */
export type AdmTabKey = 'overview' | 'approvals' | 'merchants' | 'cities' | 'more';

export interface AdmNavTab {
  key: AdmTabKey;
  label: string;
  icon: AdmIcon;
}

export function AdmNav({
  tabs,
  active,
  onSelect,
  pendingBadge = 0,
}: {
  tabs: AdmNavTab[];
  active: AdmTabKey;
  onSelect?: (key: AdmTabKey) => void;
  /** count shown on the Approvals tab. */
  pendingBadge?: number;
}) {
  const t = useAg3Theme();
  return (
    <View style={[styles.nav, { backgroundColor: t.colors.surface, borderTopColor: t.colors.line }, t.shadows.lift]}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        const Icon = tab.icon;
        const showBadge = tab.key === 'approvals' && pendingBadge > 0;
        return (
          <Pressable key={tab.key} onPress={() => onSelect?.(tab.key)} style={styles.navItem} hitSlop={6}>
            <View>
              <Icon size={22} color={on ? t.colors.primary : t.colors.muted} strokeWidth={on ? 2.4 : 2} />
              {showBadge ? (
                <View style={[styles.navBadge, { backgroundColor: t.colors.primary, borderColor: t.colors.surface }]}>
                  <Text style={styles.navBadgeTxt}>{pendingBadge > 99 ? '99+' : pendingBadge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 10.5, fontWeight: on ? '800' : '600', color: on ? t.colors.primary : t.colors.muted }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LiveOpsCard — ink hero with a pulsing live dot + 3 inline stats
   ════════════════════════════════════════════════════════════════════════════ */
export function LiveOpsCard({
  title = 'Live operations',
  stats,
  online = true,
  style,
}: {
  title?: string;
  /** exactly 3 stats render best; more wrap. */
  stats: { label: string; value: string | number }[];
  online?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const onInk = '#F6EFE7';
  const onInkSoft = 'rgba(246,239,231,0.62)';
  return (
    <View style={[styles.liveOps, style]}>
      <LinearGradient colors={inkGradient} start={gradients.start} end={gradients.end} style={StyleSheet.absoluteFill} />
      <View style={styles.liveOpsHead}>
        <View style={styles.liveOpsDotRow}>
          <PulseDot color={online ? '#43D17A' : '#8C7C6E'} on={online} />
          <Text style={[styles.liveOpsTitle, { color: onInk }]}>{title}</Text>
        </View>
        <View style={[styles.liveOpsState, { backgroundColor: online ? 'rgba(67,209,122,0.16)' : 'rgba(140,124,110,0.16)' }]}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: online ? '#43D17A' : '#C8B9AA' }}>
            {online ? 'ALL SYSTEMS' : 'DEGRADED'}
          </Text>
        </View>
      </View>
      <View style={styles.liveOpsStats}>
        {stats.map((s, i) => (
          <View key={`${s.label}-${i}`} style={styles.liveOpsStat}>
            <Text style={[styles.liveOpsVal, { color: onInk }]} numberOfLines={1}>
              {s.value}
            </Text>
            <Text style={[styles.liveOpsLbl, { color: onInkSoft }]} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* pulsing dot — Animated loop (RN Animated, no extra deps) */
function PulseDot({ color, on }: { color: string; on: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, pulse]);
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={styles.pulseWrap}>
      {on ? (
        <Animated.View
          style={[styles.pulseHalo, { backgroundColor: color, transform: [{ scale: haloScale }], opacity: haloOpacity }]}
        />
      ) : null}
      <View style={[styles.pulseCore, { backgroundColor: color }]} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ActivityRow — recent-activity feed item (icon, text, relative time)
   ════════════════════════════════════════════════════════════════════════════ */
export function ActivityRow({
  text,
  when,
  icon: Icon = AActivity,
  accent,
  last,
}: {
  text: string;
  when: string;
  icon?: AdmIcon;
  accent?: string;
  /** hide the connector line below the last item. */
  last?: boolean;
}) {
  const t = useAg3Theme();
  const tint = accent ?? t.colors.primary;
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityRail}>
        <View style={[styles.activityIcon, { backgroundColor: tint + '1F' }]}>
          <Icon size={14} color={tint} />
        </View>
        {!last ? <View style={[styles.activityLine, { backgroundColor: t.colors.line }]} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 16, gap: 2 }}>
        <Text style={{ fontSize: 13.5, color: t.colors.fg, lineHeight: 18 }}>{text}</Text>
        <Text style={{ fontSize: 11.5, color: t.colors.muted }}>{when}</Text>
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FeeRow — one editable city-fee line (label + MoneyField), onChange(text)
   ════════════════════════════════════════════════════════════════════════════ */
export function FeeRow({
  label,
  hint,
  value,
  onChangeText,
  style,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  return (
    <View style={[styles.feeRow, { borderBottomColor: t.colors.line2 }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.fg }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 1 }}>{hint}</Text> : null}
      </View>
      <View style={styles.feeRowInput}>
        <MoneyField value={value} onChangeText={onChangeText} />
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PayoutBar — one payout row: who, amount, status pill + Pay action
   ════════════════════════════════════════════════════════════════════════════ */
export function PayoutBar({
  name,
  meta,
  amountDh,
  status,
  emoji,
  icon: Icon,
  onPay,
  paying,
  style,
}: {
  name: string;
  /** e.g. "42 orders · Jun 1–15". */
  meta?: string;
  amountDh: number;
  /** maps onto pending/processing/paid/failed → pill bucket. */
  status: 'pending' | 'processing' | 'paid' | 'failed';
  emoji?: string;
  icon?: AdmIcon;
  /** fire the process_payout advance; parent owns the call. */
  onPay?: () => void;
  paying?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const pillStatus: AdmStatus =
    status === 'paid' ? 'live' : status === 'failed' ? 'off' : 'pending';
  const pillLabel = status[0].toUpperCase() + status.slice(1);
  const canPay = status === 'pending' || status === 'processing';
  return (
    <View style={[admCard(t), styles.payout, style]}>
      <View style={[styles.listLeading, { backgroundColor: t.colors.surface2, borderColor: t.colors.line2 }]}>
        {emoji ? <Text style={{ fontSize: 20 }}>{emoji}</Text> : Icon ? <Icon size={18} color={t.colors.fgSoft} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={[styles.listTitle, { color: t.colors.fg }]} numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text style={{ fontSize: 12, color: t.colors.muted }} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <StatusPill status={pillStatus} label={pillLabel} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Text style={[styles.payoutAmt, { color: t.colors.fg }]}>
          {fmtDh(amountDh)}
          <Text style={{ fontSize: 12, fontWeight: '600', color: t.colors.muted }}> dh</Text>
        </Text>
        {canPay ? (
          <Press onPress={onPay} scaleTo={0.94} disabled={paying}>
            <View style={[styles.payBtn, { backgroundColor: t.colors.primary, opacity: paying ? 0.6 : 1 }, t.shadows.glow]}>
              <Text style={styles.payBtnTxt}>{paying ? '…' : status === 'processing' ? 'Mark paid' : 'Pay'}</Text>
            </View>
          </Press>
        ) : null}
      </View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PromoCard — promotion with a budget spent/total bar
   ════════════════════════════════════════════════════════════════════════════ */
export function PromoCard({
  name,
  code,
  detail,
  active,
  spentDh,
  budgetDh,
  onToggle,
  onPress,
  style,
}: {
  name: string;
  code: string;
  /** e.g. "20% off · min 80 dh". */
  detail?: string;
  active: boolean;
  spentDh: number;
  budgetDh: number;
  /** flip is_active; parent owns the write. */
  onToggle?: (next: boolean) => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const pct = budgetDh > 0 ? Math.min(1, Math.max(0, spentDh / budgetDh)) : 0;
  const over = budgetDh > 0 && spentDh >= budgetDh;
  const barColor = over ? (t.isDark ? ADM.redDark : ADM.red) : t.colors.primary;
  const body = (
    <View style={[admCard(t), styles.promo, style]}>
      <View style={styles.promoHead}>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={styles.promoTitleRow}>
            <Text style={[styles.listTitle, { color: t.colors.fg }]} numberOfLines={1}>
              {name}
            </Text>
            <StatusPill status={active ? 'live' : 'paused'} label={active ? 'Active' : 'Off'} />
          </View>
          {detail ? (
            <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        <View style={[styles.promoCode, { backgroundColor: t.colors.surface2, borderColor: t.colors.line2 }]}>
          <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: t.colors.fgSoft }}>{code}</Text>
        </View>
      </View>
      {budgetDh > 0 ? (
        <View style={{ gap: 6, marginTop: 12 }}>
          <View style={[styles.promoTrack, { backgroundColor: t.colors.line2 }]}>
            <View style={[styles.promoFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
          </View>
          <View style={styles.promoBudgetRow}>
            <Text style={{ fontSize: 11.5, color: t.colors.muted }}>
              {fmtDh(spentDh)} / {fmtDh(budgetDh)} dh
            </Text>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: over ? barColor : t.colors.fgSoft }}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
        </View>
      ) : null}
      {onToggle ? (
        <View style={{ marginTop: 12 }}>
          <Press onPress={() => onToggle(!active)} scaleTo={0.96}>
            <View
              style={[
                styles.promoToggle,
                {
                  backgroundColor: active ? 'transparent' : t.colors.primary,
                  borderColor: active ? t.colors.line : t.colors.primary,
                },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? t.colors.fgSoft : t.colors.onPrimary }}>
                {active ? 'Pause promo' : 'Activate'}
              </Text>
            </View>
          </Press>
        </View>
      ) : null}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} style={{ width: '100%' }}>
      {body}
    </Press>
  ) : (
    body
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Toast — transient confirmation (auto-dismiss via onDone)
   ════════════════════════════════════════════════════════════════════════════ */
export function Toast({
  message,
  visible,
  variant = 'ok',
  onDone,
  duration = 2400,
}: {
  message: string;
  visible: boolean;
  variant?: 'ok' | 'error' | 'info';
  /** called when the auto-dismiss timer elapses; parent flips `visible`. */
  onDone?: () => void;
  duration?: number;
}) {
  const t = useAg3Theme();
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(id);
  }, [visible, duration, onDone]);
  if (!visible) return null;
  const tint =
    variant === 'error' ? (t.isDark ? ADM.redDark : ADM.red) : variant === 'info' ? t.colors.snow : t.colors.ok;
  return (
    <View pointerEvents="box-none" style={styles.toastAnchor}>
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220 }}
        style={[styles.toast, { backgroundColor: t.colors.fg }, t.shadows.lift]}
      >
        <View style={[styles.toastDot, { backgroundColor: tint }]} />
        <Text style={[styles.toastTxt, { color: t.colors.bg }]} numberOfLines={2}>
          {message}
        </Text>
      </MotiView>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Fab — floating action button (coral, glow)
   ════════════════════════════════════════════════════════════════════════════ */
export function Fab({
  onPress,
  icon: Icon = APlus,
  label,
  style,
}: {
  onPress?: () => void;
  icon?: AdmIcon;
  /** optional text → extended FAB. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  return (
    <Press onPress={onPress} scaleTo={0.92} style={[styles.fabWrap, style]}>
      <LinearGradient
        colors={[t.colors.primary, t.colors.primary2]}
        start={gradients.start}
        end={gradients.end}
        style={[label ? styles.fabExtended : styles.fab, t.shadows.glow]}
      >
        <Icon size={24} color="#fff" strokeWidth={2.4} />
        {label ? <Text style={styles.fabLabel}>{label}</Text> : null}
      </LinearGradient>
    </Press>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ApproveRejectButtons — paired approve / reject actions
   ════════════════════════════════════════════════════════════════════════════ */
export function ApproveRejectButtons({
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  busy,
  style,
}: {
  onApprove?: () => void;
  onReject?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useAg3Theme();
  const red = t.isDark ? ADM.redDark : ADM.red;
  return (
    <View style={[styles.arRow, style]}>
      <Press onPress={onReject} scaleTo={0.95} disabled={busy} style={{ flex: 1 }}>
        <View style={[styles.arBtn, { backgroundColor: red + '14', borderColor: red + '33' }]}>
          <AClose size={17} color={red} strokeWidth={2.4} />
          <Text style={[styles.arTxt, { color: red }]}>{rejectLabel}</Text>
        </View>
      </Press>
      <Press onPress={onApprove} scaleTo={0.95} disabled={busy} style={{ flex: 1.4 }}>
        <View style={[styles.arBtn, { backgroundColor: t.colors.ok, borderColor: t.colors.ok }, t.shadows.card]}>
          <ACheck size={17} color="#fff" strokeWidth={2.6} />
          <Text style={[styles.arTxt, { color: '#fff' }]}>{busy ? 'Saving…' : approveLabel}</Text>
        </View>
      </Press>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   AddSheet — BottomSheet (ag3) wrapper with a sticky primary submit footer
   ════════════════════════════════════════════════════════════════════════════ */
export function AddSheet({
  visible,
  onClose,
  title,
  children,
  submitLabel = 'Save',
  onSubmit,
  submitDisabled,
  submitting,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  submitLabel?: string;
  /** parent owns the create/update write. */
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitting?: boolean;
  height?: number | `${number}%`;
}) {
  const t = useAg3Theme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} height={height}>
      <View style={{ gap: 14 }}>{children}</View>
      <View style={{ marginTop: 18 }}>
        <Press onPress={onSubmit} scaleTo={0.97} disabled={submitDisabled || submitting}>
          <View
            style={[
              styles.submitBtn,
              { backgroundColor: t.colors.primary, opacity: submitDisabled ? 0.5 : 1 },
              t.shadows.glow,
            ]}
          >
            <Text style={styles.submitTxt}>{submitting ? 'Saving…' : submitLabel}</Text>
          </View>
        </Press>
      </View>
    </BottomSheet>
  );
}

/* re-export the ag3 motion helpers so admin screens can import everything from
   one place without reaching back into ag3 directly. */
export { Press, Rise } from '../ag3/primitives';

/* ════════════════════════════════════════════════════════════════════════════
   styles
   ════════════════════════════════════════════════════════════════════════════ */
const disp: TextStyle = { fontWeight: '800', letterSpacing: -0.3 };

const styles = StyleSheet.create({
  /* StatCard */
  statCard: { flex: 1, padding: 14, gap: 8, minWidth: 0 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  statIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { ...disp, fontSize: 26, fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 13, fontWeight: '700' },
  statDelta: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  /* StatusPill */
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillDot: { width: 6, height: 6, borderRadius: 999 },
  pillTxt: { fontSize: 11.5, fontWeight: '700' },

  /* VerticalTag */
  vtag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  vtagTxt: { fontSize: 11, fontWeight: '700' },

  /* Field / inputs */
  field: { gap: 7 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700' },
  fieldHint: { fontSize: 11.5, fontWeight: '500' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', padding: 0 },
  moneyInput: { fontVariant: ['tabular-nums'], textAlign: 'left' },
  moneyUnit: { fontSize: 14, fontWeight: '700' },

  /* ListRow */
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  listLeading: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  listTrailing: { alignItems: 'flex-end', justifyContent: 'center' },

  /* SegTabs */
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, borderWidth: 1 },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12 },
  segBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segBadgeTxt: { fontSize: 10.5, fontWeight: '800', color: '#fff' },

  /* AdmNav */
  nav: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 24, paddingHorizontal: 8, borderTopWidth: 1 },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navBadge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeTxt: { fontSize: 9.5, fontWeight: '800', color: '#fff' },

  /* LiveOpsCard */
  liveOps: { borderRadius: 26, overflow: 'hidden', padding: 18 },
  liveOpsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveOpsDotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveOpsTitle: { ...disp, fontSize: 16 },
  liveOpsState: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  liveOpsStats: { flexDirection: 'row', marginTop: 18, gap: 10 },
  liveOpsStat: { flex: 1, minWidth: 0 },
  liveOpsVal: { ...disp, fontSize: 24, fontVariant: ['tabular-nums'] },
  liveOpsLbl: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },

  /* PulseDot */
  pulseWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  pulseHalo: { position: 'absolute', width: 10, height: 10, borderRadius: 999 },
  pulseCore: { width: 10, height: 10, borderRadius: 999 },

  /* ActivityRow */
  activityRow: { flexDirection: 'row', gap: 12 },
  activityRail: { alignItems: 'center', width: 30 },
  activityIcon: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  activityLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 999 },

  /* FeeRow */
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  feeRowInput: { width: 124 },

  /* PayoutBar */
  payout: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  payoutAmt: { ...disp, fontSize: 18, fontVariant: ['tabular-nums'] },
  payBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  payBtnTxt: { fontSize: 13.5, fontWeight: '800', color: '#fff' },

  /* PromoCard */
  promo: { padding: 15 },
  promoHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  promoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoCode: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  promoTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  promoFill: { height: '100%', borderRadius: 999 },
  promoBudgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoToggle: { alignItems: 'center', paddingVertical: 11, borderRadius: 14, borderWidth: 1 },

  /* Toast */
  toastAnchor: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', paddingHorizontal: 20 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 16, maxWidth: 420 },
  toastDot: { width: 8, height: 8, borderRadius: 999 },
  toastTxt: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },

  /* Fab */
  fabWrap: { position: 'absolute', right: 18, bottom: 96 },
  fab: { width: 58, height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  fabExtended: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 56, paddingHorizontal: 20, borderRadius: 999 },
  fabLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },

  /* ApproveRejectButtons */
  arRow: { flexDirection: 'row', gap: 10 },
  arBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 16, borderWidth: 1 },
  arTxt: { fontSize: 14.5, fontWeight: '800' },

  /* AddSheet */
  submitBtn: { alignItems: 'center', paddingVertical: 15, borderRadius: 16 },
  submitTxt: { fontSize: 15.5, fontWeight: '800', color: '#fff' },
});

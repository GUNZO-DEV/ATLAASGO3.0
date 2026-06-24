// AtlaasGo 3.0 — shared UI primitives (RN port of ag-ui2.jsx + app2.css).
//
// Native equivalents of the prototype's window-exported components. Visuals are
// faithful to app2.css: warm sunset gradients (expo-linear-gradient), emoji-in-
// gradient-tile imagery, rounded cards, mono-dh prices, circular cuisine tokens,
// snow weather strip, and a Modal-based bottom sheet. moti drives entrance +
// press-scale.
//
// RestoCard / RestoRow take an agApi `Store` and map spec fields → display:
//   etaMinutes -> 'lo–hi'   deliveryFeeDh -> 'Free' | 'N dh'
//   priceTier  -> '·'×tier  tags -> 'a · b'
import { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useAg3Theme, type Ag3Theme, type TileKey, gradients, tileGradients } from './theme';
import { IStar, IClock, IBolt, ISnow, ISlider, IClose, type AgIcon } from './icons';
import type { Store } from '../../lib/ag3/agApi';

/* ── food emoji per restaurant / item — house-style imagery ─────────────── */
export const FOOD_EM: Record<string, string> = {
  amandine: '🥐', medina: '🫕', cedars: '🍔', 'atlas-green': '🥗', forno: '🍕', pharmacie: '💊', 'atlas-market': '🛒',
  mf: '🍰', croissant: '🥐', flat: '☕', paino: '🥐', amande: '🥐', fraisier: '🍰', tarte: '🍋',
  para: '💊', ibu: '💊', vitc: '🍊', lozenge: '🍬', plaster: '🩹', antiseptic: '🧴', sanitizer: '🧴', lipbalm: '💄',
  tomatoes: '🍅', bananas: '🍌', bread: '🥖', milk: '🥛', eggs: '🥚', pasta: '🍝', oliveoil: '🫒', water: '💧', chips: '🍿',
};
export function foodEm(id: string, fallback = '🍽'): string {
  return FOOD_EM[id] || fallback;
}

/* ── tile-class deriver — Store has no `tile`; derive a deterministic one ── */
const TILE_KEYS: TileKey[] = ['tile-a', 'tile-b', 'tile-c', 'tile-d', 'tile-e', 'tile-f'];
export function tileFor(id: string): TileKey {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TILE_KEYS[h % TILE_KEYS.length];
}

/* ── Store → display fields (spec-faithful mapping) ─────────────────────── */
export function etaLabel(s: Store): string {
  return `${s.etaMinutes[0]}–${s.etaMinutes[1]}`;
}
export function feeLabel(s: Store): string {
  return s.deliveryFeeDh === 0 ? 'Free' : `${s.deliveryFeeDh} dh`;
}
export function priceLabel(s: Store): string {
  return '·'.repeat(s.priceTier);
}
export function tagLabel(s: Store): string {
  return s.tags.join(' · ');
}

/* ── Press — moti press-scale wrapper (the .ag2-press :active transform) ──── */
export function Press({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.975,
  ...rest
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
} & Omit<PressableProps, 'style' | 'onPress' | 'children'>) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      {...rest}
    >
      <MotiView animate={{ scale: pressed ? scaleTo : 1 }} transition={{ type: 'timing', duration: 120 }} style={style}>
        {children}
      </MotiView>
    </Pressable>
  );
}

/* ── Rise — the .ag2-anim entrance (translateY + fade) ────────────────────── */
export function Rise({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 440, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

/* ── ★ rating ───────────────────────────────────────────────────────────── */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const t = useAg3Theme();
  return (
    <View style={styles.row4}>
      <IStar size={size} color={t.colors.amber} fill={t.colors.amber} strokeWidth={0} />
      <Text style={{ color: t.colors.fg, fontWeight: '700', fontSize: 13 }}>{value}</Text>
    </View>
  );
}

/* ── money — mono dh ────────────────────────────────────────────────────── */
export function Price({
  v,
  big = false,
  color,
  style,
}: {
  v: number | string;
  big?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const t = useAg3Theme();
  return (
    <Text style={[{ fontWeight: '700', fontSize: big ? 18 : 15, color: color ?? t.colors.fg, fontVariant: ['tabular-nums'] }, style]}>
      {v}
      <Text style={{ fontSize: big ? 13 : 11, opacity: 0.65, fontWeight: '600' }}> dh</Text>
    </Text>
  );
}

/* ── photo tile — emoji food imagery floats over a gradient ───────────────── */
export function PhotoTile({
  tile = 'tile-a',
  em,
  style,
  children,
  radius = 26,
  float = false,
}: {
  tile?: TileKey;
  em?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  radius?: number | ViewStyle['borderRadius'];
  float?: boolean;
}) {
  const colors = tileGradients[tile];
  return (
    <View style={[{ overflow: 'hidden', borderRadius: radius as number }, style]}>
      <LinearGradient colors={colors} start={gradients.start} end={gradients.end} style={StyleSheet.absoluteFill} />
      {/* top-right radial highlight (approximated with a soft overlay) */}
      <View pointerEvents="none" style={styles.tileSheen} />
      {em && (
        <MotiView
          pointerEvents="none"
          from={float ? { translateY: 0 } : undefined}
          animate={float ? { translateY: -7 } : undefined}
          transition={float ? { type: 'timing', duration: 2500, loop: true } : undefined}
          style={styles.tileEmojiWrap}
        >
          <Text style={styles.tileEmoji}>{em}</Text>
        </MotiView>
      )}
      {children}
    </View>
  );
}

/* ── floating rating chip (over a tile) ───────────────────────────────────── */
function RateChip({ value }: { value: number }) {
  return (
    <View style={styles.rateChip}>
      <IStar size={12} color="#FFB74D" fill="#FFB74D" strokeWidth={0} />
      <Text style={styles.rateChipTxt}>{value}</Text>
    </View>
  );
}

/* ── promo badge (over a tile) ────────────────────────────────────────────── */
function PromoTileBadge({ label }: { label: string }) {
  return (
    <View style={styles.promoTileBadge}>
      <IBolt size={12} color="#fff" fill="#fff" strokeWidth={0} />
      <Text style={styles.promoTileTxt}>{label}</Text>
    </View>
  );
}

/* ── big image-forward restaurant card (featured rail) ──────────────────── */
export function RestoCard({ r, onPress }: { r: Store; onPress?: () => void }) {
  const t = useAg3Theme();
  const tile = tileFor(r.id);
  const em = r.emoji || foodEm(r.id);
  const fee = feeLabel(r);
  const free = fee === 'Free';
  return (
    <Press onPress={onPress} style={{ width: 256 }}>
      <View style={[cardBase(t), { overflow: 'hidden' }]}>
        <PhotoTile tile={tile} em={em} float radius={0} style={{ height: 138, padding: 12 }}>
          <View style={styles.cardTopRow}>
            {r.promo ? <PromoTileBadge label={r.promo} /> : <View />}
            <RateChip value={r.rating} />
          </View>
        </PhotoTile>
        <View style={{ padding: 14, paddingTop: 12 }}>
          <Text style={[styles.disp, { fontSize: 16.5, color: t.colors.fg, marginBottom: 6 }]} numberOfLines={1}>
            {r.name}
          </Text>
          <View style={styles.metaRow}>
            <IClock size={13} color={t.colors.muted} />
            <Text style={{ fontSize: 12.5, color: t.colors.muted }}>{etaLabel(r)}m</Text>
            <Dot color={t.colors.muted} />
            <Text style={{ fontSize: 12.5, color: free ? t.colors.ok : t.colors.muted, fontWeight: free ? '700' : '500' }}>
              {free ? 'Free delivery' : fee}
            </Text>
          </View>
        </View>
      </View>
    </Press>
  );
}

/* ── full-width restaurant row ──────────────────────────────────────────── */
export function RestoRow({ r, onPress }: { r: Store; onPress?: () => void }) {
  const t = useAg3Theme();
  const tile = tileFor(r.id);
  const em = r.emoji || foodEm(r.id);
  const fee = feeLabel(r);
  const free = fee === 'Free';
  return (
    <Press onPress={onPress} style={{ width: '100%' }}>
      <View style={[cardBase(t), { flexDirection: 'row', gap: 13, padding: 11, alignItems: 'stretch' }]}>
        <PhotoTile tile={tile} em={em} radius={18} style={{ width: 98, minHeight: 98 }} />
        <View style={{ flex: 1, minWidth: 0, gap: 5, paddingRight: 2 }}>
          <Text style={[styles.disp, { fontSize: 16, color: t.colors.fg }]} numberOfLines={1}>
            {r.name}
          </Text>
          <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
            {tagLabel(r)}
            {r.tags.length ? '  ·  ' : ''}
            {priceLabel(r)}
          </Text>
          <View style={[styles.metaRow, { marginTop: 'auto', flexWrap: 'wrap' }]}>
            <Stars value={r.rating} size={12} />
            <Dot color={t.colors.muted} />
            <IClock size={13} color={t.colors.fgSoft} />
            <Text style={{ fontSize: 12.5, color: t.colors.fgSoft }}>{etaLabel(r)}m</Text>
            <Dot color={t.colors.muted} />
            <Text style={{ fontSize: 12.5, color: free ? t.colors.ok : t.colors.fgSoft, fontWeight: free ? '700' : '500' }}>
              {free ? 'Free' : fee}
            </Text>
          </View>
          {r.promo ? (
            <View style={{ alignSelf: 'flex-start', marginTop: 1 }}>
              <Badge label={r.promo} variant="soft" icon={IBolt} />
            </View>
          ) : null}
        </View>
      </View>
    </Press>
  );
}

/* ── Chip — cuisine / filter token (circular gradient when active) ────────── */
export function Chip({
  label,
  emoji,
  active = false,
  onPress,
  icon: Icon,
}: {
  label: string;
  emoji?: string;
  active?: boolean;
  onPress?: () => void;
  icon?: AgIcon;
}) {
  const t = useAg3Theme();
  return (
    <Press onPress={onPress} scaleTo={0.95}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? t.colors.fg : t.colors.surface,
            borderColor: active ? t.colors.fg : t.colors.line,
          },
        ]}
      >
        {emoji ? <Text style={{ fontSize: 14 }}>{emoji}</Text> : null}
        {Icon ? <Icon size={15} color={active ? t.colors.bg : t.colors.fgSoft} /> : null}
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: active ? t.colors.bg : t.colors.fgSoft }}>{label}</Text>
      </View>
    </Press>
  );
}

/* ── CuisineToken — circular emoji category token (Home rail) ─────────────── */
export function CuisineToken({
  label,
  emoji,
  active = false,
  onPress,
}: {
  label: string;
  emoji: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const t = useAg3Theme();
  return (
    <Press onPress={onPress} scaleTo={0.93} style={{ width: 62, alignItems: 'center', gap: 7 }}>
      <View style={{ width: 60, height: 60, borderRadius: 22, overflow: 'hidden' }}>
        {active ? (
          <LinearGradient colors={gradients.sunset} start={gradients.start} end={gradients.end} style={[StyleSheet.absoluteFill, styles.tokenInner]}>
            <Text style={{ fontSize: 27 }}>{emoji}</Text>
          </LinearGradient>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.tokenInner, { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.line }]}>
            <Text style={{ fontSize: 27 }}>{emoji}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: active ? '700' : '600', color: active ? t.colors.primary : t.colors.fgSoft }}>
        {label}
      </Text>
    </Press>
  );
}

/* ── SectionTitle — eyebrow + title + optional action link ────────────────── */
export function SectionTitle({
  title,
  eyebrow,
  actionLabel,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useAg3Theme();
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{eyebrow}</Text> : null}
        <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg }]}>{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Badge — soft / ok / snow pill ────────────────────────────────────────── */
export function Badge({
  label,
  variant = 'soft',
  icon: Icon,
}: {
  label: string;
  variant?: 'soft' | 'ok' | 'snow' | 'solid';
  icon?: AgIcon;
}) {
  const t = useAg3Theme();
  const map = {
    soft: { bg: 'rgba(255,87,34,0.12)', fg: t.colors.primary },
    ok: { bg: 'rgba(47,163,107,0.14)', fg: t.colors.ok },
    snow: { bg: 'rgba(62,134,199,0.14)', fg: t.colors.snow },
    solid: { bg: t.colors.fg, fg: t.colors.bg },
  }[variant];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      {Icon ? <Icon size={12} color={map.fg} /> : null}
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: map.fg }}>{label}</Text>
    </View>
  );
}

/* ── WeatherStrip — snow advisory banner (city.weather gating) ────────────── */
export function WeatherStrip({
  condition,
  tempC,
  etaAddMinutes,
  note,
}: {
  condition: string;
  tempC: number;
  etaAddMinutes: number;
  note?: string;
}) {
  const t = useAg3Theme();
  return (
    <View style={[styles.weatherStrip, { backgroundColor: 'rgba(62,134,199,0.12)', borderColor: 'rgba(62,134,199,0.22)' }]}>
      <View style={[styles.weatherIcon, { backgroundColor: 'rgba(62,134,199,0.18)' }]}>
        <ISnow size={20} color={t.colors.snow} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', fontSize: 13.5, color: t.colors.fg }}>
          {condition} · {tempC}°C
        </Text>
        <Text style={{ fontSize: 12, color: t.colors.fgSoft }} numberOfLines={2}>
          {note ?? `Deliveries +${etaAddMinutes} min in this weather`}
        </Text>
      </View>
      {etaAddMinutes > 0 ? <Badge label={`+${etaAddMinutes} min`} variant="snow" /> : null}
    </View>
  );
}

/* ── Dot — tiny separator ─────────────────────────────────────────────────── */
export function Dot({ color }: { color?: string }) {
  const t = useAg3Theme();
  return <View style={[styles.dot, { backgroundColor: color ?? t.colors.muted }]} />;
}

/* ── FilterButton — the round slider icon button ──────────────────────────── */
export function FilterButton({ onPress }: { onPress?: () => void }) {
  const t = useAg3Theme();
  return (
    <Press onPress={onPress} scaleTo={0.9}>
      <View style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
        <ISlider size={20} color={t.colors.fg} />
      </View>
    </Press>
  );
}

/* ── BottomSheet — Modal-based sheet for item / city pickers ──────────────── */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: number | `${number}%`;
}) {
  const t = useAg3Theme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View pointerEvents="box-none" style={styles.sheetAnchor}>
        <MotiView
          from={{ translateY: 40, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'timing', duration: 260 }}
          style={[
            styles.sheet,
            { backgroundColor: t.colors.surface, maxHeight: '88%', height: height as ViewStyle['height'] },
            t.shadows.lift,
          ]}
        >
          <View style={[styles.sheetGrip, { backgroundColor: t.colors.line }]} />
          {(title || true) && (
            <View style={styles.sheetHeader}>
              <Text style={[styles.disp, { fontSize: 19, color: t.colors.fg, flex: 1 }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={[styles.iconBtn, styles.sheetClose, { backgroundColor: t.colors.surface2 }]}>
                <IClose size={18} color={t.colors.fg} />
              </Pressable>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
            {children}
          </ScrollView>
        </MotiView>
      </View>
    </Modal>
  );
}

/* ── shared card base style ──────────────────────────────────────────────── */
function cardBase(t: Ag3Theme): ViewStyle {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  };
}

/* ── styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // Montserrat-style display weight; the actual font family is wired at the
  // screen layer (the prototype uses Montserrat). We set tight letterSpacing.
  disp: { fontWeight: '800', letterSpacing: -0.4, lineHeight: 20 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileSheen: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 120,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  tileEmojiWrap: { position: 'absolute', right: -6, bottom: -10, zIndex: 1, transform: [{ rotate: '-10deg' }] },
  tileEmoji: { fontSize: 78, opacity: 0.92, lineHeight: 84 },
  rateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  rateChipTxt: { fontWeight: '800', fontSize: 12, color: '#1A1410' },
  promoTileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,20,16,0.36)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  promoTileTxt: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tokenInner: { alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  weatherStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1 },
  weatherIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 3, height: 3, borderRadius: 999 },
  iconBtn: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,20,16,0.45)' },
  sheetAnchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  sheetGrip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, marginBottom: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sheetClose: { width: 36, height: 36, borderWidth: 0 },
});

// AtlaasDriver 3.0 — shared "cockpit" theme + UI primitives.
// Self-contained foundation file: every driver screen imports from here.
// Dark cockpit surface, emerald accents (distinct from the customer app's
// sunset-orange). React Native translation of the design JSX/CSS.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Snowflake, ChevronRight, Check } from 'lucide-react-native';

// ── Palette ─────────────────────────────────────────────────────────────
export const BG = '#07140E';
export const CARD = 'rgba(255,255,255,0.045)';
export const LINE = 'rgba(255,255,255,0.09)';
export const EMERALD = '#10B981';
export const DEEP = '#0E7C5A';
export const GLOW = '#34D399';
export const CREAM = '#EAF3EE';
export const MUTED = '#7E948A';
export const AMBER = '#FBBF24';
export const SNOW = '#5AA9E6';
export const DANGER = '#F87171';

// ── Animated primitives (extracted verbatim from app/index.tsx) ─────────
export function Enter({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 420, delay }}
    >
      {children}
    </MotiView>
  );
}

export function Tappable({
  children,
  onPress,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[{ flex: 1 }, style]}
    >
      <MotiView animate={{ scale: down ? 0.95 : 1 }} transition={{ type: 'timing', duration: 110 }}>
        {children}
      </MotiView>
    </Pressable>
  );
}

export function LiveDot({ color = GLOW, size = 8 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MotiView
        from={{ opacity: 0.55, scale: 1 }}
        animate={{ opacity: 0, scale: 2.6 }}
        transition={{ type: 'timing', duration: 1500, loop: true, repeatReverse: false }}
        style={{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: color }}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

// ── Money — "<v> dh" with a smaller muted "dh" suffix ──────────────────
export function DH({ v, sign = false }: { v: number; sign?: boolean }) {
  return (
    <Text style={{ fontWeight: '800', color: CREAM, letterSpacing: -0.3 }}>
      {sign ? '+' : ''}
      {v}
      <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED }}> dh</Text>
    </Text>
  );
}

// ── KPI tile ───────────────────────────────────────────────────────────
export function StatTile({
  icon,
  value,
  unit,
  label,
}: {
  icon: ReactNode;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LINE,
        padding: 14,
      }}
    >
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text style={{ fontSize: 23, fontWeight: '800', color: CREAM, letterSpacing: -0.6 }}>
        {value}
        {unit ? <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED }}> {unit}</Text> : null}
      </Text>
      <Text style={{ fontSize: 11.5, color: MUTED, fontWeight: '600', marginTop: 5 }}>{label}</Text>
    </View>
  );
}

// ── Weather / surge boost banner ───────────────────────────────────────
export function Surge({ temp, label }: { temp?: number; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 13,
        borderRadius: 16,
        backgroundColor: 'rgba(90,169,230,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(90,169,230,0.35)',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[SNOW, '#2A6FA8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ ...StyleFill, borderRadius: 12 }}
        />
        <Snowflake size={20} color="#fff" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '800', color: CREAM }}>Snow boost active</Text>
        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{label}</Text>
      </View>
      {temp != null ? (
        <Text style={{ fontSize: 17, fontWeight: '800', color: SNOW }}>{temp}°</Text>
      ) : null}
    </View>
  );
}

const StyleFill: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };

// ── Pickup → dropoff route rail ────────────────────────────────────────
type RoutePoint = { name: string; area: string; dist?: string };

export function RouteSummary({ pickup, dropoff }: { pickup: RoutePoint; dropoff: RoutePoint }) {
  return (
    <View>
      {/* Pickup row */}
      <View style={{ flexDirection: 'row', gap: 13 }}>
        <View style={{ alignItems: 'center', paddingTop: 4 }}>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: BG,
              borderWidth: 3,
              borderColor: AMBER,
            }}
          />
          <DashedConnector />
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: AMBER }}>
            PICK UP
          </Text>
          <Text
            style={{ fontWeight: '800', fontSize: 15.5, color: CREAM, marginTop: 2 }}
            numberOfLines={1}
          >
            {pickup.name}
          </Text>
          <Text style={{ fontSize: 12.5, color: MUTED }} numberOfLines={1}>
            {pickup.area}
            {pickup.dist ? ` · ${pickup.dist}` : ''}
          </Text>
        </View>
      </View>
      {/* Dropoff row */}
      <View style={{ flexDirection: 'row', gap: 13 }}>
        <View style={{ alignItems: 'center', paddingTop: 4 }}>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: EMERALD,
              borderWidth: 3,
              borderColor: EMERALD,
            }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: EMERALD }}>
            DROP OFF
          </Text>
          <Text
            style={{ fontWeight: '800', fontSize: 15.5, color: CREAM, marginTop: 2 }}
            numberOfLines={1}
          >
            {dropoff.name}
          </Text>
          <Text style={{ fontSize: 12.5, color: MUTED }} numberOfLines={1}>
            {dropoff.area}
            {dropoff.dist ? ` · ${dropoff.dist}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Dashed vertical connector between the pickup and dropoff nodes.
function DashedConnector() {
  return (
    <View style={{ flex: 1, minHeight: 26, marginVertical: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 2,
            height: 4,
            borderRadius: 1,
            marginBottom: 4,
            backgroundColor: LINE,
          }}
        />
      ))}
    </View>
  );
}

// ── Slide to confirm — drag the knob to the right end to fire ──────────
const SLIDE_H = 60;
const KNOB = 50;
const PAD = 5;

export function SlideConfirm({
  label,
  onConfirm,
  resetKey,
  disabled = false,
}: {
  label: string;
  onConfirm: () => void;
  resetKey?: string | number;
  disabled?: boolean;
}) {
  const [trackW, setTrackW] = useState(0);
  const [done, setDone] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  const offset = useRef(0); // current settled knob offset
  const maxRef = useRef(0); // furthest the knob can travel
  const doneRef = useRef(false);

  const maxX = Math.max(0, trackW - KNOB - PAD * 2);
  maxRef.current = maxX;

  // Reset when the caller bumps resetKey.
  useEffect(() => {
    doneRef.current = false;
    offset.current = 0;
    setDone(false);
    x.setValue(0);
  }, [resetKey, x]);

  const settle = (to: number) => {
    Animated.spring(x, { toValue: to, useNativeDriver: false, bounciness: 4 }).start();
    offset.current = to;
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current && !disabled,
      onMoveShouldSetPanResponder: () => !doneRef.current && !disabled,
      onPanResponderMove: (_e, g) => {
        if (doneRef.current) return;
        const nx = Math.min(maxRef.current, Math.max(0, g.dx));
        x.setValue(nx);
      },
      onPanResponderRelease: (_e, g) => {
        if (doneRef.current) return;
        const nx = Math.min(maxRef.current, Math.max(0, g.dx));
        if (nx >= maxRef.current - 6 && maxRef.current > 0) {
          doneRef.current = true;
          setDone(true);
          settle(maxRef.current);
          setTimeout(() => onConfirm(), 220);
        } else {
          settle(0);
        }
      },
    }),
  ).current;

  const textOpacity = x.interpolate({
    inputRange: [0, Math.max(1, maxX)],
    outputRange: [1, 0.25],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={{
        height: SLIDE_H,
        borderRadius: SLIDE_H,
        overflow: 'hidden',
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <LinearGradient
        colors={done ? [EMERALD, EMERALD] : [GLOW, EMERALD]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleFill}
      />
      <Animated.Text
        style={{
          textAlign: 'center',
          paddingLeft: 40,
          fontSize: 15.5,
          fontWeight: '800',
          color: '#fff',
          opacity: done ? 1 : textOpacity,
        }}
      >
        {done ? 'Confirmed' : label}
      </Animated.Text>
      {done ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            justifyContent: 'center',
          }}
          pointerEvents="none"
        >
          <Check size={20} color="#fff" />
        </View>
      ) : null}
      <Animated.View
        {...responder.panHandlers}
        style={{
          position: 'absolute',
          top: PAD,
          left: PAD,
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: x }],
        }}
      >
        {done ? <Check size={22} color={EMERALD} /> : <ChevronRight size={22} color={EMERALD} />}
      </Animated.View>
    </View>
  );
}

// ── Week bar chart ─────────────────────────────────────────────────────
type WeekDay = { d: string; amt: number; boost?: number; today?: boolean };

export function WeekBars({ week }: { week: WeekDay[] }) {
  const max = Math.max(1, ...week.map((w) => w.amt));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 130 }}>
      {week.map((w, i) => {
        const h = w.amt === 0 ? 4 : Math.max(10, (w.amt / max) * 100);
        const boostPct = w.amt && w.boost ? Math.min(100, (w.boost / w.amt) * 100) : 0;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 7,
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                width: '100%',
                height: `${h}%`,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                overflow: 'hidden',
                backgroundColor: w.today ? 'transparent' : 'rgba(255,255,255,0.08)',
              }}
            >
              {w.today ? (
                <LinearGradient
                  colors={[GLOW, EMERALD]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleFill}
                />
              ) : null}
              {boostPct > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${boostPct}%`,
                    backgroundColor: SNOW,
                    opacity: 0.8,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }}
                />
              ) : null}
            </View>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                color: w.today ? EMERALD : MUTED,
              }}
            >
              {w.d}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Section heading row ────────────────────────────────────────────────
export function Section({ icon, title, badge }: { icon?: ReactNode; title: string; badge?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 12 }}>
      {icon}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: CREAM,
          marginLeft: icon ? 7 : 0,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </Text>
      {badge ? (
        <View
          style={{
            marginLeft: 8,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: AMBER,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#04140D' }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Action button — gradient (primary) / outline ───────────────────────
export function ActionBtn({
  label,
  icon,
  onPress,
  primary,
  busy,
  disabled,
  tint,
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  disabled?: boolean;
  tint?: string;
}) {
  const content = (
    <View
      style={{
        borderRadius: 13,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: primary ? 0 : 1,
        borderColor: tint ? `${tint}55` : LINE,
        opacity: busy || disabled ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={primary ? '#04140D' : EMERALD} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              fontWeight: '800',
              fontSize: 14,
              marginLeft: icon ? 7 : 0,
              color: primary ? '#04140D' : tint ?? CREAM,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );
  return (
    <Tappable onPress={onPress} disabled={busy || disabled}>
      {primary ? (
        <LinearGradient colors={[GLOW, EMERALD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 13 }}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Tappable>
  );
}

// ── Tier ribbon — gradient pill (dark → amber) with mono uppercase label ─
export function TierRibbon({ label }: { label: string }) {
  return (
    <LinearGradient
      colors={['#1A1410', '#4A3526']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
      }}
    >
      <Text
        style={{
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.2,
          color: '#FFD9A8',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </LinearGradient>
  );
}

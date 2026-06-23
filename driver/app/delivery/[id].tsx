// AtlaasDriver — ACTIVE DELIVERY (full-screen pickup → dropoff flow).
// Root stack route (no tab bar). Translates the design's screen-active.jsx onto
// the light + sunset-orange cockpit, but driven by REAL data: a live
// react-native-maps view up top (pickup pin, dropoff pin, courier's own GPS)
// and a cream bottom sheet whose slide-to-confirm maps to the real lifecycle.
//
//   status not-yet-picked-up  → "Slide — order collected" → markPickedUp
//   picked up & not arriving   → "Slide — arriving"        → markArriving
//   arriving                   → "Slide — mark delivered"  → markDelivered
//   delivered                  → "Delivered · +payout" hero + back to dashboard
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  ArrowLeft, Navigation, Phone, MessageCircle, MapPin, Check, Store, Package, Snowflake,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { useActiveDelivery, type LatLng } from '../../hooks/useActiveDelivery';
import { useBroadcastLocation } from '../../hooks/useBroadcastLocation';
import { useNearestCity } from '../../hooks/useNearestCity';
import { useCityWeather } from '../../hooks/useCityWeather';
import { OrderChat } from '../../components/dr/OrderChat';
import { markPickedUp, markArriving, markDelivered } from '../../lib/orderActions';
import { supabase } from '../../lib/supabase';
import {
  BG, CARD, LINE, LINE2, EMERALD, GLOW, CREAM, MUTED, AMBER, SNOW, ONLINE, FG_SOFT,
  LiveDot, SlideConfirm, ActionBtn,
} from '../../components/dr/ui';

// ── Phase model ─────────────────────────────────────────────────────────
// Four visible segments; the order status decides which one we're on.
type Phase = 'pickup' | 'pickedUp' | 'arriving' | 'delivered';
const PHASE_INDEX: Record<Phase, number> = { pickup: 0, pickedUp: 1, arriving: 2, delivered: 3 };

// Statuses where the courier has NOT yet collected the order.
const PRE_PICKUP = new Set(['ordered', 'preparing', 'enRoute']);

function phaseFromStatus(status: string): Phase {
  if (status === 'delivered') return 'delivered';
  if (status === 'arriving') return 'arriving';
  if (status === 'outForDelivery') return 'pickedUp';
  // ordered / preparing / enRoute / anything earlier
  return 'pickup';
}

// Map (longitude/latitude) span padding around the fitted region.
const PAD = 0.012;

function regionFor(points: LatLng[]): Region | null {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return { ...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.01, maxLat - minLat + PAD),
    longitudeDelta: Math.max(0.01, maxLng - minLng + PAD),
  };
}

// Neutral fallback region (Ifrane / Atlas) when no coords exist at all.
const NEUTRAL: Region = { latitude: 33.5333, longitude: -5.1106, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function DeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === 'string' ? id : null;
  const router = useRouter();
  const { user } = useAuth();
  const { delivery, loading, refresh } = useActiveDelivery(orderId);

  const [me, setMe] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Mount the "active delivery" intent: tight-cadence GPS broadcast so the
  // customer sees the courier pin move smoothly the whole screen.
  useBroadcastLocation(user?.id, true);

  // Live weather for the drop city → optional snow-boost badge on the map.
  const { cityId } = useNearestCity();
  const weather = useCityWeather(cityId);

  // Foreground location: snapshot first, then watch for the courier pin.
  useEffect(() => {
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!cancelled) setMe({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 12 },
          (p) => setMe({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        );
      } catch {
        // permission denied / unavailable — map just won't show the courier pin
      }
    })();
    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, []);

  // Re-fetch the order when this screen regains focus (status may have moved).
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  // Realtime: refresh the moment the order row changes from anywhere else (the
  // customer cancelling, dispatch reassigning, a parallel device advancing it),
  // so the stepper/stage and slide action never go stale on-screen.
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`delivery-${orderId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, refresh]);

  const pickup = delivery?.pickup.coords ?? null;
  const dropoff = delivery?.dropoff.coords ?? null;

  const allPoints = useMemo(() => {
    const pts: LatLng[] = [];
    if (pickup) pts.push(pickup);
    if (dropoff) pts.push(dropoff);
    if (me) pts.push(me);
    return pts;
  }, [pickup, dropoff, me]);

  const initialRegion = useMemo(() => regionFor(allPoints) ?? NEUTRAL, [allPoints]);

  // Fit the map to whatever coords we have once they resolve.
  useEffect(() => {
    const r = regionFor(allPoints);
    if (r && mapRef.current) mapRef.current.animateToRegion(r, 600);
  }, [allPoints]);

  const recenter = useCallback(() => {
    const r = regionFor(allPoints) ?? NEUTRAL;
    mapRef.current?.animateToRegion(r, 500);
  }, [allPoints]);

  // ── Lifecycle action wiring ───────────────────────────────────────────
  const phase: Phase = delivery ? phaseFromStatus(delivery.status) : 'pickup';
  const isPickupSide = phase === 'pickup';
  const isDone = phase === 'delivered';

  const runAction = useCallback(
    async (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, failTitle: string) => {
      if (busy || !orderId) return;
      setBusy(true);
      const res = await fn();
      setBusy(false);
      if (!res.ok) { Alert.alert(failTitle, res.error); return; }
      await refresh();
    },
    [busy, orderId, refresh],
  );

  const slide = useMemo(() => {
    if (!orderId) return null;
    if (phase === 'pickup') {
      return {
        label: 'Slide — order collected',
        onConfirm: () => user && runAction(() => markPickedUp(orderId, user.id), 'Could not update'),
      };
    }
    if (phase === 'pickedUp') {
      return {
        label: 'Slide — arriving',
        onConfirm: () => runAction(() => markArriving(orderId), 'Could not update'),
      };
    }
    if (phase === 'arriving') {
      return {
        label: 'Slide — mark delivered',
        onConfirm: () => user && runAction(() => markDelivered(orderId, user.id), 'Could not update'),
      };
    }
    return null;
  }, [phase, orderId, user, runAction]);

  // ── Stage copy ────────────────────────────────────────────────────────
  const stage = useMemo(() => {
    switch (phase) {
      case 'pickup':
        return { eyebrow: 'Pickup', label: 'Head to pickup', sub: 'Collect the order from the merchant' };
      case 'pickedUp':
        return { eyebrow: 'Drop off', label: 'On the way', sub: 'Heading to the customer drop-off' };
      case 'arriving':
        return { eyebrow: 'Drop off', label: 'Arriving now', sub: 'You are 1–2 minutes from the drop' };
      case 'delivered':
        return { eyebrow: 'Complete', label: 'Delivered', sub: 'Nice work — payout added' };
    }
  }, [phase]);

  const contactName = isPickupSide ? delivery?.pickup.name : delivery?.dropoff.label;
  const contactArea = isPickupSide ? 'Merchant pickup' : delivery?.dropoff.sub || 'Customer drop-off';

  if (!orderId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: MUTED }}>No delivery selected.</Text>
      </SafeAreaView>
    );
  }

  if (loading && !delivery) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={EMERALD} />
      </View>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Package size={26} color={MUTED} />
        <Text style={{ color: MUTED, marginTop: 12, textAlign: 'center' }}>
          This delivery could not be loaded.
        </Text>
        <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
          <ActionBtn primary label="Back to dashboard" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {chatOpen && orderId ? <OrderChat orderId={orderId} onClose={() => setChatOpen(false)} /> : null}
      {/* ── MAP (top ~42%) ── */}
      <View style={{ height: '42%' }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {/* pickup → dropoff leg */}
          {pickup && dropoff ? (
            <Polyline
              coordinates={[pickup, dropoff]}
              strokeColor={EMERALD}
              strokeWidth={4}
              lineCap="round"
              lineDashPattern={[2, 10]}
            />
          ) : null}
          {pickup ? (
            <Marker coordinate={pickup} title={delivery.pickup.name} pinColor={AMBER}>
              <Pin color={AMBER} />
            </Marker>
          ) : null}
          {dropoff ? (
            <Marker coordinate={dropoff} title={delivery.dropoff.label} pinColor={EMERALD}>
              <Pin color={EMERALD} />
            </Marker>
          ) : null}
          {me ? (
            <Marker coordinate={me} title="You" anchor={{ x: 0.5, y: 0.5 }}>
              <CourierPin />
            </Marker>
          ) : null}
        </MapView>

        {/* back (top-left) */}
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={iconBtn}
            >
              <ArrowLeft size={20} color={CREAM} />
            </Pressable>
            {/* recenter / nav (top-right) — sunset gradient pill */}
            <Pressable onPress={recenter} hitSlop={10} style={navBtnWrap}>
              <LinearGradient
                colors={[EMERALD, GLOW]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={navBtnFill}
              />
              <Navigation size={19} color="#fff" />
            </Pressable>
          </View>

          {/* weather / snow-boost badge — only when a real boost is live for the
              city (city_weather surcharge or snow condition). */}
          {weather.isBoost ? (
            <View style={weatherBadge}>
              <Snowflake size={13} color={SNOW} />
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: CREAM }}>
                {weather.tempC != null ? `${weather.tempC}° · ` : ''}
                {weather.condition ?? 'Snow boost'}
              </Text>
            </View>
          ) : null}
        </SafeAreaView>
      </View>

      {/* ── SHEET (cream sheet, overlaps the map) ── */}
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          marginTop: -24,
          overflow: 'hidden',
          shadowColor: '#1A1410',
          shadowOpacity: 0.16,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: -10 },
        }}
      >
        {/* grabber */}
        <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: LINE, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />

        {/* phase stepper — done = sunset solid, now = sunset gradient, todo = hairline */}
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: 4 }}>
          {(['pickup', 'pickedUp', 'arriving', 'delivered'] as Phase[]).map((p) => {
            const idx = PHASE_INDEX[p];
            const cur = PHASE_INDEX[phase];
            const state = idx < cur ? 'done' : idx === cur ? 'now' : 'todo';
            return state === 'now' ? (
              <LinearGradient
                key={p}
                colors={[EMERALD, GLOW]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, height: 5, borderRadius: 999 }}
              />
            ) : (
              <View
                key={p}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: state === 'done' ? EMERALD : LINE,
                }}
              />
            );
          })}
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {/* current stage */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!isDone ? <LiveDot size={7} color={EMERALD} /> : <Check size={14} color={ONLINE} />}
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: isDone ? ONLINE : EMERALD }}>
              {stage.eyebrow.toUpperCase()} · #{delivery.orderId.slice(0, 8)}
            </Text>
          </View>
          <Text style={{ fontSize: 27, fontWeight: '800', color: CREAM, letterSpacing: -0.6, marginTop: 6 }}>
            {stage.label}
          </Text>
          <Text style={{ fontSize: 13.5, color: MUTED, marginTop: 3 }}>{stage.sub}</Text>

          {/* contact card */}
          {!isDone ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
                backgroundColor: CARD,
                borderWidth: 1,
                borderColor: LINE2,
                borderRadius: 18,
                padding: 13,
                marginTop: 18,
                ...cardShadow,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isPickupSide ? 'rgba(255,183,77,0.16)' : 'rgba(255,87,34,0.12)',
                }}
              >
                {isPickupSide ? <Store size={20} color={AMBER} /> : <MapPin size={20} color={EMERALD} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: CREAM }} numberOfLines={1}>
                  {contactName}
                </Text>
                <Text style={{ fontSize: 12.5, color: MUTED }} numberOfLines={1}>{contactArea}</Text>
              </View>
              <Pressable
                onPress={() => setChatOpen(true)}
                hitSlop={8}
                style={contactIconBtn}
              >
                <MessageCircle size={19} color={EMERALD} />
              </Pressable>
              {/* Call the counterparty — only when a number is on file (the
                  order_contact_phone RPC returns null otherwise). */}
              {delivery.counterpartyPhone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${delivery.counterpartyPhone}`)}
                  hitSlop={8}
                  style={contactIconBtn}
                >
                  <Phone size={18} color={EMERALD} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* the bag (pickup) or drop note (dropoff) */}
          {!isDone && isPickupSide ? (
            <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: LINE2, borderRadius: 18, padding: 16, marginTop: 12, ...cardShadow }}>
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: MUTED, marginBottom: 10 }}>THE BAG</Text>
              {delivery.items.length === 0 ? (
                <Text style={{ fontSize: 13.5, color: MUTED }}>No item details.</Text>
              ) : (
                delivery.items.map((it, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: EMERALD, minWidth: 26 }}>{it.qty}×</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: CREAM, flex: 1 }} numberOfLines={1}>{it.name}</Text>
                    <View style={{ width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: LINE }} />
                  </View>
                ))
              )}
            </View>
          ) : null}

          {!isDone && !isPickupSide ? (
            <View style={{ flexDirection: 'row', gap: 11, backgroundColor: CARD, borderWidth: 1, borderColor: LINE2, borderRadius: 18, padding: 16, marginTop: 12, ...cardShadow }}>
              <MapPin size={18} color={EMERALD} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: MUTED, marginBottom: 4 }}>DROP NOTE</Text>
                <Text style={{ fontSize: 13.5, color: FG_SOFT, lineHeight: 19 }}>
                  {delivery.dropoff.note || 'No drop note — confirm the handoff with the customer.'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* delivered hero — dark ink card, cream text, sunset corner glow */}
          {isDone ? (
            <View
              style={{
                marginTop: 18,
                borderRadius: 24,
                padding: 22,
                backgroundColor: CREAM,
                overflow: 'hidden',
              }}
            >
              {/* sunset gradient blob in the top-right corner (.dr-earn-hero::after) */}
              <LinearGradient
                colors={[EMERALD, GLOW]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  right: -40,
                  top: -40,
                  width: 160,
                  height: 160,
                  borderRadius: 999,
                  opacity: 0.9,
                }}
              />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Check size={16} color="#fff" />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.82)' }}>
                    Delivered to {delivery.dropoff.label}
                  </Text>
                </View>
                <Text style={{ fontSize: 44, fontWeight: '800', color: BG, letterSpacing: -1.2, marginTop: 8 }}>
                  +{delivery.payoutDh}
                  <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.65)' }}> dh</Text>
                </Text>
                <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                  Added to today’s earnings
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* sticky action */}
        <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, borderTopWidth: 1, borderTopColor: LINE }}>
          {isDone ? (
            <ActionBtn primary label="Back to dashboard" onPress={() => router.replace('/(tabs)')} />
          ) : slide ? (
            <View style={{ opacity: busy ? 0.6 : 1 }}>
              <SlideConfirm label={slide.label} onConfirm={slide.onConfirm} resetKey={delivery.status} disabled={busy} />
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </View>
  );
}

// ── Map pin glyphs ────────────────────────────────────────────────────────
function Pin({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 30, height: 30 }}>
      <View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: color, opacity: 0.22 }} />
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 3, borderColor: '#fff' }} />
    </View>
  );
}

function CourierPin() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 34, height: 34 }}>
      <View style={{ position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: SNOW_FILL }} />
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#5AA9E6', borderWidth: 4, borderColor: '#fff' }} />
    </View>
  );
}

const SNOW_FILL = 'rgba(90,169,230,0.28)';

// Soft elevation shared by the cream sheet cards (app.css --sh-1).
const cardShadow = {
  shadowColor: '#1A1410',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 2,
} as const;

// Light pill icon button (.ag-iconbtn): white surface, dark ink icon, soft shadow.
const iconBtn = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: CARD,
  borderWidth: 1,
  borderColor: LINE2,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  ...cardShadow,
};

// Contact-card action button — white pill, sunset icon.
const contactIconBtn = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: CARD,
  borderWidth: 1,
  borderColor: LINE2,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

// Map nav pill — sunset gradient fill (set via LinearGradient child).
const navBtnWrap = {
  width: 42,
  height: 42,
  borderRadius: 21,
  overflow: 'hidden' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: EMERALD,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.34,
  shadowRadius: 18,
  elevation: 5,
};

const navBtnFill = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

// Snow-boost badge (.ag-badge-snow) — white pill, snow-blue trim, tucked under
// the top-right nav button. Only mounts when a real boost is live for the city.
const weatherBadge = {
  position: 'absolute' as const,
  top: 56,
  right: 16,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: CARD,
  borderWidth: 1,
  borderColor: 'rgba(90,169,230,0.35)',
  ...cardShadow,
};

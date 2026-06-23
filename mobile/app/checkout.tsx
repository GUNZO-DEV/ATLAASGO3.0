// AtlaasGo 3.0 — Combined Checkout (the whole order step on one screen).
//
// This screen merges what used to be TWO screens (app/cart.tsx + the old
// app/checkout.tsx) into ONE, faithful to the live Claude Design
// screen-checkout2.jsx: order-from, items + qty steppers, dorm-precise drop
// with handoff, delivery speed, weather note, courier tip, payment, bill
// summary and a sticky place-order footer — top to bottom.
//
// LOGIC PRESERVED EXACTLY (the cart-side selections are now LOCAL state) ───────
//   • Line items + qty come from the LIVE zustand cart (lib/cart) — the qty
//     steppers drive the same setQty, so totals stay in sync everywhere.
//   • Speed / tip / handoff used to be passed cart→checkout via router params;
//     they now live as useState ON this screen and feed the quote + order-create.
//   • Saved-address selection (supabase addresses read with coords, auto-select
//     default, selectAddress, "use a new address instead" / inline picker).
//   • Landmark + GPS capture (LandmarkInput / useLocation), with the saved-coords
//     shortcut that skips the manual GPS requirement.
//   • Phone-on-file validation (isValidMoroccanPhone) + savePhone (profiles).
//   • Promo (usePromotions / redeemPromo) apply / remove.
//   • Payment method cash / wallet / card (isStripeAvailable gating).
//   • Stripe PaymentSheet flow (create-payment-intent → payWithPaymentSheet,
//     cancelOrder on abandon/fail).
//   • pay_order_with_wallet RPC (partial vs full coverage handling).
//   • useCreateOrder + the server cart_quote pricing (quote state, the
//     deliveryFee / priorityDh / weatherDh / tipAmount bill lines, the !!quote
//     submit gate, tip / speed / handoff persistence).
//   • Navigation: router.replace to /order/[id] after a successful order-create.
// None of the money math, Stripe, wallet RPC or order-create logic is touched.
import { MotiView } from 'moti';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Banknote, Clock, CreditCard } from 'lucide-react-native';
import { LandmarkInput, MIN_LANDMARK_LENGTH } from '../components/LandmarkInput';
import { useLocation } from '../hooks/useLocation';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { usePromotions, redeemPromo } from '../hooks/usePromotions';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { supabase } from '../lib/supabase';
import { isStripeAvailable, payWithPaymentSheet } from '../lib/stripe';
import { cancelOrder } from '../lib/orderActions';
import type { CategoryKey, Coords } from '../lib/types';
import { agApi, type Quote } from '../lib/ag3/agApi';
import { useAsync } from '../lib/ag3/useAsync';

import { useAg3Theme, type Ag3Theme } from '../components/ag3/theme';
import { PhotoTile, Price, Press, Rise, foodEm, tileFor } from '../components/ag3/primitives';
import {
  IBack,
  IPin,
  IHome,
  IPhone,
  IBolt,
  ISnow,
  IClock,
  IUser,
  ICheck,
  IClose,
  IWallet,
  IBag,
  IChevR,
  IGift,
} from '../components/ag3/icons';

const MIN_ORDER_DH = 30; // Minimum order subtotal — same as web (src/pages/Cart.tsx)

// The mobile app is AUI / Ifrane-centric — that's the campus city the cart
// quote + dorm drop key off. (CityProvider isn't mounted at the root, so we
// resolve the city directly from agApi rather than from context.)
const CITY_ID = 'ifrane';

type Speed = 'standard' | 'priority';
type Handoff = 'door' | 'hand' | 'lounge';

/** Morocco-friendly phone check — starts +212 or 0, then 5/6/7 and 8 digits. */
function isValidMoroccanPhone(raw: string): boolean {
  const cleaned = raw.replace(/[\s-]/g, '');
  return /^(?:\+212|0)[567]\d{8}$/.test(cleaned);
}

type SavedAddress = {
  id: string;
  label: string | null;
  line1: string | null;
  building: string | null;
  room: string | null;
  coords: Coords | null;
  landmark: string | null;
  is_default: boolean;
  is_campus: boolean;
};

export default function Checkout() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; speed?: string; tipDh?: string; handoff?: string }>();
  const categoryKey = (params.category as CategoryKey) ?? 'food';

  // Line items + subtotal from the live cart store; the fee breakdown (delivery,
  // priority, winter surcharge, tip) comes from the server cart_quote.
  const items = useCart((s) => s.items);
  const isCampusOrder = useCart((s) => s.isCampusOrder);
  const setQty = useCart((s) => s.setQty);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart((s) => s.subtotal());

  const storeName = items[0]?.restaurantName ?? tr('cart.yourOrder');
  const storeIdForTile = items[0]?.restaurantId ?? '';

  const { user } = useAuth();
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const { coords: gpsCoords, status: locStatus, capture, error: locError } = useLocation();
  const { create, submitting, error: createError } = useCreateOrder();
  const { balanceDh, loading: walletLoading } = useWallet();
  const promo = usePromotions();

  // ── city + weather (campus gating, weather strip) ──
  const { data: city } = useAsync(() => agApi.cities.get(CITY_ID), []);
  const { data: weather } = useAsync(() => agApi.cities.weather(CITY_ID), []);
  const isCampus = !!city?.campus || isCampusOrder;
  const hasWeather = !!city?.weather && !!weather;

  // ── 3.0 cart selections — now LOCAL state (were router params). Initial
  // defaults still honour any params a stale link may carry. ──
  const [speed, setSpeed] = useState<Speed>(params.speed === 'priority' ? 'priority' : 'standard');
  const [tip, setTip] = useState<number>(Math.max(0, parseInt(params.tipDh ?? '10', 10) || 0));
  const [handoff, setHandoff] = useState<Handoff>(
    params.handoff === 'hand' ? 'hand' : params.handoff === 'lounge' ? 'lounge' : 'door',
  );

  // ── Saved addresses (with coords — the shared hook omits them) ──
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  // ── Phone on file ──
  const [phoneOnFile, setPhoneOnFile] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);

  // ── Payment + promo ──
  const [payMethod, setPayMethod] = useState<'cash' | 'wallet' | 'card'>('cash');
  const [promoInput, setPromoInput] = useState('');

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setAddrLoading(false);
      setPhoneOnFile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setAddrLoading(true);
    setProfileLoading(true);
    void Promise.all([
      supabase
        .from('addresses')
        .select('id, label, line1, building, room, coords, landmark, is_default, is_campus')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle(),
    ]).then(([{ data: a }, { data: p }]) => {
      if (cancelled) return;
      const rows = (a ?? []) as SavedAddress[];
      setAddresses(rows);
      // Auto-select the default saved address, like the web cart.
      const def = rows.find((r) => r.is_default) ?? rows[0];
      if (def) {
        setSelectedAddressId(def.id);
        setLandmark((prev) => (prev.trim() ? prev : (def.landmark ?? def.label ?? '')));
      }
      setAddrLoading(false);
      setPhoneOnFile((p as { phone?: string | null } | null)?.phone ?? null);
      setProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  function selectAddress(a: SavedAddress) {
    setSelectedAddressId(a.id);
    setLandmark(a.landmark ?? a.label ?? '');
    setPickOpen(false);
  }

  // A saved address with coords skips the GPS requirement; otherwise the
  // manual GPS capture flow stays as fallback.
  const effectiveCoords = selectedAddress?.coords ?? gpsCoords;
  const landmarkValid = landmark.trim().length >= MIN_LANDMARK_LENGTH;
  const phoneOk = !!phoneOnFile && phoneOnFile.length >= 8;
  const subtotalOk = subtotal >= MIN_ORDER_DH;

  // Drop card display — the user's selected/saved address only. With no saved
  // address we show an "add address" prompt, never a fabricated city default.
  const dropName = selectedAddress?.label ?? tr('checkout.addAddressTitle');
  const dropSub =
    [selectedAddress?.line1, selectedAddress?.building, selectedAddress?.room ? tr('checkout.roomShort', { room: selectedAddress.room }) : null]
      .filter(Boolean)
      .join(' · ') ||
    selectedAddress?.landmark ||
    (selectedAddress ? '' : tr('checkout.addAddressSub'));

  // ── Server-priced bill (cart_quote): the SAME quote source as the old cart
  // screen, so the amount charged equals the amount displayed. Re-fetched here
  // for authority — never trust a client-passed total. Now re-quotes whenever
  // the on-screen speed / tip / address changes. ──
  const storeId = items[0]?.restaurantId ?? null;
  const quoteItems = useMemo(() => items.map((i) => ({ itemId: i.id, qty: i.qty })), [items]);
  const itemsKey = quoteItems.map((q) => `${q.itemId}:${q.qty}`).join(',');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  useEffect(() => {
    if (!storeId || quoteItems.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    agApi.cart
      .quote({ storeId, items: quoteItems, speed, tipDh: tip, addressId: selectedAddress?.id })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, itemsKey, speed, tip, selectedAddress?.id]);

  // ── Money (integer dirhams) — server quote is the source of truth ──
  const deliveryFee = quote?.deliveryFeeDh ?? 0;
  const priorityDh = quote?.priorityDh ?? (speed === 'priority' ? 9 : 0);
  const weatherDh = quote?.weatherSurchargeDh ?? (hasWeather ? 3 : 0);
  const tipAmount = quote?.tipDh ?? tip;
  const promoDiscount = promo.applied?.discountDh ?? 0;
  const grossTotal = quote ? quote.totalDh : subtotal + deliveryFee + priorityDh + weatherDh + tipAmount;
  const totalBeforeWallet = Math.max(0, grossTotal - promoDiscount);
  const walletCredit = payMethod === 'wallet' ? Math.min(balanceDh, totalBeforeWallet) : 0;
  const finalTotal = Math.max(0, totalBeforeWallet - walletCredit);
  const fullyCoveredByWallet = walletCredit > 0 && finalTotal === 0;

  const etaLabel = quote
    ? `${quote.etaMinutes[0]}–${quote.etaMinutes[1]}`
    : speed === 'priority'
      ? '14–18'
      : '18–24';

  const canSubmit =
    !!user &&
    items.length > 0 &&
    subtotalOk &&
    phoneOk &&
    // Placement is gated on a real LOCATION (saved-address coords or a GPS fix),
    // not a typed landmark.
    !!effectiveCoords &&
    !!quote &&
    !submitting;

  async function savePhone() {
    if (!user) return;
    const cleaned = phoneInput.replace(/[\s-]/g, '');
    if (!isValidMoroccanPhone(cleaned)) {
      Alert.alert(tr('checkout.invalidPhoneTitle'), tr('checkout.invalidPhoneBody'));
      return;
    }
    setPhoneSaving(true);
    const { error } = await supabase.from('profiles').update({ phone: cleaned }).eq('id', user.id);
    setPhoneSaving(false);
    if (error) {
      Alert.alert(tr('checkout.savePhoneErrorTitle'), error.message);
      return;
    }
    setPhoneOnFile(cleaned);
  }

  async function applyPromo() {
    await promo.apply(promoInput, subtotal, deliveryFee);
  }

  const handleSubmit = async () => {
    // Production: a real order requires a signed-in user (RLS enforces
    // orders.customer_id = auth.uid()).
    if (!user) {
      Alert.alert(tr('checkout.signInTitle'), tr('checkout.signInBody'), [
        { text: tr('checkout.notNow'), style: 'cancel' },
        { text: tr('checkout.signIn'), onPress: () => router.push('/sign-in') },
      ]);
      return;
    }
    if (items.length === 0) {
      Alert.alert(tr('checkout.emptyCartTitle'), tr('checkout.emptyCartBody'));
      return;
    }
    if (!subtotalOk) {
      Alert.alert(tr('checkout.almostThereTitle'), tr('checkout.minOrderBody', { min: MIN_ORDER_DH, more: MIN_ORDER_DH - subtotal }));
      return;
    }
    if (!phoneOk) {
      Alert.alert(tr('checkout.phoneNeededTitle'), tr('checkout.phoneNeededBody'));
      return;
    }
    if (!effectiveCoords) {
      Alert.alert(tr('checkout.locationRequiredTitle'), tr('checkout.locationRequiredBody'));
      return;
    }
    if (!quote) {
      Alert.alert(tr('checkout.oneMomentTitle'), tr('checkout.oneMomentBody'));
      return;
    }

    const orderId = await create({
      customerId: user.id,
      category: categoryKey,
      coords: effectiveCoords,
      // Location is the drop point; the address line is display-only, landmark optional.
      address: (dropSub || selectedAddress?.label || '').trim() || undefined,
      landmark: landmark.trim() || undefined,
      items: items.map((i) => ({
        id: i.id,
        restaurantId: i.restaurantId,
        restaurantName: i.restaurantName,
        name: i.name,
        priceDh: i.priceDh,
        qty: i.qty,
      })),
      subtotalDh: subtotal,
      deliveryFeeDh: deliveryFee,
      serviceFeeDh: priorityDh + weatherDh,
      totalDh: finalTotal,
      deliveryNotes: notes.trim() || undefined,
      // Wallet only counts as the payment method when it covers everything;
      // a partial wallet credit falls back to cash on delivery (web parity).
      paymentMethod: payMethod === 'card' ? 'card' : fullyCoveredByWallet ? 'wallet' : 'cash',
      promotionCode: promo.applied?.code ?? null,
      addressId: selectedAddress?.id ?? null,
      isCampus: isCampusOrder,
      tipDh: tipAmount,
      deliverySpeed: speed,
      handoff,
    });
    if (!orderId) {
      Alert.alert(tr('checkout.placeOrderErrorTitle'), createError?.message ?? tr('checkout.tryAgainMoment'));
      return;
    }

    // Card: collect payment via the native PaymentSheet against the order's
    // PaymentIntent (same create-payment-intent edge function as the web).
    // An abandoned/failed payment cancels the just-created order so no ghost
    // unpaid orders reach the kitchen.
    if (payMethod === 'card') {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { orderId, totalDh: finalTotal, customerEmail: user.email ?? undefined },
        });
        if (error || !data?.clientSecret) throw new Error(error?.message ?? tr('checkout.paymentStartError'));
        const paid = await payWithPaymentSheet(data.clientSecret as string, user.email ?? 'AtlaasGo customer');
        if (!paid) {
          await cancelOrder(orderId);
          Alert.alert(tr('checkout.paymentCanceledTitle'), tr('checkout.paymentCanceledBody'));
          return;
        }
      } catch (e) {
        await cancelOrder(orderId);
        Alert.alert(tr('checkout.paymentFailedTitle'), tr('checkout.paymentFailedBody', { message: (e as Error).message }));
        return;
      }
    }

    // Apply wallet credit via the SECURITY DEFINER RPC, which debits the
    // balance and writes the ledger row atomically (a direct client write
    // is blocked by RLS). The RPC RETURNS the new balance, or NULL when the
    // balance was insufficient (a stale client-side balance), and only raises
    // for auth/ownership errors — so we must inspect BOTH data and error.
    let walletFailed = false;
    if (walletCredit > 0) {
      const { data: newBalance, error: walletErr } = await supabase.rpc('pay_order_with_wallet', {
        p_order_id: orderId,
        p_amount: walletCredit,
      });
      walletFailed = !!walletErr || newBalance == null;
      if (walletFailed) {
        if (fullyCoveredByWallet) {
          // The order was inserted as total_dh=0 / payment_method='wallet'
          // with nothing collected. The debit never happened, so don't leave
          // a free order on the books — cancel it and stop.
          await cancelOrder(orderId);
          Alert.alert(
            tr('checkout.walletFailedTitle'),
            tr('checkout.walletFailedBody'),
          );
          return;
        }
        // Partial credit: the cash remainder still covers the order, but the
        // wallet portion was not applied — ask the user to pay full cash.
        Alert.alert(
          tr('checkout.walletNotAppliedTitle'),
          tr('checkout.walletNotAppliedBody'),
        );
      }
    }

    // Increment promo redemption only when the payment legs actually went
    // through — otherwise a failed wallet leg would still consume the promo's
    // limited redemption budget (best-effort, non-blocking).
    if (promo.applied && !walletFailed) redeemPromo(promo.applied.code);

    router.replace({ pathname: '/order/[id]', params: { id: orderId } });
    clearCart();
  };

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header t={t} onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IBag size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>
            {tr('checkout.emptyTitle')}
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            {tr('checkout.emptyBody')}
          </Text>
          <Press onPress={() => router.replace('/')}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.browseBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>{tr('checkout.browseSpots')}</Text>
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 176 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── order from ── */}
        <Rise>
          <View style={[styles.pad, { flexDirection: 'row', alignItems: 'center', gap: 11 }]}>
            <PhotoTile
              tile={tileFor(storeIdForTile || storeName)}
              em={foodEm(storeIdForTile)}
              radius={14}
              style={{ width: 46, height: 46 }}
            />
            <View>
              <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{tr('cart.orderFrom')}</Text>
              <Text style={[styles.disp, { fontSize: 16, color: t.colors.fg }]} numberOfLines={1}>
                {storeName}
              </Text>
            </View>
          </View>
        </Rise>

        {/* ── your items ── */}
        <Section
          t={t}
          title={tr('cart.yourItems')}
          right={
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>{tr('cart.addMore')}</Text>
            </Pressable>
          }
        >
          <View style={[card(t), { paddingHorizontal: 16, paddingVertical: 4 }]}>
            {items.map((c, i) => (
              <View key={c.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
                  <PhotoTile tile={tileFor(c.id)} em={foodEm(c.id)} radius={12} style={{ width: 48, height: 48 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Price v={c.priceDh} />
                  </View>
                  <Stepper t={t} qty={c.qty} onDec={() => setQty(c.id, c.qty - 1)} onInc={() => setQty(c.id, c.qty + 1)} />
                </View>
                {i < items.length - 1 && <View style={[styles.hr, { backgroundColor: t.colors.line }]} />}
              </View>
            ))}
          </View>
        </Section>

        {/* ── Signed-out note ── */}
        {!user && (
          <View style={[styles.pad, { marginTop: 18 }]}>
            <View
              style={[
                styles.softNote,
                { backgroundColor: 'rgba(255,87,34,0.08)', borderColor: 'rgba(255,87,34,0.3)', borderStyle: 'dashed' },
              ]}
            >
              <Text style={{ fontSize: 12, color: t.colors.fgSoft, lineHeight: 18 }}>{tr('checkout.signInNote')}</Text>
            </View>
          </View>
        )}

        {/* ── delivery drop (saved address + handoff + courier note) ── */}
        <Section
          t={t}
          title={isCampus ? tr('cart.dormPreciseDrop') : tr('cart.deliveryAddress')}
          right={
            user && addresses.length > 0 ? (
              <Pressable onPress={() => setPickOpen((o) => !o)} hitSlop={8}>
                <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>
                  {pickOpen ? tr('cart.done') : tr('cart.change')}
                </Text>
              </Pressable>
            ) : null
          }
        >
          {user && addrLoading ? (
            <View style={[card(t), { paddingVertical: 18, alignItems: 'center' }]}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : (
            <View style={card(t)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 }}>
                <LinearGradient
                  colors={t.gradients.sunset}
                  start={t.gradients.start}
                  end={t.gradients.end}
                  style={[styles.pinTile, t.shadows.glow]}
                >
                  {selectedAddress?.is_campus ? <IHome size={22} color="#fff" /> : <IPin size={22} color="#fff" />}
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.disp, { fontSize: 16, color: t.colors.fg }]} numberOfLines={1}>
                    {dropName}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
                    {dropSub}
                  </Text>
                </View>
                {selectedAddress && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(47,163,107,0.14)' }]}>
                    <ICheck size={13} color={t.colors.ok} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: t.colors.ok }}>{tr('cart.pinned')}</Text>
                  </View>
                )}
              </View>

              {pickOpen && addresses.length > 0 && (
                <MotiView
                  from={{ opacity: 0, translateY: 6 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 240 }}
                  style={{ borderTopWidth: 1, borderColor: t.colors.line, paddingHorizontal: 8, paddingVertical: 6 }}
                >
                  {addresses.map((opt) => {
                    const active = opt.id === selectedAddressId;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => selectAddress(opt)}
                        style={[styles.addrRow, active && { backgroundColor: 'rgba(255,87,34,0.10)' }]}
                      >
                        {opt.is_campus ? (
                          <IHome size={19} color={active ? t.colors.primary : t.colors.muted} />
                        ) : (
                          <IPin size={19} color={active ? t.colors.primary : t.colors.muted} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', fontSize: 14, color: t.colors.fg }} numberOfLines={1}>
                            {opt.label ?? tr('checkout.addressFallback')}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: t.colors.muted }} numberOfLines={1}>
                            {[opt.line1, opt.building].filter(Boolean).join(' · ') || opt.landmark || '—'}
                          </Text>
                        </View>
                        {active && <ICheck size={18} color={t.colors.primary} />}
                      </Pressable>
                    );
                  })}
                  {selectedAddressId && (
                    <Press onPress={() => { setSelectedAddressId(null); setPickOpen(false); }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.primary, paddingHorizontal: 12, paddingVertical: 8 }}>
                        {tr('checkout.useNewAddress')}
                      </Text>
                    </Press>
                  )}
                </MotiView>
              )}

              <View style={{ borderTopWidth: 1, borderColor: t.colors.line, padding: 13 }}>
                <Segmented
                  t={t}
                  value={handoff}
                  onChange={setHandoff}
                  options={[
                    ['door', tr('cart.handoffDoor')],
                    ['hand', tr('cart.handoffHand')],
                    ['lounge', isCampus ? tr('cart.handoffLounge') : tr('cart.handoffConcierge')],
                  ]}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingHorizontal: 2 }}>
                  <IUser size={15} color={t.colors.muted} />
                  <Text style={{ fontSize: 12.5, color: t.colors.muted }}>
                    {tr('cart.noteForCourier', { note: notes.trim() || tr('cart.leaveAtTheDoor') })}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Section>

        {/* ── Delivery location (GPS pin — based on location, no landmark) ── */}
        <View style={styles.pad}>
          <Rise style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 }}>
              <IPin size={14} color={t.colors.primary} strokeWidth={2.5} />
              <Text style={[styles.eyebrow, { color: t.colors.muted, marginBottom: 0 }]}>{tr('checkout.dropLocationEyebrow')}</Text>
            </View>
            {effectiveCoords ? (
              <View style={[styles.okStrip, { backgroundColor: 'rgba(47,163,107,0.10)', borderColor: 'rgba(47,163,107,0.24)' }]}>
                <ICheck size={14} color={t.colors.ok} />
                <Text style={{ marginLeft: 8, fontSize: 12.5, fontWeight: '700', color: t.colors.ok, flex: 1 }}>
                  {selectedAddress?.coords
                    ? tr('checkout.savedGpsNote', { address: selectedAddress.label ?? tr('checkout.thisAddress') })
                    : tr('checkout.locationPinned')}
                </Text>
              </View>
            ) : (
              <Press onPress={() => void capture()} scaleTo={0.97}>
                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: t.colors.primary, backgroundColor: t.colors.surface2, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 16 },
                  ]}
                >
                  <IPin size={18} color={t.colors.primary} strokeWidth={2.5} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: t.colors.fg, flex: 1 }}>
                    {locStatus === 'requesting' ? tr('checkout.locating') : tr('checkout.useMyLocation')}
                  </Text>
                  {locStatus === 'requesting' ? <ActivityIndicator color={t.colors.primary} /> : null}
                </View>
              </Press>
            )}
          </Rise>

          {locError && !selectedAddress?.coords && (
            <Text style={{ marginTop: 12, fontSize: 12, color: '#EF4444' }}>{locError}</Text>
          )}

          {/* ── Phone on file ── */}
          {user && !profileLoading && !phoneOk && (
            <Rise style={[styles.warnCard, { backgroundColor: 'rgba(232,169,59,0.10)', borderColor: 'rgba(232,169,59,0.24)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IPhone size={15} color={t.colors.warn} />
                <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: t.colors.warn, flex: 1 }}>
                  {tr('checkout.addPhonePrompt')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TextInput
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                  placeholder={tr('checkout.phonePlaceholder')}
                  placeholderTextColor={t.colors.muted}
                  style={{
                    flex: 1,
                    backgroundColor: t.colors.surface,
                    borderWidth: 1,
                    borderColor: t.colors.line,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: t.colors.fg,
                  }}
                />
                <Press onPress={savePhone} disabled={phoneSaving || !phoneInput.trim()}>
                  <LinearGradient
                    colors={t.gradients.sunset}
                    start={t.gradients.start}
                    end={t.gradients.end}
                    style={[styles.smallBtn, t.shadows.glow, { opacity: phoneSaving || !phoneInput.trim() ? 0.6 : 1 }]}
                  >
                    {phoneSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{tr('checkout.save')}</Text>
                    )}
                  </LinearGradient>
                </Press>
              </View>
            </Rise>
          )}

          {/* ── Driver notes (wired to orders.delivery_notes) ── */}
          <Rise style={{ marginTop: 22 }}>
            <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>{tr('checkout.driverNotesEyebrow')}</Text>
            <View style={[card(t), styles.inputWrap]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={tr('checkout.driverNotesPlaceholder')}
                placeholderTextColor={t.colors.muted}
                multiline
                style={{ paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: t.colors.fg, minHeight: 56 }}
              />
            </View>
          </Rise>
        </View>

        {/* ── delivery speed ── */}
        <Section t={t} title={tr('cart.deliverySpeed')}>
          <View style={{ gap: 10 }}>
            {(
              [
                {
                  k: 'standard' as Speed,
                  title: tr('cart.speedStandard'),
                  sub: hasWeather ? tr('cart.speedStandardSubWeather') : tr('cart.speedStandardSub'),
                  price: tr('cart.free'),
                },
                {
                  k: 'priority' as Speed,
                  title: tr('cart.speedPriority'),
                  sub: tr('cart.speedPrioritySub'),
                  price: tr('cart.priorityPrice'),
                },
              ]
            ).map((o) => {
              const active = speed === o.k;
              return (
                <Press key={o.k} onPress={() => setSpeed(o.k)}>
                  <View
                    style={[
                      card(t),
                      styles.speedRow,
                      { borderColor: active ? t.colors.primary : t.colors.line2, borderWidth: 1.5 },
                    ]}
                  >
                    <Radio t={t} active={active} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }}>{o.title}</Text>
                        {o.k === 'priority' && <IBolt size={14} color={t.colors.primary} />}
                      </View>
                      <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 1 }}>{o.sub}</Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        fontVariant: ['tabular-nums'],
                        color: o.k === 'standard' ? t.colors.ok : t.colors.fg,
                      }}
                    >
                      {o.price}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </View>

          {hasWeather && (
            <View style={[styles.snowStrip, { backgroundColor: 'rgba(62,134,199,0.09)', borderColor: 'rgba(62,134,199,0.2)' }]}>
              <ISnow size={19} color={t.colors.snow} />
              <Text style={{ fontSize: 12, color: t.colors.fgSoft, flex: 1, lineHeight: 17 }}>
                {tr('cart.snowStripBefore')}{' '}
                <Text style={{ fontWeight: '800', color: t.colors.fg }}>
                  {weatherDh ? `${weatherDh} dh` : `~${weather?.etaAddMinutes ?? 4} min`}
                </Text>{' '}
                {tr('cart.snowStripAfter')}
              </Text>
            </View>
          )}
        </Section>

        {/* ── tip ── */}
        <Section t={t} title={tr('cart.tipYourCourier')}>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {[0, 5, 10, 15].map((amt) => {
              const active = tip === amt;
              return (
                <Press key={amt} onPress={() => setTip(amt)} style={{ flex: 1 }}>
                  <View
                    style={[
                      card(t),
                      styles.tipPill,
                      { borderColor: active ? t.colors.primary : t.colors.line2, borderWidth: 1.5 },
                    ]}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 14,
                        fontVariant: ['tabular-nums'],
                        color: active ? t.colors.primary : t.colors.fg,
                      }}
                    >
                      {amt === 0 ? tr('cart.tipNone') : `${amt} dh`}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </Section>

        {/* ── promo code (real wiring) ── */}
        <Section t={t} title={tr('checkout.promoCodeEyebrow')}>
          {promo.applied ? (
            <View
              style={[
                styles.okStrip,
                { marginTop: 0, backgroundColor: 'rgba(47,163,107,0.10)', borderColor: 'rgba(47,163,107,0.24)' },
              ]}
            >
              <ICheck size={14} color={t.colors.ok} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: t.colors.ok, flex: 1 }}>
                {tr('checkout.promoApplied', { code: promo.applied.code, discount: promo.applied.discountDh })}
              </Text>
              <Press
                onPress={() => {
                  promo.remove();
                  setPromoInput('');
                }}
                scaleTo={0.9}
              >
                <View style={[styles.closeBtn, { backgroundColor: t.colors.surface2 }]}>
                  <IClose size={14} color={t.colors.fg} />
                </View>
              </Press>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[card(t), { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }]}>
                <IGift size={15} color={t.colors.muted} />
                <TextInput
                  value={promoInput}
                  onChangeText={(v) => setPromoInput(v.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="WELCOME50"
                  placeholderTextColor={t.colors.muted}
                  style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: t.colors.fg, letterSpacing: 1 }}
                />
              </View>
              <Press onPress={applyPromo} disabled={!promoInput.trim() || promo.checking}>
                <View style={[styles.applyBtn, { backgroundColor: t.colors.fg, opacity: !promoInput.trim() || promo.checking ? 0.5 : 1 }]}>
                  {promo.checking ? (
                    <ActivityIndicator color={t.colors.bg} size="small" />
                  ) : (
                    <Text style={{ color: t.colors.bg, fontWeight: '800', fontSize: 13 }}>{tr('checkout.apply')}</Text>
                  )}
                </View>
              </Press>
            </View>
          )}
          {promo.error && !promo.applied && (
            <Text style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{promo.error}</Text>
          )}
        </Section>

        {/* ── Payment method (real cash / wallet / card + Stripe gating) ── */}
        <Section t={t} title={tr('checkout.payWithEyebrow')}>
          <View style={{ gap: 10 }}>
            {/* Cash on delivery — default */}
            <Press onPress={() => setPayMethod('cash')}>
              <View
                style={[
                  card(t),
                  styles.payOption,
                  {
                    borderColor: payMethod === 'cash' ? t.colors.primary : t.colors.line2,
                    borderWidth: payMethod === 'cash' ? 1.5 : 1,
                    backgroundColor: payMethod === 'cash' ? 'rgba(255,87,34,0.06)' : t.colors.surface,
                  },
                ]}
              >
                <View style={[styles.payIcon, { backgroundColor: t.colors.ok }]}>
                  <Banknote size={17} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>{tr('checkout.cashTitle')}</Text>
                  <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>{tr('checkout.cashSubtitle')}</Text>
                </View>
                {payMethod === 'cash' && <ICheck size={18} color={t.colors.primary} />}
              </View>
            </Press>

            {/* Wallet credit — only when there's a balance */}
            {user && walletLoading ? (
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <ActivityIndicator color={t.colors.primary} size="small" />
              </View>
            ) : user && balanceDh > 0 ? (
              <Press onPress={() => setPayMethod('wallet')}>
                <View
                  style={[
                    card(t),
                    styles.payOption,
                    {
                      borderColor: payMethod === 'wallet' ? t.colors.primary : t.colors.line2,
                      borderWidth: payMethod === 'wallet' ? 1.5 : 1,
                      backgroundColor: payMethod === 'wallet' ? 'rgba(255,87,34,0.06)' : t.colors.surface,
                    },
                  ]}
                >
                  <View style={[styles.payIcon, { backgroundColor: '#635BFF' }]}>
                    <IWallet size={17} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>
                      {tr('checkout.walletTitle')}{payMethod === 'wallet' && walletCredit > 0 ? tr('checkout.walletCreditSuffix', { amount: walletCredit }) : ''}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>{tr('checkout.walletBalance', { balance: balanceDh })}</Text>
                  </View>
                  {payMethod === 'wallet' && <ICheck size={18} color={t.colors.primary} />}
                </View>
              </Press>
            ) : null}

            {/* Card — Stripe PaymentSheet when the native SDK is in the build,
                otherwise a visibly disabled row (old builds keep working). */}
            {isStripeAvailable ? (
              <Press onPress={() => setPayMethod('card')}>
                <View
                  style={[
                    card(t),
                    styles.payOption,
                    {
                      borderColor: payMethod === 'card' ? t.colors.primary : t.colors.line2,
                      borderWidth: payMethod === 'card' ? 1.5 : 1,
                      backgroundColor: payMethod === 'card' ? 'rgba(255,87,34,0.06)' : t.colors.surface,
                    },
                  ]}
                >
                  <View style={[styles.payIcon, { backgroundColor: t.colors.fg }]}>
                    <CreditCard size={17} color={t.colors.bg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>{tr('checkout.cardTitle')}</Text>
                    <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>{tr('checkout.cardSubtitle')}</Text>
                  </View>
                  {payMethod === 'card' && <ICheck size={18} color={t.colors.primary} />}
                </View>
              </Press>
            ) : (
              <View style={[card(t), styles.payOption, { opacity: 0.45 }]}>
                <View style={[styles.payIcon, { backgroundColor: t.colors.fg }]}>
                  <CreditCard size={17} color={t.colors.bg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>{tr('checkout.cardTitle')}</Text>
                  <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>{tr('checkout.cardComingSoon')}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Partial wallet note */}
          {payMethod === 'wallet' && walletCredit > 0 && !fullyCoveredByWallet && (
            <View style={[styles.warnStrip, { backgroundColor: 'rgba(232,169,59,0.10)', borderColor: 'rgba(232,169,59,0.24)' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: t.colors.warn, lineHeight: 18 }}>
                {tr('checkout.walletPartialNote', { covers: walletCredit, remaining: finalTotal })}
              </Text>
            </View>
          )}
        </Section>

        {/* ── Min-order warning ── */}
        {!subtotalOk && (
          <View style={styles.pad}>
            <View style={[styles.warnStrip, { marginTop: 18, backgroundColor: 'rgba(232,169,59,0.10)', borderColor: 'rgba(232,169,59,0.24)' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: t.colors.warn, lineHeight: 18 }}>
                {tr('checkout.minOrderWarning', { min: MIN_ORDER_DH, more: MIN_ORDER_DH - subtotal })}
              </Text>
            </View>
          </View>
        )}

        {/* ── Bill summary (server-priced light card) ── */}
        <Section t={t} title={tr('cart.billSummary')}>
          <View style={[card(t), { paddingHorizontal: 16, paddingVertical: 15 }]}>
            <BillRow t={t} label={tr('cart.subtotal')} value={`${subtotal} dh`} />
            {deliveryFee ? (
              <BillRow t={t} label={tr('cart.deliveryFee')} value={`${deliveryFee} dh`} />
            ) : (
              <BillRow t={t} label={tr('cart.deliveryFee')} value={tr('cart.free')} ok />
            )}
            {speed === 'priority' && priorityDh ? <BillRow t={t} label={tr('cart.priority')} value={`${priorityDh} dh`} /> : null}
            {hasWeather && weatherDh ? <BillRow t={t} label={tr('cart.winterSurcharge')} value={`${weatherDh} dh`} /> : null}
            {tipAmount > 0 ? <BillRow t={t} label={tr('cart.courierTip')} value={`${tipAmount} dh`} /> : null}
            {promoDiscount > 0 ? (
              <BillRow t={t} label={tr('checkout.billPromo', { code: promo.applied?.code })} value={`−${promoDiscount} dh`} ok />
            ) : null}
            {walletCredit > 0 ? <BillRow t={t} label={tr('checkout.billWalletCredit')} value={`−${walletCredit} dh`} ok /> : null}

            <View style={[styles.hr, { backgroundColor: t.colors.line, marginVertical: 9 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg }]}>{tr('cart.total')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                {quoting && <ActivityIndicator size="small" color={t.colors.muted} />}
                <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, fontVariant: ['tabular-nums'] }]}>
                  {finalTotal} dh
                </Text>
              </View>
            </View>
          </View>
        </Section>

        {createError && (
          <Text style={[styles.pad, { marginTop: 12, fontSize: 12, color: '#EF4444' }]}>{createError.message}</Text>
        )}
      </ScrollView>

      {/* ── Sticky 3.0 gradient "Place order" ── */}
      <View style={[styles.sticky, { backgroundColor: t.colors.bg, borderColor: t.colors.line }]}>
        <View style={styles.etaLine}>
          <Clock size={13} color={t.colors.muted} />
          <Text style={{ fontSize: 12, color: t.colors.muted }}>
            {tr('cart.arrivesIn')}{' '}
            <Text style={{ fontWeight: '800', color: t.colors.fg }}>{tr('cart.etaMin', { eta: etaLabel })}</Text>{' '}
            {tr('cart.arrivesTo', { name: dropName })}
          </Text>
        </View>
        <Press onPress={handleSubmit} disabled={!!user && !canSubmit}>
          {canSubmit || !user ? (
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.placeBtn, t.shadows.glow]}
            >
              <PlaceLabel />
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <IChevR size={18} color="#fff" strokeWidth={2.5} />
              )}
            </LinearGradient>
          ) : (
            <View style={[styles.placeBtn, { backgroundColor: t.colors.muted }]}>
              <PlaceLabel />
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <IChevR size={18} color="#fff" strokeWidth={2.5} />
              )}
            </View>
          )}
        </Press>
      </View>
    </SafeAreaView>
  );

  // Inline label so it can read the full submit gate without prop threading.
  function PlaceLabel() {
    return (
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginRight: 6, letterSpacing: 0.2 }}>
        {submitting
          ? tr('checkout.placingOrder')
          : !user
            ? tr('checkout.signInToOrder')
            : !subtotalOk
              ? tr('checkout.addMore', { more: MIN_ORDER_DH - subtotal })
              : !phoneOk
                ? tr('checkout.addPhoneFirst')
                : !effectiveCoords
                  ? tr('checkout.captureGpsFirst')
                  : !quote
                      ? tr('checkout.pricing')
                      : fullyCoveredByWallet
                        ? tr('checkout.placeOrderWallet')
                        : walletCredit > 0
                          ? tr('checkout.placeOrderCash', { total: finalTotal })
                          : tr('checkout.placeOrderTotal', { total: finalTotal })}
      </Text>
    );
  }
}

/* ── sub-components ───────────────────────────────────────────────────────── */

type Theme = Ag3Theme;

function Header({ t, onBack }: { t: Theme; onBack: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 }}
    >
      <Press onPress={onBack} scaleTo={0.9}>
        <View style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }]}>
          <IBack size={20} color={t.colors.fg} />
        </View>
      </Press>
      <Text style={[styles.disp, { fontWeight: '800', fontSize: 20, color: t.colors.fg }]}>{tr('checkout.headerTitle')}</Text>
    </MotiView>
  );
}

function Section({ t, title, right, children }: { t: Theme; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Rise style={[styles.pad, { marginTop: 22 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg }]}>{title}</Text>
        {right}
      </View>
      {children}
    </Rise>
  );
}

function Stepper({ t, qty, onDec, onInc }: { t: Theme; qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <View style={[styles.stepper, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
      <Pressable onPress={onDec} hitSlop={6} style={styles.stepBtn}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: t.colors.fg, lineHeight: 20 }}>–</Text>
      </Pressable>
      <Text style={{ fontWeight: '800', fontSize: 14, color: t.colors.fg, minWidth: 16, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {qty}
      </Text>
      <Pressable onPress={onInc} hitSlop={6} style={styles.stepBtn}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: t.colors.fg, lineHeight: 20 }}>+</Text>
      </Pressable>
    </View>
  );
}

function Segmented<T extends string>({
  t,
  value,
  onChange,
  options,
}: {
  t: Theme;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <View style={[styles.seg, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
      {options.map(([k, label]) => {
        const active = value === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            style={[styles.segBtn, active && [{ backgroundColor: t.colors.surface }, t.shadows.card]]}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 12.5, fontWeight: active ? '700' : '600', color: active ? t.colors.fg : t.colors.muted }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Radio({ t, active }: { t: Theme; active: boolean }) {
  return (
    <View style={[styles.radio, { borderColor: active ? t.colors.primary : t.colors.line }]}>
      {active && <View style={[styles.radioDot, { backgroundColor: t.colors.primary }]} />}
    </View>
  );
}

function BillRow({ t, label, value, ok }: { t: Theme; label: string; value: string; ok?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13.5, color: t.colors.fgSoft }}>{label}</Text>
      <Text style={{ fontSize: 13.5, fontWeight: '600', fontVariant: ['tabular-nums'], color: ok ? t.colors.ok : t.colors.fg }}>
        {value}
      </Text>
    </View>
  );
}

/* ── shared card base (matches account.tsx) ────────────────────────────────── */
function card(t: Theme) {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  } as const;
}

/* ── styles ────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  disp: { fontWeight: '800', letterSpacing: -0.4 },
  eyebrow: { fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  pad: { paddingHorizontal: 18 },
  hr: { height: 1, width: '100%' },

  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  browseBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 },

  softNote: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },

  pinTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, borderRadius: 14 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 3 },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },

  inputWrap: { borderRadius: 18, overflow: 'hidden' },
  okStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },

  warnCard: { marginTop: 22, borderRadius: 20, padding: 14, borderWidth: 1 },
  warnStrip: { marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  smallBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 46 },

  closeBtn: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, height: 46 },

  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 14 },
  radio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 999 },

  snowStrip: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 18, borderWidth: 1 },

  tipPill: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },

  payOption: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  payIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, borderWidth: 1, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11 },

  etaLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22 },
});

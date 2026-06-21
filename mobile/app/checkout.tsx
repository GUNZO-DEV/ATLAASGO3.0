// AtlaasGo 3.0 — Checkout / payment (the order-create + pay step).
//
// Native re-skin to the 3.0 design language (warm terracotta + amber on
// cream/ink, sunset gradient header + CTA, rounded cards, dark Bill summary)
// built on the ag3 foundation: useAg3Theme, components/ag3/icons,
// components/ag3/primitives (Press, Rise). Dark-mode aware.
//
// LOGIC PRESERVED EXACTLY (presentation-only re-skin) ──────────────────────────
//   • Saved-address selection (supabase addresses read, auto-select default,
//     selectAddress, "use a new address instead").
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
//   • expo-router params (category / speed / tipDh / handoff / addressId) and
//     navigation (router.replace to /order/[id]).
// None of the money math or order-create logic is touched.
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

import { useAg3Theme, type Ag3Theme } from '../components/ag3/theme';
import { Press, Rise } from '../components/ag3/primitives';
import {
  IBack,
  IPin,
  IHome,
  IPhone,
  ICheck,
  IClose,
  IWallet,
  IBag,
  IChevR,
  IGift,
} from '../components/ag3/icons';

const MIN_ORDER_DH = 30; // Minimum order subtotal — same as web (src/pages/Cart.tsx)

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  food: 'Food',
  pharmacy: 'Pharmacy',
  groceries: 'Groceries',
};

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
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; speed?: string; tipDh?: string; handoff?: string; addressId?: string }>();
  const categoryKey = (params.category as CategoryKey) ?? 'food';
  // 3.0 cart selections carried over so the charge matches the displayed quote.
  const speed: 'standard' | 'priority' = params.speed === 'priority' ? 'priority' : 'standard';
  const tipDh = Math.max(0, parseInt(params.tipDh ?? '0', 10) || 0);
  const handoff: 'door' | 'hand' | 'lounge' =
    params.handoff === 'hand' ? 'hand' : params.handoff === 'lounge' ? 'lounge' : 'door';

  // Line items + subtotal from the live cart store; the fee breakdown (delivery,
  // priority, winter surcharge, tip) now comes from the server cart_quote — the
  // SAME source the 3.0 cart screen shows, so charged == displayed.
  const items = useCart((s) => s.items);
  const isCampusOrder = useCart((s) => s.isCampusOrder);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart((s) => s.subtotal());

  const { user } = useAuth();
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const { coords: gpsCoords, status: locStatus, capture, error: locError } = useLocation();
  const { create, submitting, error: createError } = useCreateOrder();
  const { balanceDh, loading: walletLoading } = useWallet();
  const promo = usePromotions();

  // ── Saved addresses (with coords — the shared hook omits them) ──
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

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
  }

  // A saved address with coords skips the GPS requirement; otherwise the
  // manual GPS capture flow stays as fallback.
  const effectiveCoords = selectedAddress?.coords ?? gpsCoords;
  const landmarkValid = landmark.trim().length >= MIN_LANDMARK_LENGTH;
  const phoneOk = !!phoneOnFile && phoneOnFile.length >= 8;
  const subtotalOk = subtotal >= MIN_ORDER_DH;

  // ── Server-priced bill (cart_quote): the SAME quote the 3.0 cart shows, so
  // the amount charged equals the amount displayed. Re-fetched here for
  // authority — never trust a client-passed total. ──
  const storeId = items[0]?.restaurantId ?? null;
  const quoteItems = items.map((i) => ({ itemId: i.id, qty: i.qty }));
  const itemsKey = quoteItems.map((q) => `${q.itemId}:${q.qty}`).join(',');
  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    if (!storeId || quoteItems.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    agApi.cart
      .quote({ storeId, items: quoteItems, speed, tipDh, addressId: selectedAddress?.id })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, itemsKey, speed, tipDh, selectedAddress?.id]);

  // ── Money (integer dirhams) — server quote is the source of truth ──
  const deliveryFee = quote?.deliveryFeeDh ?? 0;
  const priorityDh = quote?.priorityDh ?? 0;
  const weatherDh = quote?.weatherSurchargeDh ?? 0;
  const tipAmount = quote?.tipDh ?? tipDh;
  const promoDiscount = promo.applied?.discountDh ?? 0;
  const grossTotal = quote ? quote.totalDh : subtotal + deliveryFee + priorityDh + weatherDh + tipAmount;
  const totalBeforeWallet = Math.max(0, grossTotal - promoDiscount);
  const walletCredit = payMethod === 'wallet' ? Math.min(balanceDh, totalBeforeWallet) : 0;
  const finalTotal = Math.max(0, totalBeforeWallet - walletCredit);
  const fullyCoveredByWallet = walletCredit > 0 && finalTotal === 0;

  const canSubmit =
    !!user &&
    items.length > 0 &&
    subtotalOk &&
    phoneOk &&
    landmarkValid &&
    !!effectiveCoords &&
    !!quote &&
    !submitting;

  async function savePhone() {
    if (!user) return;
    const cleaned = phoneInput.replace(/[\s-]/g, '');
    if (!isValidMoroccanPhone(cleaned)) {
      Alert.alert('Invalid phone', 'Enter a Moroccan number like +212612345678 or 0612345678.');
      return;
    }
    setPhoneSaving(true);
    const { error } = await supabase.from('profiles').update({ phone: cleaned }).eq('id', user.id);
    setPhoneSaving(false);
    if (error) {
      Alert.alert('Could not save phone', error.message);
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
      Alert.alert('Sign in to order', 'Create an account or sign in to place your order.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/sign-in') },
      ]);
      return;
    }
    if (items.length === 0) {
      Alert.alert('Cart is empty', 'Add items before placing an order.');
      return;
    }
    if (!subtotalOk) {
      Alert.alert('Almost there', `Minimum order is ${MIN_ORDER_DH} dh — add ${MIN_ORDER_DH - subtotal} dh more to checkout.`);
      return;
    }
    if (!phoneOk) {
      Alert.alert('Phone needed', 'Add your phone number so your rider can reach you.');
      return;
    }
    if (!effectiveCoords) {
      Alert.alert('Location required', 'Tap "Capture" to share your GPS pin, or pick a saved address.');
      return;
    }
    if (!landmarkValid) {
      Alert.alert('Landmark required', 'Add a quick landmark so your driver finds you.');
      return;
    }
    if (!quote) {
      Alert.alert('One moment', "We're still calculating your total — try again in a second.");
      return;
    }

    const orderId = await create({
      customerId: user.id,
      category: categoryKey,
      coords: effectiveCoords,
      landmark: landmark.trim(),
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
      Alert.alert('Could not place order', createError?.message ?? 'Please try again in a moment.');
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
        if (error || !data?.clientSecret) throw new Error(error?.message ?? 'Could not start the payment');
        const paid = await payWithPaymentSheet(data.clientSecret as string, user.email ?? 'AtlaasGo customer');
        if (!paid) {
          await cancelOrder(orderId);
          Alert.alert('Payment canceled', 'Your order was not placed.');
          return;
        }
      } catch (e) {
        await cancelOrder(orderId);
        Alert.alert('Payment failed', `${(e as Error).message}\n\nYour order was not placed — try again or pay cash on delivery.`);
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
            'Wallet payment failed',
            'Your wallet balance changed and the payment could not be completed. Your order was not placed — please try again.',
          );
          return;
        }
        // Partial credit: the cash remainder still covers the order, but the
        // wallet portion was not applied — ask the user to pay full cash.
        Alert.alert(
          'Wallet credit not applied',
          'Your order was placed, but the wallet payment failed — please pay the full amount in cash on delivery.',
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

  // ── 3.0 sunset header ──
  function Header() {
    return (
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
        <Text style={[styles.disp, { fontWeight: '800', fontSize: 20, color: t.colors.fg }]}>Payment</Text>
        <View style={{ width: 42 }} />
      </MotiView>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IBag size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>
            Nothing to check out
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Your cart is empty. Add items from a spot to get started.
          </Text>
          <Press onPress={() => router.replace('/')}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.browseBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>Browse spots</Text>
            </LinearGradient>
          </Press>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <Header />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 168 }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <Text style={[styles.eyebrow, { color: t.colors.primary, marginTop: 6 }]}>
            {CATEGORY_LABELS[categoryKey].toUpperCase()} DELIVERY
          </Text>
          <Text style={[styles.disp, { fontSize: 27, color: t.colors.fg, marginTop: 3, lineHeight: 31 }]}>
            Where exactly{'\n'}should we drop it?
          </Text>
        </Rise>

        {/* ── Signed-out note ── */}
        {!user && (
          <View
            style={[
              styles.softNote,
              { backgroundColor: 'rgba(255,87,34,0.08)', borderColor: 'rgba(255,87,34,0.3)', borderStyle: 'dashed' },
            ]}
          >
            <Text style={{ fontSize: 12, color: t.colors.fgSoft, lineHeight: 18 }}>
              You'll be asked to sign in before your order is placed.
            </Text>
          </View>
        )}

        {/* ── Saved addresses ── */}
        {user && (addrLoading ? (
          <View style={{ marginTop: 22, paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : addresses.length > 0 ? (
          <Rise style={{ marginTop: 22 }}>
            <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>SAVED ADDRESSES</Text>
            <View style={{ gap: 10 }}>
              {addresses.map((a) => {
                const active = selectedAddressId === a.id;
                return (
                  <Press key={a.id} onPress={() => selectAddress(a)}>
                    <View
                      style={[
                        card(t),
                        styles.addrCard,
                        {
                          borderColor: active ? t.colors.primary : t.colors.line2,
                          borderWidth: active ? 1.5 : 1,
                          backgroundColor: active ? 'rgba(255,87,34,0.06)' : t.colors.surface,
                        },
                      ]}
                    >
                      {active ? (
                        <LinearGradient
                          colors={t.gradients.sunset}
                          start={t.gradients.start}
                          end={t.gradients.end}
                          style={[styles.addrIcon, t.shadows.glow]}
                        >
                          {a.is_campus ? <IHome size={17} color="#fff" /> : <IPin size={17} color="#fff" />}
                        </LinearGradient>
                      ) : (
                        <View style={[styles.addrIcon, { backgroundColor: t.colors.surface2 }]}>
                          {a.is_campus ? <IHome size={17} color={t.colors.fg} /> : <IPin size={17} color={t.colors.fg} />}
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }} numberOfLines={1}>
                          {a.label ?? 'Address'}
                        </Text>
                        <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }} numberOfLines={1}>
                          {[a.line1, a.building, a.room ? `Rm ${a.room}` : null].filter(Boolean).join(' · ') ||
                            a.landmark ||
                            '—'}
                        </Text>
                      </View>
                      {active && <ICheck size={18} color={t.colors.primary} />}
                    </View>
                  </Press>
                );
              })}
              {selectedAddressId && (
                <Press onPress={() => setSelectedAddressId(null)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.colors.primary, paddingHorizontal: 2, paddingVertical: 4 }}>
                    Use a new address instead
                  </Text>
                </Press>
              )}
            </View>
          </Rise>
        ) : null)}

        {/* ── Landmark + GPS ── */}
        <Rise style={{ marginTop: 22 }}>
          {selectedAddress?.coords ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                <IPin size={14} color={t.colors.primary} strokeWidth={2.5} />
                <Text style={[styles.eyebrow, { color: t.colors.muted, marginBottom: 0 }]}>LANDMARK · REQUIRED</Text>
              </View>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: landmarkValid || !landmark ? t.colors.line : '#EF4444',
                    backgroundColor: t.colors.surface2,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder='e.g. "Near the Grand Mosque"'
                  placeholderTextColor={t.colors.muted}
                  multiline
                  style={{ paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: t.colors.fg, minHeight: 64 }}
                />
              </View>
              <View
                style={[
                  styles.okStrip,
                  { backgroundColor: 'rgba(47,163,107,0.10)', borderColor: 'rgba(47,163,107,0.24)' },
                ]}
              >
                <ICheck size={14} color={t.colors.ok} />
                <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '700', color: t.colors.ok, flex: 1 }}>
                  Using the saved GPS pin from “{selectedAddress.label ?? 'this address'}” — no need to capture.
                </Text>
              </View>
            </View>
          ) : (
            <LandmarkInput
              value={landmark}
              onChange={setLandmark}
              coords={gpsCoords}
              onCaptureCoords={capture}
              capturing={locStatus === 'requesting'}
            />
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
                Add a phone number so your rider can reach you
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TextInput
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                placeholder="+212612345678 or 0612345678"
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
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Save</Text>
                  )}
                </LinearGradient>
              </Press>
            </View>
          </Rise>
        )}

        {/* ── Driver notes (wired to orders.delivery_notes) ── */}
        <Rise style={{ marginTop: 22 }}>
          <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>DRIVER NOTES · OPTIONAL</Text>
          <View style={[card(t), styles.inputWrap]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Gate code, floor, anything else"
              placeholderTextColor={t.colors.muted}
              multiline
              style={{ paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: t.colors.fg, minHeight: 56 }}
            />
          </View>
        </Rise>

        {/* ── Promo code ── */}
        <Rise style={{ marginTop: 22 }}>
          <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>PROMO CODE</Text>
          {promo.applied ? (
            <View
              style={[
                styles.okStrip,
                { marginTop: 0, backgroundColor: 'rgba(47,163,107,0.10)', borderColor: 'rgba(47,163,107,0.24)' },
              ]}
            >
              <ICheck size={14} color={t.colors.ok} />
              <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: t.colors.ok, flex: 1 }}>
                {promo.applied.code} applied · −{promo.applied.discountDh} dh
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
              <View
                style={[
                  card(t),
                  { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
                ]}
              >
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
                <View
                  style={[
                    styles.applyBtn,
                    { backgroundColor: t.colors.fg, opacity: !promoInput.trim() || promo.checking ? 0.5 : 1 },
                  ]}
                >
                  {promo.checking ? (
                    <ActivityIndicator color={t.colors.bg} size="small" />
                  ) : (
                    <Text style={{ color: t.colors.bg, fontWeight: '800', fontSize: 13 }}>Apply</Text>
                  )}
                </View>
              </Press>
            </View>
          )}
          {promo.error && !promo.applied && (
            <Text style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{promo.error}</Text>
          )}
        </Rise>

        {/* ── Payment method ── */}
        <Rise style={{ marginTop: 22 }}>
          <Text style={[styles.eyebrow, { color: t.colors.primary, marginBottom: 10 }]}>PAY WITH</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>Cash on delivery</Text>
                  <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>Pay the rider when it arrives</Text>
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
                      Wallet credit{payMethod === 'wallet' && walletCredit > 0 ? ` · −${walletCredit} dh` : ''}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>Balance: {balanceDh} dh</Text>
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
                    <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>Credit / debit card</Text>
                    <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>Secure payment via Stripe</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.fg }}>Credit / debit card</Text>
                  <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 2 }}>Arriving in the next update</Text>
                </View>
              </View>
            )}
          </View>

          {/* Partial wallet note */}
          {payMethod === 'wallet' && walletCredit > 0 && !fullyCoveredByWallet && (
            <View style={[styles.warnStrip, { backgroundColor: 'rgba(232,169,59,0.10)', borderColor: 'rgba(232,169,59,0.24)' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: t.colors.warn, lineHeight: 18 }}>
                Wallet covers {walletCredit} dh — the remaining {finalTotal} dh is cash on delivery.
              </Text>
            </View>
          )}
        </Rise>

        {/* ── Min-order warning ── */}
        {!subtotalOk && (
          <View style={[styles.warnStrip, { marginTop: 18, backgroundColor: 'rgba(232,169,59,0.10)', borderColor: 'rgba(232,169,59,0.24)' }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.colors.warn, lineHeight: 18 }}>
              Minimum order is {MIN_ORDER_DH} dh — add {MIN_ORDER_DH - subtotal} dh more to checkout.
            </Text>
          </View>
        )}

        {/* ── Order summary — dark Bill card (3.0 tokens) ── */}
        <Rise style={[styles.billCard, t.shadows.lift]}>
          <LinearGradient
            colors={t.isDark ? ['#231910', '#19120C'] : ['#211913', '#100B07']}
            start={t.gradients.start}
            end={t.gradients.end}
            style={StyleSheet.absoluteFill}
          />
          <BillRow label="Subtotal" value={`${subtotal} dh`} />
          <BillRow label="Delivery" value={deliveryFee === 0 ? 'Free' : `${deliveryFee} dh`} />
          {priorityDh > 0 && <BillRow label="Priority" value={`${priorityDh} dh`} />}
          {weatherDh > 0 && <BillRow label="Winter surcharge" value={`${weatherDh} dh`} />}
          {tipAmount > 0 && <BillRow label="Courier tip" value={`${tipAmount} dh`} />}
          {promoDiscount > 0 && (
            <BillRow label={`Promo · ${promo.applied?.code}`} value={`−${promoDiscount} dh`} accent="#3FD08A" />
          )}
          {walletCredit > 0 && <BillRow label="Wallet credit" value={`−${walletCredit} dh`} accent="#A99DFF" />}
          <View style={styles.billTotalRow}>
            <Text style={[styles.disp, { fontSize: 15, color: '#fff' }]}>Total</Text>
            <Text style={[styles.disp, { fontSize: 19, color: '#fff', fontVariant: ['tabular-nums'] }]}>
              {finalTotal} dh
            </Text>
          </View>
        </Rise>

        {createError && (
          <Text style={{ marginTop: 12, fontSize: 12, color: '#EF4444' }}>{createError.message}</Text>
        )}
      </ScrollView>

      {/* ── Sticky 3.0 gradient "Place order" ── */}
      <View style={[styles.sticky, { backgroundColor: t.colors.bg, borderColor: t.colors.line }]}>
        {quote && (
          <View style={styles.etaLine}>
            <Clock size={13} color={t.colors.muted} />
            <Text style={{ fontSize: 12, color: t.colors.muted }}>
              Arrives in{' '}
              <Text style={{ fontWeight: '800', color: t.colors.fg }}>
                {quote.etaMinutes[0]}–{quote.etaMinutes[1]} min
              </Text>
              {selectedAddress?.label ? ` · to ${selectedAddress.label}` : ''}
            </Text>
          </View>
        )}
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
          ? 'Placing order…'
          : !user
            ? 'Sign in to order'
            : !subtotalOk
              ? `Add ${MIN_ORDER_DH - subtotal} dh more`
              : !phoneOk
                ? 'Add your phone first'
                : !effectiveCoords
                  ? 'Capture GPS first'
                  : !landmarkValid
                    ? 'Add a landmark'
                    : !quote
                      ? 'Pricing…'
                      : fullyCoveredByWallet
                        ? 'Place order · paid from wallet'
                        : `Place order · ${finalTotal} dh${walletCredit > 0 ? ' cash' : ''}`}
      </Text>
    );
  }
}

/* ── dark Bill summary row ─────────────────────────────────────────────────── */
function BillRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.billRow}>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: accent ?? 'rgba(255,255,255,0.62)' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: accent ?? '#fff', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/* ── shared card base (matches cart.tsx / account.tsx) ─────────────────────── */
function card(t: Ag3Theme) {
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
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  browseBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 },

  softNote: { marginTop: 20, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },

  addrCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  addrIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  inputWrap: { borderRadius: 18, overflow: 'hidden' },
  okStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },

  warnCard: { marginTop: 22, borderRadius: 20, padding: 14, borderWidth: 1 },
  warnStrip: { marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  smallBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 46 },

  closeBtn: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, height: 46 },

  payOption: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  payIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  billCard: { marginTop: 22, borderRadius: 26, padding: 20, overflow: 'hidden' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 13,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  etaLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
});

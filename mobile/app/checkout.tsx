import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  Home,
  MapPin,
  Phone,
  ShoppingBag,
  Tag,
  Wallet,
  X,
} from 'lucide-react-native';
import { LandmarkInput, MIN_LANDMARK_LENGTH } from '../components/LandmarkInput';
import { PressableScale } from '../components/primitives/PressableScale';
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

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const LINE = 'rgba(26,20,16,0.08)';
const GREEN = '#059669';
const AMBER = '#B45309';

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

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] uppercase font-bold mb-2" style={{ letterSpacing: 1.4, color: MUTED }}>
      {children}
    </Text>
  );
}

export default function Checkout() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const categoryKey = (category as CategoryKey) ?? 'food';

  // Real totals come from the cart store (same fee model as the web app).
  const items = useCart((s) => s.items);
  const isCampusOrder = useCart((s) => s.isCampusOrder);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = useCart((s) => s.deliveryFee());
  const serviceFee = useCart((s) => s.serviceFee());

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

  // ── Money (integer dirhams) — mirrors the web cart math exactly ──
  const promoDiscount = promo.applied?.discountDh ?? 0;
  const totalBeforeWallet = Math.max(0, subtotal + deliveryFee + serviceFee - promoDiscount);
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
      serviceFeeDh: serviceFee,
      totalDh: finalTotal,
      deliveryNotes: notes.trim() || undefined,
      // Wallet only counts as the payment method when it covers everything;
      // a partial wallet credit falls back to cash on delivery (web parity).
      paymentMethod: payMethod === 'card' ? 'card' : fullyCoveredByWallet ? 'wallet' : 'cash',
      promotionCode: promo.applied?.code ?? null,
      addressId: selectedAddress?.id ?? null,
      isCampus: isCampusOrder,
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

  function Header() {
    return (
      <MotiView
        from={{ opacity: 0, translateX: -8 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 240 }}
        className="flex-row items-center justify-between pt-3"
      >
        <PressableScale onPress={() => router.back()}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1, borderColor: LINE }}
          >
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>
          Step 2 of 3
        </Text>
        <View style={{ width: 40 }} />
      </MotiView>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <View className="flex-1 px-6">
          <Header />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
            <ShoppingBag size={30} color={MUTED} />
            <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>
              Nothing to check out
            </Text>
            <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
              Your cart is empty. Add items from a restaurant to get started.
            </Text>
            <PressableScale onPress={() => router.replace('/')}>
              <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse restaurants</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320, delay: 80 }}
          className="mt-6"
        >
          <Text className="text-[12px] uppercase font-bold" style={{ letterSpacing: 1.6, color: MUTED }}>
            {CATEGORY_LABELS[categoryKey]} delivery
          </Text>
          <Text
            className="font-display text-[28px] mt-1"
            style={{ fontWeight: '800', letterSpacing: -0.8, color: INK, lineHeight: 32 }}
          >
            Where exactly{'\n'}should we drop it?
          </Text>
        </MotiView>

        {/* ── Signed-out note ── */}
        {!user && (
          <View
            className="mt-5 rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'rgba(255,87,34,0.08)', borderWidth: 1, borderColor: 'rgba(255,87,34,0.3)', borderStyle: 'dashed' }}
          >
            <Text className="text-[12px]" style={{ color: MUTED, lineHeight: 18 }}>
              You'll be asked to sign in before your order is placed.
            </Text>
          </View>
        )}

        {/* ── Saved addresses ── */}
        {user && (addrLoading ? (
          <View className="mt-6 py-4 items-center">
            <ActivityIndicator color={BRAND} />
          </View>
        ) : addresses.length > 0 ? (
          <MotiView
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 120 }}
            className="mt-6"
          >
            <SectionLabel>Saved addresses</SectionLabel>
            <View style={{ gap: 8 }}>
              {addresses.map((a) => {
                const active = selectedAddressId === a.id;
                return (
                  <PressableScale key={a.id} onPress={() => selectAddress(a)}>
                    <View
                      className="flex-row items-center bg-white rounded-2xl p-4"
                      style={{
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? BRAND : 'rgba(26,20,16,0.07)',
                        backgroundColor: active ? 'rgba(255,87,34,0.05)' : '#fff',
                      }}
                    >
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: active ? BRAND : 'rgba(26,20,16,0.06)' }}
                      >
                        {a.is_campus ? (
                          <Home size={16} color={active ? '#fff' : INK} />
                        ) : (
                          <MapPin size={16} color={active ? '#fff' : INK} />
                        )}
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-[14px] font-bold" style={{ color: INK }} numberOfLines={1}>
                          {a.label ?? 'Address'}
                        </Text>
                        <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>
                          {[a.line1, a.building, a.room ? `Rm ${a.room}` : null].filter(Boolean).join(' · ') ||
                            a.landmark ||
                            '—'}
                        </Text>
                      </View>
                      {active && <Check size={16} color={BRAND} />}
                    </View>
                  </PressableScale>
                );
              })}
              {selectedAddressId && (
                <PressableScale onPress={() => setSelectedAddressId(null)}>
                  <Text className="text-[12px] font-bold px-1 py-1" style={{ color: BRAND }}>
                    Use a new address instead
                  </Text>
                </PressableScale>
              )}
            </View>
          </MotiView>
        ) : null)}

        {/* ── Landmark + GPS ── */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 160 }}
          className="mt-6"
        >
          {selectedAddress?.coords ? (
            <View>
              <View className="flex-row items-center mb-2">
                <MapPin size={14} color={BRAND} strokeWidth={2.5} />
                <Text className="ml-1.5 text-[11px] uppercase font-bold" style={{ letterSpacing: 1.4, color: MUTED }}>
                  Landmark · required
                </Text>
              </View>
              <View
                className="rounded-2xl"
                style={{ borderWidth: 1.5, borderColor: landmarkValid || !landmark ? 'rgba(26,20,16,0.10)' : '#EF4444', backgroundColor: '#FBF7F2' }}
              >
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder='e.g. "Near the Grand Mosque"'
                  placeholderTextColor="#9B8F84"
                  multiline
                  style={{ paddingHorizontal: 18, paddingVertical: 16, fontSize: 15, color: INK, minHeight: 64 }}
                />
              </View>
              <View
                className="flex-row items-center mt-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: 'rgba(5,150,105,0.08)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.24)' }}
              >
                <Check size={14} color={GREEN} />
                <Text className="ml-2 text-[12px] font-bold flex-1" style={{ color: GREEN }}>
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
        </MotiView>

        {locError && !selectedAddress?.coords && (
          <Text className="mt-3 text-[12px]" style={{ color: '#EF4444' }}>
            {locError}
          </Text>
        )}

        {/* ── Phone on file ── */}
        {user && !profileLoading && !phoneOk && (
          <MotiView
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 180 }}
            className="mt-6 rounded-2xl p-4"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)' }}
          >
            <View className="flex-row items-center">
              <Phone size={15} color={AMBER} />
              <Text className="ml-2 text-[13px] font-bold flex-1" style={{ color: AMBER }}>
                Add a phone number so your rider can reach you
              </Text>
            </View>
            <View className="flex-row mt-3" style={{ gap: 8 }}>
              <TextInput
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                placeholder="+212612345678 or 0612345678"
                placeholderTextColor="#A89E94"
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: 'rgba(26,20,16,0.10)',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: INK,
                }}
              />
              <PressableScale onPress={savePhone} disabled={phoneSaving || !phoneInput.trim()}>
                <View
                  className="rounded-2xl items-center justify-center px-4"
                  style={{ backgroundColor: BRAND, height: 46, opacity: phoneSaving || !phoneInput.trim() ? 0.6 : 1 }}
                >
                  {phoneSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save</Text>
                  )}
                </View>
              </PressableScale>
            </View>
          </MotiView>
        )}

        {/* ── Driver notes (wired to orders.delivery_notes) ── */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 220 }}
          className="mt-6"
        >
          <SectionLabel>Driver notes · optional</SectionLabel>
          <View className="rounded-2xl bg-white" style={{ borderWidth: 1, borderColor: LINE }}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Gate code, floor, anything else"
              placeholderTextColor="#9B8F84"
              multiline
              style={{ paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: INK, minHeight: 56 }}
            />
          </View>
        </MotiView>

        {/* ── Promo code ── */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 260 }}
          className="mt-6"
        >
          <SectionLabel>Promo code</SectionLabel>
          {promo.applied ? (
            <View
              className="flex-row items-center rounded-2xl px-4 py-3"
              style={{ backgroundColor: 'rgba(5,150,105,0.08)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.24)' }}
            >
              <Check size={14} color={GREEN} />
              <Text className="ml-2 text-[13px] font-bold flex-1" style={{ color: GREEN }}>
                {promo.applied.code} applied · −{promo.applied.discountDh} dh
              </Text>
              <PressableScale
                onPress={() => {
                  promo.remove();
                  setPromoInput('');
                }}
              >
                <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
                  <X size={14} color={INK} />
                </View>
              </PressableScale>
            </View>
          ) : (
            <View className="flex-row" style={{ gap: 8 }}>
              <View
                className="flex-1 flex-row items-center rounded-2xl bg-white px-3"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)' }}
              >
                <Tag size={14} color={MUTED} />
                <TextInput
                  value={promoInput}
                  onChangeText={(v) => setPromoInput(v.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="WELCOME50"
                  placeholderTextColor="#A89E94"
                  style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: INK, letterSpacing: 1 }}
                />
              </View>
              <PressableScale onPress={applyPromo} disabled={!promoInput.trim() || promo.checking}>
                <View
                  className="rounded-2xl items-center justify-center px-5"
                  style={{ backgroundColor: INK, height: 46, opacity: !promoInput.trim() || promo.checking ? 0.5 : 1 }}
                >
                  {promo.checking ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Apply</Text>
                  )}
                </View>
              </PressableScale>
            </View>
          )}
          {promo.error && !promo.applied && (
            <Text className="mt-2 text-[12px]" style={{ color: '#EF4444' }}>
              {promo.error}
            </Text>
          )}
        </MotiView>

        {/* ── Payment method ── */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 300 }}
          className="mt-6"
        >
          <SectionLabel>Pay with</SectionLabel>
          <View style={{ gap: 8 }}>
            {/* Cash on delivery — default */}
            <PressableScale onPress={() => setPayMethod('cash')}>
              <View
                className="flex-row items-center rounded-2xl p-4"
                style={{
                  borderWidth: 2,
                  borderColor: payMethod === 'cash' ? BRAND : 'rgba(26,20,16,0.07)',
                  backgroundColor: payMethod === 'cash' ? 'rgba(255,87,34,0.06)' : '#fff',
                }}
              >
                <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: GREEN }}>
                  <Banknote size={16} color="#fff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-bold" style={{ color: INK }}>Cash on delivery</Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: MUTED }}>Pay the rider when it arrives</Text>
                </View>
                {payMethod === 'cash' && <Check size={16} color={BRAND} />}
              </View>
            </PressableScale>

            {/* Wallet credit — only when there's a balance */}
            {user && walletLoading ? (
              <View className="py-2 items-center">
                <ActivityIndicator color={BRAND} size="small" />
              </View>
            ) : user && balanceDh > 0 ? (
              <PressableScale onPress={() => setPayMethod('wallet')}>
                <View
                  className="flex-row items-center rounded-2xl p-4"
                  style={{
                    borderWidth: 2,
                    borderColor: payMethod === 'wallet' ? BRAND : 'rgba(26,20,16,0.07)',
                    backgroundColor: payMethod === 'wallet' ? 'rgba(255,87,34,0.06)' : '#fff',
                  }}
                >
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: '#635BFF' }}>
                    <Wallet size={16} color="#fff" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-bold" style={{ color: INK }}>
                      Wallet credit{payMethod === 'wallet' && walletCredit > 0 ? ` · −${walletCredit} dh` : ''}
                    </Text>
                    <Text className="text-[11px] mt-0.5" style={{ color: MUTED }}>Balance: {balanceDh} dh</Text>
                  </View>
                  {payMethod === 'wallet' && <Check size={16} color={BRAND} />}
                </View>
              </PressableScale>
            ) : null}

            {/* Card — Stripe PaymentSheet when the native SDK is in the build,
                otherwise a visibly disabled row (old builds keep working). */}
            {isStripeAvailable ? (
              <PressableScale onPress={() => setPayMethod('card')}>
                <View
                  className="flex-row items-center rounded-2xl p-4"
                  style={{
                    borderWidth: 2,
                    borderColor: payMethod === 'card' ? BRAND : 'rgba(26,20,16,0.07)',
                    backgroundColor: payMethod === 'card' ? 'rgba(255,87,34,0.06)' : '#fff',
                  }}
                >
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: INK }}>
                    <CreditCard size={16} color="#fff" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-bold" style={{ color: INK }}>Card / Apple Pay</Text>
                    <Text className="text-[11px] mt-0.5" style={{ color: MUTED }}>Secure payment via Stripe</Text>
                  </View>
                  {payMethod === 'card' && <Check size={16} color={BRAND} />}
                </View>
              </PressableScale>
            ) : (
              <View
                className="flex-row items-center rounded-2xl p-4"
                style={{ borderWidth: 2, borderColor: 'rgba(26,20,16,0.07)', backgroundColor: '#fff', opacity: 0.45 }}
              >
                <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: INK }}>
                  <CreditCard size={16} color="#fff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-bold" style={{ color: INK }}>Card / Apple Pay</Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: MUTED }}>Arriving in the next update</Text>
                </View>
              </View>
            )}
          </View>

          {/* Partial wallet note */}
          {payMethod === 'wallet' && walletCredit > 0 && !fullyCoveredByWallet && (
            <View
              className="mt-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)' }}
            >
              <Text className="text-[12px] font-bold" style={{ color: AMBER, lineHeight: 18 }}>
                Wallet covers {walletCredit} dh — the remaining {finalTotal} dh is cash on delivery.
              </Text>
            </View>
          )}
        </MotiView>

        {/* ── Min-order warning ── */}
        {!subtotalOk && (
          <View
            className="mt-5 rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)' }}
          >
            <Text className="text-[12px] font-bold" style={{ color: AMBER, lineHeight: 18 }}>
              Minimum order is {MIN_ORDER_DH} dh — add {MIN_ORDER_DH - subtotal} dh more to checkout.
            </Text>
          </View>
        )}

        {/* ── Order summary ── */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 340 }}
          className="mt-6 p-5 rounded-3xl"
          style={{ backgroundColor: INK }}
        >
          <View className="flex-row justify-between mb-2">
            <Text className="text-white/60 text-[12px] font-semibold">Subtotal</Text>
            <Text className="text-white text-[13px] font-semibold">{subtotal} dh</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-white/60 text-[12px] font-semibold">Delivery</Text>
            <Text className="text-white text-[13px] font-semibold">{deliveryFee} dh</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-white/60 text-[12px] font-semibold">Service fee</Text>
            <Text className="text-white text-[13px] font-semibold">{serviceFee} dh</Text>
          </View>
          {promoDiscount > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-[12px] font-semibold" style={{ color: '#34D399' }}>
                Promo · {promo.applied?.code}
              </Text>
              <Text className="text-[13px] font-semibold" style={{ color: '#34D399' }}>−{promoDiscount} dh</Text>
            </View>
          )}
          {walletCredit > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-[12px] font-semibold" style={{ color: '#8E85FF' }}>Wallet credit</Text>
              <Text className="text-[13px] font-semibold" style={{ color: '#8E85FF' }}>−{walletCredit} dh</Text>
            </View>
          )}
          <View
            className="flex-row justify-between pt-3 mt-2"
            style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text className="text-white font-display text-[15px]" style={{ fontWeight: '800' }}>Total</Text>
            <Text className="text-white font-display text-[18px]" style={{ fontWeight: '800', letterSpacing: -0.4 }}>
              {finalTotal} dh
            </Text>
          </View>
        </MotiView>

        {createError && (
          <Text className="mt-3 text-[12px]" style={{ color: '#EF4444' }}>
            {createError.message}
          </Text>
        )}
      </ScrollView>

      {/* Sticky submit */}
      <MotiView
        from={{ translateY: 80, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: 360, delay: 320 }}
        style={{ position: 'absolute', left: 24, right: 24, bottom: 32 }}
      >
        <PressableScale onPress={handleSubmit} disabled={!!user && !canSubmit}>
          <View
            className="rounded-full py-4 px-6 flex-row items-center justify-center"
            style={{
              backgroundColor: canSubmit || !user ? BRAND : '#9B8F84',
              shadowColor: BRAND,
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: canSubmit ? 0.4 : 0,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            <Text className="text-white font-bold text-[15px] mr-2" style={{ letterSpacing: 0.2 }}>
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
                          : fullyCoveredByWallet
                            ? 'Place order · paid from wallet'
                            : `Place order · ${finalTotal} dh${walletCredit > 0 ? ' cash' : ''}`}
            </Text>
            <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
          </View>
        </PressableScale>
      </MotiView>
    </SafeAreaView>
  );
}

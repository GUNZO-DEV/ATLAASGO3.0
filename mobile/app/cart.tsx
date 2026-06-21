// AtlaasGo 3.0 — Cart / Checkout (dorm-precise drop).
//
// Native re-skin of the prototype screen-checkout2.jsx, faithful to the 3.0
// look (warm terracotta + amber on cream/ink, sunset gradients, emoji-in-
// gradient tiles, rounded cards, glass canopy, segmented handoff, radio speed,
// tip pills, server-priced bill). Built on the ag3 foundation:
//   theme.ts (useAg3Theme), icons.tsx, components/ag3/primitives (PhotoTile,
//   Price, Press, Rise, foodEm, tileFor) and lib/ag3/agApi (cart.quote, cities,
//   me.addresses) via useAsync.
//
// DATA / PLUMBING PRESERVED ───────────────────────────────────────────────────
//   • Line items come from the LIVE cart (lib/cart, the zustand store the
//     restaurant screen + the existing /checkout already write to). The qty
//     steppers drive the same setQty/remove, so totals stay in sync across the
//     app and the working Stripe/wallet/order-create flow keeps its real items.
//   • The displayed Bill summary is priced SERVER-SIDE via agApi.cart.quote
//     ({ storeId, items, speed, tipDh, addressId }) — subtotal / delivery /
//     priority / weather surcharge / tip / total / eta, exactly as the 3.0 card.
//   • "Place order" forwards to the EXISTING native /checkout screen, passing
//     speed / tip / handoff / addressId through. That screen still owns phone +
//     landmark validation, the Stripe PaymentSheet, the wallet RPC, the
//     pay_order_with_wallet leg and the orders insert — none of that is touched.
import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';

import { useAg3Theme } from '../components/ag3/theme';
import {
  IBack,
  IPin,
  IClock,
  IBolt,
  ISnow,
  IWallet,
  ICheck,
  IChevR,
  IUser,
  IBag,
} from '../components/ag3/icons';
import { PhotoTile, Price, Press, Rise, foodEm, tileFor } from '../components/ag3/primitives';
import { agApi, type Address } from '../lib/ag3/agApi';
import { useAsync } from '../lib/ag3/useAsync';
import { useCart } from '../lib/cart';

type Speed = 'standard' | 'priority';
type Handoff = 'door' | 'hand' | 'lounge';

// The mobile app is AUI / Ifrane-centric — that's the campus city the cart
// quote + dorm drop key off. (CityProvider isn't mounted at the root, so we
// resolve the city directly from agApi rather than from context.)
const CITY_ID = 'ifrane';

export default function CartScreen() {
  const t = useAg3Theme();
  const router = useRouter();

  // ── live cart (lib/cart zustand store — shared with restaurant + checkout) ──
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const localSubtotal = useCart((s) => s.subtotal());

  const storeId = items[0]?.restaurantId ?? null;
  const restoName = items[0]?.restaurantName ?? 'Your order';

  // ── city + weather (campus gating, weather strip) ──
  const { data: city } = useAsync(() => agApi.cities.get(CITY_ID), []);
  const { data: weather } = useAsync(() => agApi.cities.weather(CITY_ID), []);
  const { data: addresses } = useAsync(() => agApi.me.addresses(), []);
  const { data: payments } = useAsync(() => agApi.me.paymentMethods(), []);
  const payment = (payments ?? [])[0];

  // ── selections ──
  const [addressId, setAddressId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [handoff, setHandoff] = useState<Handoff>('door');
  const [speed, setSpeed] = useState<Speed>('standard');
  const [tip, setTip] = useState(10);

  const isCampus = !!city?.campus;
  const hasWeather = !!city?.weather && !!weather;

  const selectedAddress: Address | undefined = useMemo(() => {
    const list = addresses ?? [];
    return list.find((a) => a.id === addressId) ?? list.find((a) => a.isDefault) ?? list[0];
  }, [addresses, addressId]);

  // dorm-precise drop (campus) vs delivery address — mirrors the prototype `d`
  const d = selectedAddress
    ? {
        name: selectedAddress.label,
        sub: selectedAddress.sub,
        note: selectedAddress.dropNote ?? 'Leave at the door',
      }
    : {
        name: city?.defaultAddress ?? 'Delivery address',
        sub: city?.defaultAddressSub ?? '',
        note: 'Leave at the door',
      };

  // ── server-side bill: re-quote on every input that affects price ──
  const quoteItems = useMemo(() => items.map((c) => ({ itemId: c.id, qty: c.qty })), [items]);
  const itemsKey = quoteItems.map((i) => `${i.itemId}:${i.qty}`).join(',');
  const { data: quote, loading: quoting } = useAsync(
    () =>
      storeId && quoteItems.length
        ? agApi.cart.quote({
            storeId,
            items: quoteItems,
            addressId: selectedAddress?.id,
            speed,
            tipDh: tip,
          })
        : Promise.resolve(null),
    [storeId, itemsKey, speed, tip, selectedAddress?.id],
  );

  // prefer the live server quote, fall back to the local subtotal
  const sub = quote?.subtotalDh ?? localSubtotal;
  const baseFee = quote?.deliveryFeeDh ?? 0;
  const priority = quote?.priorityDh ?? (speed === 'priority' ? 9 : 0);
  const weatherFee = quote?.weatherSurchargeDh ?? (hasWeather ? 3 : 0);
  const tipDh = quote?.tipDh ?? tip;
  const total = quote?.totalDh ?? sub + baseFee + priority + weatherFee + tipDh;
  const eta = quote
    ? `${quote.etaMinutes[0]}–${quote.etaMinutes[1]}`
    : speed === 'priority'
      ? '14–18'
      : '18–24';

  // ── place order → existing native /checkout (Stripe + wallet + orders insert)
  // Pass the 3.0 selections through so checkout can persist speed/tip/handoff.
  const placeOrder = () => {
    if (!items.length) return;
    router.push({
      pathname: '/checkout',
      params: {
        category: 'food',
        speed,
        tipDh: String(tip),
        handoff,
        addressId: selectedAddress?.id ?? '',
        quotedTotalDh: String(total),
      },
    });
  };

  // ── empty state ──
  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
        <Header t={t} onBack={() => router.back()} />
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
            <IBag size={28} color={t.colors.muted} />
          </View>
          <Text style={[styles.disp, { fontSize: 21, color: t.colors.fg, marginTop: 18 }]}>
            Your cart is empty
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Add items from a spot to get started.
          </Text>
          <Press onPress={() => router.replace('/')}>
            <LinearGradient
              colors={t.gradients.sunset}
              start={t.gradients.start}
              end={t.gradients.end}
              style={[styles.browseBtn, t.shadows.glow]}
            >
              <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15 }}>
                Browse spots
              </Text>
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
        contentContainerStyle={{ paddingBottom: 168 }}
      >
        {/* order from */}
        <Rise>
          <View style={[styles.pad, { flexDirection: 'row', alignItems: 'center', gap: 11 }]}>
            <PhotoTile
              tile={tileFor(storeId ?? restoName)}
              em={foodEm(storeId ?? '')}
              radius={14}
              style={{ width: 46, height: 46 }}
            />
            <View>
              <Text style={[styles.eyebrow, { color: t.colors.primary }]}>ORDER FROM</Text>
              <Text style={[styles.disp, { fontSize: 16, color: t.colors.fg }]} numberOfLines={1}>
                {restoName}
              </Text>
            </View>
          </View>
        </Rise>

        {/* items */}
        <Section
          t={t}
          title="Your items"
          right={
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>+ Add more</Text>
            </Pressable>
          }
        >
          <View style={[card(t), { paddingHorizontal: 16, paddingVertical: 4 }]}>
            {items.map((c, i) => (
              <View key={c.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
                  <PhotoTile
                    tile={tileFor(c.id)}
                    em={foodEm(c.id)}
                    radius={12}
                    style={{ width: 48, height: 48 }}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Price v={c.priceDh} />
                  </View>
                  <Stepper
                    t={t}
                    qty={c.qty}
                    onDec={() => setQty(c.id, c.qty - 1)}
                    onInc={() => setQty(c.id, c.qty + 1)}
                  />
                </View>
                {i < items.length - 1 && <View style={[styles.hr, { backgroundColor: t.colors.line }]} />}
              </View>
            ))}
          </View>
        </Section>

        {/* drop / address */}
        <Section
          t={t}
          title={isCampus ? 'Dorm-precise drop' : 'Delivery address'}
          right={
            isCampus ? (
              <Pressable onPress={() => setPickOpen((o) => !o)} hitSlop={8}>
                <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>
                  {pickOpen ? 'Done' : 'Change'}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/')} hitSlop={8}>
                <Text style={{ color: t.colors.primary, fontWeight: '700', fontSize: 13.5 }}>Change</Text>
              </Pressable>
            )
          }
        >
          <View style={card(t)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 }}>
              <LinearGradient
                colors={t.gradients.sunset}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.pinTile, t.shadows.glow]}
              >
                <IPin size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.disp, { fontSize: 16, color: t.colors.fg }]} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={{ fontSize: 12.5, color: t.colors.muted }} numberOfLines={1}>
                  {d.sub}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(47,163,107,0.14)' }]}>
                <ICheck size={13} color={t.colors.ok} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: t.colors.ok }}>Pinned</Text>
              </View>
            </View>

            {pickOpen && isCampus && (addresses ?? []).length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 240 }}
                style={{ borderTopWidth: 1, borderColor: t.colors.line, paddingHorizontal: 8, paddingVertical: 6 }}
              >
                {(addresses ?? []).map((opt) => {
                  const active = opt.id === selectedAddress?.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        setAddressId(opt.id);
                        setPickOpen(false);
                      }}
                      style={[
                        styles.addrRow,
                        active && { backgroundColor: 'rgba(255,87,34,0.10)' },
                      ]}
                    >
                      <IPin size={19} color={active ? t.colors.primary : t.colors.muted} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: t.colors.fg }} numberOfLines={1}>
                          {opt.label}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: t.colors.muted }} numberOfLines={1}>
                          {opt.sub}
                        </Text>
                      </View>
                      {active && <ICheck size={18} color={t.colors.primary} />}
                    </Pressable>
                  );
                })}
              </MotiView>
            )}

            <View style={{ borderTopWidth: 1, borderColor: t.colors.line, padding: 13 }}>
              <Segmented
                t={t}
                value={handoff}
                onChange={setHandoff}
                options={[
                  ['door', 'Leave at door'],
                  ['hand', 'Hand to me'],
                  ['lounge', isCampus ? 'Floor lounge' : 'Concierge'],
                ]}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingHorizontal: 2 }}>
                <IUser size={15} color={t.colors.muted} />
                <Text style={{ fontSize: 12.5, color: t.colors.muted }}>
                  Note for courier · “{d.note}”
                </Text>
              </View>
            </View>
          </View>
        </Section>

        {/* delivery speed */}
        <Section t={t} title="Delivery speed">
          <View style={{ gap: 10 }}>
            {(
              [
                {
                  k: 'standard' as Speed,
                  title: 'Standard',
                  sub: hasWeather ? '18–24 min · weather-adjusted' : '18–24 min · standard delivery',
                  price: 'Free',
                },
                {
                  k: 'priority' as Speed,
                  title: 'Priority',
                  sub: '14–18 min · jumps the queue',
                  price: '+9 dh',
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
                        color: o.price === 'Free' ? t.colors.ok : t.colors.fg,
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
                Snow on the Atlas pass adds{' '}
                <Text style={{ fontWeight: '800', color: t.colors.fg }}>
                  {weatherFee ? `${weatherFee} dh` : `~${weather?.etaAddMinutes ?? 4} min`}
                </Text>{' '}
                to the run. We track it live and update your ETA.
              </Text>
            </View>
          )}
        </Section>

        {/* tip */}
        <Section t={t} title="Tip your courier">
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
                      {amt === 0 ? 'None' : `${amt} dh`}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </Section>

        {/* payment */}
        <Section t={t} title="Payment">
          <Press onPress={placeOrder}>
            <View style={[card(t), styles.payRow]}>
              <View style={[styles.payIcon, { backgroundColor: 'rgba(255,87,34,0.12)' }]}>
                <IWallet size={21} color={t.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 14.5, color: t.colors.fg }}>
                  {payment?.label ?? 'AtlaasGo Wallet'}
                </Text>
                <Text style={{ fontSize: 12, color: t.colors.muted, marginTop: 1 }}>
                  {payment?.last4 ? `•••• ${payment.last4}` : 'Choose card, wallet or cash at checkout'}
                </Text>
              </View>
              <IChevR size={20} color={t.colors.muted} />
            </View>
          </Press>
        </Section>

        {/* bill */}
        <Section t={t} title="Bill summary">
          <View style={[card(t), { paddingHorizontal: 16, paddingVertical: 15 }]}>
            <BillRow t={t} label="Subtotal" value={`${sub} dh`} />
            {baseFee ? (
              <BillRow t={t} label="Delivery fee" value={`${baseFee} dh`} />
            ) : (
              <BillRow t={t} label="Delivery fee" value="Free" ok />
            )}
            {speed === 'priority' && priority ? (
              <BillRow t={t} label="Priority" value={`${priority} dh`} />
            ) : null}
            {hasWeather && weatherFee ? (
              <BillRow t={t} label="Winter surcharge" value={`${weatherFee} dh`} />
            ) : null}
            {tipDh > 0 ? <BillRow t={t} label="Courier tip" value={`${tipDh} dh`} /> : null}

            <View style={[styles.hr, { backgroundColor: t.colors.line, marginVertical: 9 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[styles.disp, { fontSize: 17, color: t.colors.fg }]}>Total</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                {quoting && <ActivityIndicator size="small" color={t.colors.muted} />}
                <Text
                  style={[styles.disp, { fontSize: 21, color: t.colors.fg, fontVariant: ['tabular-nums'] }]}
                >
                  {total} dh
                </Text>
              </View>
            </View>
          </View>
        </Section>
      </ScrollView>

      {/* sticky place order */}
      <View
        style={[
          styles.sticky,
          { backgroundColor: t.colors.bg, borderColor: t.colors.line },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', marginBottom: 9 }}>
          <IClock size={14} color={t.colors.muted} />
          <Text style={{ fontSize: 12, color: t.colors.muted }}>
            Arrives in <Text style={{ fontWeight: '800', color: t.colors.fg }}>{eta} min</Text> · to {d.name}
          </Text>
        </View>
        <Press onPress={placeOrder} disabled={items.length === 0}>
          <LinearGradient
            colors={t.gradients.sunset}
            start={t.gradients.start}
            end={t.gradients.end}
            style={[styles.placeBtn, t.shadows.glow]}
          >
            <Text style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15.5 }}>Place order</Text>
            <Text
              style={{ color: t.colors.onPrimary, fontWeight: '800', fontSize: 15.5, fontVariant: ['tabular-nums'] }}
            >
              {total} dh
            </Text>
          </LinearGradient>
        </Press>
      </View>
    </SafeAreaView>
  );
}

/* ── sub-components ───────────────────────────────────────────────────────── */

type Theme = ReturnType<typeof useAg3Theme>;

function Header({ t, onBack }: { t: Theme; onBack: () => void }) {
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
      <Text style={[styles.disp, { fontWeight: '800', fontSize: 20, color: t.colors.fg }]}>Checkout</Text>
    </MotiView>
  );
}

function Section({
  t,
  title,
  right,
  children,
}: {
  t: Theme;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
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

function Stepper({
  t,
  qty,
  onDec,
  onInc,
}: {
  t: Theme;
  qty: number;
  onDec: () => void;
  onInc: () => void;
}) {
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
  eyebrow: { fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  pad: { paddingHorizontal: 18 },
  hr: { height: 1, width: '100%' },

  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  browseBtn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 },

  pinTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, borderRadius: 14 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 3 },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },

  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 14 },
  radio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 999 },

  snowStrip: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 18, borderWidth: 1 },

  tipPill: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },

  payRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 14 },
  payIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, borderWidth: 1, padding: 4 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11 },

  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22 },
});

/**
 * Premium mobile cart screen.
 *
 *   - Big restaurant header banner
 *   - Native-feel item rows with - + qty controls and swipe-to-remove gesture
 *   - Address selector card
 *   - Promo + wallet credit cards
 *   - Sectioned totals
 *   - Sticky bottom CTA that's always thumb-reachable
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useCart, type CartItem } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { useCreateOrder } from '../lib/orders';
import { useAddresses } from '../lib/customer';
import { useToast } from '../lib/toast';
import { IS_STRIPE_CONFIGURED } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import type { AddressRow, Coords } from '../lib/database.types';

type PayMethod = 'card' | 'cash' | 'wallet';

const MIN_ORDER_DH = 30;
const MIN_LANDMARK = 3;

export default function MobileCart() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = useCart((s) => s.deliveryFee());
  const serviceFee = useCart((s) => s.serviceFee());
  const clearCart = useCart((s) => s.clear);

  const { user } = useAuth();
  const { create, submitting, error } = useCreateOrder();
  const { addresses } = useAddresses();
  const nav = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const wasCancelled = searchParams.get('cancelled') === '1';

  const [mode, setMode] = useState<'saved' | 'new'>('new');
  const [selectedAddress, setSelectedAddress] = useState<AddressRow | null>(null);
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>(IS_STRIPE_CONFIGURED ? 'card' : 'cash');
  const [phoneOnFile, setPhoneOnFile] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletCredit, setUseWalletCredit] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  useEffect(() => {
    if (!user) {
      setPhoneOnFile(null);
      setWalletBalance(0);
      return;
    }
    void Promise.all([
      supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle(),
      supabase.from('wallets').select('balance_dh').eq('user_id', user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: w }]) => {
      setPhoneOnFile((p as { phone?: string | null } | null)?.phone ?? null);
      setWalletBalance((w as { balance_dh?: number } | null)?.balance_dh ?? 0);
    });
  }, [user]);

  useEffect(() => {
    if (addresses.length === 0) {
      setMode('new');
      return;
    }
    const def = addresses.find((a) => a.is_default) ?? addresses[0];
    setMode('saved');
    setSelectedAddress(def);
  }, [addresses]);

  // ── Computed ───────────────────────────────────────────────────────
  const effectiveLandmark =
    mode === 'saved' ? (selectedAddress?.landmark ?? selectedAddress?.label ?? '') : landmark;
  const effectiveCoords = mode === 'saved' ? selectedAddress?.coords ?? null : coords;
  const landmarkOk = effectiveLandmark.trim().length >= MIN_LANDMARK;
  const phoneOk = !!phoneOnFile && phoneOnFile.length >= 8;
  const subtotalOk = subtotal >= MIN_ORDER_DH;
  const totalBeforeWallet = Math.max(0, subtotal + deliveryFee + serviceFee - promoDiscount);
  const walletCredit = useWalletCredit ? Math.min(walletBalance, totalBeforeWallet) : 0;
  const finalTotal = Math.max(0, totalBeforeWallet - walletCredit);
  const fullyCoveredByWallet = walletCredit > 0 && finalTotal === 0;
  const canSubmit =
    items.length > 0 && landmarkOk && !!effectiveCoords && !submitting && phoneOk && subtotalOk;

  // Group items by restaurant for visual organization
  const grouped = items.reduce<Record<string, { name: string; slug: string; items: CartItem[] }>>(
    (acc, i) => {
      if (!acc[i.restaurantSlug])
        acc[i.restaurantSlug] = { name: i.restaurantName, slug: i.restaurantSlug, items: [] };
      acc[i.restaurantSlug].items.push(i);
      return acc;
    },
    {},
  );

  async function captureCoords() {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported on this device');
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
        setCapturing(false);
        if ('vibrate' in navigator) navigator.vibrate?.(10);
        toast.success(`GPS captured · ±${Math.round(pos.coords.accuracy)}m`);
      },
      (err) => {
        setCapturing(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it in Settings.'
            : 'Could not read your location.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoChecking(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('code,kind,percent_off,flat_off_dh,min_subtotal_dh,is_active,valid_to,max_redemptions,redemptions')
        .eq('code', code)
        .maybeSingle();
      if (error || !data) {
        toast.error('Invalid promo code');
        return;
      }
      const promo = data as {
        code: string;
        kind: 'percent_off' | 'flat_off' | 'free_delivery' | 'bogo';
        percent_off: number | null;
        flat_off_dh: number | null;
        min_subtotal_dh: number;
        is_active: boolean;
        valid_to: string | null;
        max_redemptions: number | null;
        redemptions: number;
      };
      if (!promo.is_active) { toast.error('This promo is no longer active'); return; }
      if (promo.valid_to && new Date(promo.valid_to) < new Date()) {
        toast.error('This promo has expired'); return;
      }
      if (promo.max_redemptions && promo.redemptions >= promo.max_redemptions) {
        toast.error('This promo has reached its limit'); return;
      }
      if (subtotal < promo.min_subtotal_dh) {
        toast.error(`Add ${promo.min_subtotal_dh - subtotal} dh more to use this code`);
        return;
      }
      let discount = 0;
      if (promo.kind === 'percent_off' && promo.percent_off) {
        discount = Math.round((subtotal * promo.percent_off) / 100);
      } else if (promo.kind === 'flat_off' && promo.flat_off_dh) {
        discount = promo.flat_off_dh;
      } else if (promo.kind === 'free_delivery') {
        discount = deliveryFee;
      }
      setPromoDiscount(discount);
      setPromoApplied(code);
      toast.success(`Promo applied · −${discount} dh`);
      if ('vibrate' in navigator) navigator.vibrate?.(10);
    } finally {
      setPromoChecking(false);
    }
  }

  async function checkout() {
    if (!user) {
      nav(`/auth?next=${encodeURIComponent('/cart')}`);
      return;
    }
    if (!subtotalOk) {
      toast.warn(`Minimum order ${MIN_ORDER_DH} dh — add a bit more.`);
      return;
    }
    if (!phoneOk) {
      toast.warn('Add a phone number in your account before checking out.');
      nav('/account?next=/cart');
      return;
    }
    if (!effectiveCoords || !landmarkOk) {
      toast.warn('Set a landmark and pin your location first.');
      return;
    }
    const orderId = await create({
      items,
      landmark: effectiveLandmark.trim(),
      coords: effectiveCoords,
      deliveryNotes: notes.trim() || undefined,
      subtotalDh: subtotal,
      deliveryFeeDh: deliveryFee,
      serviceFeeDh: serviceFee,
      totalDh: finalTotal,
    });
    if (!orderId) {
      toast.error(error || 'Could not place the order — try again');
      return;
    }
    if (promoApplied || walletCredit > 0) {
      await supabase
        .from('orders')
        .update({
          promotion_code: promoApplied,
          payment_method: walletCredit > 0 && finalTotal === 0 ? 'wallet' : payMethod,
        })
        .eq('id', orderId);
    }
    // Wallet credit via SECURITY DEFINER RPC (atomic debit + ledger row;
    // a direct client write is RLS-blocked and used non-existent columns).
    if (walletCredit > 0) {
      const { error: walletErr } = await supabase.rpc('pay_order_with_wallet', {
        p_order_id: orderId,
        p_amount: walletCredit,
      });
      if (walletErr) {
        toast.error('Could not apply wallet credit — try again');
        return;
      }
    }
    if (promoApplied) {
      void supabase.rpc('increment_promo_redemption', { promo_code: promoApplied });
    }
    if (fullyCoveredByWallet) {
      clearCart();
      toast.success('Order placed · paid from wallet');
      nav(`/track/${orderId}`);
    } else if (payMethod === 'card' && IS_STRIPE_CONFIGURED) {
      clearCart();
      nav(`/checkout/${orderId}`);
    } else {
      await supabase.from('orders').update({ payment_method: 'cash' }).eq('id', orderId);
      clearCart();
      toast.success('Order placed · pay on delivery');
      nav(`/track/${orderId}`);
    }
  }

  // ── Empty cart state ───────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mcart-empty">
        <div className="mcart-empty-icon">🛍</div>
        <h2>Your cart is empty</h2>
        <p>Add a dish you crave and the cart will appear here.</p>
        <Link to="/order" className="mcart-empty-cta">
          Browse restaurants <I.Arrow size={14} />
        </Link>
        <MobileCartStyles />
      </div>
    );
  }

  const ctaLabel = submitting
    ? 'Placing order…'
    : !user
      ? 'Sign in to checkout'
      : !subtotalOk
        ? `Add ${MIN_ORDER_DH - subtotal} dh more`
        : !phoneOk
          ? 'Add phone in account →'
          : !effectiveCoords
            ? 'Capture GPS pin'
            : !landmarkOk
              ? 'Add a landmark'
              : fullyCoveredByWallet
                ? 'Place order'
                : payMethod === 'card'
                  ? `Pay ${finalTotal} dh`
                  : `Order · ${finalTotal} dh cash`;

  return (
    <div className="mcart">
      {/* Header */}
      <header className="mcart-hd">
        <button onClick={() => nav(-1)} aria-label="Back" className="mcart-back">
          <I.Arrow size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h1>Your order</h1>
        <button
          onClick={() => {
            if (confirm('Clear all items from your cart?')) clearCart();
          }}
          className="mcart-clear"
        >
          Clear
        </button>
      </header>

      {wasCancelled && (
        <div className="mcart-alert">
          <I.Shield size={14} /> Payment was cancelled. Try again or pay with cash.
        </div>
      )}

      {/* Items grouped by restaurant */}
      {Object.values(grouped).map((g) => (
        <section key={g.slug} className="mcart-resto">
          <div className="mcart-resto-hd">
            <span className="mcart-resto-emoji">🥘</span>
            <Link to={`/r/${g.slug}`} className="mcart-resto-name">
              {g.name} <I.Arrow size={11} style={{ opacity: 0.5 }} />
            </Link>
          </div>
          <ul className="mcart-items">
            {g.items.map((it) => (
              <li key={it.id} className="mcart-item">
                <div className="mcart-item-body">
                  <div className="mcart-item-name">{it.name}</div>
                  <div className="mcart-item-price">{it.priceDh} dh</div>
                </div>
                <div className="mcart-qty">
                  <button
                    onClick={() => {
                      if (it.qty === 1) {
                        if ('vibrate' in navigator) navigator.vibrate?.(12);
                        removeItem(it.id);
                      } else {
                        if ('vibrate' in navigator) navigator.vibrate?.(6);
                        setQty(it.id, it.qty - 1);
                      }
                    }}
                    aria-label="Remove one"
                  >
                    {it.qty === 1 ? <I.Close size={12} /> : <I.Minus size={14} />}
                  </button>
                  <span>{it.qty}</span>
                  <button
                    onClick={() => {
                      if ('vibrate' in navigator) navigator.vibrate?.(6);
                      setQty(it.id, it.qty + 1);
                    }}
                    aria-label="Add one"
                  >
                    <I.Plus size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Delivery address */}
      <SectionHd>Delivery to</SectionHd>
      {addresses.length > 0 && (
        <div className="mcart-mode">
          <button
            className={`mcart-mode-btn ${mode === 'saved' ? 'active' : ''}`}
            onClick={() => setMode('saved')}
          >
            Saved address
          </button>
          <button
            className={`mcart-mode-btn ${mode === 'new' ? 'active' : ''}`}
            onClick={() => setMode('new')}
          >
            New pin
          </button>
        </div>
      )}

      {mode === 'saved' && addresses.length > 0 ? (
        <div className="mcart-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {addresses.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAddress(a)}
                className={`mcart-addr ${selectedAddress?.id === a.id ? 'active' : ''}`}
              >
                <span className="mcart-addr-icon">
                  {a.is_campus ? <I.Home size={16} /> : <I.Pin size={16} />}
                </span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div className="mcart-addr-label">
                    {a.label}
                    {a.is_default && <span className="mcart-addr-def">DEFAULT</span>}
                  </div>
                  <div className="mcart-addr-line">{a.line1}</div>
                </div>
                {selectedAddress?.id === a.id && (
                  <I.Check size={16} style={{ color: 'var(--primary)' }} />
                )}
              </button>
            ))}
          </div>
          <Link to="/addresses" className="mcart-addr-add">
            <I.Plus size={14} /> Add new address
          </Link>
        </div>
      ) : (
        <div className="mcart-card">
          <label className="mcart-field">
            <span>Landmark (required)</span>
            <input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Near the Grand Mosque, Building 16…"
              className="mcart-input"
            />
          </label>
          <label className="mcart-field">
            <span>Delivery notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate 3, ring at door 2"
              className="mcart-input"
            />
          </label>
          <button onClick={captureCoords} disabled={capturing} className="mcart-gps">
            {capturing ? (
              <>
                <span className="mcart-spinner" /> Getting GPS…
              </>
            ) : effectiveCoords ? (
              <>
                <I.Check size={14} /> GPS captured · ±{Math.round(effectiveCoords.accuracyM ?? 0)}m · Re-pin
              </>
            ) : (
              <>
                <I.Pin size={14} /> Drop GPS pin
              </>
            )}
          </button>
        </div>
      )}

      {/* Promo code */}
      <SectionHd>Promo & wallet</SectionHd>
      <div className="mcart-card">
        {promoApplied ? (
          <div className="mcart-promo-active">
            <I.Check size={14} />
            <div style={{ flex: 1 }}>
              <strong>{promoApplied}</strong> applied · −{promoDiscount} dh
            </div>
            <button
              onClick={() => {
                setPromoApplied(null);
                setPromoDiscount(0);
                setPromoCode('');
              }}
              className="mcart-promo-remove"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mcart-promo">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Promo code"
              className="mcart-input"
            />
            <button onClick={applyPromo} disabled={!promoCode.trim() || promoChecking}>
              {promoChecking ? '…' : 'Apply'}
            </button>
          </div>
        )}

        {user && walletBalance > 0 && (
          <button
            onClick={() => {
              setUseWalletCredit((v) => !v);
              if ('vibrate' in navigator) navigator.vibrate?.(6);
            }}
            className={`mcart-wallet ${useWalletCredit ? 'active' : ''}`}
            style={{ marginTop: 10 }}
          >
            <span className="mcart-wallet-icon">
              <I.Wallet size={15} />
            </span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                Use wallet credit
                {useWalletCredit && walletCredit > 0 ? ` · −${walletCredit} dh` : ''}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-soft)' }}>
                Balance: {walletBalance} dh
              </div>
            </div>
            <span className="mcart-checkbox">{useWalletCredit && <I.Check size={11} />}</span>
          </button>
        )}
      </div>

      {/* Payment method */}
      <SectionHd>Payment</SectionHd>
      <div className="mcart-card">
        {IS_STRIPE_CONFIGURED && (
          <button
            type="button"
            onClick={() => setPayMethod('card')}
            className={`mcart-pay ${payMethod === 'card' ? 'active' : ''}`}
          >
            <span className="mcart-pay-icon" style={{ background: 'linear-gradient(135deg, #635BFF, #0A2540)' }}>
              <I.Wallet size={15} />
            </span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Card / Apple Pay</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-soft)' }}>Visa, Mastercard, Apple Pay</div>
            </div>
            {payMethod === 'card' && <I.Check size={16} style={{ color: 'var(--primary)' }} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPayMethod('cash')}
          className={`mcart-pay ${payMethod === 'cash' ? 'active' : ''}`}
          style={{ marginTop: IS_STRIPE_CONFIGURED ? 8 : 0 }}
        >
          <span className="mcart-pay-icon" style={{ background: 'linear-gradient(135deg, #34D399, #059669)', fontSize: 18 }}>
            💵
          </span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Cash on delivery</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-soft)' }}>Pay the rider in cash</div>
          </div>
          {payMethod === 'cash' && <I.Check size={16} style={{ color: 'var(--primary)' }} />}
        </button>
      </div>

      {/* Totals */}
      <SectionHd>Summary</SectionHd>
      <div className="mcart-card">
        <Row label="Subtotal" value={`${subtotal} dh`} />
        <Row label="Delivery" value={`${deliveryFee} dh`} />
        <Row label="Service" value={`${serviceFee} dh`} />
        {promoDiscount > 0 && (
          <Row label={`Promo · ${promoApplied}`} value={`−${promoDiscount} dh`} color="#059669" />
        )}
        {walletCredit > 0 && (
          <Row label="Wallet credit" value={`−${walletCredit} dh`} color="#4F46E5" />
        )}
        <div className="mcart-total">
          <span>Total</span>
          <span>{finalTotal} dh</span>
        </div>
      </div>

      {/* Warnings */}
      {!subtotalOk && (
        <div className="mcart-warn">
          Minimum order {MIN_ORDER_DH} dh — add {MIN_ORDER_DH - subtotal} dh more.
        </div>
      )}
      {user && !phoneOk && (
        <div className="mcart-warn">
          <I.Phone size={13} /> <strong>Add a phone in account</strong> so your rider can reach you.
        </div>
      )}

      {/* Spacer for sticky CTA */}
      <div style={{ height: 100 }} />

      {/* Sticky CTA */}
      <div className="mcart-cta-wrap">
        <button
          onClick={checkout}
          disabled={!canSubmit && !!user}
          className="mcart-cta"
          style={{ opacity: canSubmit || !user ? 1 : 0.6 }}
        >
          {ctaLabel}
          {canSubmit && <I.Arrow size={14} />}
        </button>
      </div>

      <MobileCartStyles />
    </div>
  );
}

function SectionHd({ children }: { children: React.ReactNode }) {
  return <div className="mcart-section-hd">{children}</div>;
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="mcart-row" style={{ color: color ?? undefined }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: color ? 700 : 600 }}>{value}</span>
    </div>
  );
}

function MobileCartStyles() {
  return (
    <style>{`
      .mcart {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
      }
      .mcart-hd {
        position: sticky;
        top: var(--safe-top);
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 0.5px solid var(--line);
      }
      .mcart-hd h1 {
        flex: 1;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 17px;
        margin: 0;
        text-align: center;
        color: var(--fg);
      }
      .mcart-back, .mcart-clear {
        background: var(--surface);
        border: 1px solid var(--line);
        color: var(--fg);
        cursor: pointer;
        border-radius: 50%;
        width: 36px; height: 36px;
        display: grid; place-items: center;
        transition: transform .15s;
      }
      .mcart-clear {
        width: auto; height: 32px; border-radius: 999px;
        padding: 0 12px;
        font-size: 12px; font-weight: 700;
        color: var(--fg-soft);
      }
      .mcart-back:active, .mcart-clear:active { transform: scale(0.9); }

      .mcart-alert {
        margin: 12px 14px 0;
        padding: 12px 14px;
        background: rgba(239,68,68,0.06);
        border: 1px solid rgba(239,68,68,0.20);
        border-radius: 12px;
        font-size: 13px; font-weight: 600;
        color: #B91C1C;
        display: flex; align-items: center; gap: 8px;
      }

      .mcart-section-hd {
        padding: 22px 18px 8px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--fg-soft);
      }

      .mcart-resto {
        margin: 14px 14px 0;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
      }
      .mcart-resto-hd {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--line);
      }
      .mcart-resto-emoji {
        font-size: 20px;
        width: 32px; height: 32px;
        background: rgba(255,87,34,0.08);
        border-radius: 10px;
        display: grid; place-items: center;
      }
      .mcart-resto-name {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 14px;
        color: var(--fg);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .mcart-items { list-style: none; margin: 0; padding: 0; }
      .mcart-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--line);
      }
      .mcart-item:first-child { border-top: 0; }
      .mcart-item-body { flex: 1; min-width: 0; }
      .mcart-item-name {
        font-weight: 700;
        font-size: 14px;
        color: var(--fg);
        margin-bottom: 2px;
      }
      .mcart-item-price {
        font-size: 12px;
        color: var(--primary);
        font-weight: 700;
      }
      .mcart-qty {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--bg);
        border-radius: 999px;
        padding: 3px;
        border: 1px solid var(--line);
      }
      .mcart-qty button {
        width: 30px; height: 30px;
        border-radius: 50%;
        background: var(--surface);
        color: var(--fg);
        border: 0;
        display: grid; place-items: center;
        cursor: pointer;
        transition: transform .15s, background .15s;
      }
      .mcart-qty button:hover { background: var(--primary); color: white; }
      .mcart-qty button:active { transform: scale(0.85); }
      .mcart-qty span {
        min-width: 18px;
        text-align: center;
        font-weight: 800;
        font-size: 14px;
        font-variant-numeric: tabular-nums;
      }

      .mcart-mode {
        display: flex;
        gap: 8px;
        padding: 0 14px;
        margin-bottom: 10px;
      }
      .mcart-mode-btn {
        flex: 1;
        padding: 10px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        color: var(--fg);
        cursor: pointer;
        transition: all .2s;
      }
      .mcart-mode-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .mcart-card {
        margin: 0 14px;
        padding: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
      }
      .mcart-card + .mcart-card { margin-top: 12px; }

      .mcart-addr {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 14px;
        cursor: pointer;
        transition: all .2s;
        width: 100%;
      }
      .mcart-addr.active {
        border-color: var(--primary);
        background: rgba(255,87,34,0.04);
      }
      .mcart-addr-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        background: rgba(255,87,34,0.08);
        color: var(--primary);
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .mcart-addr-label {
        font-weight: 700;
        font-size: 14px;
        color: var(--fg);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mcart-addr-def {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        background: rgba(255,87,34,0.10);
        color: var(--primary);
        border-radius: 999px;
        letter-spacing: 0.04em;
      }
      .mcart-addr-line {
        font-size: 12px;
        color: var(--fg-soft);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mcart-addr-add {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px;
        margin-top: 10px;
        background: transparent;
        border: 1.5px dashed var(--line);
        border-radius: 12px;
        color: var(--primary);
        font-weight: 700;
        font-size: 13px;
        text-decoration: none;
      }
      .mcart-field {
        display: block;
        margin-bottom: 12px;
      }
      .mcart-field span {
        display: block;
        font-size: 11.5px;
        font-weight: 700;
        color: var(--fg-soft);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .mcart-input {
        width: 100%;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        font-size: 15px !important;
        color: var(--fg);
        font-family: inherit;
        outline: none;
        transition: border-color .2s, box-shadow .2s;
      }
      .mcart-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(255,87,34,0.10);
      }
      .mcart-gps {
        width: 100%;
        padding: 13px;
        background: linear-gradient(135deg, var(--primary), #FF8A65);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 6px 14px rgba(255,87,34,0.30);
        transition: transform .15s;
      }
      .mcart-gps:active { transform: scale(0.98); }
      .mcart-gps:disabled { opacity: 0.6; }
      .mcart-spinner {
        width: 14px; height: 14px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin .8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .mcart-promo {
        display: flex;
        gap: 8px;
      }
      .mcart-promo button {
        padding: 0 18px;
        background: var(--ink);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: transform .15s;
      }
      .mcart-promo button:active { transform: scale(0.94); }
      .mcart-promo button:disabled { opacity: 0.5; }
      .mcart-promo-active {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: rgba(5,150,105,0.08);
        border: 1px solid rgba(5,150,105,0.24);
        border-radius: 12px;
        color: #059669;
        font-size: 13px;
        font-weight: 600;
      }
      .mcart-promo-remove {
        background: transparent;
        border: 0;
        color: var(--fg-soft);
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
      }

      .mcart-wallet {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        width: 100%;
        transition: all .2s;
      }
      .mcart-wallet.active {
        background: rgba(99,91,255,0.06);
        border-color: #635BFF;
      }
      .mcart-wallet-icon {
        width: 32px; height: 32px;
        border-radius: 9px;
        background: linear-gradient(135deg, #635BFF, #8E85FF);
        color: white;
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .mcart-checkbox {
        width: 20px; height: 20px;
        border-radius: 6px;
        border: 2px solid var(--line);
        display: grid; place-items: center;
        color: white;
        flex-shrink: 0;
      }
      .mcart-wallet.active .mcart-checkbox {
        background: #635BFF;
        border-color: #635BFF;
      }

      .mcart-pay {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        width: 100%;
        transition: all .2s;
      }
      .mcart-pay.active {
        background: rgba(255,87,34,0.04);
        border-color: var(--primary);
      }
      .mcart-pay-icon {
        width: 32px; height: 32px;
        border-radius: 9px;
        color: white;
        display: grid; place-items: center;
        flex-shrink: 0;
      }

      .mcart-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13.5px;
        color: var(--fg-soft);
      }
      .mcart-total {
        display: flex;
        justify-content: space-between;
        padding-top: 12px;
        margin-top: 6px;
        border-top: 1px solid var(--line);
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 18px;
        color: var(--fg);
      }
      .mcart-total span:last-child {
        color: var(--primary);
        font-variant-numeric: tabular-nums;
      }

      .mcart-warn {
        margin: 12px 14px 0;
        padding: 12px 14px;
        background: rgba(245,158,11,0.08);
        border: 1px solid rgba(245,158,11,0.20);
        border-radius: 12px;
        font-size: 13px;
        color: #B45309;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mcart-cta-wrap {
        position: fixed;
        left: 14px; right: 14px;
        bottom: calc(var(--tabbar-h) + var(--safe-bot) + 12px);
        z-index: 40;
      }
      .mcart-cta {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, var(--primary), #FF8A65);
        color: white;
        border: 0;
        border-radius: 18px;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 14px 32px -8px rgba(255,87,34,0.55);
        transition: transform .15s;
      }
      .mcart-cta:active { transform: scale(0.98); }
      .mcart-cta:disabled { cursor: not-allowed; }

      /* Empty state */
      .mcart-empty {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding-left: 24px;
        padding-right: 24px;
      }
      .mcart-empty-icon {
        font-size: 72px;
        margin-bottom: 16px;
      }
      .mcart-empty h2 {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 24px;
        margin: 0 0 8px;
      }
      .mcart-empty p {
        color: var(--fg-soft);
        margin: 0 0 28px;
      }
      .mcart-empty-cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 24px;
        background: linear-gradient(135deg, var(--primary), #FF8A65);
        color: white;
        border-radius: 14px;
        font-weight: 800;
        font-size: 14.5px;
        text-decoration: none;
        box-shadow: 0 10px 24px -6px rgba(255,87,34,0.5);
        transition: transform .15s;
      }
      .mcart-empty-cta:active { transform: scale(0.96); }
    `}</style>
  );
}

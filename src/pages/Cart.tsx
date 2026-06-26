import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useCart } from '../lib/cart';
import MobileCart from '../components/MobileCart';
import { useSEO } from '../lib/seo';

function useIsMobile(): boolean {
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useCreateOrder } from '../lib/orders';
import { useAddresses } from '../lib/customer';
import { useToast } from '../lib/toast';
import { IS_STRIPE_CONFIGURED } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import type { AddressRow, Coords } from '../lib/database.types';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton, MotionCard, MotionFade, AnimatePresence, motion } from '../components/visual/Motion';

type PayMethod = 'card' | 'cash' | 'wallet';

const MIN_LANDMARK = 3;
const MIN_ORDER_DH = 30; // Minimum order subtotal

const SUGGESTIONS = [
  'AUI Dorm 16',
  'AUI Main Gate',
  'AUI Student Center',
  'Near the Grand Mosque',
  'Next to the AUI gate',
  'Near the Michlifen pharmacy',
];

export default function CartPage() {
  const isMobile = useIsMobile();
  useSEO({ title: 'Cart', noindex: true });
  if (isMobile) return <MobileCart />;
  return <DesktopCartPage />;
}

function DesktopCartPage() {
  const { t } = useI18n();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = useCart((s) => s.deliveryFee());
  const serviceFee = useCart((s) => s.serviceFee());
  const total = useCart((s) => s.total());
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();
  const { create, submitting, error } = useCreateOrder();
  const { addresses } = useAddresses();
  const nav = useNavigate();
  const toast = useToast();

  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'saved' | 'new'>('new');
  const [selectedAddress, setSelectedAddress] = useState<AddressRow | null>(null);
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'requesting' | 'denied' | 'error'>('idle');
  const [locError, setLocError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>(IS_STRIPE_CONFIGURED ? 'card' : 'cash');
  const [phoneOnFile, setPhoneOnFile] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletCredit, setUseWalletCredit] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const wasCancelled = searchParams.get('cancelled') === '1';

  // Load phone + wallet balance once user is known
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

  // Auto-select default saved address if user has any
  useEffect(() => {
    if (addresses.length === 0) {
      setMode('new');
      return;
    }
    const def = addresses.find((a) => a.is_default) ?? addresses[0];
    setMode('saved');
    setSelectedAddress(def);
  }, [addresses]);

  const effectiveLandmark =
    mode === 'saved' ? (selectedAddress?.landmark ?? selectedAddress?.label ?? '') : landmark;
  const effectiveCoords = mode === 'saved' ? selectedAddress?.coords ?? null : coords;
  const landmarkOk = effectiveLandmark.trim().length >= MIN_LANDMARK;
  const phoneOk = !!phoneOnFile && phoneOnFile.length >= 8;
  const subtotalOk = subtotal >= MIN_ORDER_DH;

  // Wallet credit applied (capped to total before wallet)
  const totalBeforeWallet = Math.max(0, subtotal + deliveryFee + serviceFee - promoDiscount);
  const walletCredit = useWalletCredit ? Math.min(walletBalance, totalBeforeWallet) : 0;
  const finalTotal = Math.max(0, totalBeforeWallet - walletCredit);
  const fullyCoveredByWallet = walletCredit > 0 && finalTotal === 0;

  const canSubmit =
    items.length > 0 &&
    landmarkOk &&
    !!effectiveCoords &&
    !submitting &&
    phoneOk &&
    subtotalOk;

  async function captureCoords() {
    if (!('geolocation' in navigator)) {
      setLocStatus('error');
      setLocError('Geolocation not supported.');
      return;
    }
    setLocStatus('requesting');
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
        setLocStatus('idle');
      },
      (err) => {
        setLocStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
        setLocError(err.message || 'Could not read your location.');
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
      if (!promo.is_active) { toast.error('This promo code is no longer active'); return; }
      if (promo.valid_to && new Date(promo.valid_to) < new Date()) {
        toast.error('This promo code has expired'); return;
      }
      if (promo.max_redemptions && promo.redemptions >= promo.max_redemptions) {
        toast.error('This promo code has reached its limit'); return;
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
      } else {
        // 'bogo' (and any unsupported/misconfigured kind) has no discount logic —
        // refuse rather than silently applying 0 dh and burning a redemption.
        toast.error('This promo code can’t be applied to your order');
        return;
      }
      setPromoDiscount(discount);
      setPromoApplied(code);
      toast.success(`Promo applied: -${discount} dh`);
    } finally {
      setPromoChecking(false);
    }
  }

  function clearPromo() {
    setPromoDiscount(0);
    setPromoApplied(null);
    setPromoCode('');
  }

  async function checkout() {
    if (!user) {
      nav(`/auth?next=${encodeURIComponent('/cart')}`);
      return;
    }
    if (!subtotalOk) {
      toast.warn(`Minimum order is ${MIN_ORDER_DH} dh — add a bit more.`);
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

    // Persist promo + wallet usage on the order row
    if (promoApplied || walletCredit > 0) {
      await supabase
        .from('orders')
        .update({
          promotion_code: promoApplied,
          payment_method: walletCredit > 0 && finalTotal === 0 ? 'wallet' : payMethod,
        })
        .eq('id', orderId);
    }

    // Apply wallet credit via the SECURITY DEFINER RPC, which debits the
    // balance and writes the ledger row atomically (a direct client write
    // is blocked by RLS and used the wrong columns).
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

    // Increment promo redemption count (best-effort, non-blocking)
    if (promoApplied) {
      void supabase.rpc('increment_promo_redemption', { promo_code: promoApplied });
    }

    // Route based on remaining balance
    if (fullyCoveredByWallet) {
      // Whole order paid from wallet — straight to tracking
      clear();
      toast.success('Order placed · paid from wallet');
      nav(`/track/${orderId}`);
    } else if (payMethod === 'card' && IS_STRIPE_CONFIGURED) {
      // Redirect to our premium checkout page
      clear();
      nav(`/checkout/${orderId}`);
    } else {
      // Cash on delivery
      await supabase
        .from('orders')
        .update({ payment_method: 'cash' })
        .eq('id', orderId);
      clear();
      toast.success('Order placed · pay on delivery');
      nav(`/track/${orderId}`);
    }
  }

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={12}>
          <div className="section-tag">
            <I.Bag size={11} /> Your order
          </div>
          <h1 className="page-title">{t('cart.title')}</h1>
        </FadeUp>

        {items.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <I.Bag size={36} />
            <h3>{t('cart.empty.title')}</h3>
            <p>{t('cart.empty.sub')}</p>
            <Link to="/order" className="btn btn-primary" style={{ marginTop: 16 }}>
              {t('cart.browse')} <I.Arrow />
            </Link>
          </div>
        ) : (
          <div className="cart-grid" style={{ marginTop: 24 }}>
            <div>
              <FadeUp y={10}>
                <div className="cart-list">
                  {items.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div className="cart-thumb" />
                      <div>
                        <div className="cart-name">{item.name}</div>
                        <div className="cart-meta">
                          {item.restaurantName} · {item.priceDh} dh
                        </div>
                      </div>
                      <div className="qty">
                        <button onClick={() => setQty(item.id, item.qty - 1)} aria-label="Decrease">
                          <I.Minus size={14} />
                        </button>
                        <span className="n">{item.qty}</span>
                        <button onClick={() => setQty(item.id, item.qty + 1)} aria-label="Increase">
                          <I.Plus size={14} />
                        </button>
                      </div>
                      <div className="cart-price">
                        {item.priceDh * item.qty} dh
                        <button
                          onClick={() => remove(item.id)}
                          style={{
                            display: 'block',
                            marginTop: 4,
                            color: 'var(--fg-soft)',
                            fontSize: 11,
                          }}
                          aria-label="Remove"
                        >
                          <I.Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeUp>

              <FadeUp y={10} delay={0.05}>
                <div
                  style={{
                    marginTop: 24,
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-lg)',
                    padding: '22px 24px',
                  }}
                >
                  <div className="section-tag" style={{ marginBottom: 6 }}>
                    <I.Pin size={11} /> Where exactly?
                  </div>
                  <h3
                    style={{
                      fontFamily: 'Montserrat',
                      fontWeight: 800,
                      fontSize: 22,
                      margin: '4px 0 14px',
                    }}
                  >
                    Drop landmark
                  </h3>

                  {addresses.length > 0 && (
                    <div className="auth-toggle" style={{ marginBottom: 18 }}>
                      <button
                        className={mode === 'saved' ? 'active' : ''}
                        onClick={() => setMode('saved')}
                      >
                        Saved ({addresses.length})
                      </button>
                      <button
                        className={mode === 'new' ? 'active' : ''}
                        onClick={() => setMode('new')}
                      >
                        New address
                      </button>
                    </div>
                  )}

                  {mode === 'saved' && addresses.length > 0 && (
                    <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                      {addresses.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAddress(a)}
                          className={`address-picker ${
                            selectedAddress?.id === a.id ? 'active' : ''
                          }`}
                        >
                          <div className="address-picker-icon">
                            {a.is_campus ? <I.Home size={16} /> : <I.Pin size={16} />}
                          </div>
                          <div style={{ flex: 1, textAlign: 'start', minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{a.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
                              {a.line1}
                              {a.building ? ` · ${a.building}` : ''}
                              {a.room ? ` · Rm ${a.room}` : ''}
                            </div>
                          </div>
                          {selectedAddress?.id === a.id && (
                            <I.Check size={14} style={{ color: 'var(--primary)' }} />
                          )}
                        </button>
                      ))}
                      <Link
                        to="/addresses"
                        style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}
                      >
                        Manage addresses →
                      </Link>
                    </div>
                  )}

                  {mode === 'new' && (
                    <>
                      <div className="field">
                        <label htmlFor="landmark">Landmark · required</label>
                        <input
                          id="landmark"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder='e.g. "Near the Grand Mosque"'
                          aria-invalid={!landmarkOk && landmark.length > 0}
                        />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {SUGGESTIONS.map((s) => (
                            <button
                              type="button"
                              key={s}
                              onClick={() => setLandmark(s)}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid var(--line)',
                                borderRadius: 999,
                                fontSize: 12,
                                background: 'var(--surface)',
                                color: 'var(--fg-soft)',
                                cursor: 'pointer',
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: 14,
                          borderRadius: 16,
                          background: '#FFF1EB',
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            background: 'var(--primary)',
                            color: 'white',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <I.Pin size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              color: 'var(--fg-soft)',
                            }}
                          >
                            GPS pin
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg)' }}>
                            {coords
                              ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                              : locStatus === 'requesting'
                                ? 'Reading…'
                                : 'Tap to capture'}
                          </div>
                          {coords?.accuracyM != null && (
                            <div style={{ fontSize: 11, color: 'var(--fg-soft)', marginTop: 2 }}>
                              ±{Math.round(coords.accuracyM)} m
                            </div>
                          )}
                        </div>
                        <button
                          onClick={captureCoords}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 999,
                            background: coords ? 'transparent' : 'var(--primary)',
                            color: coords ? 'var(--fg-soft)' : 'white',
                            fontSize: 13,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {coords ? 'Update' : 'Capture'}
                        </button>
                      </div>
                      {locError && (
                        <div style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>
                          {locError}
                        </div>
                      )}
                    </>
                  )}

                  <div className="field" style={{ marginTop: 18 }}>
                    <label htmlFor="notes">Driver notes · optional</label>
                    <textarea
                      id="notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Gate code, floor, anything else"
                    />
                  </div>
                </div>
              </FadeUp>
            </div>

            <div className="cart-summary">
              <h3>Order summary</h3>

              {wasCancelled && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#EF4444',
                    marginBottom: 14,
                    lineHeight: 1.45,
                    fontWeight: 600,
                  }}
                >
                  Payment was cancelled. You can try again or pay with cash.
                </div>
              )}

              <div className="sum-row">
                <span>{t('cart.subtotal')}</span>
                <span>{subtotal} dh</span>
              </div>
              <div className="sum-row">
                <span>{t('cart.delivery')}</span>
                <span>{deliveryFee} dh</span>
              </div>
              <div className="sum-row">
                <span>{t('cart.service')}</span>
                <span>{serviceFee} dh</span>
              </div>
              {promoDiscount > 0 && (
                <div className="sum-row" style={{ color: '#059669', fontWeight: 600 }}>
                  <span>Promo · {promoApplied}</span>
                  <span>−{promoDiscount} dh</span>
                </div>
              )}
              {walletCredit > 0 && (
                <div className="sum-row" style={{ color: '#4F46E5', fontWeight: 600 }}>
                  <span>Wallet credit</span>
                  <span>−{walletCredit} dh</span>
                </div>
              )}
              <div className="sum-row total">
                <span>{t('cart.total')}</span>
                <span>{finalTotal} dh</span>
              </div>

              {/* ── Min-order warning ── */}
              {!subtotalOk && (
                <div
                  style={{
                    margin: '14px 0 4px',
                    padding: '10px 12px',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.20)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#B45309',
                    lineHeight: 1.45,
                    fontWeight: 600,
                  }}
                >
                  Minimum order is {MIN_ORDER_DH} dh — add {MIN_ORDER_DH - subtotal} dh more to checkout.
                </div>
              )}

              {/* ── Phone-missing warning ── */}
              {user && !phoneOk && (
                <div
                  style={{
                    margin: '14px 0 4px',
                    padding: '12px 14px',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.20)',
                    borderRadius: 12,
                    fontSize: 13,
                    color: '#B45309',
                    lineHeight: 1.45,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <I.Phone size={16} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong>Add a phone number</strong> so your rider can reach you.{' '}
                    <Link to="/account?next=/cart" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      Add now
                    </Link>
                  </div>
                </div>
              )}

              {/* ── Promo code ── */}
              <div style={{ margin: '18px 0 8px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-soft)', marginBottom: 8 }}>
                  Promo code
                </div>
                {promoApplied ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: 'rgba(5,150,105,0.08)',
                      border: '1px solid rgba(5,150,105,0.24)',
                      borderRadius: 12,
                    }}
                  >
                    <I.Check size={14} style={{ color: '#059669' }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#059669' }}>
                      {promoApplied} applied · −{promoDiscount} dh
                    </div>
                    <button
                      type="button"
                      onClick={clearPromo}
                      style={{
                        background: 'none',
                        border: 0,
                        cursor: 'pointer',
                        color: 'var(--fg-soft)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="WELCOME50"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 12,
                        fontSize: 13,
                        fontFamily: 'inherit',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={!promoCode.trim() || promoChecking}
                      className="btn btn-outline"
                      style={{ padding: '0 16px', fontSize: 13 }}
                    >
                      {promoChecking ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Wallet credit ── */}
              {user && walletBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setUseWalletCredit((v) => !v)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: useWalletCredit ? 'rgba(99,91,255,0.08)' : 'var(--surface)',
                    border: `2px solid ${useWalletCredit ? '#635BFF' : 'var(--line)'}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: 8,
                    transition: 'all .2s',
                  }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, #635BFF, #8E85FF)',
                      display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0,
                    }}
                  >
                    <I.Wallet size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Use wallet credit{useWalletCredit && walletCredit > 0 ? ` · −${walletCredit} dh` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-soft)' }}>
                      Balance: {walletBalance} dh
                    </div>
                  </div>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${useWalletCredit ? '#635BFF' : 'var(--line)'}`,
                      background: useWalletCredit ? '#635BFF' : 'transparent',
                      display: 'grid', placeItems: 'center', color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {useWalletCredit && <I.Check size={12} />}
                  </div>
                </button>
              )}

              {/* ── Payment method selector ── */}
              <div style={{ margin: '18px 0 8px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-soft)', marginBottom: 8 }}>
                  Pay with
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {IS_STRIPE_CONFIGURED && (
                    <button
                      type="button"
                      onClick={() => setPayMethod('card')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: `2px solid ${payMethod === 'card' ? 'var(--primary)' : 'var(--line)'}`,
                        background: payMethod === 'card' ? 'rgba(255,87,34,0.06)' : 'var(--surface)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all .2s',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #635BFF, #0A2540)',
                        display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0,
                      }}>
                        <I.Wallet size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Card / Apple Pay</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-soft)' }}>Visa, Mastercard, Apple Pay</div>
                      </div>
                      {payMethod === 'card' && <I.Check size={16} style={{ color: 'var(--primary)' }} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `2px solid ${payMethod === 'cash' ? 'var(--primary)' : 'var(--line)'}`,
                      background: payMethod === 'cash' ? 'rgba(255,87,34,0.06)' : 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, #34D399, #059669)',
                      display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0,
                      fontSize: 18,
                    }}>
                      💵
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Cash on delivery</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-soft)' }}>Pay the rider when it arrives</div>
                    </div>
                    {payMethod === 'cash' && <I.Check size={16} style={{ color: 'var(--primary)' }} />}
                  </button>
                </div>
              </div>

              {!user && (
                <div
                  style={{
                    background: 'rgba(255,87,34,0.08)',
                    border: '1px dashed rgba(255,87,34,0.3)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: 'var(--fg-soft)',
                    margin: '14px 0 8px',
                    lineHeight: 1.45,
                  }}
                >
                  You'll be asked to sign in or create an account before checkout.
                </div>
              )}

              {error && (
                <div style={{ color: '#EF4444', fontSize: 12, marginTop: 12 }}>{error}</div>
              )}

              <MotionButton
                className="btn btn-primary btn-lg btn-block"
                style={{ marginTop: 18, opacity: canSubmit ? 1 : 0.6 }}
                onClick={checkout}
                disabled={!canSubmit && !!user}
              >
                {submitting
                  ? 'Placing order…'
                  : !user
                    ? 'Sign in to checkout'
                    : !subtotalOk
                      ? `Add ${MIN_ORDER_DH - subtotal} dh more`
                      : !phoneOk
                        ? 'Add phone in account'
                        : !effectiveCoords
                          ? 'Capture GPS first'
                          : !landmarkOk
                            ? 'Add a landmark'
                            : fullyCoveredByWallet
                              ? `Place order · paid from wallet`
                              : payMethod === 'card'
                                ? `Pay ${finalTotal} dh`
                                : `Order · ${finalTotal} dh (cash)`}{' '}
                <I.Arrow />
              </MotionButton>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--fg-soft)',
                  textAlign: 'center',
                  marginTop: 14,
                  lineHeight: 1.4,
                }}
              >
                Main gate → dorms 20 dh · Restaurant → main gate 35 dh.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile sticky checkout bar — always thumb-reachable ───────── */}
      {items.length > 0 && (
        <MobileStickyCheckout
          submitting={submitting}
          canSubmit={canSubmit}
          finalTotal={finalTotal}
          fullyCoveredByWallet={fullyCoveredByWallet}
          subtotalOk={subtotalOk}
          phoneOk={phoneOk}
          effectiveCoords={effectiveCoords}
          landmarkOk={landmarkOk}
          subtotal={subtotal}
          payMethod={payMethod}
          user={user}
          onClick={checkout}
        />
      )}
    </section>
  );
}

/** Sticky bottom-of-screen primary CTA — visible only on mobile (≤ 768px) */
function MobileStickyCheckout({
  submitting,
  canSubmit,
  finalTotal,
  fullyCoveredByWallet,
  subtotalOk,
  phoneOk,
  effectiveCoords,
  landmarkOk,
  subtotal,
  payMethod,
  user,
  onClick,
}: {
  submitting: boolean;
  canSubmit: boolean;
  finalTotal: number;
  fullyCoveredByWallet: boolean;
  subtotalOk: boolean;
  phoneOk: boolean;
  effectiveCoords: unknown;
  landmarkOk: boolean;
  subtotal: number;
  payMethod: 'card' | 'cash' | 'wallet';
  user: { email?: string | null } | null;
  onClick: () => void;
}) {
  // Set sticky-cta marker on body so MobileTabBar can pad accordingly
  useEffect(() => {
    document.body.classList.add('has-sticky-cta');
    return () => document.body.classList.remove('has-sticky-cta');
  }, []);

  const label = submitting
    ? 'Placing order…'
    : !user
      ? 'Sign in to checkout'
      : !subtotalOk
        ? `Add ${MIN_ORDER_DH - subtotal} dh more`
        : !phoneOk
          ? 'Add phone in account'
          : !effectiveCoords
            ? 'Capture GPS first'
            : !landmarkOk
              ? 'Add a landmark'
              : fullyCoveredByWallet
                ? `Place order · wallet`
                : payMethod === 'card'
                  ? `Pay ${finalTotal} dh`
                  : `Order · ${finalTotal} dh`;

  return (
    <div className="sticky-action-bar">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-soft)' }}>
          Total
        </div>
        <div style={{
          fontFamily: 'Montserrat',
          fontWeight: 900,
          fontSize: 20,
          color: 'var(--primary)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>
          {finalTotal} dh
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={!canSubmit && !!user}
        className="btn btn-primary"
        style={{
          flex: '0 0 auto',
          padding: '14px 22px',
          fontSize: 14,
          fontWeight: 700,
          opacity: canSubmit ? 1 : 0.6,
          minHeight: 50,
          borderRadius: 14,
        }}
      >
        {label}
      </button>
    </div>
  );
}

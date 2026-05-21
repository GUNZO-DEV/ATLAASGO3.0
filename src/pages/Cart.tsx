import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useCart } from '../lib/cart';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useCreateOrder } from '../lib/orders';
import { useAddresses } from '../lib/customer';
import { IS_STRIPE_CONFIGURED } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import type { AddressRow, Coords } from '../lib/database.types';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton, MotionCard, MotionFade, AnimatePresence, motion } from '../components/visual/Motion';

type PayMethod = 'card' | 'cash';

const MIN_LANDMARK = 3;

const SUGGESTIONS = [
  'AUI Dorm 16',
  'AUI Main Gate',
  'AUI Student Center',
  'Near the Grand Mosque',
  'Next to the AUI gate',
  'Near the Michlifen pharmacy',
];

export default function CartPage() {
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

  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'saved' | 'new'>('new');
  const [selectedAddress, setSelectedAddress] = useState<AddressRow | null>(null);
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'requesting' | 'denied' | 'error'>('idle');
  const [locError, setLocError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>(IS_STRIPE_CONFIGURED ? 'card' : 'cash');
  const wasCancelled = searchParams.get('cancelled') === '1';

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
  const canSubmit = items.length > 0 && landmarkOk && !!effectiveCoords && !submitting;

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

  async function checkout() {
    if (!user) {
      nav(`/auth?next=${encodeURIComponent('/cart')}`);
      return;
    }
    if (!effectiveCoords || !landmarkOk) return;

    const orderId = await create({
      items,
      landmark: effectiveLandmark.trim(),
      coords: effectiveCoords,
      deliveryNotes: notes.trim() || undefined,
      subtotalDh: subtotal,
      deliveryFeeDh: deliveryFee,
      serviceFeeDh: serviceFee,
      totalDh: total,
    });
    if (!orderId) return;

    if (payMethod === 'card' && IS_STRIPE_CONFIGURED) {
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
              <div className="sum-row total">
                <span>{t('cart.total')}</span>
                <span>{total} dh</span>
              </div>

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
                    : !effectiveCoords
                      ? 'Capture GPS first'
                      : !landmarkOk
                        ? 'Add a landmark'
                        : payMethod === 'card'
                          ? `Pay ${total} dh`
                          : `Order · ${total} dh (cash)`}{' '}
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
    </section>
  );
}

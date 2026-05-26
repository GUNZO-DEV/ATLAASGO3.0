import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useOrder } from '../lib/orders';
import { useOrderAssignment } from '../lib/orderAssignment';
import { cancelOrder } from '../lib/orderActions';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import OrderChat from '../components/OrderChat';
import ReviewForm from '../components/ReviewForm';
import OrderStageHero from '../components/OrderStageHero';
import OrderProgress, { ORDER_STAGES } from '../components/OrderProgress';
import OrderReceipt from '../components/OrderReceipt';
import DriverCard from '../components/DriverCard';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton } from '../components/visual/Motion';
import { useSEO } from '../lib/seo';

// Leaflet ships ~80 KB so we lazy-load it
const TrackMap = lazy(() => import('../components/TrackMap'));

const DEFAULT_CUSTOMER_COORDS = { lat: 33.5350, lng: -5.1106 }; // AUI Ifrane

export default function Track() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { order, loading, error, stage, mutate, refresh } = useOrder(id);
  const { assignment, rider } = useOrderAssignment(id);
  useSEO({ title: `Order #${(id ?? '').slice(0, 6).toUpperCase()}`, noindex: true });
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [cancelling, setCancelling] = useState(false);
  const [riderPhone, setRiderPhone] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Resolve rider's phone for the Call button (best-effort)
  useEffect(() => {
    if (!rider?.user_id) {
      setRiderPhone(null);
      return;
    }
    void supabase
      .from('profiles')
      .select('phone')
      .eq('id', rider.user_id)
      .maybeSingle()
      .then(({ data }) => {
        setRiderPhone((data as { phone?: string | null } | null)?.phone ?? null);
      });
  }, [rider?.user_id]);

  // Payment-return success toast (?paid=1)
  useEffect(() => {
    if (params.get('paid') === '1') {
      toast.success('Payment confirmed · your order is on its way!', { duration: 6000 });
      const np = new URLSearchParams(params);
      np.delete('paid');
      setParams(np, { replace: true });
    }
  }, [params, setParams, toast]);

  // Stage indexing + ETA
  const stageIndex = stage ? ORDER_STAGES.findIndex((s) => s.key === stage) : 0;
  const etaMin = Math.max(0, (ORDER_STAGES.length - 1 - stageIndex) * 4);
  const delivered = stage === 'delivered';
  const cancelled = stage === 'cancelled';
  const cancellable = stage === 'ordered' && order?.customer_id === user?.id;

  const customerCoords = order?.coords ?? DEFAULT_CUSTOMER_COORDS;
  const headerLandmark = order?.driver_payload?.headerLandmark ?? 'Near the AUI gate';

  const itemSummary = useMemo(() => {
    if (!order?.items?.length) return null;
    const count = order.items.reduce((acc, i) => acc + i.qty, 0);
    return `${count} item${count === 1 ? '' : 's'} · ${order.items[0].restaurantName}`;
  }, [order]);

  async function handleCancel() {
    if (!id) return;
    if (!confirm('Cancel this order? You can\'t undo this.')) return;
    setCancelling(true);
    mutate({ status: 'cancelled' }); // optimistic
    const res = await cancelOrder(id);
    setCancelling(false);
    if (!res.ok) {
      toast.error(res.error || 'Could not cancel — try again');
      void refresh();
    } else {
      toast.success('Order cancelled');
    }
  }

  // ── Empty / not-found state ──────────────────────────────────────
  if (!loading && !order && !error) {
    return (
      <section className="page">
        <div className="container" style={{ maxWidth: 520, padding: '60px 20px' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '40px 32px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 24,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 8 }}>🔍</div>
            <h2
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 24,
                margin: '0 0 8px',
              }}
            >
              Order not found
            </h2>
            <p style={{ color: 'var(--fg-soft)', margin: '0 0 22px' }}>
              We couldn't find this order — it may have been removed or never existed.
            </p>
            <Link to="/orders" className="btn btn-primary btn-lg">
              See your orders <I.Arrow />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page" style={{ paddingTop: 20 }}>
      <div className="container" style={{ maxWidth: 1180 }}>
        {/* ── HERO — gradient card with stage headline ─────────── */}
        <FadeUp y={12}>
          <OrderStageHero status={stage} etaMin={etaMin} orderId={id} />
        </FadeUp>

        {/* ── PROGRESS BAR ─────────────────────────────────────── */}
        <FadeUp y={10} delay={0.08}>
          <div
            style={{
              marginTop: 18,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: 4,
            }}
          >
            <OrderProgress status={stage} />
          </div>
        </FadeUp>

        {/* ── ERRORS ───────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 14,
              background: 'rgba(239,68,68,0.08)',
              color: '#B91C1C',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}{' '}
            <Link to="/orders" style={{ color: '#B91C1C', textDecoration: 'underline' }}>
              See your orders
            </Link>
          </div>
        )}

        {/* ── CANCEL CTA (only while still 'ordered') ──────────── */}
        {cancellable && (
          <FadeUp y={8} delay={0.12}>
            <div
              style={{
                marginTop: 14,
                padding: '14px 18px',
                background: 'rgba(239,68,68,0.05)',
                border: '1px dashed rgba(239,68,68,0.24)',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--fg-soft)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--fg)' }}>Change of mind?</strong> You can
                cancel before the restaurant accepts.
              </div>
              <MotionButton
                className="btn btn-outline"
                onClick={handleCancel}
                disabled={cancelling}
                style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#B91C1C' }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </MotionButton>
            </div>
          </FadeUp>
        )}

        {/* ── MAIN GRID: Map (left) + Side rail (right) ────────── */}
        {!cancelled && (
          <div
            style={{
              marginTop: 22,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
              gap: 22,
            }}
            className="track-main-grid"
          >
            {/* ── LEFT: Map + landmark strip ───────────────────── */}
            <div
              style={{
                position: 'relative',
                borderRadius: 22,
                overflow: 'hidden',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
              }}
            >
              <Suspense
                fallback={
                  <div
                    className="skeleton-shimmer"
                    style={{ minHeight: 420, borderRadius: 22 }}
                  />
                }
              >
                <TrackMap customer={customerCoords} />
              </Suspense>

              {/* Floating landmark strip */}
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 14,
                  background: 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 16,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
                    color: 'white',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <I.Pin size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#7A6F66',
                    }}
                  >
                    Drop-off
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#1A1410',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {headerLandmark}
                  </div>
                </div>
                <MotionButton
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.warn('Geolocation not supported in this browser');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${pos.coords.latitude},${pos.coords.longitude}`;
                        window.open(url, '_blank');
                      },
                      () => toast.error('Could not read your location'),
                    );
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <I.Pin size={12} /> Share
                </MotionButton>
              </div>
            </div>

            {/* ── RIGHT: Rail (Driver + Receipt + Chat) ─────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DriverCard
                rider={rider}
                hasAssignment={!!assignment}
                phone={riderPhone}
                onChat={() => setShowChat(true)}
              />

              {order && <OrderReceipt order={order} />}

              {!showChat && order && (
                <button
                  type="button"
                  onClick={() => setShowChat(true)}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,91,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #4F46E5, #635BFF)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    <I.Chat size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Chat about this order</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
                      Talk to the rider or restaurant
                    </div>
                  </div>
                  <I.Arrow size={14} style={{ color: 'var(--fg-soft)' }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Cancelled state — show only receipt ─────────────── */}
        {cancelled && order && (
          <FadeUp y={10}>
            <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
              <OrderReceipt order={order} defaultOpen />
              <Link to="/order" className="btn btn-primary btn-lg" style={{ width: 'fit-content' }}>
                Order something else <I.Arrow />
              </Link>
            </div>
          </FadeUp>
        )}

        {/* ── Chat panel — slides in when opened ───────────────── */}
        {showChat && order && (
          <FadeUp y={10}>
            <div
              style={{
                marginTop: 22,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 22,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #4F46E5, #635BFF)',
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <I.Chat size={14} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Order chat</div>
                    {itemSummary && (
                      <div style={{ fontSize: 11, color: 'var(--fg-soft)' }}>{itemSummary}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  className="icon-btn"
                  aria-label="Close chat"
                  style={{ border: 0, background: 'rgba(0,0,0,0.04)' }}
                >
                  <I.Close size={14} />
                </button>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <OrderChat orderId={id} />
              </div>
            </div>
          </FadeUp>
        )}

        {/* ── Review (delivered only) ──────────────────────────── */}
        {delivered && order && (
          <FadeUp y={10}>
            <div style={{ marginTop: 22 }}>
              <ReviewForm orderId={id!} restaurantId={order.restaurant_id} />
            </div>
          </FadeUp>
        )}

        {/* ── Bottom: re-order CTA for delivered orders ────────── */}
        {delivered && (
          <div
            style={{
              marginTop: 22,
              padding: '20px 24px',
              background:
                'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(52,211,153,0.04))',
              border: '1px solid rgba(5,150,105,0.20)',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                Loved it? Reorder in one tap.
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
                We'll start a fresh order with the same items.
              </div>
            </div>
            <Link to={`/r/${order?.items?.[0]?.restaurantSlug ?? ''}`} className="btn btn-primary">
              Reorder <I.Arrow />
            </Link>
          </div>
        )}

        {/* Responsive grid: stack on mobile */}
        <style>{`
          @media (max-width: 880px) {
            .track-main-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

import { lazy, Suspense, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';
import { useOrder } from '../lib/orders';
import { useOrderAssignment } from '../lib/orderAssignment';
import type { OrderStatus } from '../lib/database.types';
import OrderChat from '../components/OrderChat';
import ReviewForm from '../components/ReviewForm';
import { FadeUp } from '../components/visual/ScrollReveal';

// Leaflet ships ~80 KB so we lazy-load it; the rest of the Track page renders
// instantly while the map hydrates.
const TrackMap = lazy(() => import('../components/TrackMap'));

const STAGES: { key: OrderStatus; title: string; sub: string }[] = [
  { key: 'ordered',        title: 'Order placed',           sub: 'We\'ve received it' },
  { key: 'preparing',      title: 'Preparing',              sub: 'In the kitchen' },
  { key: 'enRoute',        title: 'Driver en route',        sub: 'Heading to merchant' },
  { key: 'outForDelivery', title: 'Out for delivery',       sub: 'On the way to you' },
  { key: 'arriving',       title: 'Arriving',               sub: 'Almost at your door' },
  { key: 'delivered',      title: 'Delivered',              sub: 'Enjoy!' },
];

const DEFAULT_CUSTOMER_COORDS = { lat: 33.5350, lng: -5.1106 }; // AUI Ifrane

export default function Track() {
  const { id } = useParams<{ id?: string }>();
  const { t } = useI18n();
  const { order, loading, error, stage } = useOrder(id);
  const { assignment, rider } = useOrderAssignment(id);

  const stageIndex = stage ? STAGES.findIndex((s) => s.key === stage) : 0;
  const eta = Math.max(0, (STAGES.length - 1 - stageIndex) * 4);
  const delivered = stage === 'delivered';

  const customerCoords = order?.coords ?? DEFAULT_CUSTOMER_COORDS;
  const headerLandmark = order?.driver_payload?.headerLandmark ?? 'Near the AUI gate';

  const itemSummary = useMemo(() => {
    if (!order?.items?.length) return 'Loading order…';
    const count = order.items.reduce((acc, i) => acc + i.qty, 0);
    return `${count} item${count === 1 ? '' : 's'} from ${order.items[0].restaurantName}`;
  }, [order]);

  return (
    <section className="page">
      <div className="container">
        {/* ── Header ───────────────────────────── */}
        <FadeUp y={10}>
          <div className="track-head">
            <div>
              <div className="section-tag">
                <I.Bike size={11} /> Order #{(id ?? '—').slice(0, 8).toUpperCase()}
              </div>
              <h1 className="page-title">{t('track.title')}</h1>
              <p className="page-sub">
                {loading
                  ? 'Loading your order…'
                  : delivered
                    ? 'Delivered. Enjoy your meal!'
                    : stage === 'cancelled'
                      ? 'This order was cancelled.'
                      : itemSummary}
              </p>
            </div>
            <div className="track-eta">
              <div className="track-eta-num">
                {delivered ? '✓' : stage === 'cancelled' ? '—' : eta}
              </div>
              <div className="track-eta-label">
                {delivered ? 'Delivered' : stage === 'cancelled' ? 'Cancelled' : 'min ETA'}
              </div>
            </div>
          </div>
        </FadeUp>

        {error && (
          <div className="track-err">
            {error}
            <div style={{ marginTop: 8 }}>
              <Link to="/orders">View your orders</Link>
            </div>
          </div>
        )}

        {!loading && !order && !error && (
          <div className="empty-state" style={{ marginTop: 24 }}>
            <h3>Order not found</h3>
            <p>
              We couldn't find this order. <Link to="/orders">See your orders</Link>.
            </p>
          </div>
        )}

        {/* ── Map + Timeline ──────────────────── */}
        <div className="track-grid" style={{ marginTop: 32 }}>
          <div className="track-map-wrap">
            <Suspense
              fallback={
                <div className="track-leaflet skeleton-shimmer" style={{ minHeight: 360 }} />
              }
            >
              <TrackMap customer={customerCoords} />
            </Suspense>

            <div className="track-landmark-strip">
              <div className="track-landmark-icon">
                <I.Pin size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="track-landmark-label">Driver heads to</div>
                <div className="track-landmark-value">{headerLandmark}</div>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '8px 14px', fontSize: 12 }}
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${pos.coords.latitude},${pos.coords.longitude}`;
                    window.open(url, '_blank');
                  });
                }}
              >
                <I.Pin size={12} /> Share location
              </button>
            </div>
          </div>

          <div className="timeline">
            <h3>Live timeline</h3>
            <div className="eta">
              {delivered ? 'Order complete' : stage === 'cancelled' ? 'Cancelled' : `ETA ~ ${eta} min`}
            </div>

            {STAGES.map((s, i) => {
              const cls = i < stageIndex ? 'done' : i === stageIndex ? 'current done' : 'pending';
              return (
                <div className={`tl-step ${cls}`} key={s.key}>
                  <div className="tl-dot">{i < stageIndex ? <I.Check size={12} /> : null}</div>
                  <div>
                    <div className="tl-title">{s.title}</div>
                    <div className="tl-time">{s.sub}</div>
                  </div>
                </div>
              );
            })}

            {rider && assignment && (
              <div className="rider-card-pro">
                <div className="rider-card-pro-avatar">
                  {rider.user_id.substring(0, 1).toUpperCase()}
                </div>
                <div className="rider-card-pro-info">
                  <div className="rider-card-pro-name">Your driver</div>
                  <div className="rider-card-pro-meta">
                    <span>
                      {rider.vehicle && rider.plate ? `${rider.vehicle} · ${rider.plate}` : 'Loading…'}
                    </span>
                    <span>·</span>
                    <span>
                      <I.Star size={11} /> {rider.rating.toFixed(1)} · {rider.total_trips} trips
                    </span>
                  </div>
                </div>
                <button className="chat-btn" aria-label="Chat">
                  <I.Chat size={16} />
                </button>
                <button className="chat-btn" aria-label="Call" style={{ background: 'var(--ink)' }}>
                  <I.Phone size={16} />
                </button>
              </div>
            )}
            {!rider && assignment && (
              <div className="rider-card-pro" style={{ opacity: 0.6 }}>
                <div className="rider-card-pro-avatar" style={{ background: 'var(--line)' }}>?</div>
                <div className="rider-card-pro-info">
                  <div className="rider-card-pro-name">Waiting for driver…</div>
                  <div className="rider-card-pro-meta">
                    <span>Your driver will appear here once assigned</span>
                  </div>
                </div>
              </div>
            )}
            {!assignment && stage && stage !== 'ordered' && stage !== 'preparing' && (
              <div className="rider-card-pro" style={{ opacity: 0.6 }}>
                <div className="rider-card-pro-avatar" style={{ background: 'var(--line)' }}>🚴</div>
                <div className="rider-card-pro-info">
                  <div className="rider-card-pro-name">Driver assignment pending</div>
                  <div className="rider-card-pro-meta">
                    <span>Your driver will be assigned shortly</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {order && (
          <div className="track-bottom">
            <OrderChat orderId={id} />
            {delivered && <ReviewForm orderId={id!} restaurantId={order.restaurant_id} />}
          </div>
        )}
      </div>
    </section>
  );
}

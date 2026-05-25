import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useOrdersList } from '../lib/orders';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { FadeUp } from '../components/visual/ScrollReveal';
import type { OrderStatus } from '../lib/database.types';

type Filter = 'all' | 'live' | 'delivered' | 'cancelled';

const LIVE_STATUSES: OrderStatus[] = [
  'ordered',
  'preparing',
  'enRoute',
  'outForDelivery',
  'arriving',
];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const { orders, loading, error } = useOrdersList(50);
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!authLoading && !user)
      nav(`/auth?next=${encodeURIComponent('/orders')}`, { replace: true });
  }, [authLoading, user, nav]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'live') return orders.filter((o) => LIVE_STATUSES.includes(o.status));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const liveCount = orders.filter((o) => LIVE_STATUSES.includes(o.status)).length;

  return (
    <section className="page">
      <div className="container" style={{ maxWidth: 880 }}>
        <FadeUp y={12}>
          <div className="section-tag">
            <I.Receipt size={11} /> Your orders
          </div>
          <h1 className="page-title">Order history</h1>
          <p className="page-sub">
            {liveCount > 0 ? (
              <>
                <strong style={{ color: 'var(--primary)' }}>
                  {liveCount} live order{liveCount === 1 ? '' : 's'}
                </strong>{' '}
                — tap to track
              </>
            ) : (
              "Everything you've ordered, in one place."
            )}
          </p>
        </FadeUp>

        {/* Filter pills */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            paddingBottom: 4,
          }}
        >
          {FILTERS.map((f) => {
            const count =
              f.key === 'all'
                ? orders.length
                : f.key === 'live'
                  ? liveCount
                  : orders.filter((o) => o.status === f.key).length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  color: active ? 'white' : 'var(--fg)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all .2s',
                }}
              >
                {f.label}
                <span
                  style={{
                    background: active ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.06)',
                    color: active ? 'white' : 'var(--fg-soft)',
                    padding: '1px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 18,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 14,
              background: 'rgba(239,68,68,0.10)',
              color: '#B91C1C',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ marginTop: 22, display: 'grid', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer"
                style={{ height: 96, borderRadius: 18 }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              marginTop: 32,
              textAlign: 'center',
              padding: '48px 24px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 22,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 4 }}>
              {filter === 'all' ? '🛍' : '🌿'}
            </div>
            <h3
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 18,
                margin: '0 0 6px',
              }}
            >
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </h3>
            <p style={{ color: 'var(--fg-soft)', margin: '0 0 18px', fontSize: 14 }}>
              {filter === 'all'
                ? "Once you order something we'll keep the history here."
                : 'Try another filter.'}
            </p>
            {filter === 'all' && (
              <Link to="/order" className="btn btn-primary">
                Browse restaurants <I.Arrow />
              </Link>
            )}
          </div>
        )}

        {/* Order cards */}
        <div style={{ marginTop: 22, display: 'grid', gap: 12 }}>
          {filtered.map((o, idx) => {
            const firstItem = o.items?.[0];
            const itemCount = o.items?.reduce((acc, i) => acc + i.qty, 0) ?? 0;
            const isLive = LIVE_STATUSES.includes(o.status);
            return (
              <FadeUp y={10} delay={Math.min(idx * 0.04, 0.32)} key={o.id}>
                <Link
                  to={`/track/${o.id}`}
                  style={{
                    display: 'block',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 18,
                    padding: '18px 22px',
                    textDecoration: 'none',
                    color: 'var(--fg)',
                    transition: 'all .2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,87,34,0.30)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,87,34,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Live indicator stripe */}
                  {isLive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: 'linear-gradient(180deg, #FF5722, #FF8A65)',
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Restaurant emoji icon */}
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background:
                          'linear-gradient(135deg, rgba(255,87,34,0.12), rgba(255,138,101,0.20))',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 26,
                        flexShrink: 0,
                      }}
                    >
                      🥘
                    </div>

                    {/* Middle: restaurant + items + landmark */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'Montserrat',
                            fontWeight: 800,
                            fontSize: 15,
                            color: 'var(--fg)',
                          }}
                        >
                          {firstItem?.restaurantName ?? 'Restaurant'}
                        </div>
                        <OrderStatusBadge status={o.status} variant="mini" />
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--fg-soft)',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          {itemCount} item{itemCount === 1 ? '' : 's'}
                          {firstItem && itemCount > 1 ? ` · ${firstItem.name} +${itemCount - 1}` : firstItem ? ` · ${firstItem.name}` : ''}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-soft)',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <I.Pin size={11} />
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 280,
                          }}
                        >
                          {o.landmark}
                        </span>
                        <span style={{ opacity: 0.6 }}>·</span>
                        <span>{timeAgo(o.created_at)}</span>
                      </div>
                    </div>

                    {/* Right: total + chevron */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'Montserrat',
                          fontWeight: 900,
                          fontSize: 17,
                          color: 'var(--primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {o.total_dh} dh
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--fg-soft)',
                        }}
                      >
                        {o.payment_method === 'cash'
                          ? 'Cash'
                          : o.payment_method === 'wallet'
                            ? 'Wallet'
                            : 'Card'}
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}

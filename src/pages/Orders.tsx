import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useOrdersList } from '../lib/orders';
import type { OrderStatus } from '../lib/database.types';

const STATUS_STYLE: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  ordered: { label: 'Ordered', color: '#7A6F66', bg: 'rgba(0,0,0,0.06)' },
  preparing: { label: 'Preparing', color: '#C66B1F', bg: 'rgba(255,138,101,0.16)' },
  enRoute: { label: 'En route', color: '#C66B1F', bg: 'rgba(255,138,101,0.16)' },
  outForDelivery: { label: 'Out for delivery', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  arriving: { label: 'Arriving', color: '#FF5722', bg: 'rgba(255,87,34,0.12)' },
  delivered: { label: 'Delivered', color: '#7A6F66', bg: 'rgba(0,0,0,0.06)' },
  cancelled: { label: 'Cancelled', color: '#B91C1C', bg: 'rgba(239,68,68,0.10)' },
};

export default function Orders() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { orders, loading, error } = useOrdersList(50);
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) nav(`/auth?next=${encodeURIComponent('/orders')}`, { replace: true });
  }, [authLoading, user, nav]);

  return (
    <section className="page">
      <div className="container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div>
            <div className="section-tag">
              <I.Receipt size={11} /> Your orders
            </div>
            <h1 className="page-title">Order history</h1>
            <p className="page-sub">
              {user ? <>Signed in as <strong>{user.email}</strong></> : 'Loading…'}
            </p>
          </div>
          {user && (
            <button onClick={signOut} className="btn btn-outline">
              Sign out
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.10)',
              color: '#B91C1C',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
          {loading && <div style={{ color: 'var(--fg-soft)', fontSize: 14 }}>Loading…</div>}

          {!loading && orders.length === 0 && (
            <div className="empty-state">
              <I.Bag size={36} />
              <h3>No orders yet</h3>
              <p>Place your first order and we'll keep the history here.</p>
              <Link to="/order" className="btn btn-primary" style={{ marginTop: 16 }}>
                Browse restaurants <I.Arrow />
              </Link>
            </div>
          )}

          {orders.map((o) => {
            const sty = STATUS_STYLE[o.status];
            const firstItem = o.items[0];
            return (
              <Link
                key={o.id}
                to={`/track/${o.id}`}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    color: 'var(--fg-soft)',
                    minWidth: 92,
                  }}
                >
                  #{o.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15 }}>
                    {firstItem?.restaurantName ?? 'Order'} · {o.items.reduce((acc, i) => acc + i.qty, 0)} items
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginTop: 2 }}>
                    {o.landmark}
                  </div>
                </div>
                <div
                  style={{
                    background: sty.bg,
                    color: sty.color,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {sty.label}
                </div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 800, color: 'var(--primary)' }}>
                  {o.total_dh} dh
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/customer';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton } from '../components/visual/Motion';
import type { NotificationKind } from '../lib/database.types';

const KIND_ICON: Record<NotificationKind, JSX.Element> = {
  order_status: <I.Bike size={16} />,
  chat_message: <I.Chat size={16} />,
  promo: <I.Lightning size={16} />,
  system: <I.Shield size={16} />,
  rider_assignment: <I.Bike size={16} />,
  review_request: <I.Star size={16} />,
  wallet: <I.Wallet size={16} />,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  order_status: '#FF5722',
  chat_message: '#34D399',
  promo: '#FFB74D',
  system: '#7A6F66',
  rider_assignment: '#FF8A65',
  review_request: '#F59E0B',
  wallet: '#A78BFA',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) nav('/auth?next=/notifications', { replace: true });
  }, [authLoading, user, nav]);

  return (
    <section className="page">
      <div className="container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div>
            <FadeUp y={12}>
              <div className="section-tag">
                <I.Lightning size={11} /> {unreadCount > 0 ? `${unreadCount} new` : 'All clear'}
              </div>
              <h1 className="page-title">Notifications</h1>
              <p className="page-sub">Order updates, chats, promos — all here.</p>
            </FadeUp>
          </div>
          {unreadCount > 0 && (
            <MotionButton className="btn btn-outline btn-sm" onClick={markAllRead}>
              Mark all read
            </MotionButton>
          )}
        </div>

        {loading && <p style={{ marginTop: 24, color: 'var(--fg-soft)' }}>Loading…</p>}

        {!loading && items.length === 0 && (
          <div className="empty-state" style={{ marginTop: 24 }}>
            <I.Lightning size={36} />
            <h3>Inbox zero</h3>
            <p>Place an order and you'll see live updates here in real-time.</p>
            <Link to="/order" className="btn btn-primary" style={{ marginTop: 16 }}>
              Browse restaurants <I.Arrow />
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div style={{ marginTop: 28, display: 'grid', gap: 10 }}>
            {items.map((n) => (
              <FadeUp y={10} key={n.id}>
                <button
                  onClick={() => !n.read_at && markRead(n.id)}
                  className={`notif-card ${!n.read_at ? 'unread' : ''}`}
                >
                  <div
                    className="notif-icon"
                    style={{ background: `${KIND_COLOR[n.kind]}1A`, color: KIND_COLOR[n.kind] }}
                  >
                    {KIND_ICON[n.kind]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 13, color: 'var(--fg-soft)', marginTop: 2 }}>
                        {n.body}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-soft)', whiteSpace: 'nowrap' }}>
                    {timeAgo(n.created_at)}
                  </div>
                  {!n.read_at && <span className="notif-dot" />}
                </button>
              </FadeUp>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

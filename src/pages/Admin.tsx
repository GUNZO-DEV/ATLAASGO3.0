import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { RoleGate } from '../lib/roles';
import {
  useAdminOrders,
  useApplications,
  usePromotions,
  useAdminUsers,
  useAvailableRiders,
  type AdminOrderFilter,
} from '../lib/admin';
import { assignRider } from '../lib/orderActions';
import { supabase } from '../lib/supabase';
import type { OrderRow } from '../lib/database.types';
import { FadeUp } from '../components/visual/ScrollReveal';

type Tab = 'orders' | 'applications' | 'promotions' | 'users';

function STATUS_LABEL(s: string) {
  return s
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (c) => c.toUpperCase());
}

const STATUS_COLOR: Record<string, { c: string; bg: string }> = {
  ordered: { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)' },
  preparing: { c: '#C66B1F', bg: 'rgba(255,138,101,0.16)' },
  enRoute: { c: '#C66B1F', bg: 'rgba(255,138,101,0.16)' },
  outForDelivery: { c: '#059669', bg: 'rgba(16,185,129,0.12)' },
  arriving: { c: '#FF5722', bg: 'rgba(255,87,34,0.12)' },
  delivered: { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)' },
  cancelled: { c: '#B91C1C', bg: 'rgba(239,68,68,0.10)' },
};

function AdminShell() {
  const [tab, setTab] = useState<Tab>('orders');
  const [filter, setFilter] = useState<AdminOrderFilter>('live');
  const { orders, loading: ordersLoading } = useAdminOrders(filter);
  const {
    rider: riderApps,
    restaurant: restoApps,
    loading: appsLoading,
    decide,
  } = useApplications();
  const { promotions, toggle } = usePromotions();
  const { users, loading: usersLoading } = useAdminUsers();

  const stats = useMemo(() => {
    const live = orders.filter((o) =>
      ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'].includes(o.status),
    );
    const today = orders.filter(
      (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
    );
    const revenue = today.reduce((acc, o) => acc + o.total_dh, 0);
    return { live: live.length, today: today.length, revenue };
  }, [orders]);

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={10}>
          <div className="section-tag">
            <I.Shield size={11} /> Admin
          </div>
          <h1 className="page-title">Platform control</h1>
          <p className="page-sub">Orders, applications, promotions, users — every lever in one place.</p>
        </FadeUp>

        <div className="kpi-grid" style={{ marginTop: 24 }}>
          <div className="kpi">
            <div className="kpi-icon">
              <I.Bike size={18} />
            </div>
            <div className="kpi-label">Live orders</div>
            <div className="kpi-value">{stats.live}</div>
            <div className="kpi-trend">Updating in realtime</div>
          </div>
          <div className="kpi">
            <div className="kpi-icon">
              <I.Receipt size={18} />
            </div>
            <div className="kpi-label">Orders today</div>
            <div className="kpi-value">{stats.today}</div>
          </div>
          <div className="kpi">
            <div className="kpi-icon">
              <I.Wallet size={18} />
            </div>
            <div className="kpi-label">Revenue today</div>
            <div className="kpi-value">{stats.revenue.toLocaleString()} dh</div>
          </div>
          <div className="kpi">
            <div className="kpi-icon">
              <I.User size={18} />
            </div>
            <div className="kpi-label">Open applications</div>
            <div className="kpi-value">
              {[...riderApps, ...restoApps].filter((a) => a.status === 'submitted' || a.status === 'reviewing').length}
            </div>
          </div>
        </div>

        <div className="dash-tabs">
          {(['orders', 'applications', 'promotions', 'users'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <>
            <div className="cuisine-filter" style={{ marginBottom: 18 }}>
              {(
                ['live', 'all', 'ordered', 'preparing', 'outForDelivery', 'arriving', 'delivered', 'cancelled'] as AdminOrderFilter[]
              ).map((f) => (
                <button
                  key={f}
                  className={`cuisine-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'live' ? 'Live' : f === 'all' ? 'All' : STATUS_LABEL(f)}
                </button>
              ))}
            </div>
            <div className="dash-panel" style={{ padding: 0 }}>
              {ordersLoading && <p style={{ padding: 24, color: 'var(--fg-soft)' }}>Loading…</p>}
              {!ordersLoading && orders.length === 0 && (
                <div className="empty-state" style={{ padding: 40 }}>
                  <p>No orders match this filter.</p>
                </div>
              )}
              {orders.map((o) => (
                <AdminOrderRow key={o.id} order={o} />
              ))}
            </div>
          </>
        )}

        {tab === 'applications' && (
          <div style={{ display: 'grid', gap: 24 }}>
            <ApplicationsBlock
              title="Rider applications"
              icon={<I.Bike size={14} />}
              loading={appsLoading}
              items={riderApps.map((a) => ({
                id: a.id,
                primary: a.full_name,
                secondary: `${a.vehicle ?? 'No vehicle'} · ${a.plate ?? '—'}`,
                contact: `${a.email ?? ''} · ${a.contact_phone}`,
                status: a.status,
              }))}
              decide={(id, next) => decide('rider', id, next)}
            />
            <ApplicationsBlock
              title="Restaurant applications"
              icon={<I.Box size={14} />}
              loading={appsLoading}
              items={restoApps.map((a) => ({
                id: a.id,
                primary: a.business_name,
                secondary: a.cuisine ?? '—',
                contact: `${a.contact_email} · ${a.contact_phone ?? ''}`,
                status: a.status,
              }))}
              decide={(id, next) => decide('restaurant', id, next)}
            />
          </div>
        )}

        {tab === 'promotions' && (
          <div className="dash-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Promotions</h3>
              <span style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
                Toggle live / off. Adding new codes is a future migration.
              </span>
            </div>
            {promotions.map((p) => (
              <div className="order-row" key={p.code}>
                <span className="order-id">{p.code}</span>
                <span>
                  {p.description}{' '}
                  <span style={{ color: 'var(--fg-soft)', fontSize: 12 }}>
                    {p.kind === 'percent_off'
                      ? `${p.percent_off}% off`
                      : p.kind === 'flat_off'
                        ? `${p.flat_off_dh} dh off`
                        : p.kind === 'free_delivery'
                          ? 'Free delivery'
                          : 'BOGO'}
                  </span>
                </span>
                <span className={`order-status ${p.is_active ? 'live' : 'delivered'}`}>
                  {p.is_active ? 'Active' : 'Off'}
                </span>
                <button className="btn btn-outline" onClick={() => toggle(p.code, !p.is_active)}>
                  {p.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
            {promotions.length === 0 && (
              <p style={{ color: 'var(--fg-soft)' }}>No promotions yet.</p>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="dash-panel">
            <h3>Users · roles</h3>
            {usersLoading && <p style={{ color: 'var(--fg-soft)' }}>Loading…</p>}
            {!usersLoading &&
              users.map((u) => (
                <div className="order-row" key={u.id}>
                  <span className="order-id">{u.id.slice(0, 8)}</span>
                  <span>
                    <strong>{u.display_name ?? '—'}</strong>{' '}
                    <span style={{ color: 'var(--fg-soft)', fontSize: 12 }}>{u.phone ?? ''}</span>
                  </span>
                  <span>
                    {u.roles.length === 0 ? (
                      <span style={{ color: 'var(--fg-soft)', fontSize: 12 }}>customer</span>
                    ) : (
                      u.roles.map((r) => (
                        <span key={r} className="badge badge-soft" style={{ marginInlineEnd: 6 }}>
                          {r}
                        </span>
                      ))
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fg-soft)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AdminOrderRow({ order }: { order: OrderRow }) {
  const sty = STATUS_COLOR[order.status] ?? { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)' };
  const { riders } = useAvailableRiders();
  const [showRiderSelect, setShowRiderSelect] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function quickAction(next: 'preparing' | 'cancelled') {
    await supabase.from('orders').update({ status: next }).eq('id', order.id);
  }

  async function handleAssignRider(riderId: string) {
    setAssigning(true);
    try {
      const result = await assignRider(order.id, riderId);
      if (!result.ok) {
        alert(`Error: ${result.error}`);
      } else {
        setShowRiderSelect(false);
      }
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="admin-order-row">
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 92 }}>
        <span className="order-id">{order.id.slice(0, 8).toUpperCase()}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-soft)', marginTop: 2 }}>
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {order.items?.[0]?.restaurantName ?? 'Order'} ·{' '}
          {order.items?.reduce((acc, i) => acc + i.qty, 0) ?? 0} items
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginTop: 2 }}>
          {order.driver_payload?.headerLandmark ?? order.landmark}
        </div>
      </div>
      <div
        className="order-status"
        style={{ background: sty.bg, color: sty.c }}
      >
        {STATUS_LABEL(order.status)}
      </div>
      <span style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--primary)' }}>
        {order.total_dh} dh
      </span>
      <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
        <Link to={`/track/${order.id}`} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
          View
        </Link>
        {order.status === 'ordered' && (
          <button
            onClick={() => quickAction('preparing')}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Accept
          </button>
        )}
        {order.status === 'preparing' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRiderSelect(!showRiderSelect)}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Assign <I.Arrow size={10} />
            </button>
            {showRiderSelect && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-md)',
                  minWidth: 180,
                  maxHeight: 240,
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {riders.length === 0 && (
                  <div style={{ padding: 12, fontSize: 12, color: 'var(--fg-soft)', textAlign: 'center' }}>
                    No riders online
                  </div>
                )}
                {riders.map((r) => (
                  <button
                    key={r.user_id}
                    onClick={() => handleAssignRider(r.user_id)}
                    disabled={assigning}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: 12,
                      color: 'var(--fg)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {r.vehicle} · {r.plate}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-soft)' }}>
                      ⭐ {r.rating.toFixed(1)} · {r.total_trips} trips
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {['ordered', 'preparing'].includes(order.status) && (
          <button
            onClick={() => quickAction('cancelled')}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12, color: '#B91C1C' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function ApplicationsBlock<
  Item extends {
    id: string;
    primary: string;
    secondary: string;
    contact: string;
    status: string;
  },
>({
  title,
  icon,
  loading,
  items,
  decide,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  items: Item[];
  decide: (id: string, next: 'approved' | 'rejected' | 'reviewing') => Promise<void>;
}) {
  return (
    <div className="dash-panel">
      <h3>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{icon} {title}</span>
      </h3>
      {loading && <p style={{ color: 'var(--fg-soft)' }}>Loading…</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: 'var(--fg-soft)', fontSize: 13 }}>No pending applications.</p>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((it) => (
          <div className="application-card" key={it.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>
                {it.primary}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginTop: 2 }}>
                {it.secondary}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg-soft)',
                  marginTop: 4,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {it.contact}
              </div>
            </div>
            <span
              className={`order-status ${
                it.status === 'approved' ? 'live' : it.status === 'rejected' ? 'delivered' : 'preparing'
              }`}
            >
              {it.status}
            </span>
            {it.status !== 'approved' && it.status !== 'rejected' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => decide(it.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12, color: '#B91C1C' }}
                  onClick={() => decide(it.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <RoleGate any={['admin', 'super_admin']}>
      <AdminShell />
    </RoleGate>
  );
}

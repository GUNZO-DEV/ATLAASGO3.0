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
  type UserWithRoles,
} from '../lib/admin';
import { assignRider } from '../lib/orderActions';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import type { OrderRow, AppRole } from '../lib/database.types';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton } from '../components/visual/Motion';
import { TIKTOK_CAMPAIGN, type TikTokVideo } from '../data/tiktokCampaign';

type Tab = 'orders' | 'applications' | 'promotions' | 'users' | 'marketing';

const EMERALD = '#059669';

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
  const { orders, loading: ordersLoading, refresh: refreshOrders } = useAdminOrders(filter);
  const {
    rider: riderApps,
    restaurant: restoApps,
    loading: appsLoading,
    decide,
  } = useApplications();
  const { promotions, toggle } = usePromotions();
  const { users, loading: usersLoading, createUser, grantRole, revokeRole } = useAdminUsers();

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
          {(['orders', 'applications', 'promotions', 'users', 'marketing'] as Tab[]).map((t) => (
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
                <AdminOrderRow key={o.id} order={o} onChange={refreshOrders} />
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
          <div style={{ display: 'grid', gap: 20 }}>
            <CreateUserForm onCreate={createUser} />
            <div className="dash-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>Users · roles</h3>
                <span style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
                  {users.length} users
                </span>
              </div>
              {usersLoading && <p style={{ color: 'var(--fg-soft)' }}>Loading…</p>}
              {!usersLoading && users.length === 0 && (
                <p style={{ color: 'var(--fg-soft)', fontSize: 13 }}>No users found.</p>
              )}
              <div style={{ display: 'grid', gap: 8 }}>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} onGrant={grantRole} onRevoke={revokeRole} />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'marketing' && <MarketingTab />}
      </div>
    </section>
  );
}

/* ── TikTok marketing campaign ────────────────────────────────────── */
function MarketingTab() {
  const videos = TIKTOK_CAMPAIGN;
  const totals = useMemo(
    () =>
      videos.reduce(
        (acc, v) => {
          acc.views += v.stats.views;
          acc.likes += v.stats.likes;
          acc.live += v.status === 'live' ? 1 : 0;
          return acc;
        },
        { views: 0, likes: 0, live: 0 },
      ),
    [videos],
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="dash-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <I.Trending size={16} /> TikTok campaign
            </span>
          </h3>
          <span style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
            {totals.live} live · {videos.length} total · drop files in{' '}
            <code style={{ fontSize: 11 }}>public/marketing/</code>
          </span>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="dash-panel">
          <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
            <p>No campaign videos yet.</p>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
              Add your clips to <code>public/marketing/</code> and list them in{' '}
              <code>src/data/tiktokCampaign.ts</code>.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 18,
          }}
        >
          {videos.map((v) => (
            <TikTokCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}

const CAMPAIGN_STATUS_STYLE: Record<TikTokVideo['status'], { c: string; bg: string; label: string }> = {
  live: { c: EMERALD, bg: 'rgba(16,185,129,0.12)', label: 'Live' },
  scheduled: { c: '#C66B1F', bg: 'rgba(255,138,101,0.16)', label: 'Scheduled' },
  draft: { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)', label: 'Draft' },
};

function TikTokCard({ video }: { video: TikTokVideo }) {
  const [missing, setMissing] = useState(false);
  const st = CAMPAIGN_STATUS_STYLE[video.status];

  return (
    <FadeUp y={10}>
      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: '9 / 16', background: '#0E1116' }}>
          {missing ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                padding: 16,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
              }}
            >
              <div>
                <I.Trending size={22} />
                <div style={{ marginTop: 8 }}>Video file not found</div>
                <div style={{ marginTop: 4, opacity: 0.7, wordBreak: 'break-all' }}>{video.src}</div>
              </div>
            </div>
          ) : (
            <video
              src={video.src}
              poster={video.poster}
              controls
              playsInline
              preload="metadata"
              onError={() => setMissing(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: st.bg,
              color: st.c,
              backdropFilter: 'blur(4px)',
            }}
          >
            {st.label}
          </span>
        </div>

        <div style={{ padding: 14, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{video.title}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-soft)', whiteSpace: 'nowrap' }}>{video.city}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.4 }}>{video.caption}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {video.hashtags.map((h) => (
              <span key={h} style={{ fontSize: 11, color: EMERALD, fontWeight: 600 }}>
                #{h}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              fontSize: 11,
              color: 'var(--fg-soft)',
              borderTop: '1px solid var(--line)',
              paddingTop: 8,
            }}
          >
            <span>▶ {video.stats.views.toLocaleString()}</span>
            <span>♥ {video.stats.likes.toLocaleString()}</span>
            <span>↗ {video.stats.shares.toLocaleString()}</span>
            <span style={{ marginLeft: 'auto' }}>{new Date(video.publishedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </FadeUp>
  );
}

/* ── Create user form ─────────────────────────────────────────────── */
const ALL_ROLES: AppRole[] = ['customer', 'merchant', 'rider', 'admin', 'super_admin'];

function CreateUserForm({
  onCreate,
}: {
  onCreate: (p: {
    email: string;
    password: string;
    display_name?: string;
    phone?: string;
    role?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('customer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setSuccess(false);
    const res = await onCreate({
      email: email.trim(),
      password,
      display_name: displayName.trim() || undefined,
      phone: phone.trim() || undefined,
      role: role !== 'customer' ? role : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to create user');
    } else {
      setSuccess(true);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setPhone('');
      setRole('customer');
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  if (!open) {
    return (
      <MotionButton className="btn btn-primary" onClick={() => setOpen(true)}>
        <I.Plus size={14} /> Create new user
      </MotionButton>
    );
  }

  return (
    <FadeUp y={12}>
      <div className="dash-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <I.User size={16} /> Create new user
            </span>
          </h3>
          <button className="btn btn-ghost" onClick={() => setOpen(false)} style={{ fontSize: 12 }}>
            Cancel
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, maxWidth: 500 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="field">
              <label>Password *</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Youssef B."
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6 ..."
              />
            </div>
          </div>
          <div className="field">
            <label>Role</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    padding: '7px 14px',
                    border: role === r ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: role === r ? 700 : 500,
                    background: role === r ? 'rgba(255,87,34,0.08)' : 'var(--surface)',
                    color: role === r ? 'var(--primary)' : 'var(--fg-soft)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: '#EF4444', fontSize: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: '#059669', fontSize: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 10 }}>
              User created successfully
            </div>
          )}

          <MotionButton
            onClick={handleSubmit}
            disabled={busy || !email.trim() || password.length < 6}
            className="btn btn-primary"
            style={{ justifySelf: 'start' }}
          >
            {busy ? 'Creating…' : 'Create user'} <I.Arrow />
          </MotionButton>
        </div>
      </div>
    </FadeUp>
  );
}

/* ── User row with role management ─────────────────────────────── */
const ROLE_COLORS: Record<string, string> = {
  customer: '#7A6F66',
  merchant: '#059669',
  rider: '#FF5722',
  admin: '#7C3AED',
  super_admin: '#DC2626',
};

function UserRow({
  user,
  onGrant,
  onRevoke,
}: {
  user: UserWithRoles;
  onGrant: (userId: string, role: string) => Promise<{ ok: boolean; error?: string }>;
  onRevoke: (userId: string, role: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGrant(role: string) {
    setBusy(true);
    setError(null);
    const res = await onGrant(user.id, role);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Failed');
  }

  async function handleRevoke(role: string) {
    setBusy(true);
    setError(null);
    const res = await onRevoke(user.id, role);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Failed');
  }

  const grantable = ALL_ROLES.filter((r) => !user.roles.includes(r));

  return (
    <div
      style={{
        background: expanded ? 'var(--bg)' : 'transparent',
        border: expanded ? '1px solid var(--line)' : '1px solid transparent',
        borderRadius: 16,
        padding: expanded ? 16 : '10px 0',
        transition: 'all .2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: 'rgba(255,87,34,0.08)',
            color: 'var(--primary)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <I.User size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>
            {user.display_name ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-soft)', fontFamily: 'JetBrains Mono, monospace' }}>
            {user.id.slice(0, 8)} · {user.phone ?? 'no phone'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {user.roles.length === 0 ? (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(0,0,0,0.05)',
                color: '#7A6F66',
              }}
            >
              customer
            </span>
          ) : (
            user.roles.map((r) => (
              <span
                key={r}
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: `${ROLE_COLORS[r] ?? '#7A6F66'}14`,
                  color: ROLE_COLORS[r] ?? '#7A6F66',
                }}
              >
                {r}
              </span>
            ))
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--fg-soft)', whiteSpace: 'nowrap' }}>
          {new Date(user.created_at).toLocaleDateString()}
        </span>
        <I.Arrow
          size={12}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
            color: 'var(--fg-soft)',
          }}
        />
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {/* Current roles with revoke */}
          {user.roles.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-soft)', marginBottom: 8 }}>
                Current roles
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {user.roles.map((r) => (
                  <div
                    key={r}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: `${ROLE_COLORS[r] ?? '#7A6F66'}14`,
                      color: ROLE_COLORS[r] ?? '#7A6F66',
                    }}
                  >
                    {r}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRevoke(r); }}
                      disabled={busy}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: '#EF4444',
                        fontWeight: 800,
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                      title={`Revoke ${r}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grant new roles */}
          {grantable.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-soft)', marginBottom: 8 }}>
                Grant role
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {grantable.map((r) => (
                  <MotionButton
                    key={r}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleGrant(r); }}
                    disabled={busy}
                    className="btn btn-outline"
                    style={{ padding: '5px 12px', fontSize: 12, borderRadius: 999 }}
                  >
                    + {r}
                  </MotionButton>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminOrderRow({
  order,
  onChange,
}: {
  order: OrderRow;
  onChange?: () => void;
}) {
  const sty = STATUS_COLOR[order.status] ?? { c: '#7A6F66', bg: 'rgba(0,0,0,0.06)' };
  const { riders } = useAvailableRiders();
  const [showRiderSelect, setShowRiderSelect] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const toast = useToast();

  async function quickAction(next: 'preparing' | 'cancelled') {
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === 'preparing' ? 'Order accepted' : 'Order cancelled');
      onChange?.();
    }
  }

  async function handleAssignRider(riderId: string) {
    setAssigning(true);
    try {
      const result = await assignRider(order.id, riderId);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success('Rider assigned · they will be notified');
        setShowRiderSelect(false);
        onChange?.();
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

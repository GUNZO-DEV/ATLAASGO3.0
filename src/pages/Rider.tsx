import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { RoleGate } from '../lib/roles';
import { useAuth } from '../lib/auth';
import {
  useRiderProfile,
  useRiderAssignments,
  useAvailableOrders,
  useRiderEarnings,
} from '../lib/rider';
import {
  acceptAssignment,
  markPickedUp,
  markArriving,
  markDelivered,
  rejectAssignment,
} from '../lib/orderActions';
import { supabase } from '../lib/supabase';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton, MotionCard, MotionStagger, MotionStaggerItem, MotionPop, AnimatePresence } from '../components/visual/Motion';
import RiderOrderCard from '../components/RiderOrderCard';

type Tab = 'pending' | 'active' | 'available' | 'history' | 'earnings';

function RiderShell() {
  const [tab, setTab] = useState<Tab>('pending');
  const { profile, setStatus } = useRiderProfile();
  const { assignments } = useRiderAssignments();
  const { orders: available } = useAvailableOrders();
  const { today, week, tripsToday } = useRiderEarnings();
  const { user } = useAuth();

  // Pending = assigned but rider hasn't accepted yet
  const pendingAssignments = useMemo(
    () => assignments.filter((a) => a.is_active && !a.accepted_at),
    [assignments],
  );
  // Active = accepted and in progress
  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.is_active && !!a.accepted_at),
    [assignments],
  );
  const historyAssignments = useMemo(
    () => assignments.filter((a) => !a.is_active),
    [assignments],
  );

  async function claim(orderId: string) {
    if (!user) return;
    // Soft optimistic claim: insert an assignment for self.
    await supabase
      .from('order_assignments')
      .insert({ order_id: orderId, rider_id: user.id, is_active: true, accepted_at: new Date().toISOString() });
    await supabase
      .from('orders')
      .update({ status: 'enRoute' })
      .eq('id', orderId);
  }

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={10}>
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
                <I.Bike size={11} /> Rider portal
              </div>
              <h1 className="page-title">Drive · earn · climb</h1>
              <p className="page-sub">
                {profile?.status === 'online'
                  ? 'You are online. New trips will appear in Available.'
                  : 'You are offline. Toggle online to start receiving trips.'}
              </p>
            </div>
            <div className="rider-status-toggle">
              <button
                className={profile?.status === 'online' ? 'active' : ''}
                onClick={() => setStatus('online')}
              >
                <span className="dot" /> Online
              </button>
              <button
                className={profile?.status === 'offline' || !profile ? 'active' : ''}
                onClick={() => setStatus('offline')}
              >
                Offline
              </button>
              <button
                className={profile?.status === 'on_break' ? 'active' : ''}
                onClick={() => setStatus('on_break')}
              >
                Break
              </button>
            </div>
          </div>
        </FadeUp>

        <div className="kpi-grid" style={{ marginTop: 28 }}>
          <KPI
            icon={<I.Wallet size={18} />}
            label="Today's earnings"
            value={`${today} dh`}
            trend={tripsToday > 0 ? `${tripsToday} trips` : 'Get rolling'}
          />
          <KPI
            icon={<I.Trending size={18} />}
            label="This week"
            value={`${week} dh`}
            trend="Avg 18 dh / trip"
          />
          <KPI
            icon={<I.Star size={18} />}
            label="Rating"
            value={(profile?.rating ?? 5.0).toFixed(2)}
            trend={`${profile?.total_trips ?? 0} lifetime trips`}
          />
          <KPI
            icon={<I.Bike size={18} />}
            label="Active now"
            value={`${activeAssignments.length}`}
            trend={available.length > 0 ? `${available.length} in pool` : 'Pool empty'}
          />
        </div>

        <div className="dash-tabs">
          {(['pending', 'active', 'available', 'history', 'earnings'] as Tab[]).map((t) => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t === 'pending' && pendingAssignments.length > 0 && (
                <span className="dash-tab-badge primary">{pendingAssignments.length}</span>
              )}
              {t === 'available' && available.length > 0 && (
                <span className="dash-tab-badge">{available.length}</span>
              )}
              {t === 'active' && activeAssignments.length > 0 && (
                <span className="dash-tab-badge primary">{activeAssignments.length}</span>
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'pending' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {pendingAssignments.length === 0 && (
              <div className="empty-state">
                <I.Lightning size={36} />
                <h3>No pending requests</h3>
                <p>When admin assigns you an order, it shows up here for you to accept or decline.</p>
              </div>
            )}
            {pendingAssignments.map(
              (a) =>
                a.order && user && (
                  <PendingOrderCard
                    key={a.id}
                    order={a.order}
                    riderId={user.id}
                  />
                ),
            )}
          </div>
        )}

        {tab === 'active' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {activeAssignments.length === 0 && (
              <div className="empty-state">
                <I.Bike size={36} />
                <h3>No active trips</h3>
                <p>Accept a pending request or claim one from the Available tab.</p>
              </div>
            )}
            {activeAssignments.map(
              (a) =>
                a.order && user && (
                  <RiderOrderCard
                    key={a.id}
                    order={a.order}
                    accepted={!!a.accepted_at}
                    pickedUp={!!a.picked_up_at}
                    riderId={user.id}
                  />
                ),
            )}
          </div>
        )}

        {tab === 'available' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {available.length === 0 && (
              <div className="empty-state">
                <I.Lightning size={36} />
                <h3>No open trips right now</h3>
                <p>This page updates in real-time — sit tight.</p>
              </div>
            )}
            {available.map((o) => (
              <PoolOrderCard key={o.id} order={o} onClaim={() => claim(o.id)} />
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {historyAssignments.length === 0 && (
              <div className="empty-state">
                <p>No closed trips yet — your history will fill up here.</p>
              </div>
            )}
            {historyAssignments.map(
              (a) =>
                a.order && (
                  <div key={a.id} className="order-row">
                    <span className="order-id">{a.order_id.slice(0, 8).toUpperCase()}</span>
                    <span>{a.order.driver_payload?.headerLandmark ?? a.order.landmark}</span>
                    <span className="order-status delivered">
                      {a.delivered_at ? 'Delivered' : a.rejected_at ? 'Rejected' : 'Closed'}
                    </span>
                    <span style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>+ 18 dh</span>
                  </div>
                ),
            )}
          </div>
        )}

        {tab === 'earnings' && (
          <div className="dash-panel">
            <h3>Performance bonuses</h3>
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <div
                className="kpi"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--coral))',
                  color: 'white',
                  border: 0,
                }}
              >
                <div className="kpi-label" style={{ color: 'rgba(255,255,255,.85)' }}>
                  50-trip badge
                </div>
                <div className="kpi-value">{Math.min(50, profile?.total_trips ?? 0)}/50</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
                  {Math.max(0, 50 - (profile?.total_trips ?? 0))} to go for +200 dh
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Rating streak</div>
                <div className="kpi-value">{(profile?.rating ?? 5.0).toFixed(1)}</div>
                <div className="kpi-trend">Stay ≥ 4.8 for the bonus</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Documents</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>
                  {profile?.documents_verified ? 'Verified' : 'Pending'}
                </div>
                <div className="kpi-trend">
                  {profile?.documents_verified ? 'All clear' : 'Submit license + insurance'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <button className="sos-btn">
        <I.Shield size={16} /> SOS · 24/7 support
      </button>
    </section>
  );
}

function KPI({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {trend && <div className="kpi-trend">{trend}</div>}
    </div>
  );
}

function RiderActiveCard({
  order,
  accepted,
  pickedUp,
  onAccept,
  onReject,
  onPickup,
  onArriving,
  onDelivered,
}: {
  order: import('../lib/database.types').OrderRow;
  accepted: boolean;
  pickedUp: boolean;
  onAccept: () => Promise<unknown>;
  onReject: () => Promise<unknown>;
  onPickup: () => Promise<unknown>;
  onArriving: () => Promise<unknown>;
  onDelivered: () => Promise<unknown>;
}) {
  return (
    <div className="trip-card">
      <div className="trip-card-head">
        <div>
          <div className="trip-card-id">
            #{order.id.slice(0, 8).toUpperCase()} · {order.status}
          </div>
          <div className="trip-card-landmark">
            <I.Pin size={14} /> {order.driver_payload?.headerLandmark ?? order.landmark}
          </div>
        </div>
        <div className="trip-card-pay">+ 18 dh</div>
      </div>
      <div className="trip-card-meta">
        <span>
          <I.Bag size={12} /> {order.items?.length ?? 0} items
        </span>
        <span>·</span>
        <span>
          <I.Receipt size={12} /> {order.total_dh} dh order
        </span>
        {order.coords && (
          <>
            <span>·</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              {order.coords.lat.toFixed(4)}, {order.coords.lng.toFixed(4)}
            </span>
          </>
        )}
      </div>

      <div className="trip-actions">
        {!accepted ? (
          <>
            <MotionButton className="btn btn-success btn-lg" onClick={onAccept}>
              Accept trip <I.Check size={14} />
            </MotionButton>
            <MotionButton className="btn btn-outline" onClick={onReject}>
              Decline
            </MotionButton>
          </>
        ) : !pickedUp ? (
          <MotionButton className="btn btn-primary btn-lg" onClick={onPickup}>
            I picked it up <I.Arrow />
          </MotionButton>
        ) : order.status === 'outForDelivery' ? (
          <>
            <MotionButton className="btn btn-primary btn-lg" onClick={onArriving}>
              Arriving now
            </MotionButton>
            <MotionButton className="btn btn-success" onClick={onDelivered}>
              Mark delivered
            </MotionButton>
          </>
        ) : (
          <MotionButton className="btn btn-success btn-lg" onClick={onDelivered}>
            Delivered <I.Check size={14} />
          </MotionButton>
        )}
      </div>
    </div>
  );
}

function PendingOrderCard({
  order,
  riderId,
}: {
  order: import('../lib/database.types').OrderRow;
  riderId: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');

  async function handleAccept() {
    setSubmitting(true);
    const res = await acceptAssignment(order.id, riderId);
    if (!res.ok) alert(res.error);
    setSubmitting(false);
  }

  async function handleDecline() {
    if (!reason.trim()) return;
    setSubmitting(true);
    const res = await rejectAssignment(order.id, riderId, reason.trim());
    if (!res.ok) alert(res.error);
    setSubmitting(false);
    setDeclining(false);
  }

  return (
    <div className="trip-card pending-pulse">
      <div className="trip-card-head">
        <div>
          <div className="trip-card-id">
            #{order.id.slice(0, 8).toUpperCase()} · assigned to you
          </div>
          <div className="trip-card-landmark">
            <I.Pin size={14} /> {order.driver_payload?.headerLandmark ?? order.landmark}
          </div>
        </div>
        <div className="trip-card-pay">+ 18 dh</div>
      </div>
      <div className="trip-card-meta">
        <span>
          <I.Bag size={12} /> {order.items?.length ?? 0} items
        </span>
        <span>·</span>
        <span>
          <I.Receipt size={12} /> {order.total_dh} dh order
        </span>
        {order.coords && (
          <>
            <span>·</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              {order.coords.lat.toFixed(4)}, {order.coords.lng.toFixed(4)}
            </span>
          </>
        )}
      </div>

      {!declining ? (
        <div className="trip-actions">
          <MotionButton
            className="btn btn-primary btn-lg"
            onClick={handleAccept}
            disabled={submitting}
          >
            {submitting ? 'Accepting…' : 'Accept trip'} <I.Check size={14} />
          </MotionButton>
          <MotionButton
            className="btn btn-outline"
            onClick={() => setDeclining(true)}
            disabled={submitting}
          >
            Decline
          </MotionButton>
        </div>
      ) : (
        <div className="trip-actions" style={{ flexDirection: 'column', gap: 10 }}>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (too far, busy, etc.)"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--line)',
              borderRadius: 12,
              fontSize: 14,
              background: 'var(--surface)',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <MotionButton
              className="btn btn-danger btn-lg"
              style={{ flex: 1 }}
              onClick={handleDecline}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Declining…' : 'Confirm decline'}
            </MotionButton>
            <MotionButton
              className="btn btn-ghost"
              onClick={() => { setDeclining(false); setReason(''); }}
            >
              Cancel
            </MotionButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PoolOrderCard({
  order,
  onClaim,
}: {
  order: import('../lib/database.types').OrderRow;
  onClaim: () => Promise<unknown>;
}) {
  return (
    <div className="trip-card">
      <div className="trip-card-head">
        <div>
          <div className="trip-card-id">#{order.id.slice(0, 8).toUpperCase()} · pool</div>
          <div className="trip-card-landmark">
            <I.Pin size={14} /> {order.driver_payload?.headerLandmark ?? order.landmark}
          </div>
        </div>
        <div className="trip-card-pay">+ 18 dh</div>
      </div>
      <div className="trip-card-meta">
        <span>
          <I.Bag size={12} /> {order.items?.length ?? 0} items
        </span>
        <span>·</span>
        <span>
          <I.Receipt size={12} /> {order.total_dh} dh
        </span>
      </div>
      <div className="trip-actions">
        <MotionButton className="btn btn-primary btn-lg" onClick={onClaim}>
          Claim this trip <I.Arrow />
        </MotionButton>
        <Link to={`/track/${order.id}`} className="btn btn-outline">
          Preview details
        </Link>
      </div>
    </div>
  );
}

export default function Rider() {
  return (
    <RoleGate any={['rider', 'admin', 'super_admin']}>
      <RiderShell />
    </RoleGate>
  );
}

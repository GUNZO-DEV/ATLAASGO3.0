import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { RoleGate } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { FadeUp } from '../components/visual/ScrollReveal';
import MerchantOrderCard from '../components/MerchantOrderCard';
import type { OrderRow } from '../lib/database.types';

type Tab = 'home' | 'tables' | 'kitchen' | 'orders' | 'analytics';

type TableRow = {
  id: string;
  label: string;
  capacity: number;
  status: 'free' | 'occupied' | 'bill';
  partySize?: number;
  minutes?: number;
};

const SEED_TABLES: TableRow[] = Array.from({ length: 12 }).map((_, i) => {
  const n = i + 1;
  const status: TableRow['status'] = n % 4 === 0 ? 'bill' : n % 3 === 0 ? 'occupied' : 'free';
  return {
    id: `t${n}`,
    label: `T${String(n).padStart(2, '0')}`,
    capacity: n <= 4 ? 2 : n <= 9 ? 4 : 6,
    status,
    partySize: status === 'free' ? undefined : Math.min(n % 6 || 2, n <= 4 ? 2 : n <= 9 ? 4 : 6),
    minutes: status === 'free' ? undefined : 12 + n * 3,
  };
});

const TILES: Array<{
  key: Tab;
  label: string;
  hint: string;
  icon: React.ReactNode;
  badge?: string;
}> = [
  { key: 'tables',    label: 'Tables',         hint: 'Floor plan & QR codes', icon: <I.Home size={20} />,    badge: '12' },
  { key: 'kitchen',   label: 'Kitchen Display', hint: 'Live ticket queue',    icon: <I.Box size={20} />,     badge: '3' },
  { key: 'orders',    label: 'Orders',         hint: 'Live + history',        icon: <I.Receipt size={20} /> },
  { key: 'analytics', label: 'Analytics',      hint: 'Revenue & trends',      icon: <I.Trending size={20} /> },
];

function MerchantShell() {
  const { t } = useI18n();
  void t;
  const [tab, setTab] = useState<Tab>('home');
  const [tables, setTables] = useState<TableRow[]>(SEED_TABLES);
  const [splitMode, setSplitMode] = useState<TableRow | null>(null);
  const [splitWay, setSplitWay] = useState<'equal' | 'by_item' | 'custom'>('equal');
  const [splitN, setSplitN] = useState(2);

  // Live order count from Supabase
  const [liveOrders, setLiveOrders] = useState<OrderRow[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [ticketsToday, setTicketsToday] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      setLiveOrders((data ?? []) as OrderRow[]);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_dh,created_at')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      if (cancelled) return;
      const total = (todayOrders ?? []).reduce(
        (acc: number, o: { total_dh: number }) => acc + o.total_dh,
        0,
      );
      setRevenueToday(total);
      setTicketsToday((todayOrders ?? []).length);

      channel = supabase
        .channel('merchant_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => void load(),
        )
        .subscribe();
    }
    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const tableCounts = useMemo(() => {
    const free = tables.filter((t) => t.status === 'free').length;
    const occ = tables.filter((t) => t.status === 'occupied').length;
    const bill = tables.filter((t) => t.status === 'bill').length;
    return { free, occ, bill };
  }, [tables]);

  function setTableStatus(id: string, status: TableRow['status']) {
    setTables((arr) => arr.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <section className="page lyn">
      <div className="container">
        {/* ── Hero strip ── */}
        <FadeUp y={10}>
          <div className="lyn-hero">
            <div>
              <div className="section-tag" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                <I.Box size={11} /> LYN · Café Hassan
              </div>
              <h1 className="page-title" style={{ color: 'white' }}>
                Your kitchen,<br /> at a glance.
              </h1>
              <p className="page-sub" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Tables · KDS · live orders · analytics — one device, offline-first.
              </p>
            </div>
            <div className="lyn-hero-pills">
              <span className="lyn-pill"><span className="dot online" /> Online</span>
              <span className="lyn-pill">{liveOrders.length} live</span>
              <span className="lyn-pill">{tableCounts.occ + tableCounts.bill} seated</span>
            </div>
          </div>
        </FadeUp>

        {/* ── KPI strip ── */}
        <div className="kpi-grid" style={{ marginTop: 24 }}>
          <div className="kpi">
            <div className="kpi-icon"><I.Wallet size={18} /></div>
            <div className="kpi-label">Revenue today</div>
            <div className="kpi-value">{revenueToday.toLocaleString()} dh</div>
            <div className="kpi-trend">{ticketsToday} tickets</div>
          </div>
          <div className="kpi">
            <div className="kpi-icon"><I.Receipt size={18} /></div>
            <div className="kpi-label">Live orders</div>
            <div className="kpi-value">{liveOrders.length}</div>
            <div className="kpi-trend">Updates in realtime</div>
          </div>
          <div className="kpi">
            <div className="kpi-icon"><I.Home size={18} /></div>
            <div className="kpi-label">Tables seated</div>
            <div className="kpi-value">{tableCounts.occ + tableCounts.bill}/12</div>
            <div className="kpi-trend">{tableCounts.free} free</div>
          </div>
          <div className="kpi">
            <div className="kpi-icon"><I.Star size={18} /></div>
            <div className="kpi-label">Rating today</div>
            <div className="kpi-value">4.9</div>
            <div className="kpi-trend">21 new reviews</div>
          </div>
        </div>

        {/* ── Tile grid (Home) ── */}
        {tab === 'home' && (
          <div className="lyn-tiles">
            {TILES.map((tile) => (
              <button key={tile.key} className="lyn-tile" onClick={() => setTab(tile.key)}>
                <div className="lyn-tile-icon">{tile.icon}</div>
                <div className="lyn-tile-body">
                  <div className="lyn-tile-label">
                    {tile.label}
                    {tile.badge && <span className="lyn-tile-badge">{tile.badge}</span>}
                  </div>
                  <div className="lyn-tile-hint">{tile.hint}</div>
                </div>
                <I.Arrow size={14} />
              </button>
            ))}
          </div>
        )}

        {/* ── Dashboard tabs ── */}
        {tab !== 'home' && (
          <div className="dash-tabs" style={{ marginTop: 24 }}>
            <button className={'active'} onClick={() => setTab('home')}>← Home</button>
            {(['tables', 'kitchen', 'orders', 'analytics'] as Tab[]).map((tb) => (
              <button key={tb} className={tab === tb ? 'active' : ''} onClick={() => setTab(tb)}>
                {tb.charAt(0).toUpperCase() + tb.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* ── Tables floor plan ── */}
        {tab === 'tables' && (
          <FadeUp y={10}>
            <div className="floor-plan">
              {tables.map((tbl) => (
                <button
                  key={tbl.id}
                  className={`floor-table status-${tbl.status}`}
                  onClick={() => {
                    if (tbl.status === 'free') setTableStatus(tbl.id, 'occupied');
                    else if (tbl.status === 'occupied') setTableStatus(tbl.id, 'bill');
                    else setTableStatus(tbl.id, 'free');
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (tbl.status === 'bill') setSplitMode(tbl);
                  }}
                >
                  <div className="floor-table-label">{tbl.label}</div>
                  <div className="floor-table-capacity">
                    {tbl.partySize ? `${tbl.partySize}/${tbl.capacity}` : `${tbl.capacity} seats`}
                  </div>
                  <div className="floor-table-state">
                    {tbl.status === 'free' && 'Free'}
                    {tbl.status === 'occupied' && `${tbl.minutes ?? 0} min`}
                    {tbl.status === 'bill' && 'Bill ready'}
                  </div>
                </button>
              ))}
            </div>
            <div className="lyn-help">
              Tap a table to cycle status: Free → Occupied → Bill → Free.
              Right-click (or long-press) a bill-ready table to split the check.
            </div>
          </FadeUp>
        )}

        {/* ── KDS ── */}
        {tab === 'kitchen' && (
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            {liveOrders.length === 0 && (
              <div className="empty-state">
                <I.Box size={36} />
                <h3>Queue empty</h3>
                <p>New tickets arrive in realtime as customers order.</p>
              </div>
            )}
            {liveOrders.map((o) => (
              <MerchantOrderCard key={o.id} order={o} />
            ))}
          </div>
        )}

        {/* ── Orders ── */}
        {tab === 'orders' && (
          <div className="dash-panel">
            <h3>Live orders</h3>
            {liveOrders.map((o) => (
              <div className="order-row" key={o.id}>
                <span className="order-id">{o.id.slice(0, 8).toUpperCase()}</span>
                <span>{o.driver_payload?.headerLandmark ?? o.landmark}</span>
                <span className="order-status preparing">{o.status}</span>
                <Link to={`/track/${o.id}`} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ── Analytics ── */}
        {tab === 'analytics' && (
          <div className="dash-panel">
            <h3>Hour-by-hour today</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 180, marginTop: 16 }}>
              {[18, 26, 32, 48, 38, 56, 72, 64, 48, 28, 20, 14].map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${v}%`,
                      background: 'linear-gradient(180deg, var(--primary), var(--coral))',
                      borderRadius: 6,
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--fg-soft)', fontWeight: 600 }}>{12 + i}h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bill split dialog ── */}
        {splitMode && (
          <div className="modal-backdrop" onClick={() => setSplitMode(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0 }}>Split {splitMode.label}'s bill</h3>
              <p style={{ fontSize: 13, color: 'var(--fg-soft)', margin: '6px 0 16px' }}>
                Party of {splitMode.partySize}. Choose how to divide the check.
              </p>
              <div className="auth-toggle" style={{ marginBottom: 14 }}>
                <button className={splitWay === 'equal' ? 'active' : ''} onClick={() => setSplitWay('equal')}>Equal</button>
                <button className={splitWay === 'by_item' ? 'active' : ''} onClick={() => setSplitWay('by_item')}>By item</button>
                <button className={splitWay === 'custom' ? 'active' : ''} onClick={() => setSplitWay('custom')}>Custom</button>
              </div>
              {splitWay === 'equal' && (
                <div>
                  <label className="field">
                    <span>People</span>
                    <input
                      type="number"
                      value={splitN}
                      min={1}
                      onChange={(e) => setSplitN(Math.max(1, Number(e.target.value)))}
                    />
                  </label>
                  <div style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
                    Each person pays <strong style={{ color: 'var(--primary)' }}>{Math.round(420 / splitN)} dh</strong>
                  </div>
                </div>
              )}
              {splitWay === 'by_item' && (
                <p style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
                  Per-item splitting picks up the table's open order; wiring lives once
                  Stripe payments are configured.
                </p>
              )}
              {splitWay === 'custom' && (
                <p style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
                  Type how much each person pays — totals must match the bill.
                </p>
              )}
              <button
                className="btn btn-primary btn-lg btn-block"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setTableStatus(splitMode.id, 'free');
                  setSplitMode(null);
                }}
              >
                Charge & close table <I.Arrow />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Merchant() {
  return (
    <RoleGate any={['merchant', 'admin', 'super_admin']}>
      <MerchantShell />
    </RoleGate>
  );
}

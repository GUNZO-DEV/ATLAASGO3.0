// AtlaasGo 3.0 — Live tracking (weather-aware). Faithful port of
// screen-tracking2.jsx, wired to live agApi + useCity. Markup/classNames
// preserved (ag2-* → ag3-*); the mock window.AG.* reads + setInterval are
// replaced with agApi.orders.tracking(id) + agApi.orders.subscribe(id, …).
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { agApi, type City, type Order, type Tracking as TrackingT } from '../../lib/agApi';
import { useCity } from '../CityContext';
import { useAsync } from '../useAsync';
import { PhotoTile, foodEm, tileFor } from '../primitives';
import { IBack, IPhone, IMsg, ISnow, IPin, IStar, IChevR } from '../icons';

type Go = (screen: string, payload?: unknown) => void;

/* default route — same hand-drawn pass the prototype used; the spec's
   route.path is lat/lng-derived (empty in the snapshot), so we keep the
   prototype's SVG path for the grid/courier-puck geometry. */
const ROUTE_PATH =
  'M40 318 C 90 300, 120 250, 150 235 S 220 210, 250 170 S 300 110, 318 70';

function TrackMap({ progress, city }: { progress: number; city: City }) {
  const ref = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState({ x: 40, y: 318 });
  useEffect(() => {
    if (!ref.current) return;
    const len = ref.current.getTotalLength();
    const p = ref.current.getPointAtLength(len * progress);
    setPt({ x: p.x, y: p.y });
  }, [progress]);

  return (
    <div className="ag3-map" style={{ height: '100%', position: 'relative' }}>
      {city.weather && Array.from({ length: 26 }).map((_, i) => (
        <span key={i} style={{
          position: 'absolute', top: '-8px', left: `${(i * 37) % 100}%`,
          width: 3 + (i % 3), height: 3 + (i % 3), borderRadius: 999,
          background: 'rgba(255,255,255,.7)',
          animation: `ag3-snow ${5 + (i % 5)}s linear ${(i % 7) * .5}s infinite`,
        }} />
      ))}

      <svg viewBox="0 0 360 360" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
        <g stroke="rgba(255,255,255,.10)" strokeWidth="14" fill="none" strokeLinecap="round">
          <path d="M-20 250 H 380" /><path d="M-20 150 H 380" /><path d="M120 -20 V 380" /><path d="M260 -20 V 380" />
        </g>
        <g stroke="rgba(255,255,255,.05)" strokeWidth="2" fill="none">
          <path d="M-20 200 H 380" /><path d="M60 -20 V 380" /><path d="M320 -20 V 380" />
        </g>
        <g fill="rgba(255,255,255,.05)">
          <rect x="135" y="165" width="110" height="70" rx="8" />
          <rect x="30" y="40" width="70" height="80" rx="8" />
          <rect x="275" y="200" width="70" height="90" rx="8" />
        </g>
        <path d={ROUTE_PATH} stroke="rgba(255,255,255,.22)" strokeWidth="6" strokeDasharray="2 12" className="ag3-route" />
        <path ref={ref} d={ROUTE_PATH} stroke="url(#rg2)" strokeWidth="5" className="ag3-route"
          style={{ strokeDasharray: 600, strokeDashoffset: 600 * (1 - progress), transition: 'stroke-dashoffset 1s linear' }} />
        <defs>
          <linearGradient id="rg2" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FF5722" /><stop offset="1" stopColor="#FFB74D" />
          </linearGradient>
        </defs>
        <g transform="translate(318 70)">
          <circle r="22" fill="rgba(255,87,34,.18)" />
          <circle r="9" fill="#FF5722" stroke="#fff" strokeWidth="3" />
        </g>
        <g transform="translate(40 318)">
          <circle r="7" fill="#fff" /><circle r="3.5" fill="#FFB74D" />
        </g>
        <g transform={`translate(${pt.x} ${pt.y})`} style={{ transition: 'transform 1s linear' }}>
          <circle r="17" fill="rgba(255,87,34,.25)">
            <animate attributeName="r" values="14;20;14" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle r="13" fill="#fff" /><circle r="10" fill="#FF5722" />
          <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Montserrat">Y</text>
        </g>
      </svg>

      <div style={{ position: 'absolute', top: 18, right: 16, background: 'var(--surface)', color: 'var(--fg)', borderRadius: 12, padding: '7px 11px', boxShadow: 'var(--sh-2)', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        <IPin size={14} style={{ color: 'var(--primary)' }} /> {city.campus ? 'Building 18' : city.name}
      </div>
    </div>
  );
}

export default function Tracking({ order, go }: { order?: { id?: string } | Order; go: Go }) {
  const { city } = useCity();

  // resolve the order id: prefer the passed order, else the latest active order.
  const passedId = (order as { id?: string } | undefined)?.id ?? null;
  const { data: resolvedId } = useAsync(async () => {
    if (passedId) return passedId;
    const { active } = await agApi.orders.list();
    return active[0]?.id ?? null;
  }, [passedId]);

  const orderId = passedId ?? resolvedId ?? null;

  // tracking snapshot (status, courier, stages, weatherAdjustMinutes, progress, etaMinutes)
  const { data: snapshot } = useAsync(
    () => (orderId ? agApi.orders.tracking(orderId) : Promise.resolve(null)),
    [orderId],
  );
  // order summary (store name + items) — tracking() doesn't carry these
  const { data: orderDetail } = useAsync(
    () => (orderId ? agApi.orders.get(orderId) : Promise.resolve(null)),
    [orderId],
  );

  // live progress/status/eta from Realtime — seeded from the snapshot, then
  // patched by subscribe() (replaces the prototype's setInterval ramp).
  const [live, setLive] = useState<Partial<TrackingT>>({});
  useEffect(() => {
    if (!snapshot) return;
    setLive(snapshot);
  }, [snapshot]);
  useEffect(() => {
    if (!orderId) return;
    const off = agApi.orders.subscribe(orderId, (t) => setLive((cur) => ({ ...cur, ...t })));
    return off;
  }, [orderId]);

  if (!city || !orderId || !snapshot) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Loading…</div>
      </div>
    );
  }

  const t: TrackingT = { ...snapshot, ...live } as TrackingT;
  const progress = t.progress ?? snapshot.progress;
  const courier = t.courier ?? snapshot.courier;
  const stages = t.stages ?? snapshot.stages;
  const status = t.status ?? snapshot.status;
  const weatherAdd = t.weatherAdjustMinutes ?? snapshot.weatherAdjustMinutes ?? 0;

  // "now" stage index = furthest done stage (matches prototype's `stage`).
  const doneCount = stages.filter((s) => s.done).length;
  const stage = status === 'delivered'
    ? stages.length - 1
    : Math.min(Math.max(doneCount - 1, 0), stages.length - 1);

  // ETA: prefer the snapshot's etaMinutes, else derive from progress (prototype math).
  const etaMin = status === 'delivered' ? 0 : (t.etaMinutes ?? Math.max(2, Math.round((1 - progress) * 22)));

  // order summary fields
  const storeName = orderDetail?.store.name ?? 'AtlaasGo';
  const storeId = orderDetail?.store.id ?? '';
  const items = orderDetail?.items ?? [];
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  const phoneHref = courier.phone ? `tel:${courier.phone}` : undefined;
  const onMessage = async () => {
    const text = (typeof window !== 'undefined' && window.prompt) ? window.prompt('Message your courier') : null;
    if (text && text.trim()) {
      try { await agApi.orders.sendMessage(orderId, text.trim()); } catch { /* ignore */ }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'relative', height: '44%', flexShrink: 0 }}>
        <TrackMap progress={progress} city={city} />
        <button onClick={() => go('home')} className="ag3-iconbtn" style={{ position: 'absolute', top: 16, left: 16, zIndex: 5 }}><IBack size={20} /></button>
        {city.weather && (
          <div style={{ position: 'absolute', top: 18, left: 70, zIndex: 5 }} className="ag3-badge ag3-badge-snow mono">
            <ISnow size={13} /> light snow
          </div>
        )}
      </div>

      {/* sheet */}
      <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0', marginTop: -26, position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -12px 44px rgba(0,0,0,.14)' }}>
        <div style={{ width: 42, height: 5, borderRadius: 999, background: 'var(--line)', margin: '11px auto 4px' }} />
        <div className="ag3-scroll" style={{ padding: '6px 0 6px' }}>

          {/* ETA hero */}
          <div className="ag3-pad" style={{ textAlign: 'center', marginTop: 6 }}>
            <div className="ag3-live" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span className="pip" /><span className="ag3-eyebrow" style={{ color: 'var(--ok)', whiteSpace: 'nowrap' }}>Live · order {orderId}</span>
            </div>
            <div className="disp" style={{ fontWeight: 800, fontSize: 16, color: 'var(--fg-soft)' }}>{status === 'delivered' ? 'Delivered' : 'Arriving in'}</div>
            <div className="disp" style={{ fontWeight: 800, fontSize: 60, lineHeight: 1, letterSpacing: '-.03em', background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as CSSProperties}>{etaMin}<span style={{ fontSize: 22 }}> min</span></div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {city.weather && weatherAdd > 0
                ? <><ISnow size={14} style={{ color: 'var(--snow)' }} /> ETA adjusted +{weatherAdd} min for snow on the pass</>
                : <>Your courier is on the way · {courier.vehicle}</>}
            </div>
          </div>

          {/* courier card */}
          <div className="ag3-pad" style={{ marginTop: 18 }}>
            <div className="ag3-card" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 13 }}>
              <div style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontFamily: 'Montserrat', fontSize: 21, flexShrink: 0 }}>{courier.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>{courier.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="ag3-rating" style={{ color: 'var(--amber)', fontSize: 12 }}><IStar size={12} /><span style={{ color: 'var(--fg-soft)' }}>{courier.rating}</span></span>
                  <span className="ag3-dot" /> {courier.vehicle}
                </div>
              </div>
              <button className="ag3-iconbtn" style={{ color: 'var(--primary)' }} aria-label="Message courier" onClick={onMessage}><IMsg size={20} /></button>
              {phoneHref
                ? <a href={phoneHref} className="ag3-iconbtn" style={{ color: 'var(--primary)' }} aria-label="Call courier"><IPhone size={19} /></a>
                : <button className="ag3-iconbtn" style={{ color: 'var(--primary)' }} aria-label="Call courier"><IPhone size={19} /></button>}
            </div>
          </div>

          {/* timeline */}
          <div className="ag3-pad" style={{ marginTop: 18 }}>
            <div className="ag3-card" style={{ padding: '16px 16px 6px' }}>
              {stages.map((s, i) => {
                const done = i < stage, now = i === stage;
                return (
                  <div key={s.key} className="ag3-trow">
                    <div className="ag3-trail">
                      <span className={`ag3-tnode ${done ? 'done' : now ? 'now' : ''}`} />
                      {i < stages.length - 1 && <span className={`ag3-tbar ${done ? 'done' : ''}`} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 16, opacity: done || now ? 1 : .5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span className="disp" style={{ fontWeight: now ? 800 : 700, fontSize: 14.5, color: now ? 'var(--primary)' : 'var(--fg)' }}>{s.label}</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{s.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* order summary */}
          <div className="ag3-pad" style={{ marginTop: 4, marginBottom: 8 }}>
            <button onClick={() => storeId && go('restaurant', { id: storeId })} className="ag3-card ag3-press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, width: '100%', textAlign: 'left' }}>
              <PhotoTile cls={tileFor(storeId || storeName)} em={foodEm(storeId)} round="12px" style={{ width: 44, height: 44 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{storeName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{itemCount} items · {items.map((i) => i.name).join(', ')}</div>
              </div>
              <span style={{ color: 'var(--muted)' }}><IChevR size={20} /></span>
            </button>
          </div>

          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}

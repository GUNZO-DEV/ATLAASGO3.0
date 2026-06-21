// AtlaasGo 3.0 — shared UI primitives (faithful port of ag-ui2.jsx).
// RestoCard / RestoRow take an agApi `Store` and map spec fields to the
// prototype's display shape. Markup/classNames preserved (ag2-* → ag3-*).
import type { CSSProperties, ReactNode } from 'react';
import type { Store } from '../lib/agApi';
import { IStar, IClock, IBolt } from './icons';

/* ── food emoji per restaurant / item — house-style imagery ─────────────── */
export const FOOD_EM: Record<string, string> = {
  amandine: '🥐', medina: '🫕', cedars: '🍔', 'atlas-green': '🥗', forno: '🍕', pharmacie: '💊', 'atlas-market': '🛒',
  mf: '🍰', croissant: '🥐', flat: '☕', paino: '🥐', amande: '🥐', fraisier: '🍰', tarte: '🍋',
  para: '💊', ibu: '💊', vitc: '🍊', lozenge: '🍬', plaster: '🩹', antiseptic: '🧴', sanitizer: '🧴', lipbalm: '💄',
  tomatoes: '🍅', bananas: '🍌', bread: '🥖', milk: '🥛', eggs: '🥚', pasta: '🍝', oliveoil: '🫒', water: '💧', chips: '🍿',
};
export function foodEm(id: string, fallback = '🍽'): string {
  return FOOD_EM[id] || fallback;
}

/* ── tile-class deriver — Store has no `tile`; derive a deterministic one ── */
const TILES = ['tile-a', 'tile-b', 'tile-c', 'tile-d', 'tile-e', 'tile-f'] as const;
export function tileFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TILES[h % TILES.length];
}

/* ── Store → display fields (spec-faithful mapping) ─────────────────────── */
export function etaLabel(s: Store): string {
  return `${s.etaMinutes[0]}–${s.etaMinutes[1]}`;
}
export function feeLabel(s: Store): string {
  return s.deliveryFeeDh === 0 ? 'Free' : `${s.deliveryFeeDh} dh`;
}
export function priceLabel(s: Store): string {
  return '·'.repeat(s.priceTier);
}
export function tagLabel(s: Store): string {
  return s.tags.join(' · ');
}

/* ── ★ rating ───────────────────────────────────────────────────────────── */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="ag3-rating" style={{ color: 'var(--amber)' }}>
      <IStar size={size} /><span style={{ color: 'var(--fg)' }}>{value}</span>
    </span>
  );
}

/* ── money — mono dh ────────────────────────────────────────────────────── */
export function Price({ v, className = '', big = false }: { v: number | string; className?: string; big?: boolean }) {
  return (
    <span className={`mono ${className}`} style={{ fontWeight: 700, fontSize: big ? 18 : undefined }}>
      {v}<span style={{ fontSize: '.72em', opacity: .65, fontWeight: 600 }}> dh</span>
    </span>
  );
}

/* ── photo placeholder tile — emoji food imagery floats in corner ───────── */
export function PhotoTile({
  cls = 'tile-a',
  em,
  style,
  children,
  round = 'var(--r-lg)',
  float = false,
}: {
  cls?: string;
  em?: string;
  style?: CSSProperties;
  children?: ReactNode;
  round?: string;
  float?: boolean;
}) {
  return (
    <div className={`ag3-photo ${cls}`} style={{ borderRadius: round, ...style }}>
      {em && <span className="em" style={float ? { animation: 'ag3-float 5s ease-in-out infinite' } : undefined}>{em}</span>}
      {children}
    </div>
  );
}

/* ── big image-forward restaurant card (featured rail) ──────────────────── */
export function RestoCard({ r, onClick }: { r: Store; onClick?: () => void }) {
  const tile = tileFor(r.id);
  const em = r.emoji || foodEm(r.id);
  const fee = feeLabel(r);
  return (
    <button onClick={onClick} className="ag3-press" style={{ width: 256, flexShrink: 0, textAlign: 'left' }}>
      <div className="ag3-card" style={{ border: 'none' }}>
        <PhotoTile cls={tile} em={em} float round="var(--r-lg) var(--r-lg) 0 0" style={{ height: 138, alignItems: 'flex-start', justifyContent: 'space-between', padding: 12 }}>
          {r.promo && <span className="ag3-badge" style={{ position: 'relative', zIndex: 2, background: 'rgba(26,20,16,.36)', backdropFilter: 'blur(6px)', color: '#fff' }}><IBolt size={12} /> {r.promo}</span>}
          <span className="ag3-ratechip" style={{ position: 'relative', zIndex: 2 }}><IStar size={12} style={{ color: 'var(--amber)' }} /> {r.rating}</span>
        </PhotoTile>
        <div style={{ padding: '12px 14px 14px' }}>
          <div className="disp" style={{ fontWeight: 800, fontSize: 16.5, lineHeight: 1.15, marginBottom: 6 }}>{r.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IClock size={13} /> {etaLabel(r)}m</span>
            <span className="ag3-dot" />
            <span style={{ color: fee === 'Free' ? 'var(--ok)' : 'var(--muted)', fontWeight: fee === 'Free' ? 700 : 500 }}>{fee === 'Free' ? 'Free delivery' : fee}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── full-width restaurant row ──────────────────────────────────────────── */
export function RestoRow({ r, onClick }: { r: Store; onClick?: () => void }) {
  const tile = tileFor(r.id);
  const em = r.emoji || foodEm(r.id);
  const fee = feeLabel(r);
  return (
    <button onClick={onClick} className="ag3-card ag3-press" style={{ display: 'flex', gap: 13, padding: 11, textAlign: 'left', width: '100%', alignItems: 'stretch' }}>
      <PhotoTile cls={tile} em={em} round="18px" style={{ width: 98, minHeight: 98, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 2 }}>
        <div className="disp" style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.12 }}>{r.name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tagLabel(r)} · {priceLabel(r)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fg-soft)', marginTop: 'auto', flexWrap: 'wrap' }}>
          <Stars value={r.rating} size={12} />
          <span className="ag3-dot" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IClock size={13} /> {etaLabel(r)}m</span>
          <span className="ag3-dot" />
          <span style={{ color: fee === 'Free' ? 'var(--ok)' : 'var(--fg-soft)', fontWeight: fee === 'Free' ? 700 : 500 }}>{fee === 'Free' ? 'Free' : fee}</span>
        </div>
        {r.promo && <span className="ag3-badge ag3-badge-soft" style={{ alignSelf: 'flex-start', marginTop: 1 }}><IBolt size={12} /> {r.promo}</span>}
      </div>
    </button>
  );
}

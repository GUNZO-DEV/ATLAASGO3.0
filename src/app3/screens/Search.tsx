// AtlaasGo 3.0 — Search. Faithful port of the `Search` export in
// screen-tabs2.jsx, wired to live agApi + useCity. Markup/classNames preserved
// (ag2-* → ag3-*); mock window.AG.* reads replaced with agApi calls:
//   trending chips      → agApi.catalog.trending()
//   browse-by-craving   → agApi.catalog.categories('food')
//   results list        → agApi.catalog.search(q, city.name)  (renders .stores)
import { useState, type CSSProperties } from 'react';
import { agApi } from '../../lib/agApi';
import { useCity } from '../CityContext';
import { useAsync } from '../useAsync';
import { PhotoTile, RestoRow } from '../primitives';
import { ISearch, ISlider, IFire } from '../icons';

type Go = (screen: string, payload?: unknown) => void;

const CRAVING_TILES = ['tile-b', 'tile-a', 'tile-c', 'tile-d', 'tile-e', 'tile-f'];

export default function Search({ go }: { go: Go }) {
  const { city } = useCity();
  const [q, setQ] = useState('');

  const cityName = city?.name ?? '';

  // window.AG mock → live agApi reads
  const { data: trending } = useAsync(() => agApi.catalog.trending(), []);
  const { data: categories } = useAsync(() => agApi.catalog.categories('food'), []);
  const { data: search } = useAsync(
    () => (q.trim() ? agApi.catalog.search(q, cityName) : Promise.resolve({ stores: [], items: [] })),
    [q, cityName],
  );

  // prototype hardcoded `AG.categories.slice(1)` to drop its "All" chip; agApi
  // categories carry no "All" entry, so we render them straight through.
  const cravings = categories ?? [];
  const results = search?.stores ?? [];

  return (
    <div className="ag3-scroll ag3-anim" style={{ paddingTop: 8 }}>
      <div className="ag3-pad" style={{ marginTop: 8 }}>
        <div className="disp" style={{ fontWeight: 800, fontSize: 27, marginBottom: 14 }}>Search</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 15px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
            <ISearch size={20} style={{ color: 'var(--primary)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search food, groceries, pharmacy" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14.5, color: 'var(--fg)' }} />
          </div>
          <button className="ag3-iconbtn" style={{ width: 50, height: 50, borderRadius: 16 }}><ISlider size={21} /></button>
        </div>
      </div>

      {!q && (
        <>
          <div className="ag3-pad" style={{ marginTop: 22 }}>
            <div className="ag3-eyebrow" style={{ marginBottom: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}><IFire size={13} /> Trending in {cityName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {(trending ?? []).map((t) => <button key={t} className="ag3-chip" onClick={() => setQ(t)}>{t}</button>)}
            </div>
          </div>
          <div className="ag3-pad" style={{ marginTop: 24 }}>
            <div className="ag3-sectitle" style={{ fontSize: 18, marginBottom: 12 }}>Browse by craving</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {cravings.map((c, i) => (
                <button key={c.id} className="ag3-card ag3-press" style={{ padding: 0, textAlign: 'left' }} onClick={() => setQ(c.label)}>
                  <PhotoTile cls={CRAVING_TILES[i % 6]} round="0" style={{ height: 84, alignItems: 'flex-end', padding: 13 }}>
                    <span style={{ position: 'absolute', right: -2, bottom: -6, fontSize: 50, transform: 'rotate(-10deg)', opacity: .9, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.25))' }}>{c.emoji}</span>
                    <span style={{ position: 'relative', zIndex: 2, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', fontSize: 16, textShadow: '0 1px 8px rgba(0,0,0,.34)' }}>{c.label}</span>
                  </PhotoTile>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {q && (
        <div className="ag3-pad" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 } as CSSProperties}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{results.length} results for “{q}”</div>
          {results.map((r) => <RestoRow key={r.id} r={r} onClick={() => go('restaurant', r)} />)}
        </div>
      )}
      <div style={{ height: 16 }} />
    </div>
  );
}

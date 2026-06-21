// AtlaasGo 3.0 — Home (immersive sunset canopy). Faithful port of
// screen-home2.jsx, wired to live agApi + useCity. Markup/classNames preserved
// (ag2-* → ag3-*); mock window.AG.* reads replaced with agApi calls.
import { useState, type CSSProperties } from 'react';
import { agApi, type City, type VerticalId } from '../../lib/agApi';
import { useCity } from '../CityContext';
import { useAsync } from '../useAsync';
import { PhotoTile, RestoCard, RestoRow, foodEm } from '../primitives';
import { IPin, IChevD, ISearch, ISnow, IBolt, IClock, IGroup, IBell, ISlider } from '../icons';

/* verticals from agApi carry no tile class — map one per vertical id */
const VERTICAL_TILE: Record<string, string> = { food: 'tile-b', grocery: 'tile-d', pharmacy: 'tile-f' };

type Go = (screen: string, payload?: unknown) => void;

function Canopy({
  go,
  city,
  onPickCity,
  greetingName,
  initials,
}: {
  go: Go;
  city: City;
  onPickCity: () => void;
  greetingName: string;
  initials: string;
}) {
  return (
    <div style={{ position: 'relative', padding: '6px 18px 0' }}>
      {/* faint warm wash — brand without the heavy block */}
      <div style={{ position: 'absolute', top: -28, right: -26, width: 170, height: 170, borderRadius: 999, background: 'radial-gradient(circle, rgba(255,87,34,.16), transparent 70%)', pointerEvents: 'none' }} />

      {/* top row */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
        <button onClick={onPickCity} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)', flexShrink: 0 }}><IPin size={20} /></span>
          <span style={{ minWidth: 0 }}>
            <span className="ag3-eyebrow" style={{ display: 'block', fontSize: 9.5 }}>Deliver to · {city.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontSize: 15.5, fontFamily: 'Montserrat', letterSpacing: '-.02em' }}>{city.defaultAddress} <IChevD size={16} /></span>
          </span>
        </button>
        <button className="ag3-iconbtn" style={{ position: 'relative' }} aria-label="Notifications" onClick={() => go('notifications')}>
          <IBell size={20} />
          <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 999, background: 'var(--primary)', border: '2px solid var(--surface)' }} />
        </button>
        <button onClick={() => go('profile')} style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontFamily: 'Montserrat', fontSize: 18, boxShadow: 'var(--sh-glow)' }}>{initials}</button>
      </div>

      {/* greeting */}
      <div style={{ marginTop: 18 }}>
        <div className="ag3-eyebrow">Good afternoon</div>
        <div className="disp" style={{ fontWeight: 800, fontSize: 27, lineHeight: 1.04, marginTop: 3 }}>Hi {greetingName} 👋</div>
      </div>

      {/* search */}
      <button onClick={() => go('search')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '15px 15px', borderRadius: 16, marginTop: 15, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)', color: 'var(--muted)', fontSize: 14.5, textAlign: 'left' }}>
        <ISearch size={20} style={{ color: 'var(--primary)' }} /> Search food, groceries, pharmacy…
        <span style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', color: 'var(--fg-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><ISlider size={17} /></span>
      </button>
    </div>
  );
}

function WeatherStrip({ cityId, cityName }: { cityId: string; cityName: string }) {
  const { data: w } = useAsync(() => agApi.cities.weather(cityId), [cityId]);
  if (!w) return null;
  return (
    <div className="ag3-pad" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r)', background: 'rgba(62,134,199,.09)', border: '1px solid rgba(62,134,199,.2)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(62,134,199,.16)', color: 'var(--snow)', flexShrink: 0 }}><ISnow size={22} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{w.condition} · {w.tempC}°C in {cityName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{w.note}</div>
        </div>
        <span className="ag3-badge ag3-badge-snow mono" style={{ flexShrink: 0 }}>ETA +{w.etaAddMinutes}m</span>
      </div>
    </div>
  );
}

export default function Home({ go, onPickCity }: { go: Go; onPickCity: () => void }) {
  const { city } = useCity();
  const [vert, setVert] = useState<VerticalId>('food');
  const [cat, setCat] = useState('all');

  const { data: me } = useAsync(() => agApi.me.get(), []);
  const { data: verticals } = useAsync(() => agApi.catalog.verticals(), []);
  const { data: foodCats } = useAsync(() => agApi.catalog.categories('food'), []);
  const cityName = city?.name ?? '';
  const { data: stores } = useAsync(
    () => (city ? agApi.catalog.stores({ vertical: vert, city: cityName }) : Promise.resolve([])),
    [vert, cityName],
  );

  if (!city) {
    return (
      <div className="ag3-scroll" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        Loading…
      </div>
    );
  }

  const greetingName = me?.name?.split(' ')[0] || 'there';
  const initials = me?.initials || 'A';

  const vObj = (verticals ?? []).find((v) => v.id === vert);
  // agApi categories don't include the "All" chip — prepend it (prototype parity)
  const categories = [{ id: 'all', label: 'All', emoji: '✦' }, ...(foodCats ?? [])];

  const inVert = stores ?? [];
  const list = vert === 'food' ? inVert.filter((r) => cat === 'all' || r.cuisineIds.includes(cat)) : inVert;
  const hero = inVert[0];
  const fast = inVert.filter((r) => r.etaMinutes[0] <= 22);

  return (
    <div className="ag3-scroll ag3-anim" style={{ paddingBottom: 10 }}>
      <Canopy go={go} city={city} onPickCity={onPickCity} greetingName={greetingName} initials={initials} />

      {city.weather && <WeatherStrip cityId={city.id} cityName={city.name} />}

      {/* vertical switcher */}
      <div className="ag3-pad" style={{ marginTop: 22, marginBottom: 0 }}>
        <div className="ag3-sectitle" style={{ fontSize: 18 }}>What do you need?</div>
      </div>
      <div className="ag3-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11, marginTop: 11 }}>
        {(verticals ?? []).map((v) => {
          const on = vert === v.id;
          return (
            <button key={v.id} onClick={() => { setVert(v.id); setCat('all'); }} className="ag3-press" style={{ textAlign: 'left' }}>
              <div style={{ borderRadius: 'var(--r)', overflow: 'hidden', border: on ? '1.5px solid var(--primary)' : '1px solid var(--line-2)', boxShadow: on ? 'var(--sh-glow)' : 'var(--sh-1)' }}>
                <PhotoTile cls={VERTICAL_TILE[v.id] ?? 'tile-b'} round="0" style={{ height: 64, alignItems: 'flex-end', padding: 9 }}>
                  <span style={{ position: 'absolute', right: -4, bottom: -6, fontSize: 42, transform: 'rotate(-10deg)', opacity: .92, filter: 'drop-shadow(0 4px 9px rgba(0,0,0,.26))' }}>{v.emoji}</span>
                </PhotoTile>
                <div style={{ background: on ? 'var(--grad-soft)' : 'var(--surface)', padding: '8px 10px' }}>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 13.5, color: on ? 'var(--primary)' : 'var(--fg)' }}>{v.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{v.blurb}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* cuisine tokens — food only */}
      {vert === 'food' && (
        <>
          <div className="ag3-pad" style={{ marginTop: 22, marginBottom: 12 }}>
            <div className="ag3-sectitle" style={{ fontSize: 18 }}>What are you craving?</div>
          </div>
          <div className="ag3-cats">
            {categories.map((c) => (
              <button key={c.id} className={`ag3-cat ${cat === c.id ? 'is-active' : ''}`} onClick={() => setCat(c.id)}>
                <span className="tok">{c.emoji}</span>
                <span className="lbl">{c.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* hero promo banner — food only */}
      {vert === 'food' && hero && (
        <div className="ag3-pad" style={{ marginTop: 20 }}>
          <button onClick={() => go('restaurant', hero)} className="ag3-press" style={{ width: '100%', textAlign: 'left' }}>
            <div className="ag3-card" style={{ border: 'none' }}>
              <PhotoTile cls={VERTICAL_TILE.food} em={hero.emoji || foodEm(hero.id)} float round="0" style={{ height: 178, alignItems: 'flex-start', flexDirection: 'column', justifyContent: 'space-between', padding: 16 }}>
                {hero.promo && <span className="ag3-badge mono" style={{ background: 'rgba(26,20,16,.36)', backdropFilter: 'blur(6px)', color: '#fff', position: 'relative', zIndex: 2 }}><IBolt size={13} /> {hero.promo}</span>}
                <div style={{ position: 'relative', zIndex: 2, color: '#fff' }}>
                  <div className="ag3-eyebrow" style={{ color: 'rgba(255,255,255,.9)' }}>Local legend</div>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 25, lineHeight: 1.04, textShadow: '0 2px 14px rgba(0,0,0,.34)', marginTop: 4 }}>{hero.name}</div>
                  <div style={{ fontSize: 12.5, opacity: .94, marginTop: 4, textShadow: '0 1px 8px rgba(0,0,0,.34)', maxWidth: 270 }}>{hero.blurb}</div>
                </div>
              </PhotoTile>
            </div>
          </button>
        </div>
      )}

      {/* group order nudge — campus + food only */}
      {city.campus && vert === 'food' && (
        <div className="ag3-pad" style={{ marginTop: 14 }}>
          <div className="ag3-card ag3-press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', background: 'var(--grad-soft)', border: '1px solid rgba(255,87,34,.16)' }}>
            <span style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--surface)', display: 'grid', placeItems: 'center', color: 'var(--primary)', flexShrink: 0, boxShadow: 'var(--sh-1)' }}><IGroup size={22} /></span>
            <div style={{ flex: 1 }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 14.5 }}>Start a dorm group order</div>
              <div style={{ fontSize: 12, color: 'var(--fg-soft)' }}>Split one delivery fee across your floor</div>
            </div>
            <span className="ag3-link">Invite ›</span>
          </div>
        </div>
      )}

      {/* fast near you rail — food only */}
      {vert === 'food' && fast.length > 0 && (
        <>
          <div className="ag3-pad" style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="ag3-sectitle">Fast near you</div>
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>under 25 min</span>
          </div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '14px 18px 4px', scrollbarWidth: 'none' } as CSSProperties}>
            {fast.map((r) => (
              <RestoCard key={r.id} r={r} onClick={() => go('restaurant', r)} />
            ))}
          </div>
        </>
      )}

      {/* all restaurants */}
      <div className="ag3-pad" style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="ag3-sectitle">{vert !== 'food' ? (vObj?.label ?? '') : (cat === 'all' ? 'All restaurants' : (categories.find((c) => c.id === cat)?.label ?? ''))}</div>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }} className="mono">{list.length} {vert === 'food' ? 'open' : (list.length === 1 ? 'store' : 'stores')}</span>
      </div>
      <div className="ag3-pad" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((r) => <RestoRow key={r.id} r={r} onClick={() => go('restaurant', r)} />)}
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}

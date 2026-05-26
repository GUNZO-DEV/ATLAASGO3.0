/**
 * Premium mobile browse screen — full-bleed search, sticky cuisine chips,
 * scrollable restaurant feed with image-ready cards.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useRestaurants, CUISINES } from '../lib/catalog';
import { useFavorites } from '../lib/customer';
import type { RestaurantRow } from '../lib/database.types';

const HEADER_GRADS = [
  'linear-gradient(135deg, #FFB74D, #FF5722)',
  'linear-gradient(135deg, #8B4513, #2A211C)',
  'linear-gradient(135deg, #34D399, #059669)',
  'linear-gradient(135deg, #6B5B95, #2A211C)',
  'linear-gradient(135deg, #FF5722, #C2185B)',
  'linear-gradient(135deg, #FBA74D, #C66B1F)',
];

export default function MobileOrder() {
  const [params] = useSearchParams();
  const isCampus = params.get('campus') === '1';
  const initialCuisine = params.get('cat') || 'All';

  const [cuisine, setCuisine] = useState<string>(initialCuisine);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'fastest' | 'rating' | 'fee'>('fastest');

  const { restaurants, loading, error } = useRestaurants();
  const { has: isFav, toggle: toggleFav } = useFavorites('restaurant');

  const filtered = useMemo(() => {
    let list = restaurants;
    if (isCampus) list = list.filter((r) => r.is_campus_partner);
    if (cuisine !== 'All') list = list.filter((r) => r.cuisine_tags?.includes(cuisine));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'fee') return a.fee_dh - b.fee_dh;
      return a.time_min - b.time_min;
    });
    return list;
  }, [restaurants, isCampus, cuisine, query, sort]);

  return (
    <div className="morder">
      {/* Sticky search bar */}
      <header className="morder-top">
        <div className="morder-search">
          <I.Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isCampus ? 'Search campus eats…' : 'Search restaurants, dishes…'}
            type="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear" className="morder-clear">
              <I.Close size={12} />
            </button>
          )}
        </div>
      </header>

      {/* Campus / city pill */}
      <div className="morder-mode">
        <Link
          to="/order"
          className={`morder-mode-btn ${!isCampus ? 'active' : ''}`}
          replace
        >
          🥘 Ifrane
        </Link>
        <Link
          to="/order?campus=1"
          className={`morder-mode-btn ${isCampus ? 'active' : ''}`}
          replace
        >
          🏫 Campus
        </Link>
      </div>

      {/* Sticky cuisine chips */}
      <div className="morder-chips-wrap">
        <div className="morder-chips">
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`morder-chip ${cuisine === c ? 'active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Sort row */}
      <div className="morder-sort">
        <span>{filtered.length} {filtered.length === 1 ? 'place' : 'places'}</span>
        <div className="morder-sort-pills">
          {(['fastest', 'rating', 'fee'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`morder-sort-pill ${sort === s ? 'active' : ''}`}
            >
              {s === 'fastest' ? 'Fastest' : s === 'rating' ? 'Top rated' : 'Cheapest fee'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="morder-err">
          <I.Shield size={14} /> Couldn't reach the catalog. Pull to refresh in a sec.
        </div>
      )}

      {/* Cards */}
      <div className="morder-feed">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="morder-card skeleton">
            <div className="morder-card-img skeleton-shimmer" />
            <div className="morder-card-body">
              <div className="skeleton-line" style={{ width: '60%' }} />
              <div className="skeleton-line" style={{ width: '40%', marginTop: 8 }} />
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="morder-empty">
            <div className="morder-empty-icon">🔎</div>
            <h3>No matches in Ifrane</h3>
            <p>
              {query
                ? `No restaurants found for "${query}"`
                : `Try a different cuisine`}
            </p>
            <button
              onClick={() => {
                setQuery('');
                setCuisine('All');
              }}
              className="morder-empty-btn"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && filtered.map((r: RestaurantRow, i) => (
          <Link key={r.id} to={`/r/${r.slug}`} className="morder-card">
            <div
              className="morder-card-img"
              style={{ background: HEADER_GRADS[r.img_variant % HEADER_GRADS.length] }}
            >
              {r.tag && (
                <span className="morder-card-tag">
                  <I.Lightning size={9} /> {r.tag}
                </span>
              )}
              <button
                className={`morder-card-fav ${isFav(r.id) ? 'active' : ''}`}
                aria-label={isFav(r.id) ? 'Remove favourite' : 'Save'}
                onClick={(e) => {
                  e.preventDefault();
                  void toggleFav(r.id);
                  if ('vibrate' in navigator) navigator.vibrate?.(6);
                }}
              >
                <I.Heart size={14} filled={isFav(r.id)} />
              </button>
              <span className="morder-card-emoji">{r.emoji ?? '🥘'}</span>
              {r.is_local_legend && (
                <span className="morder-card-legend">
                  <I.Star size={9} /> Local Legend
                </span>
              )}
            </div>
            <div className="morder-card-body">
              <div className="morder-card-head">
                <h3>{r.name}</h3>
                <span className="morder-card-rating">
                  <I.Star size={11} /> {r.rating}
                </span>
              </div>
              <div className="morder-card-meta">
                <span>{r.cuisine}</span>
                <span className="morder-dot" />
                <span>{r.time_min} min</span>
                <span className="morder-dot" />
                <span style={{ color: r.fee_dh === 0 ? 'var(--primary)' : 'inherit', fontWeight: 700 }}>
                  {r.fee_dh === 0 ? 'Free delivery' : `${r.fee_dh} dh`}
                </span>
              </div>
            </div>
            <span style={{ opacity: 0 }}>{i}</span>
          </Link>
        ))}
      </div>

      <MobileOrderStyles />
    </div>
  );
}

function MobileOrderStyles() {
  return (
    <style>{`
      .morder {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
      }
      .morder-top {
        position: sticky;
        top: var(--safe-top);
        z-index: 20;
        padding: 12px 14px 8px;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
      }
      .morder-search {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: 14px;
        transition: border-color .2s;
      }
      .morder-search:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(255,87,34,0.10);
      }
      .morder-search svg { color: var(--primary); flex-shrink: 0; }
      .morder-search input {
        flex: 1;
        background: none;
        border: 0;
        outline: 0;
        font-size: 15px;
        color: var(--fg);
        font-family: inherit;
        min-width: 0;
      }
      .morder-clear {
        width: 22px; height: 22px;
        border-radius: 50%;
        background: rgba(0,0,0,0.06);
        color: var(--fg-soft);
        border: 0;
        display: grid; place-items: center;
        cursor: pointer;
      }
      .morder-mode {
        display: flex;
        gap: 8px;
        padding: 4px 14px 14px;
      }
      .morder-mode-btn {
        flex: 1;
        text-align: center;
        padding: 10px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: 14px;
        font-weight: 700;
        font-size: 13px;
        color: var(--fg);
        text-decoration: none;
        transition: all .2s;
      }
      .morder-mode-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(255,87,34,0.25);
      }
      .morder-chips-wrap {
        position: sticky;
        top: calc(var(--safe-top) + 60px);
        z-index: 15;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        padding: 6px 0;
      }
      .morder-chips {
        display: flex;
        gap: 8px;
        padding: 4px 14px 8px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }
      .morder-chips::-webkit-scrollbar { display: none; }
      .morder-chip {
        flex-shrink: 0;
        scroll-snap-align: start;
        padding: 7px 14px;
        border-radius: 999px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        color: var(--fg);
        font-weight: 700;
        font-size: 12.5px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .2s;
      }
      .morder-chip:active { transform: scale(0.95); }
      .morder-chip.active {
        background: var(--ink);
        color: white;
        border-color: var(--ink);
      }
      [data-theme="dark"] .morder-chip.active {
        background: white;
        color: var(--ink);
        border-color: white;
      }

      .morder-sort {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        font-size: 12px;
        color: var(--fg-soft);
        font-weight: 700;
      }
      .morder-sort-pills {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .morder-sort-pills::-webkit-scrollbar { display: none; }
      .morder-sort-pill {
        padding: 5px 10px;
        border-radius: 999px;
        background: transparent;
        border: 1px solid var(--line);
        color: var(--fg-soft);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .morder-sort-pill.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .morder-feed {
        padding: 0 14px 32px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .morder-card {
        position: relative;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        overflow: hidden;
        text-decoration: none;
        color: var(--fg);
        box-shadow: 0 6px 18px -10px rgba(0,0,0,0.15);
        transition: transform .15s, box-shadow .2s;
      }
      .morder-card:active { transform: scale(0.98); }
      .morder-card.skeleton { pointer-events: none; }
      .morder-card-img {
        position: relative;
        height: 170px;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 14px;
      }
      .morder-card-tag {
        position: absolute;
        top: 12px; left: 12px;
        display: inline-flex; align-items: center; gap: 4px;
        padding: 4px 10px;
        background: white;
        color: var(--primary);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .morder-card-fav {
        position: absolute;
        top: 12px; right: 12px;
        width: 34px; height: 34px;
        border-radius: 50%;
        background: rgba(255,255,255,0.96);
        color: var(--fg);
        border: 0;
        display: grid; place-items: center;
        backdrop-filter: blur(6px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        cursor: pointer;
        transition: transform .15s;
      }
      .morder-card-fav:active { transform: scale(0.88); }
      .morder-card-fav.active {
        color: var(--primary);
        background: white;
      }
      .morder-card-emoji {
        font-size: 64px;
        line-height: 1;
        opacity: 0.92;
        filter: drop-shadow(0 4px 14px rgba(0,0,0,0.25));
      }
      .morder-card-legend {
        position: absolute;
        bottom: 12px; left: 12px;
        display: inline-flex; align-items: center; gap: 3px;
        padding: 3px 8px;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(8px);
        color: #FFD54F;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      .morder-card-body {
        padding: 14px 16px 16px;
      }
      .morder-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .morder-card h3 {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 16px;
        letter-spacing: -0.01em;
        margin: 0;
        color: var(--fg);
        flex: 1;
      }
      .morder-card-rating {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 3px 8px;
        background: rgba(245, 158, 11, 0.10);
        color: #B45309;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .morder-card-rating svg { color: #F59E0B; }
      .morder-card-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--fg-soft);
        font-weight: 600;
        flex-wrap: wrap;
      }
      .morder-dot {
        width: 3px; height: 3px;
        background: var(--fg-soft);
        border-radius: 50%;
        opacity: 0.5;
      }

      .morder-empty {
        text-align: center;
        padding: 48px 24px;
        background: var(--surface);
        border: 1px dashed var(--line);
        border-radius: 20px;
        margin: 12px 0;
      }
      .morder-empty-icon {
        font-size: 48px;
        margin-bottom: 8px;
      }
      .morder-empty h3 {
        font-family: Montserrat;
        font-weight: 800;
        font-size: 17px;
        margin: 0 0 6px;
      }
      .morder-empty p {
        font-size: 13px;
        color: var(--fg-soft);
        margin: 0 0 16px;
      }
      .morder-empty-btn {
        padding: 9px 18px;
        background: var(--primary);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      }

      .morder-err {
        margin: 8px 14px;
        padding: 12px 14px;
        background: rgba(239,68,68,0.06);
        border: 1px solid rgba(239,68,68,0.20);
        border-radius: 12px;
        color: #B91C1C;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `}</style>
  );
}

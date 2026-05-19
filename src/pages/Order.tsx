import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';
import { useRestaurants, CUISINES } from '../lib/catalog';
import { useFavorites } from '../lib/customer';
import { FadeUp } from '../components/visual/ScrollReveal';
import type { RestaurantRow } from '../lib/database.types';

const VARIANT_LABELS: Record<string, string> = {};

function tagClass(tag: string | null | undefined) {
  if (tag === 'Hot' || tag === 'Trending') return 'resto-tag hot';
  return 'resto-tag';
}

export default function Order() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const isCampus = params.get('campus') === '1';
  const [active, setActive] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'fastest' | 'rating' | 'fee'>('fastest');
  const { restaurants, loading, error } = useRestaurants();
  const { has: isFav, toggle: toggleFav } = useFavorites('restaurant');

  const filtered = useMemo(() => {
    let list = restaurants;
    if (isCampus) list = list.filter((r) => r.is_campus_partner);
    if (active !== 'All') list = list.filter((r) => r.cuisine_tags?.includes(active));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'fee') return a.fee_dh - b.fee_dh;
      return a.time_min - b.time_min;
    });
    return list;
  }, [restaurants, isCampus, active, query, sort]);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <FadeUp y={10}>
            <div className="section-tag">
              <I.Bag size={11} /> {isCampus ? 'AUIER Campus Drop' : 'Ifrane Delivery'}
            </div>
            <h1 className="page-title">{t('order.title')}</h1>
            <p className="page-sub">{t('order.sub')}</p>

            <div
              style={{
                marginTop: 28,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                  minWidth: 280,
                  flex: 1,
                }}
              >
                <I.Search size={16} style={{ color: 'var(--fg-soft)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search restaurants, dishes…"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    color: 'var(--fg)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                style={{
                  padding: '12px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--fg)',
                  fontFamily: 'inherit',
                }}
              >
                <option value="fastest">Fastest delivery</option>
                <option value="rating">Top rated</option>
                <option value="fee">Lowest fee</option>
              </select>
            </div>
          </FadeUp>
        </div>
      </div>

      <section className="bloc" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="cuisine-filter">
            {CUISINES.map((c) => (
              <button
                key={c}
                className={`cuisine-chip ${active === c ? 'active' : ''}`}
                onClick={() => setActive(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.08)',
                color: '#B91C1C',
                fontSize: 13,
              }}
            >
              Couldn't reach the catalog ({error}). Pull-to-refresh in a sec.
            </div>
          )}

          {loading && (
            <div className="resto-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="resto-card skeleton" key={i}>
                  <div className="resto-img skeleton-shimmer" style={{ height: 160 }} />
                  <div className="resto-body">
                    <div className="skeleton-line" style={{ width: '70%' }} />
                    <div className="skeleton-line" style={{ width: '40%', marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <div className="resto-grid">
              {filtered.map((r: RestaurantRow, i) => (
                <FadeUp y={16} delay={Math.min(i * 0.04, 0.4)} key={r.id}>
                  <Link to={`/r/${r.slug}`} className="resto-card">
                    <div className={`resto-img alt${r.img_variant}`}>
                      {r.tag && <span className={tagClass(r.tag)}>{r.tag}</span>}
                      <button
                        className={`resto-fav ${isFav(r.id) ? 'active' : ''}`}
                        aria-label={isFav(r.id) ? 'Remove favorite' : 'Save'}
                        onClick={(e) => {
                          e.preventDefault();
                          void toggleFav(r.id);
                        }}
                      >
                        <I.Heart size={14} filled={isFav(r.id)} />
                      </button>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          right: 14,
                          fontSize: 32,
                          opacity: 0.85,
                        }}
                      >
                        {r.emoji}
                      </span>
                    </div>
                    <div className="resto-body">
                      <div className="resto-head">
                        <div className="resto-name">{r.name}</div>
                        <div className="resto-rate">
                          <I.Star /> {r.rating}
                        </div>
                      </div>
                      <div className="resto-meta">
                        <span>{r.cuisine}</span>
                      </div>
                      <div className="resto-meta" style={{ marginTop: 4 }}>
                        <span>
                          <I.Clock size={11} style={{ marginInlineEnd: 4, verticalAlign: -1 }} />
                          {r.time_min} {t('common.minutes')}
                        </span>
                        <span className="dot" />
                        <span style={{ color: r.fee_dh === 0 ? 'var(--primary)' : 'inherit' }}>
                          {r.fee_dh === 0 ? t('common.delivery') : `${r.fee_dh} dh fee`}
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeUp>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <I.Search size={36} />
              <h3>No matches in Ifrane</h3>
              <p>Try clearing filters or searching for "Italian" or "Cafés".</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

void VARIANT_LABELS; // reserved for future variant label overrides

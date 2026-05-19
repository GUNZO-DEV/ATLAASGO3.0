import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useFavorites } from '../lib/customer';
import { useRestaurants } from '../lib/catalog';
import { FadeUp } from '../components/visual/ScrollReveal';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { ids, loading: favLoading, toggle } = useFavorites('restaurant');
  const { restaurants, loading: restoLoading } = useRestaurants();
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) nav('/auth?next=/favorites', { replace: true });
  }, [authLoading, user, nav]);

  const loading = favLoading || restoLoading;
  const favorites = restaurants.filter((r) => ids.has(r.id));

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={12}>
          <div className="section-tag">
            <I.Heart size={11} filled /> Favorites
          </div>
          <h1 className="page-title">Saved restaurants</h1>
          <p className="page-sub">Tap the heart on any restaurant to bookmark it here.</p>
        </FadeUp>

        {loading && (
          <p style={{ marginTop: 24, color: 'var(--fg-soft)' }}>Loading…</p>
        )}

        {!loading && favorites.length === 0 && (
          <div className="empty-state" style={{ marginTop: 24 }}>
            <I.Heart size={36} />
            <h3>No favorites yet</h3>
            <p>Heart a few spots and they'll live here for next time.</p>
            <Link to="/order" className="btn btn-primary" style={{ marginTop: 16 }}>
              Browse restaurants <I.Arrow />
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="resto-grid" style={{ marginTop: 28 }}>
            {favorites.map((r) => (
              <FadeUp y={14} key={r.id}>
                <Link to={`/r/${r.slug}`} className="resto-card">
                  <div className={`resto-img alt${r.img_variant}`}>
                    {r.tag && (
                      <span
                        className={`resto-tag ${
                          r.tag === 'Hot' || r.tag === 'Trending' ? 'hot' : ''
                        }`}
                      >
                        {r.tag}
                      </span>
                    )}
                    <button
                      className="resto-fav active"
                      aria-label="Remove favorite"
                      onClick={(e) => {
                        e.preventDefault();
                        void toggle(r.id);
                      }}
                    >
                      <I.Heart size={14} filled />
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
                      <span>
                        <I.Clock size={11} style={{ marginInlineEnd: 4, verticalAlign: -1 }} />
                        {r.time_min} min
                      </span>
                      <span className="dot" />
                      <span style={{ color: r.fee_dh === 0 ? 'var(--primary)' : 'inherit' }}>
                        {r.fee_dh === 0 ? 'Free delivery' : `${r.fee_dh} dh`}
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeUp>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

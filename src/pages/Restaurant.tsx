import { Link, useNavigate, useParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useRestaurant } from '../lib/catalog';
import { useCart } from '../lib/cart';
import { useI18n } from '../lib/i18n';
import { useFavorites } from '../lib/customer';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton } from '../components/visual/Motion';

const HEADER_GRADS: Record<number, string> = {
  0: 'linear-gradient(135deg, var(--amber), var(--primary))',
  1: 'linear-gradient(135deg, #8B4513, #2A211C)',
  2: 'linear-gradient(135deg, #34D399, #059669)',
  3: 'linear-gradient(135deg, #6B5B95, #2A211C)',
  4: 'linear-gradient(135deg, var(--primary), #C2185B)',
  5: 'linear-gradient(135deg, #FBA74D, #C66B1F)',
};

// Slug-specific logos served from /public/logos/
const LOGO_OVERRIDES: Record<string, string> = {
  'crepeto':          '/logos/crepeto.svg',
  'bonsai-sushi-bar': '/logos/bonsai-sushi-bar.svg',
  'foodie':           '/logos/foodie.svg',
};

export default function RestaurantPage() {
  const { slug } = useParams<{ slug: string }>();
  const { restaurant, loading, error } = useRestaurant(slug);
  const add = useCart((s) => s.add);
  const cartCount = useCart((s) => s.count());
  const { t } = useI18n();
  const nav = useNavigate();
  const { has: isFav, toggle: toggleFav } = useFavorites('restaurant');
  const { has: isItemFav, toggle: toggleItemFav } = useFavorites('menu_item');

  if (loading) {
    return (
      <section className="page">
        <div className="container">
          <div className="resto-header skeleton-shimmer" style={{ height: 320 }} />
          <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-line" style={{ height: 64 }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!restaurant || error) {
    return (
      <section className="page">
        <div className="container">
          <div className="empty-state">
            <h3>Restaurant not found</h3>
            <p>
              {error ?? "We couldn't find that partner."}{' '}
              <Link to="/order">Browse all restaurants</Link>.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="container">
        <Link to="/order" className="btn btn-ghost" style={{ marginTop: 20 }}>
          ← Back to restaurants
        </Link>

        <FadeUp y={14}>
          <div className="resto-header" style={{ background: HEADER_GRADS[restaurant.img_variant] }}>
            {LOGO_OVERRIDES[restaurant.slug] && (
              <img
                src={LOGO_OVERRIDES[restaurant.slug]}
                alt={`${restaurant.name} logo`}
                className="resto-header-logo"
              />
            )}
            <button
              className={`resto-fav ${isFav(restaurant.id) ? 'active' : ''}`}
              style={{ top: 18, right: 18, width: 40, height: 40 }}
              aria-label="Save restaurant"
              onClick={() => toggleFav(restaurant.id)}
            >
              <I.Heart size={18} filled={isFav(restaurant.id)} />
            </button>
            <div className="resto-header-content">
              <div className="section-tag" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                <I.Star size={11} /> {restaurant.rating} · {restaurant.cuisine_tags?.join(' · ')}
              </div>
              <h1>{restaurant.name}</h1>
              <p style={{ maxWidth: 540, marginTop: 6, opacity: 0.92 }}>{restaurant.description}</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 14 }}>
                <span>
                  <I.Clock size={13} style={{ verticalAlign: -2, marginInlineEnd: 4 }} />
                  {restaurant.time_min} {t('common.minutes')}
                </span>
                <span>
                  {restaurant.fee_dh === 0 ? t('common.delivery') : `${restaurant.fee_dh} dh delivery`}
                </span>
              </div>
            </div>
          </div>
        </FadeUp>

        {restaurant.categories.map((section, sectionIdx) => (
          <FadeUp y={14} key={section.id} delay={sectionIdx * 0.04}>
            <div className="menu-section">
              <h3>{section.name}</h3>
              <div className="menu-grid">
                {section.items.map((item) => (
                  <div key={item.id} className="menu-item">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ margin: 0 }}>{item.name}</h4>
                        <button
                          aria-label="Save item"
                          onClick={() => toggleItemFav(item.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: isItemFav(item.id) ? 'var(--primary)' : 'var(--fg-soft)',
                            padding: 0,
                          }}
                        >
                          <I.Heart size={13} filled={isItemFav(item.id)} />
                        </button>
                      </div>
                      <p>{item.description}</p>
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: 'Montserrat',
                          fontWeight: 700,
                          color: 'var(--primary)',
                        }}
                      >
                        {item.price_dh} dh
                      </div>
                    </div>
                    <button
                      className="menu-add"
                      onClick={() => {
                        add({
                          id: item.id,
                          restaurantSlug: restaurant.slug,
                          restaurantName: restaurant.name,
                          name: item.name,
                          desc: item.description ?? undefined,
                          priceDh: item.price_dh,
                        }, 1, !!restaurant.is_campus_partner);
                      }}
                    >
                      + {t('common.add')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        ))}

        {cartCount > 0 && (
          <div className="resto-floating-cart">
            <MotionButton className="btn btn-primary btn-lg" onClick={() => nav('/cart')}>
              View cart ({cartCount}) <I.Arrow />
            </MotionButton>
          </div>
        )}
      </div>
    </section>
  );
}

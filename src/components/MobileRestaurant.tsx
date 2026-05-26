/**
 * Premium mobile restaurant page — feels like Uber Eats / Talabat menu screen.
 *
 * - Full-bleed gradient hero with floating back/save/share buttons
 * - Sticky header that morphs on scroll (logo + name appear, gradient fades)
 * - Horizontal scroll-snap category nav (tap to scroll-to section)
 * - Item cards with quantity controls (+/-) when already in cart
 * - Sticky bottom "View cart" bar with item count + total
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useCart } from '../lib/cart';
import { useFavorites } from '../lib/customer';
import type { RestaurantWithMenu } from '../lib/catalog';

const HEADER_GRADS: Record<number, string> = {
  0: 'linear-gradient(135deg, #FFB74D, #FF5722)',
  1: 'linear-gradient(135deg, #8B4513, #2A211C)',
  2: 'linear-gradient(135deg, #34D399, #059669)',
  3: 'linear-gradient(135deg, #6B5B95, #2A211C)',
  4: 'linear-gradient(135deg, #FF5722, #C2185B)',
  5: 'linear-gradient(135deg, #FBA74D, #C66B1F)',
};

const LOGO_OVERRIDES: Record<string, string> = {
  crepeto: '/logos/crepeto.svg',
  'bonsai-sushi-bar': '/logos/bonsai-sushi-bar.svg',
  foodie: '/logos/foodie.svg',
};

type Props = { restaurant: RestaurantWithMenu };

export default function MobileRestaurant({ restaurant }: Props) {
  const nav = useNavigate();
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const items = useCart((s) => s.items);
  const cartCount = useCart((s) => s.count());
  const cartTotal = useCart((s) => s.subtotal());
  const { has: isFav, toggle: toggleFav } = useFavorites('restaurant');
  const { has: isItemFav, toggle: toggleItemFav } = useFavorites('menu_item');

  const [scrolled, setScrolled] = useState(false);
  const [activeCat, setActiveCat] = useState(restaurant.categories[0]?.id ?? '');
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const catNavRef = useRef<HTMLDivElement>(null);

  // Track which section is in view → highlight in category nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveCat(e.target.id.replace('cat-', ''));
            break;
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [restaurant.categories]);

  // Sticky-on-scroll header
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 180);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // Auto-scroll active category into view in the nav rail
  useEffect(() => {
    const rail = catNavRef.current;
    if (!rail) return;
    const activeBtn = rail.querySelector<HTMLElement>(`[data-cat-id="${activeCat}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeCat]);

  const inCartQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.id, (map.get(i.id) ?? 0) + i.qty);
    return map;
  }, [items]);

  function scrollToCat(catId: string) {
    const el = sectionRefs.current.get(catId);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  return (
    <div className="mresto">
      {/* ── Sticky header that morphs on scroll ─────────────── */}
      <div className={`mresto-stickytop ${scrolled ? 'visible' : ''}`}>
        <button
          onClick={() => nav(-1)}
          aria-label="Back"
          className="mresto-stickybtn"
        >
          <I.Arrow size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div className="mresto-stickytitle">{restaurant.name}</div>
        <button
          onClick={() => toggleFav(restaurant.id)}
          aria-label={isFav(restaurant.id) ? 'Remove from favourites' : 'Save'}
          className="mresto-stickybtn"
        >
          <I.Heart size={16} filled={isFav(restaurant.id)} />
        </button>
      </div>

      {/* ── Hero ───────────────────────────────────────────── */}
      <div
        ref={heroRef}
        className="mresto-hero"
        style={{ background: HEADER_GRADS[restaurant.img_variant] }}
      >
        <div className="mresto-hero-fab-row">
          <button
            onClick={() => nav(-1)}
            aria-label="Back"
            className="mresto-fab"
          >
            <I.Arrow size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: restaurant.name,
                  text: `Check out ${restaurant.name} on AtlaasGo`,
                  url: window.location.href,
                });
              }
            }}
            aria-label="Share restaurant"
            className="mresto-fab"
          >
            <I.Lightning size={15} />
          </button>
          <button
            onClick={() => toggleFav(restaurant.id)}
            aria-label="Save"
            className="mresto-fab"
          >
            <I.Heart size={15} filled={isFav(restaurant.id)} />
          </button>
        </div>

        <div className="mresto-hero-emoji" aria-hidden>
          {restaurant.emoji ?? '🥘'}
        </div>
        {LOGO_OVERRIDES[restaurant.slug] && (
          <img
            src={LOGO_OVERRIDES[restaurant.slug]}
            alt={`${restaurant.name} logo`}
            className="mresto-hero-logo"
          />
        )}
      </div>

      {/* ── Restaurant info card (overlaps hero) ───────────── */}
      <div className="mresto-info">
        <div className="mresto-info-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="mresto-name">{restaurant.name}</h1>
            <div className="mresto-tags">
              {restaurant.cuisine_tags?.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="mresto-rating-badge">
            <I.Star size={12} />
            <span>{restaurant.rating}</span>
          </div>
        </div>

        {restaurant.description && (
          <p className="mresto-desc">{restaurant.description}</p>
        )}

        <div className="mresto-meta">
          <div className="mresto-meta-item">
            <I.Clock size={13} />
            <span>{restaurant.time_min} min</span>
          </div>
          <div className="mresto-meta-sep" />
          <div className="mresto-meta-item">
            <I.Bike size={13} />
            <span>
              {restaurant.fee_dh === 0 ? 'Free delivery' : `${restaurant.fee_dh} dh fee`}
            </span>
          </div>
          {restaurant.is_local_legend && (
            <>
              <div className="mresto-meta-sep" />
              <div className="mresto-meta-item">
                <I.Star size={11} style={{ color: '#F59E0B' }} />
                <span style={{ color: '#F59E0B', fontWeight: 700 }}>Local Legend</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Sticky category navigation rail ─────────────────── */}
      {restaurant.categories.length > 1 && (
        <div className="mresto-catnav-wrap">
          <div className="mresto-catnav" ref={catNavRef}>
            {restaurant.categories.map((c) => (
              <button
                key={c.id}
                data-cat-id={c.id}
                onClick={() => scrollToCat(c.id)}
                className={`mresto-catpill ${activeCat === c.id ? 'active' : ''}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Menu sections ──────────────────────────────────── */}
      <div className="mresto-sections">
        {restaurant.categories.length === 0 && (
          <div className="mresto-empty">
            <div style={{ fontSize: 48 }}>🍽</div>
            <h3>Menu coming soon</h3>
            <p>This partner is setting up their menu. Check back in a bit.</p>
          </div>
        )}

        {restaurant.categories.map((section) => (
          <section
            key={section.id}
            id={`cat-${section.id}`}
            ref={(el) => {
              if (el) sectionRefs.current.set(section.id, el);
            }}
            className="mresto-section"
          >
            <h2 className="mresto-section-title">{section.name}</h2>
            <div className="mresto-items">
              {section.items.length === 0 ? (
                <div className="mresto-empty-mini">No items in this category yet</div>
              ) : (
                section.items.map((item) => {
                  const qty = inCartQty.get(item.id) ?? 0;
                  return (
                    <article key={item.id} className="mresto-item">
                      <div className="mresto-item-body">
                        <div className="mresto-item-head">
                          <h3>{item.name}</h3>
                          <button
                            aria-label={isItemFav(item.id) ? 'Remove favorite' : 'Save item'}
                            onClick={() => toggleItemFav(item.id)}
                            className="mresto-item-fav"
                            style={{ color: isItemFav(item.id) ? 'var(--primary)' : 'var(--fg-soft)' }}
                          >
                            <I.Heart size={14} filled={isItemFav(item.id)} />
                          </button>
                        </div>
                        {item.description && (
                          <p className="mresto-item-desc">{item.description}</p>
                        )}
                        <div className="mresto-item-price">{item.price_dh} dh</div>
                      </div>
                      <div className="mresto-item-action">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="mresto-item-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="mresto-item-img placeholder" aria-hidden>
                            {restaurant.emoji ?? '🥘'}
                          </div>
                        )}
                        {qty === 0 ? (
                          <button
                            className="mresto-add-btn"
                            onClick={() => {
                              add(
                                {
                                  id: item.id,
                                  restaurantSlug: restaurant.slug,
                                  restaurantName: restaurant.name,
                                  name: item.name,
                                  desc: item.description ?? undefined,
                                  priceDh: item.price_dh,
                                },
                                1,
                                !!restaurant.is_campus_partner,
                              );
                              if ('vibrate' in navigator) navigator.vibrate?.(8);
                            }}
                            aria-label={`Add ${item.name} to cart`}
                          >
                            <I.Plus size={14} />
                          </button>
                        ) : (
                          <div className="mresto-qty">
                            <button
                              onClick={() => {
                                setQty(item.id, qty - 1);
                                if ('vibrate' in navigator) navigator.vibrate?.(6);
                              }}
                              aria-label="Remove one"
                            >
                              <I.Minus size={14} />
                            </button>
                            <span>{qty}</span>
                            <button
                              onClick={() => {
                                setQty(item.id, qty + 1);
                                if ('vibrate' in navigator) navigator.vibrate?.(6);
                              }}
                              aria-label="Add one"
                            >
                              <I.Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>

      {/* ── Sticky View cart bar ───────────────────────────── */}
      {cartCount > 0 && (
        <div className="mresto-cartbar">
          <button onClick={() => nav('/cart')} className="mresto-cartbtn">
            <span className="mresto-cartcount">{cartCount}</span>
            <span className="mresto-cartlabel">View cart</span>
            <span className="mresto-carttotal">{cartTotal} dh</span>
            <I.Arrow size={14} />
          </button>
        </div>
      )}

      <MobileRestoStyles />
    </div>
  );
}

function MobileRestoStyles() {
  return (
    <style>{`
      .mresto {
        background: var(--bg);
        min-height: 100vh;
        padding-bottom: 100px;
      }

      /* Sticky header */
      .mresto-stickytop {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 60;
        padding: calc(var(--safe-top) + 8px) 14px 8px;
        background: color-mix(in srgb, var(--surface) 88%, transparent);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        backdrop-filter: blur(24px) saturate(180%);
        border-bottom: 0.5px solid var(--line);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateY(-100%);
        transition: transform 0.25s cubic-bezier(.16,1,.3,1);
      }
      .mresto-stickytop.visible { transform: translateY(0); }
      .mresto-stickytitle {
        flex: 1;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--fg);
      }
      .mresto-stickybtn {
        width: 38px; height: 38px;
        border-radius: 50%;
        background: var(--bg);
        border: 1px solid var(--line);
        color: var(--fg);
        display: grid; place-items: center;
        cursor: pointer;
        transition: transform .15s;
      }
      .mresto-stickybtn:active { transform: scale(0.9); }

      /* Hero */
      .mresto-hero {
        position: relative;
        height: 280px;
        padding: calc(var(--safe-top) + 14px) 14px 0;
        overflow: hidden;
      }
      .mresto-hero::after {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.25) 100%);
        pointer-events: none;
      }
      .mresto-hero-fab-row {
        position: relative;
        z-index: 2;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .mresto-fab {
        width: 38px; height: 38px;
        border-radius: 50%;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(12px);
        border: 0;
        color: white;
        display: grid; place-items: center;
        cursor: pointer;
        transition: transform .15s;
      }
      .mresto-fab:active { transform: scale(0.9); }
      .mresto-hero-emoji {
        position: absolute;
        bottom: 30px;
        right: 18px;
        font-size: 110px;
        line-height: 1;
        opacity: 0.95;
        filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
        transform: rotate(-8deg);
      }
      .mresto-hero-logo {
        position: absolute;
        bottom: 18px;
        left: 18px;
        height: 64px;
        width: 64px;
        object-fit: contain;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      }

      /* Info card (overlaps hero) */
      .mresto-info {
        position: relative;
        z-index: 3;
        margin: -28px 14px 0;
        padding: 18px 18px 16px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.12);
      }
      .mresto-info-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
      }
      .mresto-name {
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 22px;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--fg);
        margin: 0 0 6px;
      }
      .mresto-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .mresto-tags span {
        font-size: 11px;
        font-weight: 600;
        color: var(--fg-soft);
        background: rgba(0,0,0,0.04);
        padding: 3px 10px;
        border-radius: 999px;
      }
      .mresto-rating-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: linear-gradient(135deg, #FFB74D, #FF8A65);
        color: white;
        border-radius: 12px;
        font-weight: 800;
        font-size: 13px;
        flex-shrink: 0;
        box-shadow: 0 4px 10px rgba(255,138,101,0.3);
      }
      .mresto-desc {
        font-size: 13px;
        color: var(--fg-soft);
        line-height: 1.45;
        margin: 4px 0 14px;
      }
      .mresto-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 12px;
        border-top: 1px dashed var(--line);
        font-size: 12px;
        font-weight: 600;
        color: var(--fg);
        flex-wrap: wrap;
      }
      .mresto-meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .mresto-meta-item svg { color: var(--primary); }
      .mresto-meta-sep {
        width: 3px; height: 3px;
        background: var(--fg-soft);
        opacity: 0.5;
        border-radius: 50%;
      }

      /* Category nav rail */
      .mresto-catnav-wrap {
        position: sticky;
        top: calc(var(--safe-top) + 52px);
        z-index: 20;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        padding: 18px 0 6px;
        margin-top: 18px;
      }
      .mresto-catnav {
        display: flex;
        gap: 8px;
        padding: 0 14px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .mresto-catnav::-webkit-scrollbar { display: none; }
      .mresto-catpill {
        flex-shrink: 0;
        scroll-snap-align: start;
        padding: 8px 16px;
        border-radius: 999px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        color: var(--fg);
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .2s;
      }
      .mresto-catpill:active { transform: scale(0.94); }
      .mresto-catpill.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(255,87,34,0.3);
      }

      /* Menu sections */
      .mresto-sections { padding: 18px 14px 32px; }
      .mresto-section { margin-bottom: 28px; scroll-margin-top: 110px; }
      .mresto-section-title {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 18px;
        letter-spacing: -0.01em;
        margin: 0 0 12px;
        color: var(--fg);
      }
      .mresto-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .mresto-item {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        transition: transform .15s, box-shadow .2s;
      }
      .mresto-item:active { transform: scale(0.99); }
      .mresto-item-body { flex: 1; min-width: 0; }
      .mresto-item-head {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;
      }
      .mresto-item h3 {
        font-family: Montserrat, sans-serif;
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.005em;
        margin: 0;
        color: var(--fg);
        flex: 1;
      }
      .mresto-item-fav {
        background: none;
        border: 0;
        padding: 0;
        cursor: pointer;
        flex-shrink: 0;
      }
      .mresto-item-desc {
        font-size: 12.5px;
        color: var(--fg-soft);
        line-height: 1.4;
        margin: 0 0 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mresto-item-price {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15px;
        color: var(--primary);
        font-variant-numeric: tabular-nums;
      }
      .mresto-item-action {
        position: relative;
        width: 96px;
        flex-shrink: 0;
      }
      .mresto-item-img {
        width: 96px;
        height: 96px;
        object-fit: cover;
        border-radius: 14px;
        background: var(--bg);
      }
      .mresto-item-img.placeholder {
        display: grid;
        place-items: center;
        font-size: 44px;
        opacity: 0.5;
        background: linear-gradient(135deg, rgba(255,138,101,0.10), rgba(255,87,34,0.06));
      }
      .mresto-add-btn {
        position: absolute;
        right: 6px;
        bottom: 6px;
        width: 36px; height: 36px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        border: 2.5px solid var(--surface);
        display: grid; place-items: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(255,87,34,0.4);
        transition: transform .15s;
      }
      .mresto-add-btn:active { transform: scale(0.88); }
      .mresto-qty {
        position: absolute;
        right: 4px;
        bottom: 4px;
        display: flex;
        align-items: center;
        background: var(--primary);
        border-radius: 22px;
        padding: 2px;
        box-shadow: 0 4px 12px rgba(255,87,34,0.4);
        border: 2.5px solid var(--surface);
      }
      .mresto-qty button {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: transparent;
        color: white;
        border: 0;
        display: grid; place-items: center;
        cursor: pointer;
      }
      .mresto-qty button:active { transform: scale(0.88); }
      .mresto-qty span {
        color: white;
        font-weight: 800;
        min-width: 16px;
        text-align: center;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }

      .mresto-empty {
        text-align: center;
        padding: 48px 24px;
      }
      .mresto-empty h3 {
        font-family: Montserrat;
        font-weight: 800;
        font-size: 16px;
        margin: 12px 0 6px;
      }
      .mresto-empty p {
        font-size: 13px;
        color: var(--fg-soft);
      }
      .mresto-empty-mini {
        text-align: center;
        padding: 24px;
        font-size: 13px;
        color: var(--fg-soft);
        background: var(--surface);
        border: 1px dashed var(--line);
        border-radius: 14px;
      }

      /* Sticky cart bar (sits above bottom tab bar) */
      .mresto-cartbar {
        position: fixed;
        left: 14px; right: 14px;
        bottom: calc(var(--tabbar-h) + var(--safe-bot) + 12px);
        z-index: 50;
        animation: cartbar-up 0.3s cubic-bezier(.16,1,.3,1);
      }
      @keyframes cartbar-up {
        from { transform: translateY(120%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .mresto-cartbtn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: linear-gradient(135deg, #FF5722, #FF8A65);
        color: white;
        border: 0;
        border-radius: 18px;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 12px 32px -6px rgba(255,87,34,0.55);
        transition: transform .15s;
      }
      .mresto-cartbtn:active { transform: scale(0.98); }
      .mresto-cartcount {
        background: rgba(255,255,255,0.25);
        border-radius: 10px;
        padding: 4px 9px;
        font-size: 13px;
        font-weight: 900;
        min-width: 24px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .mresto-cartlabel { flex: 1; text-align: left; font-size: 15px; }
      .mresto-carttotal {
        font-size: 15px;
        font-variant-numeric: tabular-nums;
      }
    `}</style>
  );
}

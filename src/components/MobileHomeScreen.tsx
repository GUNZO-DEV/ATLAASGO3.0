/**
 * Premium mobile home screen — the entire mobile landing experience.
 * Feels like a top-tier food delivery app (Talabat, Uber Eats, DoorDash).
 *
 * Composition:
 *   1. Greeting + location pill
 *   2. Search bar
 *   3. Hero card with primary CTA
 *   4. Category tiles (Food, Sweets, Coffee, Groceries)
 *   5. Local Legends horizontal scroll
 *   6. "How it works" mini section
 *   7. Become a partner CTA
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { RESTAURANTS } from '../data/restaurants';

const CATEGORIES = [
  { label: 'Restaurants', emoji: '🥘', to: '/order',                  hue: '#FF5722' },
  { label: 'Sweets',      emoji: '🍰', to: '/order?cat=Sweets',       hue: '#EC4899' },
  { label: 'Coffee',      emoji: '☕', to: '/order?cat=Cafés',        hue: '#92400E' },
  { label: 'Campus',      emoji: '🏫', to: '/campus',                 hue: '#059669' },
];

const LEGEND_GRADIENTS = [
  'linear-gradient(135deg, #FF8A65, #FF5722)',
  'linear-gradient(135deg, #FBA74D, #C66B1F)',
  'linear-gradient(135deg, #6B5B47, #2A211C)',
  'linear-gradient(135deg, #FFB74D, #FF8A65)',
  'linear-gradient(135deg, #C2185B, #4A1B2C)',
  'linear-gradient(135deg, #34D399, #047857)',
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night?';
}

export default function MobileHomeScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const name = user?.email?.split('@')[0]?.split('.')[0];
  const displayName = name ? name.charAt(0).toUpperCase() + name.slice(1) : null;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="m-home">
      {/* ── Greeting bar (sticky on scroll) ───────────────── */}
      <header className={`m-top ${scrolled ? 'scrolled' : ''}`}>
        <div className="m-top-inner">
          <div className="m-greet">
            <div className="m-greet-hi">{greeting()}{displayName ? `,` : ''}</div>
            <div className="m-greet-name">{displayName ?? 'Welcome 👋'}</div>
          </div>
          <Link to="/addresses" className="m-loc-pill" aria-label="Change delivery address">
            <I.Pin size={12} />
            <span>Ifrane</span>
            <I.Arrow size={9} style={{ transform: 'rotate(90deg)', opacity: 0.5 }} />
          </Link>
        </div>
      </header>

      {/* ── Search bar ────────────────────────────────────── */}
      <Link to="/order" className="m-search">
        <I.Search size={16} />
        <span>Search restaurants, dishes…</span>
        <span className="m-search-kbd">⌘K</span>
      </Link>

      {/* ── Hero card with CTA ─────────────────────────────── */}
      <Link to="/order" className="m-hero-card">
        <div className="m-hero-card-bg" aria-hidden />
        <div className="m-hero-card-content">
          <div className="m-hero-pill">
            <I.Lightning size={10} /> {t('hero.eyebrow')}
          </div>
          <h1 className="m-hero-title">
            What are you<br />
            <span className="m-hero-accent">craving?</span>
          </h1>
          <p className="m-hero-sub">
            28+ Ifrane partners · Average 22 min
          </p>
          <span className="m-hero-cta">
            Browse menu <I.Arrow size={12} />
          </span>
        </div>
        <div className="m-hero-card-emoji" aria-hidden>🥘</div>
      </Link>

      {/* ── Category tiles (4-up grid) ─────────────────────── */}
      <div className="m-section-hd">
        <h2>Browse by category</h2>
      </div>
      <div className="m-cats">
        {CATEGORIES.map((c) => (
          <Link key={c.label} to={c.to} className="m-cat">
            <span
              className="m-cat-icon"
              style={{
                background: `linear-gradient(135deg, ${c.hue}22, ${c.hue}10)`,
                color: c.hue,
              }}
            >
              <span style={{ fontSize: 24 }}>{c.emoji}</span>
            </span>
            <span className="m-cat-label">{c.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Local Legends horizontal scroll ────────────────── */}
      <div className="m-section-hd">
        <div>
          <div className="m-section-eyebrow">
            <I.Star size={10} /> Local Legends
          </div>
          <h2>Loved by Ifrane</h2>
        </div>
        <Link to="/order" className="m-section-all">
          View all <I.Arrow size={12} />
        </Link>
      </div>
      <div className="m-rail">
        {RESTAURANTS.slice(0, 6).map((r, i) => (
          <Link key={r.slug} to={`/r/${r.slug}`} className="m-resto-card">
            <div
              className="m-resto-hero"
              style={{ background: LEGEND_GRADIENTS[i % LEGEND_GRADIENTS.length] }}
            >
              <span className="m-resto-tag">
                <I.Lightning size={9} /> {r.tag || 'Local Legend'}
              </span>
              <span className="m-resto-fav" aria-label="Save">
                <I.Heart size={13} />
              </span>
              <span className="m-resto-emoji">{r.emoji}</span>
            </div>
            <div className="m-resto-body">
              <div className="m-resto-name">{r.name}</div>
              <div className="m-resto-meta">
                <span className="m-resto-rating">
                  <I.Star size={10} /> {r.rating}
                </span>
                <span className="m-resto-dot" />
                <span>{r.timeMin} min</span>
                <span className="m-resto-dot" />
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Free delivery</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── How it works ──────────────────────────────────── */}
      <div className="m-section-hd">
        <h2>How AtlaasGo works</h2>
      </div>
      <div className="m-steps">
        <Step n={1} icon="🥘" title="Pick your craving" body="28+ local partners. Real photos, real menus, no ghost kitchens." />
        <Step n={2} icon="📍" title="Drop a pin" body="GPS + landmark. Your driver finds you exactly." />
        <Step n={3} icon="🏍" title="Track live" body="Six-stage timeline · ETA · in-app chat." />
      </div>

      {/* ── Become a partner CTA ──────────────────────────── */}
      <div className="m-section-hd">
        <h2>Be part of the Atlas</h2>
      </div>
      <div className="m-persona-rail">
        <PersonaCard
          to="/auth?mode=signup&role=rider"
          emoji="🏍"
          eyebrow="EARN"
          title="Drive with us"
          body="60–90 dh / hour · daily payouts"
          gradient="linear-gradient(135deg, #635BFF, #8E85FF)"
        />
        <PersonaCard
          to="/auth?mode=signup&role=merchant"
          emoji="🏪"
          eyebrow="PARTNER"
          title="List your restaurant"
          body="14-day trial · tablet POS included"
          gradient="linear-gradient(135deg, #059669, #34D399)"
        />
        <PersonaCard
          to="/prime"
          emoji="⚡"
          eyebrow="PRIME"
          title="Save 47 dh / week"
          body="Free delivery · priority dispatch"
          gradient="linear-gradient(135deg, #FF5722, #FFB74D)"
        />
      </div>

      {/* ── Tiny credit (footer is hidden on mobile) ──────── */}
      <div className="m-credit">
        AtlaasGo · Built in Ifrane <span>🏔</span>
        <div className="m-credit-small">
          <Link to="/order">Order</Link> ·
          <Link to="/prime"> Prime</Link> ·
          <Link to="/auth?mode=signup&role=rider"> Drive</Link>
        </div>
      </div>

      <PremiumMobileCSS />
    </div>
  );
}

function Step({ n, icon, title, body }: { n: number; icon: string; title: string; body: string }) {
  return (
    <div className="m-step">
      <div className="m-step-num">{String(n).padStart(2, '0')}</div>
      <div className="m-step-icon">{icon}</div>
      <div className="m-step-body">
        <div className="m-step-title">{title}</div>
        <div className="m-step-desc">{body}</div>
      </div>
    </div>
  );
}

function PersonaCard({
  to,
  emoji,
  eyebrow,
  title,
  body,
  gradient,
}: {
  to: string;
  emoji: string;
  eyebrow: string;
  title: string;
  body: string;
  gradient: string;
}) {
  return (
    <Link to={to} className="m-persona-card" style={{ background: gradient }}>
      <span className="m-persona-emoji">{emoji}</span>
      <span className="m-persona-eyebrow">{eyebrow}</span>
      <span className="m-persona-title">{title}</span>
      <span className="m-persona-body">{body}</span>
      <span className="m-persona-arrow">
        <I.Arrow size={12} />
      </span>
    </Link>
  );
}

/* All styles co-located so this file is fully self-contained. */
function PremiumMobileCSS() {
  return (
    <style>{`
      .m-home {
        padding: calc(var(--safe-top) + 8px) 0 20px;
        background: var(--bg);
        min-height: 100vh;
      }

      /* ── Sticky top with greeting + location ─────────────────── */
      .m-top {
        position: sticky;
        top: 0;
        z-index: 30;
        padding: 12px 18px 12px;
        transition: background .25s, box-shadow .25s, padding .25s;
      }
      .m-top.scrolled {
        background: color-mix(in srgb, var(--surface) 92%, transparent);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        box-shadow: 0 1px 0 var(--line);
      }
      .m-top-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .m-greet { line-height: 1.1; }
      .m-greet-hi {
        font-size: 12.5px;
        color: var(--fg-soft);
        font-weight: 600;
      }
      .m-greet-name {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 17px;
        color: var(--fg);
        margin-top: 1px;
        letter-spacing: -0.01em;
      }
      .m-loc-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        color: var(--fg);
        text-decoration: none;
        flex-shrink: 0;
      }
      .m-loc-pill svg:first-child { color: var(--primary); }

      /* ── Search bar ─────────────────────────────────────────── */
      .m-search {
        margin: 8px 18px 18px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        font-size: 14px;
        color: var(--fg-soft);
        text-decoration: none;
        transition: border-color .2s, transform .15s;
      }
      .m-search:active { transform: scale(0.99); }
      .m-search svg { color: var(--primary); flex-shrink: 0; }
      .m-search span { flex: 1; }
      .m-search-kbd {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(0,0,0,0.06);
        border-radius: 5px;
        color: var(--fg-soft);
      }

      /* ── Hero CTA card ──────────────────────────────────────── */
      .m-hero-card {
        position: relative;
        display: block;
        margin: 0 18px 24px;
        padding: 22px;
        border-radius: 24px;
        background: linear-gradient(135deg, #FF5722 0%, #FF8A65 60%, #FFB74D 100%);
        color: white;
        overflow: hidden;
        text-decoration: none;
        box-shadow: 0 16px 36px -10px rgba(255, 87, 34, 0.45);
        transition: transform .2s;
      }
      .m-hero-card:active { transform: scale(0.98); }
      .m-hero-card-bg {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 80% 0%, rgba(255,255,255,0.22), transparent 50%),
          radial-gradient(circle at 0% 100%, rgba(0,0,0,0.18), transparent 50%);
        pointer-events: none;
      }
      .m-hero-card-content { position: relative; max-width: 70%; }
      .m-hero-pill {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px;
        background: rgba(255,255,255,0.22);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .m-hero-title {
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 28px;
        line-height: 1.05;
        letter-spacing: -0.02em;
        margin: 0 0 6px;
        color: white;
      }
      .m-hero-accent {
        background: linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.7));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .m-hero-sub {
        font-size: 12.5px;
        margin: 0 0 14px;
        opacity: 0.88;
        line-height: 1.45;
      }
      .m-hero-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        background: white;
        color: var(--primary);
        font-weight: 800;
        font-size: 13px;
        border-radius: 999px;
        box-shadow: 0 6px 14px rgba(0,0,0,0.18);
      }
      .m-hero-card-emoji {
        position: absolute;
        right: -10px;
        bottom: -16px;
        font-size: 130px;
        line-height: 1;
        opacity: 0.18;
        filter: drop-shadow(0 8px 24px rgba(0,0,0,0.2));
        transform: rotate(-12deg);
      }

      /* ── Section headers ────────────────────────────────────── */
      .m-section-hd {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding: 6px 18px 14px;
      }
      .m-section-hd h2 {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 19px;
        letter-spacing: -0.015em;
        margin: 0;
        color: var(--fg);
        line-height: 1.15;
      }
      .m-section-eyebrow {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--primary);
        margin-bottom: 4px;
      }
      .m-section-all {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12.5px;
        font-weight: 700;
        color: var(--primary);
        text-decoration: none;
        padding: 4px 0;
      }

      /* ── Category tiles ─────────────────────────────────────── */
      .m-cats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 0 18px 24px;
      }
      .m-cat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px 4px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        text-decoration: none;
        transition: transform .15s, border-color .2s;
      }
      .m-cat:active { transform: scale(0.95); }
      .m-cat-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: grid;
        place-items: center;
      }
      .m-cat-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--fg);
        letter-spacing: -0.01em;
      }

      /* ── Restaurant horizontal rail ─────────────────────────── */
      .m-rail {
        display: flex;
        gap: 14px;
        padding: 0 18px 28px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .m-rail::-webkit-scrollbar { display: none; }
      .m-resto-card {
        flex: 0 0 78%;
        max-width: 280px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        text-decoration: none;
        scroll-snap-align: start;
        overflow: hidden;
        transition: transform .15s;
        box-shadow: 0 6px 20px -10px rgba(0,0,0,0.18);
      }
      .m-resto-card:active { transform: scale(0.98); }
      .m-resto-hero {
        position: relative;
        height: 130px;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 14px;
      }
      .m-resto-tag {
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
      .m-resto-fav {
        position: absolute;
        top: 12px; right: 12px;
        width: 32px; height: 32px;
        border-radius: 50%;
        background: rgba(255,255,255,0.95);
        color: var(--fg);
        display: grid; place-items: center;
        backdrop-filter: blur(6px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .m-resto-emoji {
        font-size: 56px;
        opacity: 0.85;
        line-height: 1;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
      }
      .m-resto-body {
        padding: 14px 16px 16px;
      }
      .m-resto-name {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15.5px;
        color: var(--fg);
        margin-bottom: 6px;
        letter-spacing: -0.01em;
      }
      .m-resto-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
        color: var(--fg-soft);
        font-weight: 600;
      }
      .m-resto-rating {
        display: inline-flex; align-items: center; gap: 3px;
        color: var(--fg);
        font-weight: 700;
      }
      .m-resto-rating svg { color: #F59E0B; }
      .m-resto-dot {
        width: 3px; height: 3px;
        background: var(--fg-soft);
        border-radius: 50%;
        opacity: 0.5;
      }

      /* ── How-it-works steps ─────────────────────────────────── */
      .m-steps {
        display: grid;
        gap: 10px;
        padding: 0 18px 24px;
      }
      .m-step {
        display: grid;
        grid-template-columns: auto auto 1fr;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
      }
      .m-step-num {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 600;
        font-size: 11px;
        color: var(--fg-soft);
        opacity: 0.6;
      }
      .m-step-icon {
        font-size: 28px;
        width: 48px; height: 48px;
        background: rgba(255,87,34,0.08);
        border-radius: 14px;
        display: grid; place-items: center;
      }
      .m-step-title {
        font-weight: 800;
        font-size: 14px;
        color: var(--fg);
      }
      .m-step-desc {
        font-size: 12px;
        color: var(--fg-soft);
        margin-top: 2px;
        line-height: 1.4;
      }

      /* ── Persona horizontal rail ────────────────────────────── */
      .m-persona-rail {
        display: flex;
        gap: 12px;
        padding: 0 18px 28px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }
      .m-persona-rail::-webkit-scrollbar { display: none; }
      .m-persona-card {
        position: relative;
        flex: 0 0 70%;
        max-width: 250px;
        padding: 20px 18px 22px;
        border-radius: 20px;
        color: white;
        text-decoration: none;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-height: 170px;
        overflow: hidden;
        box-shadow: 0 12px 28px -12px rgba(0,0,0,0.35);
        transition: transform .15s;
      }
      .m-persona-card:active { transform: scale(0.97); }
      .m-persona-emoji {
        position: absolute;
        right: -8px; top: -8px;
        font-size: 80px;
        opacity: 0.22;
        line-height: 1;
        transform: rotate(-8deg);
      }
      .m-persona-eyebrow {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
        opacity: 0.8;
      }
      .m-persona-title {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 17px;
        letter-spacing: -0.01em;
        line-height: 1.1;
        margin-bottom: 2px;
      }
      .m-persona-body {
        font-size: 12px;
        line-height: 1.4;
        opacity: 0.88;
        flex: 1;
      }
      .m-persona-arrow {
        align-self: flex-end;
        background: rgba(255,255,255,0.20);
        border-radius: 50%;
        width: 28px; height: 28px;
        display: grid; place-items: center;
      }

      /* ── Bottom credit ──────────────────────────────────────── */
      .m-credit {
        padding: 24px 18px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: var(--fg-soft);
        opacity: 0.7;
      }
      .m-credit span { font-size: 14px; }
      .m-credit-small {
        margin-top: 6px;
        font-size: 11px;
        opacity: 0.7;
      }
      .m-credit-small a {
        color: var(--fg-soft);
        text-decoration: none;
        font-weight: 600;
      }
    `}</style>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';
import { CUISINES, RESTAURANTS } from '../data/restaurants';

const LEGEND_GRADS = [
  'linear-gradient(135deg, #FF8A65 0%, #FF5722 100%)',
  'linear-gradient(135deg, #FBA74D 0%, #C66B1F 100%)',
  'linear-gradient(135deg, #6B5B47 0%, #2A211C 100%)',
  'linear-gradient(135deg, #FFB74D 0%, #FF8A65 100%)',
  'linear-gradient(135deg, #C2185B 0%, #4A1B2C 100%)',
  'linear-gradient(135deg, #34D399 0%, #047857 100%)',
];

export function LocalLegends() {
  const { t } = useI18n();
  return (
    <section className="bloc" id="partners">
      <div className="container">
        <div className="section-header">
          <div>
            <div className="section-tag">
              <I.Star size={11} /> {t('legends.tag')}
            </div>
            <h2 className="section-title">
              {t('legends.title.l1')}
              <br />
              {t('legends.title.l2')}
            </h2>
            <p className="section-sub">{t('legends.sub')}</p>
          </div>
          <Link className="section-link" to="/order">
            {t('legends.viewall')} <I.Arrow size={14} />
          </Link>
        </div>
      </div>
      <div className="container">
        <div className="legends-rail">
          {RESTAURANTS.slice(0, 6).map((r, i) => (
            <Link to={`/r/${r.slug}`} key={r.slug} className="legend-card">
              <div className="legend-img" style={{ background: LEGEND_GRADS[i % LEGEND_GRADS.length] }}>
                <span className="legend-badge">
                  <I.Lightning size={10} /> {r.tag || 'Local Legend'}
                </span>
                <span className="legend-verified" title="Verified partner">
                  <I.Check size={14} />
                </span>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    fontSize: 56,
                    opacity: 0.8,
                    lineHeight: 1,
                  }}
                >
                  {r.emoji}
                </div>
              </div>
              <div className="legend-body">
                <div className="legend-name">{r.name}</div>
                <div className="legend-cuisine">{r.cuisine}</div>
                <div className="legend-meta">
                  <span className="star">
                    <I.Star /> {r.rating}
                  </span>
                  <span className="dot" />
                  <span>
                    <I.Clock size={12} style={{ marginInlineEnd: 4, verticalAlign: -2 }} />
                    {r.timeMin} {t('common.minutes')}
                  </span>
                  <span className="dot" />
                  <span style={{ color: 'var(--primary)' }}>{t('common.delivery')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    {
      icon: <I.Search size={22} />,
      title: 'Discover & decide',
      desc: 'Browse 28+ Ifrane partners, filter by cuisine, dietary needs, or open-now. Real menus, real photos.',
    },
    {
      icon: <I.Lightning size={22} />,
      title: 'Tap, pay, relax',
      desc: 'Save addresses incl. dorm building & room. One-tap reorder. Apple Pay, card, wallet, or cash.',
    },
    {
      icon: <I.Bike size={22} />,
      title: 'Track to your door',
      desc: 'Live map, six-stage timeline, ETA powered by Atlas weather data. Chat with your rider in-app.',
    },
  ];
  return (
    <section className="bloc" style={{ background: 'var(--cream)' }}>
      <div className="container">
        <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="section-tag">
            <I.Clock size={11} /> {t('how.tag')}
          </div>
          <h2 className="section-title">
            {t('how.title.l1')}
            <br />
            {t('how.title.l2')}
          </h2>
        </div>
        <div className="how-grid">
          {steps.map((s, i) => (
            <div className="how-card" key={i}>
              <div className="how-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="how-icon">{s.icon}</div>
              <h3 className="how-title">{s.title}</h3>
              <p className="how-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Restaurants() {
  const { t } = useI18n();
  const [active, setActive] = useState<string>('All');
  const filtered = active === 'All' ? RESTAURANTS : RESTAURANTS.filter((r) => r.cats.includes(active));
  return (
    <section className="bloc" id="order">
      <div className="container">
        <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="section-tag">
            <I.Bag size={11} /> {t('restaurants.tag')}
          </div>
          <h2 className="section-title">
            {t('restaurants.title.l1')}
            <br />
            {t('restaurants.title.l2')}
          </h2>
          <p className="section-sub">{t('restaurants.sub')}</p>
        </div>

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

        <div className="resto-grid">
          {filtered.map((r) => (
            <Link to={`/r/${r.slug}`} key={r.slug} className="resto-card">
              <div className={`resto-img alt${r.imgVariant}`}>
                {r.tag && (
                  <span className={`resto-tag ${r.tag === 'Hot' || r.tag === 'Trending' ? 'hot' : ''}`}>
                    {r.tag}
                  </span>
                )}
                <button
                  className="resto-fav"
                  aria-label="Save"
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <I.Heart size={14} />
                </button>
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
                    {r.timeMin} {t('common.minutes')}
                  </span>
                  <span className="dot" />
                  <span style={{ color: r.feeDh === 'Free' ? 'var(--primary)' : 'inherit' }}>
                    {r.feeDh === 'Free' ? t('common.delivery') : `${r.feeDh} dh fee`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Tripersona() {
  const { t } = useI18n();
  return (
    <section className="bloc" id="business" style={{ background: 'var(--cream)' }}>
      <div className="container">
        <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="section-tag">
            <I.Shield size={11} /> {t('persona.tag')}
          </div>
          <h2 className="section-title">
            {t('persona.title.l1')}
            <br />
            {t('persona.title.l2')}
          </h2>
        </div>

        <div className="tri-grid">
          <div className="persona customer">
            <div className="persona-tag">
              <I.Bag size={11} /> For Customers
            </div>
            <h3>
              Order what you crave,
              <br />
              delivered hot.
            </h3>
            <p>Local kitchens, dorm drops, and Prime perks. Save 47 dh every week, on average.</p>
            <ul>
              <li>
                <I.Check size={14} /> 28+ verified local partners
              </li>
              <li>
                <I.Check size={14} /> Free delivery with Prime
              </li>
              <li>
                <I.Check size={14} /> Dorm Drop (Building + Room)
              </li>
              <li>
                <I.Check size={14} /> Apple Pay, wallet, or cash
              </li>
            </ul>
            <Link className="persona-cta" to="/order">
              Download the app <I.Arrow />
            </Link>
            <div className="persona-deco">A</div>
          </div>

          <div className="persona driver" id="riders">
            <div className="persona-tag">
              <I.Bike size={11} /> For Riders
            </div>
            <h3>
              Earn flexibly on
              <br />
              your schedule.
            </h3>
            <p>Drive when you want. Track earnings in real-time. Earn badges, climb the leaderboard.</p>
            <ul>
              <li>
                <I.Check size={14} /> 60–90 dh / hour average
              </li>
              <li>
                <I.Check size={14} /> Daily payout to wallet
              </li>
              <li>
                <I.Check size={14} /> SOS button & insurance
              </li>
              <li>
                <I.Check size={14} /> Performance bonuses
              </li>
            </ul>
            <Link className="persona-cta" to="/rider">
              Start riding <I.Arrow />
            </Link>
            <div className="persona-deco">G</div>
          </div>

          <div className="persona merchant">
            <div className="persona-tag">
              <I.Box size={11} /> For Merchants
            </div>
            <h3>
              A POS + delivery
              <br />
              that finally fits.
            </h3>
            <p>Tables, kitchen tickets, menus, analytics. Manage your whole restaurant from one tablet.</p>
            <ul>
              <li>
                <I.Check size={14} /> Tables, KDS, bill split
              </li>
              <li>
                <I.Check size={14} /> Offline-first sync
              </li>
              <li>
                <I.Check size={14} /> Real-time analytics
              </li>
              <li>
                <I.Check size={14} /> 0 setup fee · 14-day trial
              </li>
            </ul>
            <Link className="persona-cta" to="/merchant">
              Partner with us <I.Arrow />
            </Link>
            <div className="persona-deco">O</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PwaPhone() {
  return (
    <div
      style={{
        width: 200,
        height: 320,
        borderRadius: 30,
        background: 'linear-gradient(160deg, #2A211C, #0E0A07)',
        padding: 6,
        transform: 'rotate(8deg) translateY(-10px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.35), 0 14px 32px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 24,
          background: 'white',
          padding: '40px 16px 16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 60,
            height: 16,
            background: '#0E0A07',
            borderRadius: 10,
          }}
        />
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, color: '#1A1410', letterSpacing: '-0.02em' }}>
          Ready to order?
        </div>
        <div
          style={{
            marginTop: 16,
            padding: 10,
            background: '#FBF7F2',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#7A6F66',
            fontSize: 9,
          }}
        >
          <I.Search size={11} /> Search Ifrane…
        </div>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: 'linear-gradient(135deg, #FF5722, #C2185B)',
            borderRadius: 12,
            color: 'white',
          }}
        >
          <div style={{ fontSize: 8, opacity: 0.85, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Prime Offer
          </div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13, marginTop: 4, lineHeight: 1.1 }}>
            50% off your
            <br />
            first 5 orders
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, height: 50, borderRadius: 10, background: 'linear-gradient(135deg, #FFB74D, #FF8A65)' }} />
          <div style={{ flex: 1, height: 50, borderRadius: 10, background: 'linear-gradient(135deg, #6B5B47, #2A211C)' }} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, height: 50, borderRadius: 10, background: 'linear-gradient(135deg, #34D399, #059669)' }} />
          <div style={{ flex: 1, height: 50, borderRadius: 10, background: 'linear-gradient(135deg, #C2185B, #FF5722)' }} />
        </div>
      </div>
    </div>
  );
}

export function PWABanner() {
  const { t } = useI18n();
  return (
    <section className="edge-hero" id="download" aria-labelledby="edge-hero-title">
      {/* Full-bleed gradient backplate */}
      <div className="edge-hero-bg" aria-hidden />
      {/* Soft glow */}
      <div className="edge-hero-glow" aria-hidden />
      {/* Atlas mountain silhouette in the back — ties the bottom hero to the top */}
      <svg
        className="edge-hero-mountains"
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="edge-mnt-far" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="edge-mnt-near" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(26,20,16,0.55)" />
            <stop offset="1" stopColor="rgba(26,20,16,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0 240 L0 140 L120 90 L260 130 L420 70 L580 130 L760 80 L940 130 L1120 90 L1300 140 L1440 110 L1440 240 Z"
          fill="url(#edge-mnt-far)"
        />
        <path
          d="M0 240 L0 180 L160 130 L320 170 L480 110 L640 170 L820 120 L1000 180 L1180 130 L1320 180 L1440 150 L1440 240 Z"
          fill="url(#edge-mnt-near)"
        />
      </svg>
      {/* Floating sparkles */}
      <div className="edge-hero-sparkles" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 71) % 100}%`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>

      <div className="container edge-hero-grid">
        <div className="edge-hero-content">
          <span className="eyebrow edge-hero-eyebrow">
            <span className="eyebrow-dot" style={{ background: 'white', color: 'var(--primary)' }}>
              <I.Lightning size={11} />
            </span>
            <span>{t('pwa.eyebrow')}</span>
          </span>
          <h2 id="edge-hero-title" className="edge-hero-title">
            {t('pwa.title.l1')}
            <br />
            <span className="edge-hero-title-accent">{t('pwa.title.l2')}</span>
          </h2>
          <p className="edge-hero-lead">{t('pwa.lead')}</p>
          <div className="edge-hero-buttons">
            <a className="edge-hero-btn" href="#ios">
              <I.Apple size={28} />
              <div>
                <span className="edge-hero-btn-sub">Add to iOS</span>
                <span className="edge-hero-btn-big">Home Screen</span>
              </div>
            </a>
            <a className="edge-hero-btn" href="#android">
              <I.Android size={28} />
              <div>
                <span className="edge-hero-btn-sub">Install for</span>
                <span className="edge-hero-btn-big">Android</span>
              </div>
            </a>
          </div>
          <div className="edge-hero-meta">
            <span><I.Lightning size={12} /> 2-tap install · no App Store</span>
            <span className="dot" />
            <span><I.Shield size={12} /> Works offline</span>
            <span className="dot" />
            <span><I.Bike size={12} /> Live push tracking</span>
          </div>
        </div>
        <div className="edge-hero-mock">
          <PwaPhone />
        </div>
      </div>
    </section>
  );
}

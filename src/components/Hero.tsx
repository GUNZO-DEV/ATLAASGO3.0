import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';
import PhoneMockup from './PhoneMockup';

type Pt = [number, number];

function MountainLayer({ depth, color, height = 240, points }: { depth: 'far' | 'mid' | 'near'; color: [string, string]; height?: number; points: Pt[] }) {
  const path =
    points.map((p, i) => (i === 0 ? `M0 ${height} L${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ') +
    ` L1440 ${height} Z`;
  return (
    <svg
      className={`mountain-layer m-${depth}`}
      viewBox={`0 0 1440 ${height}`}
      preserveAspectRatio="none"
      data-depth={depth}
    >
      <defs>
        <linearGradient id={`g-${depth}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color[0]} />
          <stop offset="1" stopColor={color[1]} />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#g-${depth})`} />
    </svg>
  );
}

export default function Hero() {
  const [svc, setSvc] = useState<'food' | 'services'>('food');
  const stageRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e: MouseEvent) => {
      if (!phoneRef.current) return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      const ry = -14 + x * 8;
      const rx = 8 - y * 6;
      phoneRef.current.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(-2deg) translateZ(0)`;
    };
    const onLeave = () => {
      if (phoneRef.current) phoneRef.current.style.transform = '';
    };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);
    return () => {
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    let raf: number | null = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        document.querySelectorAll<HTMLElement>('.mountain-layer').forEach((el) => {
          const depth = el.dataset.depth;
          const d = depth === 'far' ? 0.15 : depth === 'mid' ? 0.3 : 0.45;
          el.style.transform = `translate3d(0, ${y * d}px, 0)`;
        });
        if (sunRef.current) sunRef.current.style.transform = `translate3d(0, ${y * 0.55}px, 0)`;
        raf = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="hero" id="top">
      <div className="hero-bg">
        <div className="hero-sky" />
        <div className="hero-sun" ref={sunRef} />
        <MountainLayer
          depth="far"
          color={['#FF8A65', '#C2185B']}
          height={300}
          points={[[0, 300], [120, 180], [280, 210], [440, 140], [620, 200], [800, 150], [980, 210], [1180, 160], [1320, 200], [1440, 170]]}
        />
        <MountainLayer
          depth="mid"
          color={['#8B4A2F', '#3A241B']}
          height={260}
          points={[[0, 260], [100, 200], [260, 150], [420, 210], [580, 130], [760, 200], [940, 140], [1120, 210], [1280, 160], [1440, 220]]}
        />
        <MountainLayer
          depth="near"
          color={['#2A1F18', '#0E0A07']}
          height={200}
          points={[[0, 200], [160, 120], [340, 170], [540, 100], [720, 160], [920, 90], [1120, 170], [1300, 120], [1440, 150]]}
        />
        <div className="pattern-overlay" />
      </div>

      <div className="container hero-grid">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot">
              <I.Lightning size={11} />
            </span>
            <span>{t('hero.eyebrow')}</span>
          </span>

          <h1>
            {t('hero.title.l1')}
            <br />
            {t('hero.title.l2')} <span className="accent">{t('hero.title.accent')}</span>
          </h1>

          <p className="lead">{t('hero.lead')}</p>

          <div className="svc-toggle" data-svc={svc}>
            <button className={svc === 'food' ? 'active' : ''} onClick={() => setSvc('food')}>
              <I.Bag size={14} /> {t('hero.toggle.food')}
            </button>
            <button className={svc === 'services' ? 'active' : ''} onClick={() => setSvc('services')}>
              <I.Box size={14} /> {t('hero.toggle.services')}
            </button>
          </div>

          <div className="cta-row">
            <Link to="/order" className="btn btn-primary btn-lg">
              {t('hero.cta.primary')} <I.Arrow />
            </Link>
            <Link to="/order?campus=1" className="btn btn-outline btn-lg">
              {t('hero.cta.secondary')}
            </Link>
          </div>

          <div className="trust-row">
            <div className="trust-stat">
              <div className="num">
                28<span className="plus">+</span>
              </div>
              <div className="lbl">{t('hero.trust.partners')}</div>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <div className="num">
                22<span style={{ fontSize: 16, color: 'var(--muted)' }}>{t('common.minutes')}</span>
              </div>
              <div className="lbl">{t('hero.trust.eta')}</div>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatars">
                <div />
                <div />
                <div />
                <div>2k</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 18, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  4.9 <I.Star />
                </div>
                <div className="lbl">{t('hero.trust.students')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-stage" ref={stageRef}>
          <PhoneMockup phoneRef={phoneRef} />

          <div className="float-card fc-1">
            <div className="fc-icon green">
              <I.Check size={18} />
            </div>
            <div>
              <div className="fc-label">Order Delivered</div>
              <div className="fc-value">Café Hassan · 2 min ago</div>
            </div>
          </div>

          <div className="float-card fc-2">
            <div className="fc-icon orange">
              <I.Bike size={18} />
            </div>
            <div>
              <div className="fc-label">Rider en route</div>
              <div className="fc-value">Youssef · 6 min away</div>
            </div>
          </div>

          <div className="float-card fc-3">
            <div className="fc-icon blue">
              <I.Pin size={16} />
            </div>
            <div>
              <div className="fc-label">Dorm Drop</div>
              <div className="fc-value">Building 16 · Room 204</div>
            </div>
          </div>

          <div className="float-card fc-4">
            <div className="fc-icon purple">
              <I.Wallet size={16} />
            </div>
            <div>
              <div className="fc-label">Prime Savings</div>
              <div className="fc-value">47 dh this week</div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

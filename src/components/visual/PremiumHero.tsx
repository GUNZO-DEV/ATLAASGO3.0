import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as I from '../../icons/Icon';
import { useI18n } from '../../lib/i18n';
import { gsap, prefersReducedMotion } from '../../lib/motion';
import { WordReveal, FadeUp } from './ScrollReveal';
import Magnetic from './Magnetic';

// Lazy-load the WebGL canvas so the initial paint isn't blocked.
const HeroScene = lazy(() => import('./HeroScene'));

export default function PremiumHero() {
  const { t } = useI18n();
  const [svc, setSvc] = useState<'food' | 'services'>('food');
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    // Delay mounting the WebGL canvas until after the first idle tick so the
    // hero text + LCP land first.
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const id = ric
      ? ric(() => setSceneReady(true))
      : window.setTimeout(() => setSceneReady(true), 220);
    return () => {
      if (!ric) window.clearTimeout(id as number);
    };
  }, []);

  // Subtle copy "stagger" entry — counts up trust numbers.
  const numRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!numRef.current || prefersReducedMotion()) return;
    const targets = numRef.current.querySelectorAll<HTMLElement>('[data-num]');
    targets.forEach((el) => {
      const end = Number(el.dataset.num ?? '0');
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end,
        duration: 1.6,
        ease: 'power3.out',
        delay: 0.6,
        onUpdate: () => {
          el.textContent = Math.round(obj.v).toString();
        },
      });
    });
  }, []);

  return (
    <section className="premium-hero">
      {/* WebGL background canvas (lazy + fallback) */}
      <div className="premium-hero-canvas" aria-hidden>
        {sceneReady && (
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        )}
        {/* Always-on static fallback so the hero never goes empty before the
            canvas mounts and so reduced-motion still gets gradient mountains. */}
        <div className="premium-hero-fallback" />
      </div>

      {/* Vignette + grain on top of the canvas */}
      <div className="premium-hero-vignette" aria-hidden />
      <div className="premium-hero-grain" aria-hidden />

      <div className="container premium-hero-grid">
        <div>
          <FadeUp y={20}>
            <span className="eyebrow">
              <span className="eyebrow-dot">
                <I.Lightning size={11} />
              </span>
              <span>{t('hero.eyebrow')}</span>
            </span>
          </FadeUp>

          <h1 className="premium-hero-title">
            <WordReveal as="span" style={{ display: 'block' }}>
              {`${t('hero.title.l1')}`}
            </WordReveal>
            <WordReveal as="span" delay={0.05} style={{ display: 'block' }}>
              {`${t('hero.title.l2')} `}
            </WordReveal>
            <FadeUp y={28} delay={0.4}>
              <span className="premium-hero-accent">{t('hero.title.accent')}</span>
            </FadeUp>
          </h1>

          <FadeUp y={14} delay={0.2}>
            <p className="premium-hero-lead">{t('hero.lead')}</p>
          </FadeUp>

          <FadeUp y={14} delay={0.3}>
            <div className="svc-toggle" data-svc={svc} style={{ marginTop: 8 }}>
              <button className={svc === 'food' ? 'active' : ''} onClick={() => setSvc('food')}>
                <I.Bag size={14} /> {t('hero.toggle.food')}
              </button>
              <button
                className={svc === 'services' ? 'active' : ''}
                onClick={() => setSvc('services')}
              >
                <I.Box size={14} /> {t('hero.toggle.services')}
              </button>
            </div>
          </FadeUp>

          <FadeUp y={14} delay={0.35}>
            <div className="cta-row" style={{ marginTop: 18 }}>
              <Magnetic strength={18}>
                <Link to="/order" className="btn btn-primary btn-lg">
                  {t('hero.cta.primary')} <I.Arrow />
                </Link>
              </Magnetic>
              <Magnetic strength={12}>
                <Link to="/order?campus=1" className="btn btn-outline btn-lg">
                  {t('hero.cta.secondary')}
                </Link>
              </Magnetic>
            </div>
          </FadeUp>

          <FadeUp y={18} delay={0.5}>
            <div className="trust-row" ref={numRef}>
              <div className="trust-stat">
                <div className="num">
                  <span data-num="28">0</span>
                  <span className="plus">+</span>
                </div>
                <div className="lbl">{t('hero.trust.partners')}</div>
              </div>
              <div className="trust-divider" />
              <div className="trust-stat">
                <div className="num">
                  <span data-num="22">0</span>
                  <span style={{ fontSize: 16, color: 'var(--muted)' }}>
                    {t('common.minutes')}
                  </span>
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
                  <div
                    className="num"
                    style={{ fontSize: 18, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    4.9 <I.Star />
                  </div>
                  <div className="lbl">{t('hero.trust.students')}</div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
        <div className="premium-hero-right" aria-hidden />
      </div>

      {/* Scroll affordance */}
      <FadeUp y={10} delay={0.7}>
        <div className="premium-hero-scroll-hint">
          <span className="scroll-line" />
          <span>Scroll the story</span>
        </div>
      </FadeUp>
    </section>
  );
}

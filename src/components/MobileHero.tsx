/**
 * Mobile-first hero — replaces the heavy desktop hero with a tight,
 * thumb-friendly composition.
 *
 * Rendered only when window width ≤ 768px (decided in Hero.tsx).
 */
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';

export default function MobileHero() {
  const { t } = useI18n();

  return (
    <section
      className="mobile-hero"
      style={{
        position: 'relative',
        padding: 'calc(80px + env(safe-area-inset-top, 0px)) 18px 28px',
        background:
          'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(255,138,101,0.20), transparent 70%), linear-gradient(180deg, var(--bg) 0%, var(--cream) 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Atlas silhouette behind text */}
      <svg
        viewBox="0 0 390 120"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 120,
          opacity: 0.5,
        }}
      >
        <defs>
          <linearGradient id="m-near" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FF8A65" />
            <stop offset="1" stopColor="#C2185B" />
          </linearGradient>
        </defs>
        <path
          d="M0 120 L0 70 L60 30 L120 65 L180 20 L240 60 L300 25 L360 55 L390 35 L390 120 Z"
          fill="url(#m-near)"
        />
      </svg>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,87,34,0.10)',
            border: '1px solid rgba(255,87,34,0.20)',
            color: 'var(--primary)',
            padding: '5px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          <I.Lightning size={11} /> {t('hero.eyebrow')}
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(32px, 9vw, 42px)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            margin: '0 0 12px',
            color: 'var(--fg)',
          }}
        >
          {t('hero.title.l1')}
          <br />
          {t('hero.title.l2')}{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #FF5722, #FF8A65, #FFB74D)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {t('hero.title.accent')}
          </span>
        </h1>

        {/* Lead */}
        <p
          style={{
            color: 'var(--fg-soft)',
            fontSize: 14.5,
            lineHeight: 1.55,
            margin: '0 0 22px',
            maxWidth: 320,
          }}
        >
          {t('hero.lead')}
        </p>

        {/* Primary CTA — full width thumb-target */}
        <Link
          to="/order"
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '16px 22px',
            fontSize: 15,
            fontWeight: 800,
            borderRadius: 16,
            marginBottom: 10,
            boxShadow: '0 14px 30px -10px rgba(255,87,34,0.5)',
          }}
        >
          {t('hero.cta.primary')} <I.Arrow size={14} />
        </Link>

        {/* Secondary CTA — outlined */}
        <Link
          to="/order?campus=1"
          className="btn btn-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '14px 22px',
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 16,
          }}
        >
          🏫 {t('hero.cta.secondary')}
        </Link>

        {/* Trust band — compact */}
        <div
          style={{
            marginTop: 28,
            padding: '14px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto 1fr',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Stat num="28+" label={t('hero.trust.partners')} />
          <Divider />
          <Stat
            num={
              <>
                22<span style={{ fontSize: 12, color: 'var(--fg-soft)' }}>m</span>
              </>
            }
            label={t('hero.trust.eta')}
          />
          <Divider />
          <Stat
            num={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                4.9 <I.Star />
              </span>
            }
            label={t('hero.trust.students')}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ num, label }: { num: React.ReactNode; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'Montserrat',
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
          lineHeight: 1,
        }}
      >
        {num}
      </div>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: 'var(--fg-soft)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        height: 24,
        background: 'var(--line)',
      }}
    />
  );
}

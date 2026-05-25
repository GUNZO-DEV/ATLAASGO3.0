import { Link, useLocation } from 'react-router-dom';
import * as I from '../icons/Icon';

export default function NotFound() {
  const loc = useLocation();
  return (
    <section className="page">
      <div className="container" style={{ maxWidth: 540, padding: '60px 20px' }}>
        <div
          style={{
            textAlign: 'center',
            padding: '48px 32px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Atlas backdrop */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 30% 0%, rgba(255,138,101,0.10), transparent 60%), radial-gradient(circle at 80% 100%, rgba(99,91,255,0.06), transparent 50%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: 84,
                lineHeight: 1,
                marginBottom: 6,
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.18))',
              }}
            >
              🏔
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                color: 'var(--fg-soft)',
                letterSpacing: '0.12em',
                marginBottom: 14,
              }}
            >
              ERROR · 404 · LOST IN THE ATLAS
            </div>
            <h1
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 900,
                fontSize: 'clamp(28px, 5vw, 40px)',
                margin: '0 0 12px',
                lineHeight: 1.1,
              }}
            >
              This trail{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                doesn't go anywhere
              </span>
            </h1>
            <p
              style={{
                color: 'var(--fg-soft)',
                margin: '0 0 8px',
                lineHeight: 1.55,
                fontSize: 15,
              }}
            >
              The page <code style={{
                background: 'rgba(0,0,0,0.04)',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
              }}>{loc.pathname}</code> doesn't exist (or wandered off the map).
            </p>
            <p style={{ color: 'var(--fg-soft)', margin: '0 0 28px', fontSize: 13 }}>
              Let's get you back to somewhere useful.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
              <Link to="/" className="btn btn-primary btn-lg">
                Back to home <I.Arrow />
              </Link>
              <Link to="/order" className="btn btn-outline">
                Browse restaurants
              </Link>
              <Link to="/orders" className="btn btn-outline" style={{ borderColor: 'transparent' }}>
                Your orders
              </Link>
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 22,
                borderTop: '1px solid var(--line)',
                fontSize: 12,
                color: 'var(--fg-soft)',
                lineHeight: 1.5,
              }}
            >
              Something broken? Email{' '}
              <a href="mailto:support@atlaasgo.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                support@atlaasgo.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

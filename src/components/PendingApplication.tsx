/**
 * Friendly "your application is under review" screen, shown when an
 * authenticated user lacks the role but has a submitted application.
 *
 * Used by RoleGate when redirecting would be confusing — instead of
 * dumping the user back at "/", explain what's happening.
 */
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';
import type { UserApplication, ApplicationKind } from '../lib/applications';

const COPY: Record<
  ApplicationKind,
  {
    emoji: string;
    title: string;
    sub: string;
    eta: string;
    perks: string[];
    gradient: string;
  }
> = {
  rider: {
    emoji: '🏍',
    title: 'Your rider application is in review',
    sub: 'Our operations team is verifying your details. Most applications are decided within 48 hours.',
    eta: '48 hours',
    perks: [
      'Daily payouts straight to your wallet',
      'Performance bonuses (50-trip badge = +200 dh)',
      'SOS support · 24/7',
    ],
    gradient: 'linear-gradient(135deg, #635BFF, #8E85FF)',
  },
  merchant: {
    emoji: '🏪',
    title: 'Your partner application is in review',
    sub: "Our partnerships team is reviewing your business. We'll reach out by phone within 24 hours.",
    eta: '24 hours',
    perks: [
      'Tablet + POS shipped to you',
      '14-day free trial · no setup fees',
      'Real-time kitchen display + analytics',
    ],
    gradient: 'linear-gradient(135deg, #059669, #34D399)',
  },
};

export function PendingApplication({
  application,
}: {
  application: UserApplication;
}) {
  const copy = COPY[application.kind];
  const submittedAt = new Date(application.created_at);
  const ageHours = Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60));
  const status = application.status;

  // If application was rejected or needs info, show different copy
  if (status === 'rejected') {
    return (
      <section className="page">
        <div className="container" style={{ maxWidth: 560, padding: '40px 20px' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '40px 32px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 24,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, margin: '0 0 8px' }}>
              Your application wasn't approved this time
            </h2>
            <p style={{ color: 'var(--fg-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {application.reviewer_notes ??
                'Our team reviewed your application but couldn\'t move forward right now.'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
              Questions? Email{' '}
              <a href="mailto:support@atlaasgo.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                support@atlaasgo.com
              </a>
            </p>
            <Link to="/" className="btn btn-primary btn-lg" style={{ marginTop: 22 }}>
              Back home <I.Arrow />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'needs_info') {
    return (
      <section className="page">
        <div className="container" style={{ maxWidth: 560, padding: '40px 20px' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '40px 32px',
              background: 'var(--surface)',
              border: '1px solid rgba(245,158,11,0.30)',
              borderRadius: 24,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, margin: '0 0 8px' }}>
              We need more info
            </h2>
            <p style={{ color: 'var(--fg-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {application.reviewer_notes ??
                'Our team needs a few more details before we can approve your application.'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
              Reply to the email we sent, or contact{' '}
              <a href="mailto:support@atlaasgo.com" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                support@atlaasgo.com
              </a>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="container" style={{ maxWidth: 640, padding: '40px 20px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          {/* Hero with role emoji */}
          <div
            style={{
              background: copy.gradient,
              padding: '36px 20px',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: 72,
                lineHeight: 1,
                filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.2))',
                marginBottom: 8,
              }}
            >
              {copy.emoji}
            </div>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.20)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {status === 'reviewing' ? 'In review' : 'Submitted'}
            </div>
          </div>

          <div style={{ padding: '28px 30px 32px' }}>
            <h2
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 24,
                margin: '0 0 10px',
                lineHeight: 1.2,
              }}
            >
              {copy.title}
            </h2>
            <p style={{ color: 'var(--fg-soft)', margin: '0 0 18px', lineHeight: 1.5 }}>
              {copy.sub}
            </p>

            <div
              style={{
                background: 'rgba(255,87,34,0.06)',
                border: '1px solid rgba(255,87,34,0.18)',
                borderRadius: 14,
                padding: '14px 16px',
                margin: '0 0 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <I.Clock size={18} style={{ color: 'var(--primary)' }} />
              <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                <strong>Submitted {ageHours < 1 ? 'just now' : `${ageHours}h ago`}</strong>
                {' · '}
                <span style={{ color: 'var(--fg-soft)' }}>
                  Typical decision within {copy.eta}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--fg-soft)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              What you'll unlock
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px', display: 'grid', gap: 10 }}>
              {copy.perks.map((p) => (
                <li key={p} style={{ display: 'flex', gap: 10, fontSize: 14 }}>
                  <I.Check size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/order" className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                Browse food while you wait <I.Arrow />
              </Link>
              <Link to="/account" className="btn btn-outline btn-lg">
                Account
              </Link>
            </div>

            <p
              style={{
                fontSize: 12,
                color: 'var(--fg-soft)',
                textAlign: 'center',
                marginTop: 20,
                lineHeight: 1.5,
              }}
            >
              We'll send you an email and an in-app notification as soon as your application is approved.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

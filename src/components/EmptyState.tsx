/**
 * Branded empty state — used by Orders, Favorites, Notifications, Addresses,
 * Wallet history, Admin filters, etc. Standardizes the "nothing here yet" UX.
 */
import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';

type Props = {
  /** Big emoji at top */
  emoji?: string;
  /** Headline */
  title: string;
  /** One-line explainer */
  body?: string;
  /** Primary action */
  action?: { label: string; to: string };
  /** Secondary tone */
  variant?: 'default' | 'success' | 'subtle';
};

export default function EmptyState({ emoji = '🌿', title, body, action, variant = 'default' }: Props) {
  const tones = {
    default: {
      bg: 'var(--surface)',
      border: '1px solid var(--line)',
    },
    success: {
      bg: 'linear-gradient(135deg, rgba(5,150,105,0.06), rgba(52,211,153,0.04))',
      border: '1px solid rgba(5,150,105,0.20)',
    },
    subtle: {
      bg: 'transparent',
      border: '1px dashed var(--line)',
    },
  };
  const tone = tones[variant];

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '44px 28px',
        background: tone.bg,
        border: tone.border,
        borderRadius: 22,
        margin: '0 auto',
        maxWidth: 480,
      }}
    >
      <div
        style={{
          fontSize: 56,
          marginBottom: 12,
          filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.08))',
        }}
      >
        {emoji}
      </div>
      <h3
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 800,
          fontSize: 19,
          margin: '0 0 8px',
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      {body && (
        <p style={{ color: 'var(--fg-soft)', margin: '0 0 22px', fontSize: 14, lineHeight: 1.5 }}>
          {body}
        </p>
      )}
      {action && (
        <Link
          to={action.to}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 22px',
            background: 'var(--primary)',
            color: 'white',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 8px 20px -6px rgba(255,87,34,0.45)',
          }}
        >
          {action.label} <I.Arrow size={13} />
        </Link>
      )}
    </div>
  );
}

/**
 * Compact skeleton row — used in lists (Orders, Notifications).
 * Already styled via .skeleton-shimmer in global.css.
 */
export function SkeletonRow({ height = 64 }: { height?: number }) {
  return <div className="skeleton-shimmer" style={{ height, borderRadius: 14 }} />;
}

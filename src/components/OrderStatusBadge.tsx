/**
 * Premium status pill used in Track, Orders, Account, Admin, etc.
 * Color-coded, animated pulse for in-progress states, branded gradients.
 */
import type { OrderStatus } from '../lib/database.types';

type Variant = 'pill' | 'solid' | 'mini';

const META: Record<
  OrderStatus,
  { label: string; emoji: string; color: string; bg: string; pulse: boolean }
> = {
  ordered: {
    label: 'Order placed',
    emoji: '📝',
    color: '#4F46E5',
    bg: 'rgba(99,91,255,0.10)',
    pulse: true,
  },
  preparing: {
    label: 'Preparing',
    emoji: '🍳',
    color: '#B45309',
    bg: 'rgba(245,158,11,0.10)',
    pulse: true,
  },
  enRoute: {
    label: 'Driver en route',
    emoji: '🏍',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.10)',
    pulse: true,
  },
  outForDelivery: {
    label: 'Out for delivery',
    emoji: '🛵',
    color: '#FF5722',
    bg: 'rgba(255,87,34,0.12)',
    pulse: true,
  },
  arriving: {
    label: 'Arriving',
    emoji: '📍',
    color: '#FF5722',
    bg: 'rgba(255,87,34,0.18)',
    pulse: true,
  },
  delivered: {
    label: 'Delivered',
    emoji: '✓',
    color: '#059669',
    bg: 'rgba(5,150,105,0.12)',
    pulse: false,
  },
  cancelled: {
    label: 'Cancelled',
    emoji: '✕',
    color: '#B91C1C',
    bg: 'rgba(239,68,68,0.10)',
    pulse: false,
  },
};

export default function OrderStatusBadge({
  status,
  variant = 'pill',
  showEmoji = true,
}: {
  status: OrderStatus;
  variant?: Variant;
  showEmoji?: boolean;
}) {
  const m = META[status];
  if (!m) return null;

  if (variant === 'mini') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          width: 'fit-content',
          padding: '2px 8px',
          borderRadius: 999,
          background: m.bg,
          color: m.color,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          position: 'relative',
        }}
      >
        {m.pulse && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: m.color,
              animation: 'osb-pulse 1.6s ease-out infinite',
            }}
          />
        )}
        {m.label}
        <style>{pulseCss}</style>
      </span>
    );
  }

  if (variant === 'solid') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 999,
          background: m.color,
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          boxShadow: `0 6px 16px ${m.bg}`,
        }}
      >
        {showEmoji && <span style={{ fontSize: 13 }}>{m.emoji}</span>}
        {m.label}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: m.bg,
        color: m.color,
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        position: 'relative',
      }}
    >
      {m.pulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: m.color,
            animation: 'osb-pulse 1.6s ease-out infinite',
            boxShadow: `0 0 0 0 ${m.color}66`,
          }}
        />
      )}
      {showEmoji && !m.pulse && <span style={{ fontSize: 12 }}>{m.emoji}</span>}
      {m.label}
      <style>{pulseCss}</style>
    </span>
  );
}

const pulseCss = `
  @keyframes osb-pulse {
    0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
    70%  { box-shadow: 0 0 0 6px transparent; opacity: 0.7; }
    100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
  }
`;

export { META as ORDER_STATUS_META };

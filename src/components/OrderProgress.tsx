/**
 * Premium horizontal stepper for the order workflow.
 * Animated fill, pulsing current step, condensed labels under each node.
 *
 *   ●──────●──────◐──────○──────○
 *   Placed Prep   En route OFD   Delivered
 */
import type { OrderStatus } from '../lib/database.types';

const STAGES: { key: OrderStatus; short: string; long: string; emoji: string }[] = [
  { key: 'ordered',        short: 'Placed',   long: 'Order placed',     emoji: '📝' },
  { key: 'preparing',      short: 'Cooking',  long: 'Preparing',        emoji: '🍳' },
  { key: 'enRoute',        short: 'En route', long: 'Driver en route',  emoji: '🏍' },
  { key: 'outForDelivery', short: 'Pickup',   long: 'Out for delivery', emoji: '🛵' },
  { key: 'arriving',       short: 'Arriving', long: 'Arriving',         emoji: '📍' },
  { key: 'delivered',      short: 'Done',     long: 'Delivered',        emoji: '✓' },
];

export default function OrderProgress({
  status,
  compact = false,
}: {
  status: OrderStatus | undefined;
  compact?: boolean;
}) {
  const idx = status === 'cancelled' ? -1 : STAGES.findIndex((s) => s.key === status);
  const fillPct = idx < 0 ? 0 : (idx / (STAGES.length - 1)) * 100;
  const cancelled = status === 'cancelled';

  return (
    <div className="order-progress" style={{ position: 'relative', padding: '24px 12px 8px' }}>
      {/* Rail */}
      <div
        style={{
          position: 'absolute',
          left: 28,
          right: 28,
          top: 38,
          height: 4,
          borderRadius: 2,
          background: 'var(--line)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: cancelled ? '100%' : `${fillPct}%`,
            background: cancelled
              ? 'linear-gradient(90deg, #B91C1C, #EF4444)'
              : 'linear-gradient(90deg, #FF5722, #FF8A65)',
            borderRadius: 2,
            transition: 'width .6s cubic-bezier(.16,1,.3,1)',
            boxShadow: cancelled ? 'none' : '0 0 12px rgba(255,87,34,0.4)',
          }}
        />
      </div>

      {/* Nodes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {STAGES.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          const future = i > idx;

          return (
            <div
              key={s.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                width: compact ? 48 : 64,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: cancelled ? 28 : current ? 32 : 28,
                  height: cancelled ? 28 : current ? 32 : 28,
                  borderRadius: '50%',
                  background: cancelled
                    ? '#B91C1C'
                    : done
                      ? '#FF5722'
                      : current
                        ? '#FF5722'
                        : 'var(--surface)',
                  border: cancelled
                    ? '2px solid #B91C1C'
                    : done || current
                      ? '2px solid #FF5722'
                      : '2px solid var(--line)',
                  color: cancelled || done || current ? 'white' : 'var(--fg-soft)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: current ? 14 : 12,
                  fontWeight: 700,
                  position: 'relative',
                  boxShadow: current
                    ? '0 0 0 6px rgba(255,87,34,0.18), 0 8px 16px rgba(255,87,34,0.24)'
                    : done
                      ? '0 4px 8px rgba(255,87,34,0.16)'
                      : 'none',
                  transition: 'all .35s cubic-bezier(.16,1,.3,1)',
                  zIndex: 1,
                }}
              >
                {done ? '✓' : current ? s.emoji : future ? '' : '✕'}
                {current && !cancelled && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      border: '2px solid #FF5722',
                      animation: 'progress-pulse 1.8s ease-out infinite',
                    }}
                  />
                )}
              </div>
              {!compact && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: current ? 700 : 600,
                    color: cancelled
                      ? '#B91C1C'
                      : current
                        ? 'var(--primary)'
                        : done
                          ? 'var(--fg)'
                          : 'var(--fg-soft)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    transition: 'color .3s',
                  }}
                >
                  {s.short}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes progress-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export { STAGES as ORDER_STAGES };

/**
 * Big premium hero for the Track page — contextual headline + sub-copy +
 * gradient backdrop that shifts with the order stage.
 */
import * as I from '../icons/Icon';
import type { OrderStatus } from '../lib/database.types';

type StageMeta = {
  headline: string;
  sub: string;
  emoji: string;
  gradient: string;
  etaLabel: string;
};

function meta(status: OrderStatus | undefined, etaMin: number): StageMeta {
  switch (status) {
    case 'ordered':
      return {
        headline: 'Order received',
        sub: "We're sending it to the kitchen right now.",
        emoji: '📝',
        gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        etaLabel: `arriving in ~${etaMin} min`,
      };
    case 'preparing':
      return {
        headline: 'In the kitchen',
        sub: 'Your dishes are being plated with care.',
        emoji: '🍳',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
        etaLabel: `arriving in ~${etaMin} min`,
      };
    case 'enRoute':
      return {
        headline: 'Driver picking up',
        sub: 'Your rider just left for the restaurant.',
        emoji: '🏍',
        gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
        etaLabel: `arriving in ~${etaMin} min`,
      };
    case 'outForDelivery':
      return {
        headline: 'On the way to you',
        sub: 'Sit tight — the Atlas is being crossed.',
        emoji: '🛵',
        gradient: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
        etaLabel: `arriving in ~${etaMin} min`,
      };
    case 'arriving':
      return {
        headline: 'Almost there!',
        sub: 'Your driver is 1–2 minutes from your door.',
        emoji: '📍',
        gradient: 'linear-gradient(135deg, #FF5722 0%, #FFB74D 100%)',
        etaLabel: 'arriving now',
      };
    case 'delivered':
      return {
        headline: 'Delivered',
        sub: 'Enjoy your meal — bsahha!',
        emoji: '✓',
        gradient: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
        etaLabel: 'completed',
      };
    case 'cancelled':
      return {
        headline: 'Order cancelled',
        sub: 'This order was cancelled. No charge.',
        emoji: '✕',
        gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
        etaLabel: 'cancelled',
      };
    default:
      return {
        headline: 'Loading…',
        sub: 'Fetching your order',
        emoji: '⏳',
        gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
        etaLabel: '—',
      };
  }
}

export default function OrderStageHero({
  status,
  etaMin,
  orderId,
}: {
  status: OrderStatus | undefined;
  etaMin: number;
  orderId: string | undefined;
}) {
  const m = meta(status, etaMin);
  const showEtaNum = status && status !== 'delivered' && status !== 'cancelled';
  const code = (orderId ?? '—').slice(0, 8).toUpperCase();

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 24,
        padding: '32px 28px',
        background: m.gradient,
        color: 'white',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
      }}
    >
      {/* Backdrop sparkles */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 80% 0%, rgba(255,255,255,0.20), transparent 50%), radial-gradient(circle at 0% 100%, rgba(0,0,0,0.20), transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.18)',
              padding: '4px 10px',
              borderRadius: 999,
              marginBottom: 16,
            }}
          >
            <I.Bike size={11} /> Order #{code}
          </div>
          <h1
            style={{
              fontFamily: 'Montserrat',
              fontWeight: 900,
              fontSize: 'clamp(28px, 5vw, 40px)',
              lineHeight: 1.1,
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            {m.headline}
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              margin: 0,
              opacity: 0.92,
              maxWidth: 420,
            }}
          >
            {m.sub}
          </p>
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: 72,
              lineHeight: 1,
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.18))',
            }}
          >
            {m.emoji}
          </div>
          {showEtaNum && (
            <>
              <div
                style={{
                  fontFamily: 'Montserrat',
                  fontWeight: 900,
                  fontSize: 36,
                  marginTop: 4,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {etaMin}
                <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.7, marginLeft: 6 }}>
                  min
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  opacity: 0.85,
                }}
              >
                Estimated arrival
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

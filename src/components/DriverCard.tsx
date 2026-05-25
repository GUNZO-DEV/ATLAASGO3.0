/**
 * Premium driver/rider card with avatar, rating, vehicle, call + chat CTAs.
 * Three states: waiting-for-assignment, assigned-but-no-profile, fully loaded.
 */
import * as I from '../icons/Icon';

type Props = {
  rider?: {
    user_id: string;
    vehicle: string | null;
    plate: string | null;
    rating: number;
    total_trips: number;
  } | null;
  hasAssignment: boolean;
  phone?: string | null;
  onChat?: () => void;
};

export default function DriverCard({ rider, hasAssignment, phone, onChat }: Props) {
  // ── No assignment yet ───────────────────────────────────────────────
  if (!hasAssignment && !rider) {
    return (
      <div className="driver-card-pro driver-card-pending">
        <div className="driver-card-avatar pending">
          <span style={{ fontSize: 20 }}>🛵</span>
        </div>
        <div className="driver-card-info">
          <div className="driver-card-name">Looking for your driver…</div>
          <div className="driver-card-meta">
            We'll match you with the nearest rider in moments.
          </div>
        </div>
        <style>{baseCss}</style>
      </div>
    );
  }

  // ── Assignment exists but rider details still loading ──────────────
  if (!rider) {
    return (
      <div className="driver-card-pro driver-card-pending">
        <div className="driver-card-avatar pending">
          <div
            style={{
              width: 22,
              height: 22,
              border: '2.5px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'dc-spin .8s linear infinite',
            }}
          />
        </div>
        <div className="driver-card-info">
          <div className="driver-card-name">Connecting to your driver…</div>
          <div className="driver-card-meta">Loading rider profile</div>
        </div>
        <style>{baseCss}</style>
      </div>
    );
  }

  // ── Full driver card ───────────────────────────────────────────────
  const initial = (rider.user_id ?? 'A').substring(0, 1).toUpperCase();
  return (
    <div className="driver-card-pro">
      <div className="driver-card-glow" aria-hidden />
      <div className="driver-card-avatar">
        <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20 }}>
          {initial}
        </span>
        <span className="driver-card-online-dot" />
      </div>
      <div className="driver-card-info">
        <div className="driver-card-name">Your driver</div>
        <div className="driver-card-meta">
          {rider.vehicle && rider.plate ? (
            <>
              <span>{rider.vehicle}</span>
              <span className="dot" />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                {rider.plate}
              </span>
            </>
          ) : (
            <span>Driver info loading…</span>
          )}
        </div>
        <div className="driver-card-rating">
          <I.Star size={11} />
          <span style={{ fontWeight: 700 }}>{rider.rating.toFixed(1)}</span>
          <span className="dot" />
          <span>{rider.total_trips} trips</span>
        </div>
      </div>
      <div className="driver-card-actions">
        <button
          className="driver-card-btn chat"
          aria-label="Chat with driver"
          onClick={onChat}
        >
          <I.Chat size={16} />
        </button>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="driver-card-btn call"
            aria-label="Call driver"
          >
            <I.Phone size={16} />
          </a>
        ) : (
          <button className="driver-card-btn call" aria-label="Call driver" disabled>
            <I.Phone size={16} />
          </button>
        )}
      </div>
      <style>{baseCss}</style>
    </div>
  );
}

const baseCss = `
  .driver-card-pro {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
    transition: all .25s;
  }
  .driver-card-pro:not(.driver-card-pending):hover {
    border-color: rgba(255,87,34,0.30);
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(255,87,34,0.10);
  }
  .driver-card-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 0% 0%, rgba(255,138,101,0.10), transparent 50%);
    pointer-events: none;
  }
  .driver-card-avatar {
    position: relative;
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF5722, #FF8A65);
    color: white;
    display: grid; place-items: center;
    flex-shrink: 0;
    box-shadow: 0 6px 16px rgba(255,87,34,0.32);
  }
  .driver-card-avatar.pending {
    background: var(--line);
    color: var(--fg-soft);
    box-shadow: none;
  }
  .driver-card-online-dot {
    position: absolute;
    bottom: 2px; right: 2px;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #34D399;
    border: 2.5px solid var(--surface);
    box-shadow: 0 0 0 0 #34D39988;
    animation: dc-online 2s ease-out infinite;
  }
  .driver-card-info {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  .driver-card-name {
    font-family: Montserrat, sans-serif;
    font-weight: 800;
    font-size: 15px;
    color: var(--fg);
  }
  .driver-card-meta {
    font-size: 12px;
    color: var(--fg-soft);
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .driver-card-rating {
    margin-top: 4px;
    font-size: 11px;
    color: var(--fg-soft);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .driver-card-rating svg { color: #F59E0B; }
  .driver-card-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    position: relative;
  }
  .driver-card-btn {
    width: 44px; height: 44px;
    border-radius: 12px;
    border: 0;
    cursor: pointer;
    display: grid; place-items: center;
    color: white;
    transition: all .2s;
    text-decoration: none;
  }
  .driver-card-btn.chat {
    background: linear-gradient(135deg, #4F46E5, #635BFF);
    box-shadow: 0 6px 14px rgba(99,91,255,0.32);
  }
  .driver-card-btn.call {
    background: linear-gradient(135deg, #059669, #34D399);
    box-shadow: 0 6px 14px rgba(5,150,105,0.32);
  }
  .driver-card-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }
  .driver-card-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .dot {
    width: 3px; height: 3px;
    border-radius: 50%;
    background: var(--fg-soft);
    opacity: 0.5;
    display: inline-block;
  }
  @keyframes dc-online {
    0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
    70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
    100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
  }
  @keyframes dc-spin {
    to { transform: rotate(360deg); }
  }
`;

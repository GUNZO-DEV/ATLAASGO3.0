import { useState } from 'react';
import * as I from '../icons/Icon';
import { markPreparing } from '../lib/orderActions';
import { useToast } from '../lib/toast';
import OrderChat from './OrderChat';
import { MotionButton } from './visual/Motion';
import type { OrderRow } from '../lib/database.types';

export default function MerchantOrderCard({
  order,
  onChange,
}: {
  order: OrderRow;
  onChange?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const toast = useToast();

  const ageMin = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const urgent = ageMin >= 12;

  async function handleMarkReady() {
    setMarking(true);
    try {
      const result = await markPreparing(order.id);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success('Marked ready · waiting for rider');
        onChange?.();
      }
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className={`merchant-order-card ${expanded ? 'expanded' : ''} ${urgent ? 'urgent' : ''}`}>
      <div className="merchant-order-header" onClick={() => setExpanded(!expanded)}>
        <div className="merchant-order-id">#{order.id.slice(0, 6).toUpperCase()}</div>
        <div className="merchant-order-status">
          <span className={`status-badge status-${order.status}`}>{order.status}</span>
          <span className="merchant-order-age">{ageMin}m</span>
        </div>
      </div>

      {expanded && (
        <div className="merchant-order-body">
          <div className="merchant-order-section">
            <h4>Delivery to</h4>
            <p style={{ margin: 0 }}>
              <I.Pin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              {order.driver_payload?.headerLandmark ?? order.landmark}
            </p>
            {order.delivery_notes && (
              <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.8, fontStyle: 'italic' }}>
                Note: {order.delivery_notes}
              </p>
            )}
          </div>

          <div className="merchant-order-section">
            <h4>Items</h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {order.items?.map((item, i) => (
                <li key={i}>
                  <strong>{item.qty}×</strong> {item.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="merchant-order-section">
            <h4>Contact</h4>
            <p style={{ margin: 0, fontSize: 13 }}>
              Customer is available via chat below
            </p>
          </div>

          <div className="merchant-order-chat">
            <OrderChat orderId={order.id} />
          </div>

          {order.status === 'ordered' && (
            <MotionButton
              className="btn btn-success btn-lg btn-block"
              onClick={handleMarkReady}
              disabled={marking}
              style={{ marginTop: 12 }}
            >
              {marking ? 'Updating…' : 'Mark ready for pickup'} <I.Check size={14} />
            </MotionButton>
          )}
        </div>
      )}
    </div>
  );
}

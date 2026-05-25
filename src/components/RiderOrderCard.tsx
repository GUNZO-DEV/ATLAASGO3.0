import { useState } from 'react';
import * as I from '../icons/Icon';
import {
  acceptAssignment,
  markPickedUp,
  markArriving,
  markDelivered,
} from '../lib/orderActions';
import { useToast } from '../lib/toast';
import OrderChat from './OrderChat';
import { MotionButton } from './visual/Motion';
import type { OrderRow } from '../lib/database.types';

export default function RiderOrderCard({
  order,
  accepted = false,
  pickedUp = false,
  riderId,
  onChange,
}: {
  order: OrderRow;
  accepted?: boolean;
  pickedUp?: boolean;
  riderId: string;
  onChange?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handlePickup() {
    setSubmitting(true);
    try {
      const result = await markPickedUp(order.id, riderId);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success('Marked as picked up');
        onChange?.();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArriving() {
    setSubmitting(true);
    try {
      const result = await markArriving(order.id);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.info('Customer notified that you\'re arriving');
        onChange?.();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelivered() {
    setSubmitting(true);
    try {
      const result = await markDelivered(order.id, riderId);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success('Delivery complete · +18 dh earned');
        onChange?.();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const itemCount = order.items?.reduce((acc, i) => acc + i.qty, 0) ?? 0;

  return (
    <div className={`rider-order-card ${expanded ? 'expanded' : ''}`}>
      <div className="rider-order-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="rider-order-id">#{order.id.slice(0, 6).toUpperCase()}</div>
          <div className="rider-order-landmark">
            <I.Pin size={12} /> {order.driver_payload?.headerLandmark ?? order.landmark}
          </div>
        </div>
        <div className="rider-order-status">
          <span className={`status-badge status-${order.status}`}>{order.status}</span>
        </div>
      </div>

      {expanded && (
        <div className="rider-order-body">
          <div className="rider-order-section">
            <h4>Order Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div>
                <div style={{ opacity: 0.6 }}>Items</div>
                <div style={{ fontWeight: 600 }}>{itemCount} items</div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>Total</div>
                <div style={{ fontWeight: 600 }}>{order.total_dh} dh</div>
              </div>
            </div>
          </div>

          <div className="rider-order-section">
            <h4>Delivery to</h4>
            <p style={{ margin: 0 }}>
              <I.Pin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              {order.driver_payload?.headerLandmark ?? order.landmark}
            </p>
            {order.delivery_notes && (
              <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.8, fontStyle: 'italic' }}>
                Special instructions: {order.delivery_notes}
              </p>
            )}
            {order.coords && (
              <p style={{ margin: '8px 0 0', fontSize: 11, fontFamily: 'monospace', opacity: 0.6 }}>
                {order.coords.lat.toFixed(4)}, {order.coords.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div className="rider-order-section">
            <h4>Communicate</h4>
            <div className="rider-order-chat">
              <OrderChat orderId={order.id} />
            </div>
          </div>

          <div className="rider-order-actions" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {!accepted ? (
              <MotionButton
                className="btn btn-success btn-lg"
                onClick={async () => {
                  setSubmitting(true);
                  const r = await acceptAssignment(order.id, riderId);
                  setSubmitting(false);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success('Accepted · head to the restaurant');
                    onChange?.();
                  }
                }}
                disabled={submitting}
              >
                Accept order <I.Check size={14} />
              </MotionButton>
            ) : !pickedUp ? (
              <MotionButton
                className="btn btn-primary btn-lg"
                onClick={handlePickup}
                disabled={submitting}
              >
                {submitting ? 'Updating…' : 'I picked it up'} <I.Arrow />
              </MotionButton>
            ) : order.status === 'outForDelivery' ? (
              <>
                <MotionButton
                  className="btn btn-primary btn-lg"
                  onClick={handleArriving}
                  disabled={submitting}
                >
                  {submitting ? 'Updating…' : 'Arriving now'} <I.Pin size={14} />
                </MotionButton>
                <MotionButton
                  className="btn btn-success"
                  onClick={handleDelivered}
                  disabled={submitting}
                >
                  Delivery complete <I.Check size={14} />
                </MotionButton>
              </>
            ) : order.status === 'arriving' ? (
              <MotionButton
                className="btn btn-success btn-lg"
                onClick={handleDelivered}
                disabled={submitting}
              >
                {submitting ? 'Confirming…' : 'Confirm delivery'} <I.Check size={14} />
              </MotionButton>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

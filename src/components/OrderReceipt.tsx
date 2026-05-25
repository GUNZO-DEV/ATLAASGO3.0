/**
 * Premium itemized order receipt — used on Track, Orders, Account.
 * Collapsible header with totals row; items list with quantities, prices, and
 * line totals. Matches the order-summary style on Cart for visual continuity.
 */
import { useState } from 'react';
import * as I from '../icons/Icon';
import type { OrderRow } from '../lib/database.types';

export default function OrderReceipt({
  order,
  defaultOpen = false,
}: {
  order: OrderRow;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const itemCount = order.items?.reduce((acc, i) => acc + i.qty, 0) ?? 0;
  const restaurantName = order.items?.[0]?.restaurantName ?? 'Restaurant';
  const placedAt = new Date(order.created_at);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '18px 22px',
          background: 'none',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background:
              'linear-gradient(135deg, rgba(255,87,34,0.12), rgba(255,138,101,0.18))',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--primary)',
            flexShrink: 0,
          }}
        >
          <I.Receipt size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: 15,
              color: 'var(--fg)',
            }}
          >
            {restaurantName}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--fg-soft)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span>
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>
              {placedAt.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {order.promotion_code && (
              <>
                <span>·</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  Promo {order.promotion_code}
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'Montserrat',
              fontWeight: 900,
              fontSize: 18,
              color: 'var(--primary)',
            }}
          >
            {order.total_dh} dh
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--fg-soft)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {order.payment_method === 'cash' ? 'Cash' : order.payment_method === 'wallet' ? 'Wallet' : 'Card'}
          </div>
        </div>
        <div
          style={{
            color: 'var(--fg-soft)',
            transform: open ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform .25s',
          }}
        >
          <I.Arrow size={14} />
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 22px 22px' }}>
          <div
            style={{
              borderTop: '1px dashed var(--line)',
              margin: '0 0 16px',
            }}
          />
          <div style={{ display: 'grid', gap: 10 }}>
            {order.items?.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontSize: 14,
                }}
              >
                <div
                  style={{
                    minWidth: 28,
                    height: 24,
                    borderRadius: 8,
                    background: 'rgba(255,87,34,0.08)',
                    color: 'var(--primary)',
                    fontWeight: 800,
                    fontSize: 11,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    padding: '0 6px',
                  }}
                >
                  ×{item.qty}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{item.name}</div>
                  {item.restaurantName !== restaurantName && (
                    <div style={{ fontSize: 11, color: 'var(--fg-soft)', marginTop: 1 }}>
                      {item.restaurantName}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--fg)',
                    fontWeight: 600,
                  }}
                >
                  {item.priceDh * item.qty} dh
                </div>
              </div>
            ))}
          </div>

          {/* Totals breakdown */}
          <div
            style={{
              borderTop: '1px dashed var(--line)',
              marginTop: 18,
              paddingTop: 14,
              display: 'grid',
              gap: 6,
              fontSize: 13,
            }}
          >
            <Row label="Subtotal" value={`${order.subtotal_dh} dh`} />
            <Row label="Delivery fee" value={`${order.delivery_fee_dh} dh`} />
            <Row label="Service fee" value={`${order.service_fee_dh} dh`} />
            <div
              style={{
                marginTop: 8,
                paddingTop: 10,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>{order.total_dh} dh</span>
            </div>
          </div>

          {order.delivery_notes && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.03)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--fg-soft)',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              <strong style={{ color: 'var(--fg)' }}>Note for the rider:</strong>{' '}
              {order.delivery_notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--fg-soft)',
      }}
    >
      <span>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

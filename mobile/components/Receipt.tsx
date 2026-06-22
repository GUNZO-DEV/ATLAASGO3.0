import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Receipt as ReceiptIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

/**
 * Itemized order receipt — mobile port of web src/components/OrderReceipt.tsx.
 * Collapsible card: header shows restaurant, item count, total + payment
 * method; expanded body lists qty x name → line total, the fee breakdown,
 * a promo badge, and the delivery note. Pass `defaultOpen` (e.g. for
 * cancelled orders) to start expanded.
 */

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const LINE = 'rgba(26,20,16,0.08)';

export type ReceiptItem = {
  id?: string;
  name: string;
  priceDh: number;
  qty: number;
  restaurantName?: string;
};

export type ReceiptOrder = {
  id: string;
  items: ReceiptItem[] | null;
  subtotal_dh: number | null;
  delivery_fee_dh: number | null;
  service_fee_dh: number | null;
  total_dh: number | null;
  payment_method: string | null;
  promotion_code: string | null;
  delivery_notes: string | null;
  created_at: string;
};

function paymentLabel(method: string | null, tr: TFunction): string {
  if (method === 'cash') return tr('receipt.payCash');
  if (method === 'wallet') return tr('receipt.payWallet');
  return tr('receipt.payCard');
}

function FeeRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[13px]" style={{ color: MUTED }}>{label}</Text>
      <Text className="text-[13px]" style={{ color: MUTED, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

export function Receipt({ order, defaultOpen = false }: { order: ReceiptOrder; defaultOpen?: boolean }) {
  const { t: tr } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const items = order.items ?? [];
  const itemCount = items.reduce((acc, i) => acc + i.qty, 0);
  const restaurantName = items[0]?.restaurantName ?? tr('receipt.fallbackName');
  const placedAt = new Date(order.created_at);

  return (
    <View
      className="rounded-3xl bg-white overflow-hidden"
      style={{ borderWidth: 1, borderColor: LINE }}
    >
      {/* Collapsible header */}
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View className="flex-row items-center p-5">
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
          >
            <ReceiptIcon size={20} color={BRAND} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[15px]" style={{ fontWeight: '800', color: INK }} numberOfLines={1}>
              {restaurantName}
            </Text>
            <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
              <Text className="text-[12px]" style={{ color: MUTED }}>
                {tr('receipt.itemCount', { n: itemCount })} ·{' '}
                {placedAt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View className="items-end mr-2">
            <Text className="text-[17px]" style={{ fontWeight: '900', color: BRAND }}>
              {order.total_dh ?? 0} dh
            </Text>
            <Text
              className="text-[10px] uppercase font-bold mt-0.5"
              style={{ letterSpacing: 1.0, color: MUTED }}
            >
              {paymentLabel(order.payment_method, tr)}
            </Text>
          </View>
          {open ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
        </View>
      </Pressable>

      {open && (
        <View className="px-5 pb-5">
          <View style={{ borderTopWidth: 1, borderColor: LINE, borderStyle: 'dashed', marginBottom: 14 }} />

          {/* Items */}
          {items.length === 0 ? (
            <Text className="text-[13px]" style={{ color: MUTED }}>{tr('receipt.noItems')}</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((item, i) => (
                <View key={item.id ?? i} className="flex-row items-start" style={{ gap: 10 }}>
                  <View
                    className="rounded-lg items-center justify-center"
                    style={{ minWidth: 30, height: 24, paddingHorizontal: 6, backgroundColor: 'rgba(255,87,34,0.08)' }}
                  >
                    <Text className="text-[11px]" style={{ fontWeight: '800', color: BRAND }}>×{item.qty}</Text>
                  </View>
                  <Text className="flex-1 text-[14px]" style={{ fontWeight: '600', color: INK }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-[14px]" style={{ fontWeight: '600', color: INK, fontVariant: ['tabular-nums'] }}>
                    {item.priceDh * item.qty} dh
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Totals breakdown */}
          <View
            style={{ borderTopWidth: 1, borderColor: LINE, borderStyle: 'dashed', marginTop: 16, paddingTop: 12, gap: 6 }}
          >
            <FeeRow label={tr('receipt.subtotal')} value={`${order.subtotal_dh ?? 0} dh`} />
            <FeeRow label={tr('receipt.deliveryFee')} value={`${order.delivery_fee_dh ?? 0} dh`} />
            <FeeRow label={tr('receipt.serviceFee')} value={`${order.service_fee_dh ?? 0} dh`} />
            <View
              className="flex-row items-center justify-between"
              style={{ borderTopWidth: 1, borderColor: LINE, marginTop: 8, paddingTop: 10 }}
            >
              <Text className="text-[15px]" style={{ fontWeight: '800', color: INK }}>{tr('receipt.total')}</Text>
              <Text className="text-[15px]" style={{ fontWeight: '800', color: BRAND, fontVariant: ['tabular-nums'] }}>
                {order.total_dh ?? 0} dh
              </Text>
            </View>
          </View>

          {/* Promo badge */}
          {order.promotion_code ? (
            <View
              className="self-start mt-3 rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'rgba(5,150,105,0.10)' }}
            >
              <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 0.8, color: '#059669' }}>
                {tr('receipt.promo')} · {order.promotion_code}
              </Text>
            </View>
          ) : null}

          {/* Delivery note */}
          {order.delivery_notes ? (
            <View
              className="mt-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(26,20,16,0.03)' }}
            >
              <Text className="text-[12px]" style={{ color: MUTED, lineHeight: 18 }}>
                <Text style={{ fontWeight: '700', color: INK }}>{tr('receipt.riderNote')} </Text>
                {order.delivery_notes}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

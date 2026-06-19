import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Order chat — mobile port of the web app's src/lib/chat.ts.
 *
 * Loads the message thread for one order, subscribes to realtime INSERTs
 * (and UPDATEs, so read receipts flip live), and exposes a `send` that
 * inserts as the given role. RLS on `order_messages` restricts rows to
 * order participants, exactly like the web.
 */

export type ChatRole = 'customer' | 'merchant' | 'rider';

export type OrderMessage = {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: string;
  kind: 'text' | 'quick_reply' | 'location' | 'system';
  body: string | null;
  location_lat: number | null;
  location_lng: number | null;
  read_at: string | null;
  created_at: string;
};

/** Pre-set messages a customer can tap instead of typing (mirrors web). */
export const CUSTOMER_QUICK_REPLIES = [
  'Where are you?',
  'I will be right out',
  'Leave at the gate',
  'Use the side entrance',
  'Thank you!',
];

const SELECT =
  'id, order_id, sender_id, sender_role, kind, body, location_lat, location_lng, read_at, created_at';

export function useOrderChat(orderId: string | undefined, role: ChatRole) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase
      .from('order_messages')
      .select(SELECT)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        setMessages((data ?? []) as OrderMessage[]);
        setLoading(false);
      });

    const channel = supabase
      // Unique topic per mount — a fixed name collides with an already-
      // subscribed channel on re-mount/Fast Refresh (see useOrderStatus).
      .channel(`order_messages:${orderId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as OrderMessage;
          setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as OrderMessage;
          setMessages((m) => m.map((x) => (x.id === row.id ? row : x)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  /** Send a message. Location messages pass `kind: 'location'` + coords. */
  const send = useCallback(
    async (
      body: string,
      kind: OrderMessage['kind'] = 'text',
      location?: { lat: number; lng: number },
    ): Promise<boolean> => {
      if (!orderId || !user || !body.trim()) return false;
      setSending(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('order_messages')
        .insert({
          order_id: orderId,
          sender_id: user.id,
          sender_role: role,
          kind,
          body: body.trim(),
          ...(location ? { location_lat: location.lat, location_lng: location.lng } : {}),
        })
        .select(SELECT)
        .single();
      setSending(false);
      if (err) {
        setError(err.message);
        return false;
      }
      if (data) {
        const row = data as OrderMessage;
        setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
      }
      return true;
    },
    [orderId, user, role],
  );

  /** Mark inbound unread messages as read (called while the thread is open). */
  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await supabase
        .from('order_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', ids);
    },
    [],
  );

  return { messages, loading, sending, error, send, markRead, me: user };
}

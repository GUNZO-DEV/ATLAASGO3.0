import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { AppRole, MessageKind, OrderMessageRow } from './database.types';

/** Pre-set messages a customer can tap instead of typing. */
export const CUSTOMER_QUICK_REPLIES = [
  'Where are you?',
  "I'll be right out",
  'Leave at the gate',
  'Use the side entrance',
  'Thank you!',
];

export function useOrderChat(orderId: string | undefined) {
  const [messages, setMessages] = useState<OrderMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; role: AppRole } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const primary = (roles?.[0]?.role as AppRole | undefined) ?? 'customer';
      setMe({ id: user.id, role: primary });
    });
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        setMessages((data ?? []) as OrderMessageRow[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`order_messages:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (cancelled) return;
          setMessages((m) => [...m, payload.new as OrderMessageRow]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const send = useCallback(
    async (body: string, kind: MessageKind = 'text'): Promise<boolean> => {
      if (!orderId || !me || !body.trim()) return false;
      setSending(true);
      setError(null);
      const { error: err } = await supabase.from('order_messages').insert({
        order_id: orderId,
        sender_id: me.id,
        sender_role: me.role,
        kind,
        body: body.trim(),
      });
      setSending(false);
      if (err) {
        setError(err.message);
        return false;
      }
      return true;
    },
    [orderId, me],
  );

  return { messages, loading, sending, error, send, me };
}

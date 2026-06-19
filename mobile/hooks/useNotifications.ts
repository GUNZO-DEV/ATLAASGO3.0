import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Notification feed for the signed-in user (RLS-scoped), realtime, with
 * mark-as-read. Drives both the Notifications screen and the unread badge.
 */
export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('id, kind, title, body, payload, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(60);
    setItems(
      ((data ?? []) as {
        id: string;
        kind: string;
        title: string;
        body: string | null;
        payload: Record<string, unknown> | null;
        read_at: string | null;
        created_at: string;
      }[]).map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        payload: r.payload,
        readAt: r.read_at,
        createdAt: r.created_at,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`notifications-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async function markAllRead() {
    const ids = items.filter((n) => !n.readAt).map((n) => n.id);
    if (ids.length) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    }
  }

  return { items, unread, loading, markRead, markAllRead };
}

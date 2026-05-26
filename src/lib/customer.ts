import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type {
  AddressRow,
  FavoriteRow,
  NotificationRow,
  ReviewRow,
} from './database.types';

// ─── Favorites ──────────────────────────────────────────────────────────
export function useFavorites(kind: 'restaurant' | 'menu_item' = 'restaurant') {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('favorites')
      .select('*')
      .eq('kind', kind)
      .then(({ data }) => {
        if (cancelled) return;
        setIds(new Set((data ?? []).map((f: FavoriteRow) => f.target_id)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const toggle = useCallback(
    async (targetId: string): Promise<boolean> => {
      const next = !ids.has(targetId);
      // Optimistic UI update.
      setIds((s) => {
        const copy = new Set(s);
        if (next) copy.add(targetId);
        else copy.delete(targetId);
        return copy;
      });
      if (next) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, kind, target_id: targetId });
        if (error) {
          // Roll back on failure.
          setIds((s) => {
            const copy = new Set(s);
            copy.delete(targetId);
            return copy;
          });
          return false;
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('kind', kind)
          .eq('target_id', targetId);
        if (error) {
          setIds((s) => new Set([...s, targetId]));
          return false;
        }
      }
      return true;
    },
    [ids, kind],
  );

  return { ids, loading, toggle, has: (id: string) => ids.has(id) };
}

// ─── Saved addresses ────────────────────────────────────────────────────
export function useAddresses() {
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    setAddresses((data ?? []) as AddressRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().then(() => {
      if (cancelled) return;
    });
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const save = useCallback(
    async (input: Omit<AddressRow, 'id' | 'user_id' | 'created_at'>): Promise<string | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      // If marking default, clear other defaults atomically (one_default unique index).
      if (input.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      }
      const { data, error: err } = await supabase
        .from('addresses')
        .insert({ ...input, user_id: user.id })
        .select('id')
        .single();
      if (err) {
        setError(err.message);
        return null;
      }
      await refresh();
      return (data as { id: string }).id;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('addresses').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const setDefault = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { addresses, loading, error, save, remove, setDefault, refresh };
}

// ─── Notifications ──────────────────────────────────────────────────────
export function useNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      setItems((data ?? []) as NotificationRow[]);
      setLoading(false);

      // Unique suffix so multiple components calling this hook don't collide
      // on the same channel name (causes "cannot add postgres_changes after
      // subscribe()" errors).
      channel = supabase
        .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            void load();
          },
        )
        .subscribe();
    }

    void load();

    // Refetch when the tab regains focus — catches missed realtime events
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const unreadCount = items.filter((n) => !n.read_at).length;

  // Optimistic update: mark the notification read locally first, then
  // sync to Supabase. If the write fails, roll back.
  const markRead = useCallback(async (id: string) => {
    const ts = new Date().toISOString();
    let previous: string | null | undefined;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          previous = n.read_at;
          return { ...n, read_at: ts };
        }
        return n;
      }),
    );
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: ts })
      .eq('id', id);
    if (error) {
      // Roll back
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: previous ?? null } : n)),
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ts = new Date().toISOString();
    // Optimistic: mark every unread as read locally
    const snapshot = items;
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: ts })));
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: ts })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (error) {
      // Roll back to snapshot if it failed
      setItems(snapshot);
    }
  }, [items]);

  return { items, unreadCount, loading, markRead, markAllRead };
}

// ─── Restaurant reviews (aggregate + write) ────────────────────────────
export function useOrderReview(orderId: string | undefined) {
  const [review, setReview] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('reviews')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setReview((data as ReviewRow | null) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const submit = useCallback(
    async (input: {
      restaurantId: string | null;
      ratingRestaurant: number;
      ratingRider?: number;
      comment?: string;
    }): Promise<boolean> => {
      if (!orderId) return false;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      setSubmitting(true);
      setError(null);
      const { error: err, data } = await supabase
        .from('reviews')
        .upsert(
          {
            order_id: orderId,
            customer_id: user.id,
            restaurant_id: input.restaurantId,
            rating_restaurant: input.ratingRestaurant,
            rating_rider: input.ratingRider ?? null,
            comment: input.comment ?? null,
          },
          { onConflict: 'order_id,customer_id' },
        )
        .select('*')
        .single();
      setSubmitting(false);
      if (err) {
        setError(err.message);
        return false;
      }
      setReview(data as ReviewRow);
      return true;
    },
    [orderId],
  );

  return { review, loading, submitting, error, submit };
}

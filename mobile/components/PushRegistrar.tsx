import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  ensureNotificationHandler,
  registerForPushAsync,
  addNotificationResponseListener,
  presentLocalNotification,
  isSimulator,
} from '../lib/push';

/**
 * Mounts inside the auth context. Registers the device for push when signed in,
 * routes to the relevant screen when a notification is tapped, and (on the
 * simulator) surfaces new realtime `notifications` rows as local banners so
 * notifications are visible without a physical device. Renders nothing.
 * No-ops gracefully until the app is rebuilt with the native module.
 */
export function PushRegistrar() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    ensureNotificationHandler();
  }, []);

  useEffect(() => {
    if (user) void registerForPushAsync(user.id);
  }, [user]);

  // Tapping a notification routes into the app.
  useEffect(() => {
    return addNotificationResponseListener((data) => {
      const orderId = data?.orderId;
      if (orderId) router.push({ pathname: '/order/[id]', params: { id: String(orderId) } });
      else router.push('/notifications');
    });
  }, [router]);

  // On the simulator (no remote push), mirror new notification rows as local
  // banners so they're visible. On a real device, remote push handles display.
  useEffect(() => {
    if (!user || !isSimulator) return;
    const channel = supabase
      .channel(`push-mirror-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { title?: string; body?: string; kind?: string; payload?: { orderId?: string } };
          void presentLocalNotification(n.title ?? 'AtlaasGo', n.body ?? '', {
            orderId: n.payload?.orderId,
            kind: n.kind,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}

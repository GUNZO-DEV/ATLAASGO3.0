import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { ensureNotificationHandler, registerForPushAsync, addNotificationResponseListener } from '../lib/push';

/**
 * Registers the driver's device for push when signed in, and routes a tapped
 * "new delivery" notification back to the dashboard (where the order is in the
 * pool to claim). Renders nothing; no-ops gracefully until rebuilt with the
 * native module + FCM credential.
 */
export function PushRegistrar() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => { ensureNotificationHandler(); }, []);
  useEffect(() => { if (user) void registerForPushAsync(user.id); }, [user]);
  useEffect(() => addNotificationResponseListener(() => router.replace('/')), [router]);

  return null;
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Push notifications for AtlaasGo.
 *
 * expo-notifications / expo-device are loaded with defensive requires so the
 * app still runs on a dev client built BEFORE these native modules were added.
 * Push stays inert until the next native rebuild (`npx expo run:ios` / EAS).
 *
 * Note on the simulator: Expo *remote* push tokens are only issued on a
 * physical device. On the simulator we still request permission and show
 * **local** notifications (mirrored from the realtime `notifications` table)
 * so notifications are visible during development.
 */
let Notifications: any = null;
let Device: any = null;
try { Notifications = require('expo-notifications'); } catch { /* not in this build yet */ }
try { Device = require('expo-device'); } catch { /* optional */ }

export const pushAvailable = !!Notifications;
export const isSimulator = !!Device && Device.isDevice === false;

let handlerSet = false;
export function ensureNotificationHandler(): void {
  if (!Notifications || handlerSet) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  } catch { /* ignore */ }
}

/** Request permission, register the Android channel, and (on a real device)
 *  persist the Expo push token to push_tokens. Returns the token or null. */
export async function registerForPushAsync(userId: string): Promise<string | null> {
  if (!Notifications) return null;
  try {
    ensureNotificationHandler();

    let status = (await Notifications.getPermissionsAsync()).status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
        lightColor: '#FF5722',
      });
    }

    // Remote push tokens require a physical device. On the simulator we stop
    // here — permission is granted, so local notifications still display.
    if (isSimulator) return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token: string | undefined = resp?.data;
    if (!token) return null;

    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('platform', Platform.OS);
    await supabase.from('push_tokens').insert({
      user_id: userId,
      token,
      platform: Platform.OS,
      user_agent: Device?.modelName ?? null,
    });
    return token;
  } catch {
    return null;
  }
}

/** Show a notification immediately on this device (used to surface realtime
 *  in-app notifications, and as the visible path on the simulator). */
export async function presentLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: null, // deliver now
    });
  } catch { /* ignore */ }
}

/** Fires when the user taps a notification. Returns an unsubscribe fn. */
export function addNotificationResponseListener(cb: (data: Record<string, any>) => void): () => void {
  if (!Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((resp: any) => {
      cb(resp?.notification?.request?.content?.data ?? {});
    });
    return () => { try { sub.remove(); } catch { /* ignore */ } };
  } catch {
    return () => {};
  }
}

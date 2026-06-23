import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Push registration for the driver app. expo-notifications is loaded defensively
 * so an older build still runs. Registers the Expo push token to push_tokens;
 * the server's trg_notification_push → send-push pipeline delivers the pings.
 * (Remote tokens require a real device + the project's FCM credential in Expo.)
 */
let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch { Notifications = null; }

export const pushAvailable = !!Notifications;

let handlerSet = false;
export function ensureNotificationHandler(): void {
  if (!Notifications || handlerSet) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  } catch { /* ignore */ }
}

export async function registerForPushAsync(userId: string): Promise<string | null> {
  if (!Notifications) return null;
  try {
    ensureNotificationHandler();
    let status = (await Notifications.getPermissionsAsync()).status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'New orders',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        lightColor: '#10B981',
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token: string | undefined = resp?.data;
    if (!token) return null;

    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('platform', Platform.OS);
    await supabase.from('push_tokens').insert({ user_id: userId, token, platform: Platform.OS });
    return token;
  } catch {
    return null;
  }
}

export function addNotificationResponseListener(cb: (data: Record<string, any>) => void): () => void {
  if (!Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((resp: any) =>
      cb(resp?.notification?.request?.content?.data ?? {}),
    );
    return () => { try { sub.remove(); } catch { /* ignore */ } };
  } catch {
    return () => {};
  }
}

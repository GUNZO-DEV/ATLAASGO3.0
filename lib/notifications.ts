// ─── FCM Token Registration ───────────────────────────────────────────────────

/**
 * Save the FCM registration token to the user's Firestore profile.
 * Call this after login and when the token refreshes.
 */
export async function saveFcmToken(uid: string, token: string): Promise<void> {
  const { doc, updateDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await updateDoc(doc(db, "users", uid), { fcmToken: token });
}

// ─── WhatsApp Business API ────────────────────────────────────────────────────

export type WhatsAppTemplateKey =
  | "driver_accepted"
  | "driver_picked_up"
  | "order_delivered";

type TemplateVars = Record<string, string>;

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, (vars: TemplateVars) => string> = {
  driver_accepted: (vars) =>
    `Your AtlaasGo driver${vars.driverName ? ` ${vars.driverName}` : ""} is on their way! 🛵`,
  driver_picked_up: (_vars) =>
    `Your AtlaasGo order has been picked up and is en route to you. 📦`,
  order_delivered: (_vars) =>
    `Your AtlaasGo order has been delivered. Thank you for using AtlaasGo! ✅`,
};

export function buildWhatsAppMessage(
  template: WhatsAppTemplateKey,
  vars: TemplateVars
): string {
  const builder = WHATSAPP_TEMPLATES[template];
  if (!builder) throw new Error(`Unknown WhatsApp template: ${template}`);
  return builder(vars);
}

/**
 * Open a WhatsApp chat with a pre-filled message.
 * Uses WhatsApp Web URL scheme — works in browser without Business API key.
 * Replace with API call when WhatsApp Business API credentials are available.
 */
export function sendWhatsAppLink(phone: string, template: WhatsAppTemplateKey, vars: TemplateVars = {}): void {
  const message = buildWhatsAppMessage(template, vars);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encoded}`;
  window.open(url, "_blank", "noopener");
}

// ─── FCM Push (browser) ───────────────────────────────────────────────────────

/**
 * Request notification permission and get the FCM registration token.
 * Returns null if permission denied or FCM not supported.
 *
 * Note: Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env.local
 * and a Firebase service worker at /public/firebase-messaging-sw.js
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const { default: app } = await import("@/lib/firebase");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Typed PostHog event catalogue for Atlaasgo.
 * Import `track` everywhere instead of calling posthog.capture() directly
 * so all event names + properties are centralised and autocompleted.
 */
import posthog from "posthog-js";

// ─── event shapes ────────────────────────────────────────────────────────────

export type AtlaasgoEvent =
  | { event: "order_form_opened";    props: { customerId: string; zone: string } }
  | { event: "order_started";        props: { customerId: string; zone: string; pickup: string; dropoff: string } }
  | { event: "order_completed";      props: { customerId: string; orderId: string; zone: string; fee: number } }
  | { event: "order_abandoned";      props: { customerId: string; step: "pickup" | "dropoff" | "description" | "submit" } }
  | { event: "driver_order_viewed";  props: { driverId: string; orderId: string; zone: string } }
  | { event: "driver_order_accepted";props: { driverId: string; orderId: string; zone: string; secondsToAccept: number } }
  | { event: "driver_picked_up";     props: { driverId: string; orderId: string } }
  | { event: "driver_delivered";     props: { driverId: string; orderId: string; zone: string; fee: number; secondsToDeliver: number } }
  | { event: "driver_went_online";   props: { driverId: string } }
  | { event: "driver_went_offline";  props: { driverId: string } }
  | { event: "user_registered";      props: { uid: string; email: string } }
  | { event: "user_logged_in";       props: { uid: string; email: string } }
  | { event: "admin_order_cancelled";props: { adminId: string; orderId: string } };

// ─── helper ───────────────────────────────────────────────────────────────────

export function track<E extends AtlaasgoEvent["event"]>(
  event: E,
  props: Extract<AtlaasgoEvent, { event: E }>["props"]
) {
  posthog.capture(event, props);
}

// ─── identify ─────────────────────────────────────────────────────────────────

export function identifyUser(uid: string, traits?: Record<string, unknown>) {
  posthog.identify(uid, traits);
}

export function resetUser() {
  posthog.reset();
}

import { supabase } from './supabase';
import type { OrderStage } from './types';

/**
 * Rider-side order workflow, on Supabase. Mirrors the web app's orderActions.
 * `rider_id` on order_assignments is the auth user id (auth.uid()), which is
 * what the RLS policies check (`auth.uid() = rider_id`).
 *
 *   ordered → preparing → enRoute → outForDelivery → arriving → delivered
 *
 * RLS guardrails (already in the DB):
 *  - order_assignments: rider self insert / self-update  (claim, accept, …)
 *  - orders: rider assigned read / rider workflow update  (advance status)
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok = (): ActionResult => ({ ok: true });
const fail = (e: unknown): ActionResult => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

/** Best-effort customer notification. Routed through the SECURITY DEFINER RPC
 *  (the rider can't insert a notification row for the customer directly). */
async function notifyCustomer(orderId: string, title: string, body: string): Promise<void> {
  const { data } = await supabase.from('orders').select('customer_id').eq('id', orderId).maybeSingle();
  const customerId = (data as { customer_id?: string } | null)?.customer_id;
  if (!customerId) return;
  void supabase.rpc('notify_order_participant', {
    p_order_id: orderId,
    p_recipient: customerId,
    p_kind: 'order_status',
    p_title: title,
    p_body: body,
  });
}

/** Admin/merchant: accept a placed order and start preparing. */
export async function markPreparing(orderId: string): Promise<ActionResult> {
  const { error } = await supabase.from('orders').update({ status: 'preparing' as OrderStage }).eq('id', orderId);
  if (error) return fail(error);
  void notifyCustomer(orderId, 'Order accepted', 'The restaurant is preparing your order.');
  return ok();
}

/** Admin/merchant: cancel an order (allowed while ordered/preparing). */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
  if (error) return fail(error);
  void notifyCustomer(orderId, 'Order cancelled', 'Your order was cancelled.');
  return ok();
}

/**
 * Customer-side cancel. Goes through the `cancel_order` SECURITY DEFINER RPC,
 * which (atomically) enforces ownership + that the order is still cancelable
 * (ordered/preparing, before pickup), refunds any wallet charge, flags a
 * Stripe-paid order for refund, notifies the customer, and flips status to
 * cancelled. A bare `update` never refunds and can silently no-op under RLS —
 * the RPC is the correct single entry point.
 */
export async function cancelOrderAsCustomer(orderId: string): Promise<ActionResult> {
  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
  if (error) return fail(error);
  return ok();
}

/** Admin: assign an order to a rider (rider_id = the rider's auth user id).
 *  Status stays at preparing until the rider accepts in Driver mode. */
export async function assignRider(orderId: string, riderUserId: string): Promise<ActionResult> {
  await supabase.from('order_assignments').update({ is_active: false }).eq('order_id', orderId).eq('is_active', true);
  const { error } = await supabase.from('order_assignments').insert({ order_id: orderId, rider_id: riderUserId, is_active: true });
  if (error) return fail(error);
  // Notify the rider (best-effort; they now count as an order participant).
  void supabase.rpc('notify_order_participant', {
    p_order_id: orderId,
    p_recipient: riderUserId,
    p_kind: 'rider_assignment',
    p_title: 'New trip assigned',
    p_body: `Order #${orderId.slice(0, 6).toUpperCase()} — open Driver mode to accept.`,
  });
  return ok();
}

/** Rider/admin: claim an open pool order for yourself → goes straight to enRoute. */
export async function claimOrder(orderId: string, riderId: string): Promise<ActionResult> {
  // Deactivate any stale active assignment for this order first.
  await supabase.from('order_assignments').update({ is_active: false }).eq('order_id', orderId).eq('is_active', true);
  const { error: insErr } = await supabase.from('order_assignments').insert({
    order_id: orderId,
    rider_id: riderId,
    is_active: true,
    accepted_at: new Date().toISOString(),
  });
  if (insErr) return fail(insErr);
  const { error: oErr } = await supabase.from('orders').update({ status: 'enRoute' as OrderStage }).eq('id', orderId);
  if (oErr) return fail(oErr);
  void notifyCustomer(orderId, 'Driver assigned', 'A driver has picked up your order from the pool.');
  return ok();
}

/** Rider: accept an assignment an admin gave you → order moves to enRoute. */
export async function acceptAssignment(orderId: string, riderId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('order_assignments')
    .update({ accepted_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (error) return fail(error);
  const { error: oErr } = await supabase.from('orders').update({ status: 'enRoute' as OrderStage }).eq('id', orderId);
  if (oErr) return fail(oErr);
  void notifyCustomer(orderId, 'Driver assigned', 'Your driver is on the way to the restaurant.');
  return ok();
}

/** Rider: decline an assignment with a reason. */
export async function rejectAssignment(orderId: string, riderId: string, reason: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('order_assignments')
    .update({ is_active: false, rejected_at: new Date().toISOString(), reject_reason: reason })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (error) return fail(error);
  return ok();
}

/** Rider: picked up from the merchant → outForDelivery. */
export async function markPickedUp(orderId: string, riderId: string): Promise<ActionResult> {
  const { error: aErr } = await supabase
    .from('order_assignments')
    .update({ picked_up_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (aErr) return fail(aErr);
  const { error: oErr } = await supabase.from('orders').update({ status: 'outForDelivery' as OrderStage }).eq('id', orderId);
  if (oErr) return fail(oErr);
  void notifyCustomer(orderId, 'Out for delivery', 'Your driver has picked up the order.');
  return ok();
}

/** Rider: 1–2 minutes from the drop. */
export async function markArriving(orderId: string): Promise<ActionResult> {
  const { error } = await supabase.from('orders').update({ status: 'arriving' as OrderStage }).eq('id', orderId);
  if (error) return fail(error);
  void notifyCustomer(orderId, 'Arriving now', 'Your driver is 1–2 minutes away.');
  return ok();
}

/** Rider: delivered → closes the assignment. */
export async function markDelivered(orderId: string, riderId: string): Promise<ActionResult> {
  const { error: aErr } = await supabase
    .from('order_assignments')
    .update({ delivered_at: new Date().toISOString(), is_active: false })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (aErr) return fail(aErr);
  const { error: oErr } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
  if (oErr) return fail(oErr);
  void notifyCustomer(orderId, 'Delivered ✓', 'Enjoy! Leave a review for your driver.');
  return ok();
}

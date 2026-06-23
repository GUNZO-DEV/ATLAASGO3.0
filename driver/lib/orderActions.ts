import { supabase } from './supabase';

/**
 * Rider-side order workflow (mirrors the customer app's lib/orderActions.ts).
 * `rider_id` on order_assignments is the auth user id (auth.uid()) — what the
 * RLS policies check. Status flow:
 *   ordered → preparing → enRoute → outForDelivery → arriving → delivered
 *
 * RLS guardrails already exist in the DB (rider self-insert/self-update on
 * order_assignments; rider workflow update on orders).
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

const ok = (): ActionResult => ({ ok: true });
const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

/** Best-effort customer notification via the SECURITY DEFINER RPC (a rider
 *  can't insert a notification row for the customer directly). */
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

/** Translate a claim/accept failure into a rider-friendly message. The
 *  accept_order_offer RPC raises errcode 23505 (unique_violation) when another
 *  rider already holds the order — surface that as a clean "already taken". */
function claimFail(e: unknown): ActionResult {
  const code = (e as { code?: string } | null)?.code;
  const msg = e instanceof Error ? e.message : String(e);
  if (code === '23505' || /already taken/i.test(msg)) {
    return { ok: false, error: 'This order was just taken by another driver.' };
  }
  return fail(e);
}

/** Claim an open pool order for yourself → straight to enRoute.
 *  Routed through the race-safe accept_order_offer RPC: it re-asserts the
 *  active assignment under the unique partial index, snapshots boost_dh from
 *  the pickup city's weather surcharge, and flips the order to enRoute. A
 *  concurrent claim loses with a unique-violation (handled as "already taken"). */
export async function claimOrder(orderId: string, _riderId: string): Promise<ActionResult> {
  const { error } = await supabase.rpc('accept_order_offer', { p_order_id: orderId });
  if (error) return claimFail(error);
  void notifyCustomer(orderId, 'Driver assigned', 'A driver has picked up your order from the pool.');
  return ok();
}

/** Accept a dispatch assignment → order moves to enRoute.
 *  Same race-safe RPC as claimOrder: an already-mine offer is accepted in
 *  place (accepted_at + boost_dh set); anyone else's active hold is rejected. */
export async function acceptAssignment(orderId: string, _riderId: string): Promise<ActionResult> {
  const { error } = await supabase.rpc('accept_order_offer', { p_order_id: orderId });
  if (error) return claimFail(error);
  void notifyCustomer(orderId, 'Driver assigned', 'Your driver is on the way to the restaurant.');
  return ok();
}

/** Decline an assignment with a reason → back to the pool. */
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

/** Picked up from the merchant → outForDelivery. */
export async function markPickedUp(orderId: string, riderId: string): Promise<ActionResult> {
  const { error: aErr } = await supabase
    .from('order_assignments')
    .update({ picked_up_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (aErr) return fail(aErr);
  const { error: oErr } = await supabase.from('orders').update({ status: 'outForDelivery' }).eq('id', orderId);
  if (oErr) return fail(oErr);
  void notifyCustomer(orderId, 'Out for delivery', 'Your driver has picked up the order.');
  return ok();
}

/** 1–2 minutes from the drop. Scoped to the rider who actively holds the order
 *  so a driver can only advance their own trip (and never one they've handed
 *  off). `riderId` defaults to the signed-in user when the caller omits it. */
export async function markArriving(orderId: string, riderId?: string): Promise<ActionResult> {
  let rid = riderId;
  if (!rid) {
    const { data: auth } = await supabase.auth.getUser();
    rid = auth.user?.id;
  }
  if (!rid) return { ok: false, error: 'Not signed in.' };
  const { data: asg, error: aErr } = await supabase
    .from('order_assignments')
    .select('id')
    .eq('order_id', orderId)
    .eq('rider_id', rid)
    .eq('is_active', true)
    .maybeSingle();
  if (aErr) return fail(aErr);
  if (!asg) return { ok: false, error: 'You are no longer assigned to this order.' };
  const { error } = await supabase.from('orders').update({ status: 'arriving' }).eq('id', orderId);
  if (error) return fail(error);
  void notifyCustomer(orderId, 'Arriving now', 'Your driver is 1–2 minutes away.');
  return ok();
}

/** Delivered → closes the assignment. */
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

/** Phone number of the order's counterparty (driver → customer). Returns null
 *  when the other side has no number on file. Routed through the SECURITY
 *  DEFINER order_contact_phone RPC, which scopes access to order participants. */
export async function orderContactPhone(orderId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('order_contact_phone', { p_order_id: orderId });
  if (error) return null;
  return (data as string | null) ?? null;
}

/** Go online: open (or reuse) the rider's shift window via rider_start_shift. */
export async function startShift(): Promise<ActionResult> {
  const { error } = await supabase.rpc('rider_start_shift');
  if (error) return fail(error);
  return ok();
}

/** Go offline: close the rider's open shift via rider_end_shift (no-op if none). */
export async function endShift(): Promise<ActionResult> {
  const { error } = await supabase.rpc('rider_end_shift');
  if (error) return fail(error);
  return ok();
}

/** Request a cash-out of `amountDh` dirhams → a 'requested' rider_payouts row. */
export async function cashOut(amountDh: number): Promise<ActionResult> {
  const { error } = await supabase.rpc('rider_cash_out', { p_amount_dh: amountDh });
  if (error) return fail(error);
  return ok();
}

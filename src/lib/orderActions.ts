import { supabase } from './supabase';
import type { OrderStatus } from './database.types';

/** Best-effort customer notification on order state change.
 *  Routed through the notify_order_participant RPC: a customer's
 *  notification row is written for a DIFFERENT user (the customer) while
 *  this code runs as the rider/merchant, which RLS blocks on a direct
 *  insert. The SECURITY DEFINER RPC verifies both caller and recipient
 *  are participants in the order, then writes the row safely. */
async function notifyCustomer(
  orderId: string,
  title: string,
  body: string,
): Promise<void> {
  const { data } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('id', orderId)
    .maybeSingle();
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

/**
 * The order workflow state machine. Transitions are enforced both here (UX
 * guardrail) and in Postgres CHECK constraints + RLS (security guardrail).
 *
 *   ordered → preparing  → enRoute → outForDelivery → arriving → delivered
 *        ↓        ↓           ↓            ↓
 *   cancelled ────┴──────────┴────────────┘   (customer or admin only)
 */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  ordered: 'preparing',
  preparing: 'enRoute',
  enRoute: 'outForDelivery',
  outForDelivery: 'arriving',
  arriving: 'delivered',
};

export type ActionResult = { ok: true } | { ok: false; error: string };

function ok(): ActionResult { return { ok: true }; }
function err(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : String(e) };
}

/** Customer-side: cancel before pickup. Allowed only on `ordered`. */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' as OrderStatus })
    .eq('id', orderId)
    .eq('status', 'ordered'); // race-safe; RLS also enforces
  if (error) return err(error);
  return ok();
}

/** Restaurant / merchant: accept an order and start preparing. */
export async function markPreparing(orderId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'preparing' as OrderStatus })
    .eq('id', orderId);
  if (error) return err(error);
  void notifyCustomer(orderId, 'Order accepted', 'The restaurant is preparing your order.');
  return ok();
}

/** Admin: assign a rider to an order. Creates the assignment row.
 *  Status stays at `preparing` until the rider accepts. */
export async function assignRider(
  orderId: string,
  riderId: string,
): Promise<ActionResult> {
  // Deactivate any prior active assignment for this order.
  await supabase
    .from('order_assignments')
    .update({ is_active: false })
    .eq('order_id', orderId)
    .eq('is_active', true);
  const { error: insErr } = await supabase
    .from('order_assignments')
    .insert({ order_id: orderId, rider_id: riderId, is_active: true });
  if (insErr) return err(insErr);

  // Resolve rider's user_id (rider_id is the riders.id PK, not the user id)
  const { data: riderRow } = await supabase
    .from('riders')
    .select('user_id')
    .eq('id', riderId)
    .maybeSingle();
  const riderUserId = (riderRow as { user_id?: string } | null)?.user_id;

  // Notify the rider (best-effort, non-blocking). Routed through the RPC:
  // once the assignment row above is inserted, the rider counts as an
  // order participant, so notify_order_participant can deliver to them.
  if (riderUserId) {
    void supabase.rpc('notify_order_participant', {
      p_order_id: orderId,
      p_recipient: riderUserId,
      p_kind: 'rider_assignment',
      p_title: 'New trip assigned',
      p_body: `Order #${orderId.slice(0, 6).toUpperCase()} — open the rider dashboard to accept.`,
    });
  }
  // Don't change order status — rider must accept first
  return ok();
}

/** Rider: accept an active assignment → order moves to enRoute. */
export async function acceptAssignment(orderId: string, riderId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('order_assignments')
    .update({ accepted_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (error) return err(error);
  // Now move order to enRoute
  const { error: oErr } = await supabase
    .from('orders')
    .update({ status: 'enRoute' as OrderStatus })
    .eq('id', orderId);
  if (oErr) return err(oErr);
  void notifyCustomer(orderId, 'Driver assigned', 'Your driver is on the way to the restaurant.');
  return ok();
}

/** Rider: picked up from merchant. */
export async function markPickedUp(orderId: string, riderId: string): Promise<ActionResult> {
  const ts = new Date().toISOString();
  const { error: aErr } = await supabase
    .from('order_assignments')
    .update({ picked_up_at: ts })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (aErr) return err(aErr);
  const { error: oErr } = await supabase
    .from('orders')
    .update({ status: 'outForDelivery' as OrderStatus })
    .eq('id', orderId);
  if (oErr) return err(oErr);
  void notifyCustomer(orderId, 'Out for delivery', 'Your driver has picked up the order.');
  return ok();
}

/** Rider: 1–2 minutes from drop. */
export async function markArriving(orderId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'arriving' as OrderStatus })
    .eq('id', orderId);
  if (error) return err(error);
  void notifyCustomer(orderId, 'Arriving now', 'Your driver is 1–2 minutes away.');
  return ok();
}

/** Rider: delivered. Closes the assignment. */
export async function markDelivered(orderId: string, riderId: string): Promise<ActionResult> {
  const ts = new Date().toISOString();
  const { error: aErr } = await supabase
    .from('order_assignments')
    .update({ delivered_at: ts, is_active: false })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (aErr) return err(aErr);
  const { error: oErr } = await supabase
    .from('orders')
    .update({ status: 'delivered' as OrderStatus })
    .eq('id', orderId);
  if (oErr) return err(oErr);
  void notifyCustomer(orderId, 'Delivered ✓', 'Enjoy your meal! Leave a review for your driver.');
  return ok();
}

/** Rider: reject an assignment with reason. */
export async function rejectAssignment(
  orderId: string,
  riderId: string,
  reason: string,
): Promise<ActionResult> {
  const { error } = await supabase
    .from('order_assignments')
    .update({
      is_active: false,
      rejected_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .eq('is_active', true);
  if (error) return err(error);
  return ok();
}

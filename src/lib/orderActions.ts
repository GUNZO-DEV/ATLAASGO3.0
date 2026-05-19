import { supabase } from './supabase';
import type { OrderStatus } from './database.types';

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
  return ok();
}

/** Rider: 1–2 minutes from drop. */
export async function markArriving(orderId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'arriving' as OrderStatus })
    .eq('id', orderId);
  if (error) return err(error);
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

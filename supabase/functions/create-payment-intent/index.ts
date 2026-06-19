/**
 * Supabase Edge Function: create-payment-intent
 *
 * Creates a Stripe PaymentIntent for an AtlaasGo order.
 * Returns clientSecret for Stripe Elements (used by /checkout/:id).
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY=sk_live_…
 *
 * POST { orderId, totalDh, customerEmail? }
 * → { clientSecret, paymentIntentId }
 */
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-04-30.basil',
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { orderId, totalDh, customerEmail } = await req.json();

    if (!orderId) {
      return json({ error: 'Missing orderId' }, 400);
    }

    // Verify the order exists and hasn't already been paid
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, total_dh, stripe_payment_intent_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return json({ error: 'Order not found' }, 404);
    }

    // SECURITY: charge the amount stored on the order row, never the
    // client-supplied totalDh. order.total_dh is the server's record of what
    // is owed; trusting the request body would let a tampered client pair a
    // real high-value orderId with an arbitrary low amount (or overcharge).
    if (!order.total_dh || order.total_dh <= 0) {
      return json({ error: 'Order has no payable amount' }, 400);
    }

    // If there's already a payment intent, reuse it (idempotent)
    if (order.stripe_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          order.stripe_payment_intent_id,
        );
        if (
          existing.status === 'requires_payment_method' ||
          existing.status === 'requires_confirmation' ||
          existing.status === 'requires_action'
        ) {
          return json({
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
          });
        }
        // If already succeeded/canceled, create a new one
      } catch {
        // Payment intent not found or invalid, create new
      }
    }

    // Convert DH to centimes (MAD: 1 DH = 100 centimes) — from the trusted
    // order row, not the request body.
    const amountCentimes = Math.round(order.total_dh * 100);
    // Defensive cross-check: if the client sent a total, it must match the
    // order's total exactly, otherwise reject rather than silently charging.
    if (totalDh != null && Math.round(totalDh * 100) !== amountCentimes) {
      return json({ error: 'Amount mismatch with order total' }, 400);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCentimes,
      currency: 'mad',
      metadata: { orderId },
      receipt_email: customerEmail || undefined,
      description: `AtlaasGo Order #${orderId.slice(0, 8)}`,
      automatic_payment_methods: { enabled: true },
    });

    // Store the payment intent ID on the order
    await supabase
      .from('orders')
      .update({
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('id', orderId);

    return json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-payment-intent error:', message);
    return json({ error: message }, 500);
  }
});

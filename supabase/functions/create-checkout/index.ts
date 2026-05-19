/**
 * Supabase Edge Function: create-checkout
 *
 * Creates a Stripe Checkout Session for an AtlaasGo order.
 * The client calls this after inserting the order row, then
 * redirects to the returned URL.
 *
 * Required secrets (set via `supabase secrets set`):
 *   STRIPE_SECRET_KEY=sk_live_…  (or sk_test_… for dev)
 *
 * Expects POST body:
 *   { orderId, totalDh, customerEmail? }
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { orderId, totalDh, customerEmail, siteUrl } = await req.json();

    if (!orderId || !totalDh) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or totalDh' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Convert DH to centimes (Stripe uses smallest currency unit)
    // MAD (Moroccan Dirham) → centimes: 1 DH = 100 centimes
    const amountCentimes = Math.round(totalDh * 100);

    const origin = siteUrl || 'https://atlaasgo.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'mad',
            unit_amount: amountCentimes,
            product_data: {
              name: `AtlaasGo Order`,
              description: `Order #${orderId.slice(0, 8)}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { orderId },
      success_url: `${origin}/track/${orderId}?paid=1`,
      cancel_url: `${origin}/cart?cancelled=1`,
    });

    // Update the order with payment intent info
    await supabase
      .from('orders')
      .update({
        payment_method: 'stripe',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

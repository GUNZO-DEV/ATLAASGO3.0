/**
 * Supabase Edge Function: create-prime-checkout
 *
 * Creates a Stripe Checkout Session for an AtlaasGo Prime subscription.
 * Uses one-time payment mode — activates the subscription on success callback.
 *
 * Expects POST body:
 *   { tier: 'student' | 'standard' | 'campus_pass', userId, customerEmail? }
 */
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2025-04-30.basil' });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TIER_CONFIG: Record<string, { name: string; priceDh: number; durationDays: number }> = {
  student:     { name: 'Prime Student',      priceDh: 39,  durationDays: 30 },
  standard:    { name: 'Prime Standard',     priceDh: 79,  durationDays: 30 },
  campus_pass: { name: 'Prime Campus Pass',  priceDh: 299, durationDays: 150 },
};

Deno.serve(async (req) => {
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
    const { tier, userId, customerEmail, siteUrl } = await req.json();

    const config = TIER_CONFIG[tier];
    if (!config || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing tier or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const amountCentimes = Math.round(config.priceDh * 100);
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
              name: config.name,
              description: `AtlaasGo ${config.name} — ${config.durationDays} days`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { userId, tier, durationDays: String(config.durationDays) },
      success_url: `${origin}/prime?success=1&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/prime?cancelled=1`,
    });

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

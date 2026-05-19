/**
 * Supabase Edge Function: activate-prime
 *
 * Verifies a Stripe Checkout Session was paid, then activates the
 * Prime subscription in the database.
 *
 * Expects POST body:
 *   { sessionId: string }
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
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    const durationDays = parseInt(session.metadata?.durationDays ?? '30', 10);

    if (!userId || !tier) {
      return new Response(
        JSON.stringify({ error: 'Invalid session metadata' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Deactivate any existing subscription
    await supabase
      .from('prime_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Create the new subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const { error: insErr } = await supabase.from('prime_subscriptions').insert({
      user_id: userId,
      tier,
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      stripe_subscription_id: session.payment_intent as string,
      is_active: true,
    });

    if (insErr) {
      return new Response(
        JSON.stringify({ error: insErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, tier, expiresAt: expiresAt.toISOString() }),
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

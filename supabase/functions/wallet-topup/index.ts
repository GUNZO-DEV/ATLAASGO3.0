/**
 * Supabase Edge Function: wallet-topup
 *
 * Creates a Stripe PaymentIntent for wallet top-up.
 * After payment succeeds, the stripe-webhook function credits the wallet.
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY=sk_live_…
 *
 * POST { amountDh, userId, customerEmail? }
 * → { clientSecret, paymentIntentId }
 */
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-04-30.basil',
});

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

const MIN_TOPUP = 20;  // 20 DH minimum
const MAX_TOPUP = 2000; // 2000 DH maximum

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { amountDh, userId, customerEmail } = await req.json();

    if (!amountDh || !userId) {
      return json({ error: 'Missing amountDh or userId' }, 400);
    }

    const amount = Number(amountDh);
    if (isNaN(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
      return json({
        error: `Amount must be between ${MIN_TOPUP} and ${MAX_TOPUP} DH`,
      }, 400);
    }

    const amountCentimes = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCentimes,
      currency: 'mad',
      metadata: {
        walletTopupUserId: userId,
        topupAmountDh: String(amount),
      },
      receipt_email: customerEmail || undefined,
      description: `AtlaasGo Wallet Top-up · ${amount} DH`,
      automatic_payment_methods: { enabled: true },
    });

    return json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('wallet-topup error:', message);
    return json({ error: message }, 500);
  }
});

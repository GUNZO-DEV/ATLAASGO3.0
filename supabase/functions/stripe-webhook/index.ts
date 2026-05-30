/**
 * Supabase Edge Function: stripe-webhook
 *
 * Handles Stripe webhook events for order payments, Prime subscriptions,
 * and wallet top-ups. Updates order status and triggers notifications.
 *
 * Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY=sk_live_…
 *   STRIPE_WEBHOOK_SECRET=whsec_…           ← from Stripe Dashboard
 *   SUPABASE_URL                            ← auto
 *   SUPABASE_SERVICE_ROLE_KEY               ← auto
 *
 * Deploy: verify_jwt = false (Stripe signs the request, no JWT to expect)
 * Endpoint: https://toywtnupchfywhtdhxvj.supabase.co/functions/v1/stripe-webhook
 */
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-04-30.basil',
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('Webhook sig verification failed:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Order payment succeeded ────────────────────────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;

        if (orderId) {
          // Advance order: mark as preparing (payment confirmed). Idempotent —
          // only flips when still in 'ordered', so replays are safe.
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              status: 'preparing',
              payment_method: 'stripe',
              stripe_payment_intent_id: pi.id,
            })
            .eq('id', orderId)
            .in('status', ['ordered']);

          if (updateErr) {
            console.error('order update failed', orderId, updateErr);
          } else {
            const { data: order } = await supabase
              .from('orders')
              .select('customer_id, total_dh')
              .eq('id', orderId)
              .maybeSingle();

            if (order?.customer_id) {
              await supabase.from('notifications').insert({
                user_id: order.customer_id,
                kind: 'order_status',
                title: 'Payment confirmed',
                body: `Your payment of ${order.total_dh} DH was successful. Your order is being prepared.`,
                payload: { orderId, status: 'preparing' },
              });
            }
          }
        }

        // Wallet top-up branch
        const walletUserId = pi.metadata?.walletTopupUserId;
        const topupAmountDh = pi.metadata?.topupAmountDh;
        if (walletUserId && topupAmountDh) {
          const amount = Math.round(Number(topupAmountDh));
          if (!Number.isFinite(amount) || amount <= 0) {
            console.error('wallet-topup: bad amount', topupAmountDh);
          } else {
            // RPC handles wallet + ledger insert atomically + the
            // NOT NULL/CHECK guards. Idempotency comes from Stripe's
            // event_id semantics + our reference field.
            const { error: rpcErr } = await supabase.rpc('credit_wallet', {
              p_user_id: walletUserId,
              p_amount: amount,
              p_kind: 'topup',
              p_reference: `stripe:${pi.id}`,
              p_metadata: { paymentIntentId: pi.id, source: 'stripe' },
            });

            if (rpcErr) {
              console.error('credit_wallet failed', rpcErr);
            } else {
              await supabase.from('notifications').insert({
                user_id: walletUserId,
                kind: 'system',
                title: 'Wallet topped up',
                body: `${amount} DH added to your wallet.`,
                payload: { amount, paymentIntentId: pi.id },
              });
            }
          }
        }

        break;
      }

      // ── Payment failed ─────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;

        if (orderId) {
          const { data: order } = await supabase
            .from('orders')
            .select('customer_id')
            .eq('id', orderId)
            .maybeSingle();

          if (order?.customer_id) {
            await supabase.from('notifications').insert({
              user_id: order.customer_id,
              kind: 'order_status',
              title: 'Payment failed',
              body: 'Your payment could not be processed. Please try again or use a different payment method.',
              payload: { orderId, error: pi.last_payment_error?.message },
            });
          }
        }
        break;
      }

      // ── Checkout Session completed (Prime subscriptions) ───────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tier = session.metadata?.tier;
        const userId = session.metadata?.userId;

        if (tier && userId && session.payment_status === 'paid') {
          const expiresAt = new Date();
          if (tier === 'campus_pass') {
            expiresAt.setMonth(expiresAt.getMonth() + 6); // ~semester
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          }

          await supabase
            .from('prime_subscriptions')
            .upsert(
              {
                user_id: userId,
                tier,
                is_active: true,
                started_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                stripe_subscription_id: session.subscription
                  ? String(session.subscription)
                  : session.id,
              },
              { onConflict: 'user_id' },
            );

          await supabase.from('notifications').insert({
            user_id: userId,
            kind: 'system',
            title: `Prime ${tier.replace('_', ' ')} activated`,
            body: 'Welcome to Prime! Your free delivery perks are now active.',
            payload: { tier },
          });
        }
        break;
      }

      // ── Subscription cancelled / expired ───────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;
        await supabase
          .from('prime_subscriptions')
          .update({ is_active: false, expires_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);
        break;
      }

      default:
        // Unhandled event types are logged but acknowledged so Stripe
        // doesn't retry forever.
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook handler error for ${event.type}:`, message);
    // Return 200 to prevent Stripe from retrying on our application errors
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

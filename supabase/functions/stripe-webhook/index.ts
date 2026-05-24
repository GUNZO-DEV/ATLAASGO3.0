/**
 * Supabase Edge Function: stripe-webhook
 *
 * Handles Stripe webhook events for order payments, Prime subscriptions,
 * and wallet top-ups. Updates order status and triggers notifications.
 *
 * Required secrets:
 *   STRIPE_SECRET_KEY=sk_live_…
 *   STRIPE_WEBHOOK_SECRET=whsec_…
 *
 * POST — called by Stripe's webhook system
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
          // Update order: mark as preparing (payment confirmed)
          const { error } = await supabase
            .from('orders')
            .update({
              status: 'preparing',
              payment_method: 'stripe',
              stripe_payment_intent_id: pi.id,
            })
            .eq('id', orderId)
            .in('status', ['ordered']); // Only advance if still in 'ordered'

          if (!error) {
            // Get customer info for notification
            const { data: order } = await supabase
              .from('orders')
              .select('customer_id, total_dh')
              .eq('id', orderId)
              .maybeSingle();

            if (order?.customer_id) {
              // Create notification for customer
              await supabase.from('notifications').insert({
                user_id: order.customer_id,
                kind: 'order_status',
                title: 'Payment confirmed',
                body: `Your payment of ${order.total_dh} dh was successful. Your order is being prepared.`,
                payload: { orderId, status: 'preparing' },
              });
            }
          }
        }

        // Check for wallet top-up metadata
        const walletUserId = pi.metadata?.walletTopupUserId;
        const topupAmountDh = pi.metadata?.topupAmountDh;
        if (walletUserId && topupAmountDh) {
          const amount = parseFloat(topupAmountDh);

          // Credit wallet
          await supabase.rpc('credit_wallet', {
            p_user_id: walletUserId,
            p_amount: amount,
          }).catch(() => {
            // Fallback: direct update if RPC doesn't exist
            return supabase
              .from('wallets')
              .upsert(
                { user_id: walletUserId, balance_dh: amount },
                { onConflict: 'user_id' },
              );
          });

          // Insert transaction record
          await supabase.from('wallet_transactions').insert({
            user_id: walletUserId,
            kind: 'topup',
            amount_dh: amount,
            reference: `Stripe ${pi.id.slice(-8)}`,
          });

          // Notification
          await supabase.from('notifications').insert({
            user_id: walletUserId,
            kind: 'wallet',
            title: 'Wallet topped up',
            body: `${amount} dh added to your wallet.`,
            payload: { amount, paymentIntentId: pi.id },
          });
        }

        break;
      }

      // ── Payment failed ─────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;

        if (orderId) {
          // Get customer for notification
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
          // Activate Prime subscription
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
                stripe_session_id: session.id,
              },
              { onConflict: 'user_id' },
            );

          await supabase.from('notifications').insert({
            user_id: userId,
            kind: 'system',
            title: `Prime ${tier.replace('_', ' ')} activated`,
            body: `Welcome to Prime! Your free delivery perks are now active.`,
            payload: { tier },
          });
        }
        break;
      }

      default:
        // Unhandled event type — log but don't error
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

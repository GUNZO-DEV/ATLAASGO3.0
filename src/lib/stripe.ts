/**
 * Stripe publishable-key wrapper. Lazy-loads @stripe/stripe-js only when a
 * page actually needs it.
 *
 * The secret-key + webhook flow lives on a Supabase Edge Function — wire it
 * up by deploying `supabase/functions/stripe-webhook` and setting:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_…
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…
 */
const PUBLISHABLE = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
export const IS_STRIPE_LIVE = PUBLISHABLE.startsWith('pk_live_');
export const IS_STRIPE_TEST = PUBLISHABLE.startsWith('pk_test_');
export const IS_STRIPE_CONFIGURED = IS_STRIPE_LIVE || IS_STRIPE_TEST;

if (IS_STRIPE_LIVE && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[stripe] LIVE publishable key detected — real cards will be charged. ' +
      'Swap to pk_test_… in .env.local for development.',
  );
}

let stripePromise: Promise<unknown> | null = null;
export async function getStripe() {
  if (!IS_STRIPE_CONFIGURED) return null;
  if (!stripePromise) {
    // Lazy import keeps the main bundle small until checkout actually loads.
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(PUBLISHABLE),
    );
  }
  return stripePromise;
}

export const stripePublishableKey = PUBLISHABLE;

import * as React from 'react';

/**
 * Defensive Stripe loader: @stripe/stripe-react-native is a native module that
 * only exists after a native rebuild. Until then every helper degrades to a
 * clear "rebuild needed" error instead of crashing the bundle at import time.
 */
let StripeModule: any = null;
try {
  StripeModule = require('@stripe/stripe-react-native');
} catch {
  StripeModule = null;
}

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const isStripeAvailable = !!StripeModule && !!STRIPE_PUBLISHABLE_KEY;

/** Provider that no-ops (renders children) when the native module is absent. */
export function StripeProviderMaybe({ children }: { children: React.ReactNode }) {
  if (!isStripeAvailable) return React.createElement(React.Fragment, null, children);
  const { StripeProvider } = StripeModule;
  return React.createElement(
    StripeProvider,
    { publishableKey: STRIPE_PUBLISHABLE_KEY, merchantIdentifier: 'merchant.com.atlaasgo.app' },
    children,
  );
}

/**
 * Present the Stripe PaymentSheet for a PaymentIntent client secret.
 * Resolves true when the payment was completed, false when the user canceled.
 * Throws with a readable message on configuration/payment errors.
 */
export async function payWithPaymentSheet(clientSecret: string, label: string): Promise<boolean> {
  if (!isStripeAvailable) {
    throw new Error('Card payments activate after the next app update.');
  }
  const { initPaymentSheet, presentPaymentSheet } = StripeModule;
  const init = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'AtlaasGo',
    style: 'automatic',
    defaultBillingDetails: { name: label },
  });
  if (init.error) throw new Error(init.error.message);
  const result = await presentPaymentSheet();
  if (result.error) {
    if (result.error.code === 'Canceled') return false;
    throw new Error(result.error.message);
  }
  return true;
}

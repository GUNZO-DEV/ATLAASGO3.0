// AtlaasGo 3.0 — Cart → Checkout redirect.
//
// The cart and checkout used to be two separate screens. They are now merged
// into ONE combined checkout (app/checkout.tsx), matching the live design's
// single-screen order step. This thin redirect keeps any lingering links and
// back-stack entries pointing at `/cart` resolving to the combined screen.
//
// The speed / tip / handoff defaults that the cart used to pass through as
// router params now initialise on the checkout screen itself, so nothing is
// lost by collapsing the route.
import { Redirect } from 'expo-router';

export default function CartRedirect() {
  return <Redirect href="/checkout" />;
}

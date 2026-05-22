// _worker.js — Cloudflare Pages edge function
// Handles SPA routing for dynamic Next.js routes.
// Static files are served directly; dynamic paths get the placeholder shell.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let { pathname } = url;

    // Strip trailing slash for matching (except root)
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    // Dynamic route matching
    const orderBase = pathname.match(/^\/orders\/([^/]+)$/);
    const orderChat = pathname.match(/^\/orders\/([^/]+)\/chat$/);
    const orderCard = pathname.match(/^\/orders\/([^/]+)\/card-payment$/);
    const orderReview = pathname.match(/^\/orders\/([^/]+)\/review$/);
    const restaurant = pathname.match(/^\/restaurants\/([^/]+)$/);

    let assetPath = null;

    if (orderChat && orderChat[1] !== "_") {
      assetPath = "/orders/_/chat.html";
    } else if (orderCard && orderCard[1] !== "_") {
      assetPath = "/orders/_/card-payment.html";
    } else if (orderReview && orderReview[1] !== "_") {
      assetPath = "/orders/_/review.html";
    } else if (orderBase && orderBase[1] !== "_") {
      assetPath = "/orders/_.html";
    } else if (restaurant && restaurant[1] !== "_") {
      assetPath = "/restaurants/_.html";
    }

    if (assetPath) {
      // Serve the placeholder HTML shell — client JS reads the real ID from URL
      const assetUrl = new URL(assetPath, request.url);
      const asset = await env.ASSETS.fetch(assetUrl);
      return new Response(asset.body, {
        status: 200,
        headers: {
          ...Object.fromEntries(asset.headers),
          "content-type": "text/html; charset=utf-8",
          "x-robots-tag": "noindex",
        },
      });
    }

    // For everything else, let Cloudflare serve static files normally
    return env.ASSETS.fetch(request);
  },
};

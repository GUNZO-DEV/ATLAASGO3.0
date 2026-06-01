// _worker.js — Cloudflare Pages edge worker for AtlaasGo SPA
// Serves index.html for all navigation requests (client-side routing).
// Static assets in /assets/ are served directly with immutable cache.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Static assets — serve directly (hashed filenames = immutable)
    if (
      pathname.startsWith('/assets/') ||
      pathname.startsWith('/logos/') ||
      pathname.startsWith('/icons/') ||
      pathname.match(/\.\w{2,5}$/) // .js .css .svg .png .webp .woff2 etc.
    ) {
      return env.ASSETS.fetch(request);
    }

    // All other routes → serve index.html (SPA client-side routing)
    const indexUrl = new URL('/index.html', request.url);
    const indexRes = await env.ASSETS.fetch(indexUrl);

    return new Response(indexRes.body, {
      status: 200,
      headers: {
        ...Object.fromEntries(indexRes.headers),
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache',
      },
    });
  },
};

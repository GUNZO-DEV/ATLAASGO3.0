# AtlaasGo

Ifrane's premium delivery — food, groceries & dorm-drops, for the Atlas region.

This repo currently ships the **customer web app** as the production target.
Mobile (Expo) and the Firebase emulator backend are scaffolded but paused; see
their READMEs for details.

## Stack

- **Vite + React 18 + TypeScript** — SPA on `/`
- **Supabase** — Postgres + Auth + Realtime + RLS as the production backend
- **React Router 6**, **Zustand** (cart), CSS custom properties for theming
- **Cloudflare Pages** for deploy + edge cache, **GitHub Actions** for CI

## Quick start (local dev)

```bash
# one-time
npm install
cp .env.example .env.local            # fill VITE_SUPABASE_URL + ANON_KEY
                                      # → see supabase/README.md to set up the project

npm run dev                           # http://localhost:5173
```

## Scripts

| Script           | What it does                                                  |
|------------------|----------------------------------------------------------------|
| `npm run dev`    | Vite dev server                                                |
| `npm run build`  | `tsc -b` + `vite build` → `dist/`                              |
| `npm run preview`| Serve the production build locally                             |
| `npm run lint`   | `tsc --noEmit`                                                 |

## Production deployment (Cloudflare Pages + Supabase)

### 1 · Supabase

Follow [supabase/README.md](supabase/README.md):
1. Create the project, copy the URL + anon key
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor
3. Enable Email provider, set Site URL + Redirect URLs to your Pages domain

### 2 · Cloudflare Pages — first-time setup (one of two ways)

**Option A · CLI (fastest):**
```bash
npm install -g wrangler          # one-time
wrangler login                    # opens browser for Cloudflare OAuth

# put your real env vars in .env.local first, then:
npm run pages:deploy              # builds + uploads dist/ as project "atlaasgo"
```

The first deploy creates the project and prints a `*.pages.dev` URL.

**Option B · GitHub auto-deploy (preferred for prod):**
1. Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git**.
2. Repo: this one. Build command: `npm run build`. Output dir: `dist`. Node: 22.
3. Settings → Environment variables → add for both **Production** and **Preview**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` (your prod URL, e.g. `https://atlaasgo.pages.dev`)
4. Every push to `main` → production deploy. Every PR → preview deployment with
   its own URL.

`public/_redirects` (`/* /index.html 200`) makes client-side routes survive
hard refresh. `public/_headers` enforces HSTS, X-Frame-Options, asset caching,
and no-cache on the service worker.

### 3 · GitHub Actions CI

`.github/workflows/ci.yml` runs `lint` + `verify:schema` + `build` on every
PR. On push to `main` it additionally deploys to Cloudflare via the
`cloudflare/wrangler-action`. Required repo secrets:

| Secret                       | Where to get it                                        |
|------------------------------|--------------------------------------------------------|
| `CLOUDFLARE_API_TOKEN`       | dash.cloudflare.com → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template (or Pages-only with `Account.Cloudflare Pages: Edit`) |
| `CLOUDFLARE_ACCOUNT_ID`      | dash.cloudflare.com → right sidebar of any zone        |
| `VITE_SUPABASE_URL`          | Supabase → Settings → API                              |
| `VITE_SUPABASE_ANON_KEY`     | Supabase → Settings → API                              |
| `VITE_SITE_URL`              | your prod URL                                          |

If you use **Option B** (Cloudflare auto-deploys from Git), the CI deploy job
is redundant — delete the `deploy:` job from `ci.yml` or skip the
Cloudflare-secret setup.

## Architecture

```
src/
├── main.tsx                ── React root: BrowserRouter + Theme + I18n + AuthProvider
├── App.tsx                 ── route table + IntersectionObserver for .reveal sections
├── components/             ── Nav, Hero, PhoneMockup, Sections, Footer, InstallToast
├── pages/
│   ├── Landing.tsx         ── Hero parallax, Local Legends, How it works, Restaurants, …
│   ├── Order.tsx           ── filterable restaurant browse
│   ├── Restaurant.tsx      ── menu detail, add-to-cart
│   ├── Cart.tsx            ── qty + landmark + GPS + Supabase order create
│   ├── Track.tsx           ── live Supabase realtime subscription on one order
│   ├── Orders.tsx          ── user's order history (auth-gated)
│   ├── Auth.tsx            ── sign-in / sign-up / magic-link via Supabase Auth
│   ├── Rider.tsx           ── (stub) rider portal mock
│   ├── Merchant.tsx        ── (stub) merchant POS mock
│   └── NotFound.tsx
├── lib/
│   ├── supabase.ts         ── createClient with env-driven URL/anon key
│   ├── auth.tsx            ── AuthProvider + useAuth (email/password + magic-link)
│   ├── orders.ts           ── useCreateOrder · useOrder · useOrdersList (with realtime)
│   ├── database.types.ts   ── hand-maintained TS mirror of Supabase schema
│   ├── theme.tsx           ── localStorage-backed dark/light, OS-preference default
│   ├── i18n.tsx            ── EN / FR / AR dictionaries, RTL auto-toggle
│   ├── cart.ts             ── Zustand store with persist (atlaasgo-cart)
│   └── pwa.ts              ── beforeinstallprompt capture + SW registration
├── data/restaurants.ts     ── static menu data (8 Ifrane partners)
├── icons/Icon.tsx          ── inline SVG library (~30 icons)
└── styles/global.css       ── design tokens, light/dark, RTL, all section styles

supabase/
├── schema.sql              ── tables + check constraints + RLS + realtime publication
└── README.md               ── one-time setup steps

public/
├── manifest.webmanifest    ── PWA manifest with shortcuts
├── sw.js                   ── offline-shell service worker
└── favicon.svg

wrangler.toml               ── Cloudflare Pages project config (`atlaasgo`, output `dist`)
public/_redirects           ── SPA fallback: /*  →  /index.html  (200)
public/_headers             ── HSTS, X-Frame-Options, asset caching, no-cache on sw.js
.github/workflows/ci.yml    ── typecheck + verify:schema + build on PR; deploy to Pages on main
```

## Data flow

```
            ┌────────── browser ──────────┐
            │                              │
   Cart ───►│ useCreateOrder → INSERT ─────┼──►  Supabase Postgres
            │                              │     (orders, profiles)
   Track ◄──┤ useOrder (realtime channel) ◄┼──   realtime publication
            │                              │     (postgres_changes on orders)
   Orders ◄─┤ useOrdersList (snapshot+chan)│
            │                              │
            └──────────────────────────────┘
```

- **RLS** ([`supabase/schema.sql`](supabase/schema.sql)): customers can only
  read & insert their own orders; they can only update them to `cancelled`.
  Driver / dispatch updates run from a server with the service-role key.
- **Landmark contract**: enforced in Postgres via CHECK constraints, not in
  client code — `landmark` ≥ 3 chars and mirrored into `driver_payload.headerLandmark`.

## What's not yet wired

See [docs/deferred-integrations.md](docs/deferred-integrations.md) for the full
list — Stripe, push/SMS/email, Google Maps, AI (Gemini/Vision), OAuth
providers, WhatsApp ordering, and the 8 edge functions to add when those land.

The **schema is complete** (38 tables with RLS, seeded restaurants/menus,
realtime publication, audit logs, RBAC roles, payment-method hooks). The
client-side UI for the more advanced features (rider portal beyond mocks,
LYN merchant console, admin) needs to be wired into the new tables — that's
sequenced work for future sessions once the external keys land.

## Paused (not currently deployed)

- [`mobile/`](mobile/) — Expo SDK 54 app prototype. Originally targeted Firestore.
  Will need a port to `@supabase/supabase-js` when you resume the mobile track.
- [`backend/`](backend/) — Firebase emulator. Superseded by Supabase.

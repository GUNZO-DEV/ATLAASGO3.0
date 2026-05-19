# Deferred external integrations

The data model (38 tables + RLS) is fully in place. These features are
*backend-ready* but require third-party accounts, API keys, billing
enrollments, or non-trivial server code to fully ship. Each section lists
the schema hooks already in the DB, what you need to provide, and the
implementation outline.

---

## 1 · Payments — Stripe

**Schema hooks already present:**
- `wallets`, `wallet_transactions` — for top-ups
- `prime_subscriptions.stripe_subscription_id`
- `orders.stripe_payment_intent_id`
- `orders.payment_method`

**You need:**
- [ ] Stripe account (https://dashboard.stripe.com — Test mode is enough to start)
- [ ] Publishable key (`pk_…`) + Secret key (`sk_…`)
- [ ] A Stripe webhook signing secret (`whsec_…`)
- [ ] Decide on a fee model (AtlaasGo platform direct vs. Connect-style merchant payouts)

**Implementation outline (~1–2 days):**
1. Add `VITE_STRIPE_PUBLISHABLE_KEY` to Cloudflare Pages env.
2. Store `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` as Supabase edge-function secrets:
   `supabase secrets set STRIPE_SECRET_KEY=…`.
3. Edge functions (Deno) in `supabase/functions/`:
   - `create-payment-intent` — called from the cart submit → returns `client_secret`
   - `stripe-webhook` — validates signature, marks `orders.status='paid'`, credits wallets, activates `prime_subscriptions`
   - `create-checkout-session` — for one-tap Prime upgrade
   - `process-refund` — admin-only via service role
4. Wire `@stripe/stripe-js` on the client; mount `<PaymentElement />` in checkout.

---

## 2 · Notifications

### 2a · Web Push (browser)
**Schema hooks:** `push_tokens` (platform = 'web'; uses `endpoint`/`p256dh`/`auth_key`).

**You need:**
- [ ] Generate VAPID keypair (`npx web-push generate-vapid-keys`)
- [ ] Store the public key in `VITE_VAPID_PUBLIC_KEY`; the private key in Supabase function secrets

**Outline:** add `subscribe` flow in `sw.js`, store subscription in `push_tokens`, dispatch via `web-push` from a Supabase edge function on `order_status` change.

### 2b · FCM (mobile, when mobile track resumes)
**You need:**
- [ ] Firebase project (free tier OK — used only for FCM)
- [ ] Service-account JSON for FCM v1 API → store in function secret

### 2c · SMS — Twilio
**Schema:** none needed — fire-and-forget.

**You need:**
- [ ] Twilio account, paid (~$0.075/msg to Morocco)
- [ ] A Twilio Messaging Service SID + Auth Token
- [ ] An originating phone number that supports Morocco

**Outline:** edge function `send-sms` fired on the `order_status` realtime change for the customer's phone.

### 2d · Transactional Email
The simplest path is **Resend** (https://resend.com — free 3000/mo) since it has the smallest setup. Supabase's default Auth emails work out of the box; transactional (receipts, refunds) need Resend.

**You need:** `RESEND_API_KEY`, a verified sending domain.

---

## 3 · Maps & Location

### 3a · Geocoding — Nominatim (free)
No keys needed. Self-hosted or via https://nominatim.openstreetmap.org. Edge function: `geocode-address` → cache result in `addresses.coords`.

### 3b · Directions / ETA — Google Maps
**You need:**
- [ ] GCP project with billing
- [ ] Maps JavaScript API + Directions API enabled
- [ ] API key restricted to your Pages domain

**Wire as `VITE_GOOGLE_MAPS_API_KEY`.**

### 3c · Live Tracking
Schema hooks already in: `rider_locations` (append-only) + realtime publication. Wire a `useRiderLocation(orderId)` hook subscribing via `postgres_changes`.

---

## 4 · AI features

### 4a · Atlaas AI Chatbot — Gemini
**You need:** Google AI Studio API key (free tier: 60 req/min).
**Secret:** `GEMINI_API_KEY` (edge function).
**Outline:** edge function `ai-chat` that proxies user messages to Gemini, optionally injecting recent order + restaurant context from Postgres.

### 4b · Menu OCR — Google Cloud Vision
**You need:** GCP project (same one as Maps works), Vision API enabled, service-account JSON.
**Outline:** edge function `ocr-menu` accepts an upload, returns structured JSON; merchant approves → `apply_migration`-style write to `menu_items`.

### 4c · Recommendation engine
Pure DB; no external keys. SQL view: `recommended_for_user(uid)` joining `orders` + `favorites` + `restaurants` with simple cosine similarity on `cuisine_tags`. Can ship without external infra.

### 4d · ML delivery ETAs
Postgres function trained on completed `orders` + `rider_locations`. No external keys. Stretch goal.

---

## 5 · OAuth providers

### 5a · Google
1. https://console.cloud.google.com → OAuth consent screen → Create OAuth client (Web)
2. Authorized redirect URI: `https://toywtnupchfywhtdhxvj.supabase.co/auth/v1/callback`
3. Supabase dashboard → Authentication → Providers → Google → paste Client ID + Secret

### 5b · Sign in with Apple
Required only if you re-enable the mobile App-Store track. Apple Developer Program ($99/yr) required.

### 5c · Phone OTP
SMS-based, uses Twilio. Enable in Supabase Auth → Providers → Phone.

---

## 6 · WhatsApp ordering
**Schema hook:** `restaurants.whatsapp_phone`.
**Implementation:** click-to-WhatsApp link with prefilled cart text. No API key needed.
**Outline:** on `RestaurantPage`, if `whatsapp_phone` is set, render an "Order via WhatsApp" CTA that opens `https://wa.me/<phone>?text=<encoded summary>`.

For two-way conversation (WhatsApp Business API), Meta business verification is required + a BSP like Twilio or 360dialog. Deferred.

---

## 7 · Required Supabase dashboard toggles

These can't be set via SQL or MCP — only via dashboard:

| Setting | Where | Why |
|---|---|---|
| **Site URL** = `https://atlaasgo.pages.dev` | Auth → URL Configuration | Magic-link emails redirect here |
| **Redirect URLs** include `https://*.atlaasgo.pages.dev/**` + `http://localhost:5173/**` | Auth → URL Configuration | PR previews + local dev |
| **Email provider** = Email | Auth → Providers | Sign-up + magic link |
| **Leaked Password Protection** = on | Auth → Policies | Blocks pwned passwords (HIBP) |
| **Email templates** customized | Auth → Email Templates | Branded confirm/reset |
| Custom SMTP (Resend) | Auth → SMTP Settings | Higher daily send limit |

---

## 8 · Server-side workers needed (edge functions)

When you're ready, scaffold these in `supabase/functions/`. None exist yet:

| Function | Trigger | Purpose |
|---|---|---|
| `assign-rider` | `orders.status` → `enRoute` | Pick the closest online rider, write `order_assignments` |
| `stripe-webhook` | Stripe POST | Verify signature, update orders + wallet |
| `send-notification` | `orders.status` change | Fan out to push_tokens + send email/SMS |
| `account-deletion` | client RPC | Apple guideline 5.1.1(v) compliance (anonymise orders, delete profile) |
| `geocode-address` | client RPC | Nominatim wrapper with caching |
| `ai-chat` | client RPC | Gemini proxy with context injection |
| `ocr-menu` | client RPC | Vision API menu OCR |
| `rls-regression-tests` | scheduled | Daily run, alerts admins on RLS drift |

Wire with `supabase functions deploy <name>` once the CLI is installed.

---

## TL;DR — what's already wired vs not

**Wired today:**
- Real Supabase Postgres backend with 38 tables, all RLS-protected
- Email/password + magic-link auth
- Live order tracking via Postgres Realtime
- Cloudflare Pages deploy with security headers + SPA fallback
- CI on GitHub Actions
- Schema verification script in CI

**Not wired (this doc covers each):**
- Stripe payments
- Push / SMS / transactional email
- Google Maps + Directions
- AI (Gemini, Cloud Vision)
- Google / Apple / Phone OAuth
- WhatsApp ordering link
- Edge functions

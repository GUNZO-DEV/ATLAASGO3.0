# AtlaasGo · Supabase setup

This folder holds the SQL that defines the AtlaasGo database. Apply it once
when setting up a fresh Supabase project; re-run it (it's idempotent) when
you change the schema.

## One-time project setup

1. Create a Supabase project at https://supabase.com → choose a region close
   to Morocco (eu-west or fra are fine for Ifrane).
2. **Database password** — pick a long one; store it in 1Password.
3. **Settings → API** — copy `Project URL` and `anon (public)` key.
4. Paste them into the project root `.env.local`:
   ```bash
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
5. **SQL editor → New query** → paste the contents of [`schema.sql`](schema.sql)
   → Run. It will:
   - create `public.profiles` and `public.orders` with check constraints
   - install the auth trigger that auto-creates a profile on sign-up
   - enable Row-Level Security
   - add the policies (self-read, self-insert, self-update with status guard)
   - register `orders` with the realtime publication
6. **Authentication → Providers** → enable **Email**. Tick "Confirm email" and
   "Enable email signup". Magic-link works out of the box once Email is on.
7. **Authentication → URL Configuration** → set
   - Site URL: your production URL (e.g. `https://atlaasgo.com`)
   - Redirect URLs: add `http://localhost:5173/**` for local dev and your
     deploy preview URL.

## When you change the schema

```bash
# regenerate types (one-time CLI setup)
npm install -g supabase
supabase login
supabase link --project-ref <project-id>
supabase gen types typescript --linked > src/lib/database.types.ts
```

For now `src/lib/database.types.ts` is hand-maintained — keep it in sync with
the SQL.

## What lives in the DB

| Table       | Purpose                                                       | RLS                                         |
|-------------|---------------------------------------------------------------|---------------------------------------------|
| `profiles`  | One row per auth user; display name & phone                   | Self read/update                            |
| `orders`    | All customer orders; mirrors landmark into `driver_payload`   | Self read/insert; self update only to cancel|

The driver/dispatch side will use a **service-role key** from a separate
worker to bypass RLS and update statuses — that's deliberately out of scope
for the customer web client.

## Production checklist before going live

- [ ] Add a billing alert in the Supabase dashboard
- [ ] Rotate the JWT secret (Settings → API → Reveal → Rotate) after testing
- [ ] Configure the SMTP sender in Auth → Email Templates (default sender has
      a low daily send limit)
- [ ] Add a privacy-policy and account-deletion link in the app
- [ ] Run `EXPLAIN ANALYZE select * from orders where customer_id = ...` after
      seeding ~1000 orders to confirm the composite index is being used

-- ============================================================================
-- AtlaasGo · canonical Supabase schema
-- ----------------------------------------------------------------------------
-- This is the single source of truth for the production database.
-- All statements are idempotent — paste into the SQL editor of any blank
-- Supabase project to bootstrap, or re-run after edits.
--
-- Applied incrementally to the production project as migrations:
--   20260517072945  initial_atlaasgo_schema
--   20260517074216  roles_and_rbac
--   20260517074244  catalog_restaurants_menus
--   20260517074331  customer_features
--   20260517074406  rider_features
--   20260517074444  extend_orders_table
--   20260517074505  order_chat_and_typing
--   20260517074557  lyn_merchant_features
--   20260517074635  admin_workflows
--   20260517074709  group_ordering_and_realtime
--   20260517074804  seed_catalog
--   20260517074940  harden_helpers_and_rpcs
-- ============================================================================

-- ─── Updated-at trigger function (security hardened) ───────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'ordered','preparing','enRoute','outForDelivery','arriving','delivered','cancelled'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('customer','merchant','rider','admin','super_admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'restaurant_status') then
    create type public.restaurant_status as enum ('draft','pending','live','paused','rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'favorite_kind') then
    create type public.favorite_kind as enum ('restaurant','menu_item');
  end if;
  if not exists (select 1 from pg_type where typname = 'wallet_tx_kind') then
    create type public.wallet_tx_kind as enum ('topup','order_payment','refund','referral_bonus','adjustment');
  end if;
  if not exists (select 1 from pg_type where typname = 'prime_tier') then
    create type public.prime_tier as enum ('student','standard','campus_pass');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type public.notification_kind as enum (
      'order_status','chat_message','promo','system','rider_assignment','review_request','wallet'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'rider_status') then
    create type public.rider_status as enum ('offline','online','busy','on_break');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_kind') then
    create type public.message_kind as enum ('text','quick_reply','location','system');
  end if;
  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum ('pending','confirmed','seated','no_show','cancelled','completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'kitchen_status') then
    create type public.kitchen_status as enum ('queued','in_progress','ready','served','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type public.staff_role as enum ('owner','manager','cashier','kitchen','host','server');
  end if;
  if not exists (select 1 from pg_type where typname = 'incident_severity') then
    create type public.incident_severity as enum ('info','low','medium','high','critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum ('submitted','reviewing','approved','rejected','needs_info');
  end if;
  if not exists (select 1 from pg_type where typname = 'promo_kind') then
    create type public.promo_kind as enum ('percent_off','flat_off','free_delivery','bogo');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('open','pending','resolved','closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_group_status') then
    create type public.order_group_status as enum ('open','locked','submitted','cancelled');
  end if;
end$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- user_roles (multi-role; default 'customer' granted on signup)
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index if not exists user_roles_role_idx on public.user_roles (role);

-- restaurants + menu
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  cuisine text not null,
  cuisine_tags text[] not null default '{}',
  description text,
  emoji text,
  img_variant integer not null default 0,
  rating numeric(2,1) not null default 4.5 check (rating between 0 and 5),
  time_min integer not null default 20,
  fee_dh integer not null default 0,
  tag text,
  status public.restaurant_status not null default 'live',
  owner_id uuid references auth.users(id) on delete set null,
  coords jsonb,
  is_campus_partner boolean not null default false,
  is_local_legend boolean not null default false,
  whatsapp_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists restaurants_status_idx on public.restaurants (status);
create index if not exists restaurants_cuisine_tags_idx on public.restaurants using gin (cuisine_tags);
create index if not exists restaurants_owner_idx on public.restaurants (owner_id);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists menu_categories_restaurant_idx on public.menu_categories (restaurant_id, sort_order);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price_dh integer not null check (price_dh >= 0),
  available boolean not null default true,
  image_url text,
  sort_order integer not null default 0,
  popularity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_items_restaurant_idx on public.menu_items (restaurant_id);
create index if not exists menu_items_category_idx on public.menu_items (category_id);

-- orders (extended)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  status public.order_status not null default 'ordered',
  landmark text not null,
  coords jsonb not null,
  driver_payload jsonb not null,
  subtotal_dh integer not null,
  delivery_fee_dh integer not null default 0,
  service_fee_dh integer not null default 0,
  total_dh integer not null,
  delivery_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_landmark_min_length check (char_length(landmark) >= 3),
  constraint orders_driver_payload_shape check (
    driver_payload ? 'headerLandmark' and driver_payload ? 'coords'
    and char_length(driver_payload->>'headerLandmark') >= 3
  ),
  constraint orders_coords_shape check (
    coords ? 'lat' and coords ? 'lng'
    and (coords->>'lat')::numeric between -90 and 90
    and (coords->>'lng')::numeric between -180 and 180
  ),
  constraint orders_totals_nonneg check (
    subtotal_dh >= 0 and total_dh >= 0 and delivery_fee_dh >= 0 and service_fee_dh >= 0
  )
);

alter table public.orders add column if not exists restaurant_id uuid references public.restaurants(id) on delete set null;
alter table public.orders add column if not exists address_id uuid;
alter table public.orders add column if not exists scheduled_for timestamptz;
alter table public.orders add column if not exists is_campus boolean not null default false;
alter table public.orders add column if not exists campus_building text;
alter table public.orders add column if not exists campus_room text;
alter table public.orders add column if not exists group_id uuid;
alter table public.orders add column if not exists promotion_code text;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists table_id uuid;

create index if not exists orders_customer_id_created_at_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_restaurant_id_idx on public.orders (restaurant_id);
create index if not exists orders_scheduled_for_idx on public.orders (scheduled_for) where scheduled_for is not null;
create index if not exists orders_group_id_idx on public.orders (group_id) where group_id is not null;

-- Customer features
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  line1 text not null,
  building text,
  room text,
  coords jsonb not null,
  landmark text,
  is_default boolean not null default false,
  is_campus boolean not null default false,
  created_at timestamptz not null default now(),
  constraint addresses_coords_shape check (
    coords ? 'lat' and coords ? 'lng'
    and (coords->>'lat')::numeric between -90 and 90
    and (coords->>'lng')::numeric between -180 and 180
  )
);
create index if not exists addresses_user_idx on public.addresses (user_id);
create unique index if not exists addresses_one_default_per_user on public.addresses (user_id) where is_default;

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.favorite_kind not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);
create index if not exists favorites_target_idx on public.favorites (kind, target_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  rider_id uuid references auth.users(id) on delete set null,
  rating_restaurant smallint check (rating_restaurant between 1 and 5),
  rating_rider smallint check (rating_rider between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, customer_id)
);
create index if not exists reviews_restaurant_idx on public.reviews (restaurant_id);
create index if not exists reviews_rider_idx on public.reviews (rider_id);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_dh integer not null default 0 check (balance_dh >= 0),
  currency text not null default 'MAD',
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(user_id) on delete cascade,
  kind public.wallet_tx_kind not null,
  amount_dh integer not null,
  reference text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_wallet_idx on public.wallet_transactions (wallet_id, created_at desc);

create table if not exists public.prime_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.prime_tier not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  stripe_subscription_id text,
  is_active boolean not null default true
);
create index if not exists prime_active_idx on public.prime_subscriptions (user_id) where is_active;

create table if not exists public.referral_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  uses integer not null default 0
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid not null references auth.users(id) on delete cascade,
  code text references public.referral_codes(code) on delete set null,
  reward_dh integer not null default 0,
  granted_at timestamptz not null default now(),
  unique (referrer_id, referee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_user_all_idx on public.notifications (user_id, created_at desc);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('web','ios','android')),
  token text not null,
  endpoint text,
  p256dh text,
  auth_key text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- Rider features
create table if not exists public.riders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vehicle text,
  plate text,
  status public.rider_status not null default 'offline',
  last_location jsonb,
  last_seen_at timestamptz,
  rating numeric(2,1) not null default 5.0 check (rating between 0 and 5),
  total_trips integer not null default 0,
  total_earnings_dh integer not null default 0,
  documents_verified boolean not null default false,
  emergency_contact text,
  created_at timestamptz not null default now()
);
create index if not exists riders_status_idx on public.riders (status);

create table if not exists public.rider_locations (
  id bigserial primary key,
  rider_id uuid not null references auth.users(id) on delete cascade,
  coords jsonb not null,
  speed_mps numeric,
  heading_deg numeric,
  recorded_at timestamptz not null default now(),
  constraint rider_locations_coords_shape check (coords ? 'lat' and coords ? 'lng')
);
create index if not exists rider_locations_rider_recent_idx on public.rider_locations (rider_id, recorded_at desc);

create table if not exists public.rider_payouts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users(id) on delete cascade,
  amount_dh integer not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists rider_payouts_rider_idx on public.rider_payouts (rider_id, period_end desc);

create table if not exists public.rider_badges (
  rider_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  awarded_at timestamptz not null default now(),
  primary key (rider_id, badge_key)
);

create table if not exists public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  rider_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  reject_reason text,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  is_active boolean not null default true
);
create index if not exists order_assignments_active_idx on public.order_assignments (order_id) where is_active;
create index if not exists order_assignments_rider_idx on public.order_assignments (rider_id, assigned_at desc);

-- Chat
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role public.app_role not null,
  kind public.message_kind not null default 'text',
  body text,
  location_lat numeric,
  location_lng numeric,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint order_messages_payload_nonempty check (
    (kind in ('text','quick_reply') and body is not null and char_length(trim(body)) > 0)
    or (kind = 'location' and location_lat is not null and location_lng is not null)
    or (kind = 'system')
  )
);
create index if not exists order_messages_order_idx on public.order_messages (order_id, created_at desc);

create table if not exists public.order_typing (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (order_id, user_id)
);

-- LYN merchant
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null,
  capacity integer not null default 4,
  qr_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  position_x integer,
  position_y integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, label)
);
create index if not exists restaurant_tables_restaurant_idx on public.restaurant_tables (restaurant_id);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  guest_name text,
  guest_phone text,
  party_size integer not null check (party_size > 0),
  scheduled_for timestamptz not null,
  status public.reservation_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists reservations_restaurant_when_idx on public.reservations (restaurant_id, scheduled_for);

create table if not exists public.kitchen_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  status public.kitchen_status not null default 'queued',
  station text,
  started_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists kitchen_tickets_restaurant_status_idx on public.kitchen_tickets (restaurant_id, status);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  unit text not null default 'pcs',
  stock_count numeric not null default 0,
  low_threshold numeric not null default 0,
  cost_per_unit_dh integer,
  updated_at timestamptz not null default now()
);
create index if not exists inventory_low_idx on public.inventory_items (restaurant_id) where stock_count <= low_threshold;

create table if not exists public.restaurant_staff (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_role public.staff_role not null,
  hired_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  body text not null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz not null default now(),
  pinned boolean not null default false
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  severity public.incident_severity not null default 'low',
  kind text not null,
  body text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists incidents_restaurant_idx on public.incidents (restaurant_id, created_at desc);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  target_table text,
  target_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- Admin
create table if not exists public.restaurant_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete set null,
  business_name text not null,
  contact_email text not null,
  contact_phone text,
  cuisine text,
  city text default 'Ifrane',
  documents jsonb not null default '{}',
  status public.application_status not null default 'submitted',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists restaurant_apps_status_idx on public.restaurant_applications (status, created_at desc);

create table if not exists public.rider_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  contact_phone text not null,
  email text,
  vehicle text,
  plate text,
  license_url text,
  insurance_url text,
  status public.application_status not null default 'submitted',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists rider_apps_status_idx on public.rider_applications (status, created_at desc);

create table if not exists public.promotions (
  code text primary key,
  kind public.promo_kind not null,
  description text,
  percent_off smallint check (percent_off between 0 and 100),
  flat_off_dh integer check (flat_off_dh >= 0),
  min_subtotal_dh integer not null default 0,
  max_redemptions integer,
  redemptions integer not null default 0,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists promotions_active_idx on public.promotions (is_active, valid_to);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  body text not null,
  order_id uuid references public.orders(id) on delete set null,
  status public.ticket_status not null default 'open',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- Groups
create table if not exists public.order_groups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  status public.order_group_status not null default 'open',
  deadline timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists order_groups_invite_idx on public.order_groups (invite_code);
create index if not exists order_groups_host_idx on public.order_groups (host_id, created_at desc);

create table if not exists public.order_group_participants (
  group_id uuid not null references public.order_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  items jsonb not null default '[]',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_participants_user_idx on public.order_group_participants (user_id);

-- ─── Late-binding foreign keys (after referenced tables exist) ────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_address_id_fkey') then
    alter table public.orders add constraint orders_address_id_fkey
      foreign key (address_id) references public.addresses(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_table_id_fkey') then
    alter table public.orders add constraint orders_table_id_fkey
      foreign key (table_id) references public.restaurant_tables(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_group_id_fkey') then
    alter table public.orders add constraint orders_group_id_fkey
      foreign key (group_id) references public.order_groups(id) on delete set null;
  end if;
end$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
drop trigger if exists restaurants_touch_updated_at on public.restaurants;
create trigger restaurants_touch_updated_at before update on public.restaurants for each row execute function public.touch_updated_at();

drop trigger if exists menu_items_touch_updated_at on public.menu_items;
create trigger menu_items_touch_updated_at before update on public.menu_items for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_updated_at();

drop trigger if exists inventory_touch_updated_at on public.inventory_items;
create trigger inventory_touch_updated_at before update on public.inventory_items for each row execute function public.touch_updated_at();

-- ============================================================================
-- AUTH HOOKS: profile + default role on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

create or replace function public.grant_default_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.grant_default_role() from anon, authenticated, public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_created_grant_role on auth.users;
create trigger on_auth_user_created_grant_role after insert on auth.users for each row execute function public.grant_default_role();

-- ============================================================================
-- RBAC HELPER FUNCTIONS
-- ============================================================================
create or replace function public.has_role(check_user uuid, check_role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = check_user and role = check_role);
$$;
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;

create or replace function public.current_user_has_role(check_role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.has_role(auth.uid(), check_role);
$$;
revoke execute on function public.current_user_has_role(public.app_role) from anon, authenticated, public;

create or replace function public.is_order_participant(check_order uuid, check_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.orders o where o.id = check_order and o.customer_id = check_user)
  or exists (select 1 from public.order_assignments a where a.order_id = check_order and a.rider_id = check_user and a.is_active)
  or exists (
    select 1 from public.orders o join public.restaurants r on r.id = o.restaurant_id
    where o.id = check_order and r.owner_id = check_user
  );
$$;
revoke execute on function public.is_order_participant(uuid, uuid) from anon, authenticated, public;

create or replace function public.is_restaurant_staff(check_restaurant uuid, check_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.restaurants r where r.id = check_restaurant and r.owner_id = check_user)
  or exists (select 1 from public.restaurant_staff s where s.restaurant_id = check_restaurant and s.user_id = check_user);
$$;
revoke execute on function public.is_restaurant_staff(uuid, uuid) from anon, authenticated, public;

create or replace function public.is_group_participant(check_group uuid, check_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.order_groups g where g.id = check_group and g.host_id = check_user)
  or exists (select 1 from public.order_group_participants p where p.group_id = check_group and p.user_id = check_user);
$$;
revoke execute on function public.is_group_participant(uuid, uuid) from anon, authenticated, public;

-- ============================================================================
-- ROW LEVEL SECURITY: enable on every public table
-- ============================================================================
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end$$;

-- Policies — see the migrations in supabase/migrations/ history for the full
-- canonical set. The applied production schema has every table covered.
-- A snapshot of policies as currently deployed can be re-pulled via:
--   `supabase db pull` once the CLI is wired in.

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
do $$
declare t text;
begin
  for t in select unnest(array[
    'orders','order_messages','order_typing','notifications',
    'order_assignments','rider_locations','kitchen_tickets','order_group_participants'
  ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t and schemaname = 'public'
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;

-- 3.0 checkout persists the delivery speed, courier tip and handoff choice that
-- the server-priced cart_quote bill is built from (handoff/AtlaasGo API.md §6).
-- Applied live to project toywtnupchfywhtdhxvj; captured here for reproducibility.
alter table public.orders add column if not exists tip_dh        int  not null default 0;
alter table public.orders add column if not exists delivery_speed text not null default 'standard';
alter table public.orders add column if not exists handoff        text not null default 'door';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_delivery_speed_chk') then
    alter table public.orders add constraint orders_delivery_speed_chk check (delivery_speed in ('standard','priority'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_handoff_chk') then
    alter table public.orders add constraint orders_handoff_chk check (handoff in ('door','hand','lounge'));
  end if;
end $$;

-- handoff/AtlaasGo API.md §1: User.language / User.theme persist on PATCH /me so
-- they follow the account across devices (previously localStorage-only).
-- Applied live to project toywtnupchfywhtdhxvj; captured here for reproducibility.

alter table public.profiles add column if not exists language text not null default 'en';
alter table public.profiles add column if not exists theme    text not null default 'light';
alter table public.profiles add column if not exists campus_id text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_language_chk') then
    alter table public.profiles add constraint profiles_language_chk check (language in ('en','fr','ar'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_chk') then
    alter table public.profiles add constraint profiles_theme_chk check (theme in ('light','dark'));
  end if;
end $$;

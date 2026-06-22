-- addresses.coords was NOT NULL, but the app saves landmark-only addresses
-- (coords is null when device GPS is denied/unavailable) — the insert then
-- violated the NOT NULL constraint, so saving/updating an address silently failed
-- on real phones (it only worked on the emulator because its GPS is always faked,
-- so coords was never null). This broke the Addresses screen AND checkout
-- (no saved addresses ever persisted). Allow null; checkout falls back to live
-- GPS capture when a saved address has no pin.
-- Applied live to project toywtnupchfywhtdhxvj via Supabase MCP on 2026-06-22.
alter table public.addresses alter column coords drop not null;

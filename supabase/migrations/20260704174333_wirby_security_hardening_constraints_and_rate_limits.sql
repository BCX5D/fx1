-- ============================================================================
-- Security hardening: bounded text fields + server-side rate limiting store.
-- No production data exists yet in lp_items/lp_audit/lp_prefs/lp_subscriptions
-- (verified empty before this migration), so these are safe additive changes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bound unconstrained text columns. Previously these had no length limit,
--    so a single malicious insert (item title, vendor, notes, audit detail,
--    prefs email) could write megabytes into a row -- a cheap storage-bloat /
--    cost-abuse vector with no legitimate use case that needs it. Limits are
--    generous enough that no real user input is affected.
-- ---------------------------------------------------------------------------
alter table public.lp_items
  add constraint lp_items_title_len check (char_length(title) <= 300),
  add constraint lp_items_vendor_len check (vendor is null or char_length(vendor) <= 200),
  add constraint lp_items_notes_len check (notes is null or char_length(notes) <= 5000),
  add constraint lp_items_currency_len check (char_length(currency) <= 8);

alter table public.lp_audit
  add constraint lp_audit_actor_len check (char_length(actor) <= 320),
  add constraint lp_audit_action_len check (char_length(action) <= 100),
  add constraint lp_audit_target_title_len check (target_title is null or char_length(target_title) <= 300),
  add constraint lp_audit_detail_len check (detail is null or char_length(detail) <= 2000);

alter table public.lp_prefs
  add constraint lp_prefs_email_len check (char_length(email) <= 320);

-- source/confidence stay jsonb with no separate size cap; Postgres already
-- caps a single field well below what any legitimate extraction snippet
-- (capped at 200 chars client-side in src/lib/extract.ts) would ever produce.
-- A belt-and-suspenders cap on the serialized jsonb size guards against a
-- crafted request that skips the client entirely and posts a huge blob.
alter table public.lp_items
  add constraint lp_items_source_size check (pg_column_size(source) <= 20000),
  add constraint lp_items_confidence_size check (confidence is null or pg_column_size(confidence) <= 4000);

-- ---------------------------------------------------------------------------
-- 2. Server-side rate limiting store, used by Edge Functions (delete-account,
--    paddle-customer, customer-portal, paddle-webhook). Postgres is used
--    instead of standing up a new Redis/Upstash account: it is already the
--    trusted, available datastore for this project, service-role-only access
--    keeps it out of client reach, and the volumes involved (a handful of
--    billing/account actions per user) do not need a dedicated cache tier.
--    This is an explicit "practical over theoretical perfection" choice.
-- ---------------------------------------------------------------------------
create table if not exists public.lp_rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

alter table public.lp_rate_limits enable row level security;
-- No policies at all: anon and authenticated have zero access (RLS default-
-- denies with no matching policy). Only the service-role key (used by Edge
-- Functions, which bypasses RLS) can read or write this table.

-- Fixed-window counter, not a true sliding window: a fixed window is O(1) per
-- check with no extra log table or range scan, and for the volumes here
-- (single-digit-to-low-double-digit requests per window per user/IP) the
-- worst case of a fixed window -- up to ~2x the stated limit for requests
-- that straddle a window boundary -- is an acceptable, well-understood
-- tradeoff against the complexity/cost of a real sliding log. Every call site
-- documents its exact limit and window.
create or replace function public.lp_check_rate_limit(p_key text, p_max_count int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now   timestamptz := now();
  v_count integer;
begin
  insert into public.lp_rate_limits as t (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update set
    count = case
      when t.window_start < v_now - (p_window_seconds || ' seconds')::interval then 1
      else t.count + 1
    end,
    window_start = case
      when t.window_start < v_now - (p_window_seconds || ' seconds')::interval then v_now
      else t.window_start
    end
  returning t.count into v_count;

  return v_count <= p_max_count;
end;
$$;

-- Callable only by the service role (Edge Functions), never by clients --
-- this is an internal abuse-prevention primitive, not an app feature.
revoke execute on function public.lp_check_rate_limit(text, int, int) from anon, authenticated, public;

-- Opportunistic cleanup so this table never grows unbounded: called at the
-- top of lp_check_rate_limit-adjacent Edge Function invocations is overkill,
-- so instead prune old rows probabilistically via a cheap periodic delete
-- Edge Functions can call. Safe to run concurrently (no locking beyond the
-- delete itself); rows are tiny (one per rate-limited key) so this is cheap.
create or replace function public.lp_prune_rate_limits()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.lp_rate_limits where window_start < now() - interval '1 day';
$$;

revoke execute on function public.lp_prune_rate_limits() from anon, authenticated, public;

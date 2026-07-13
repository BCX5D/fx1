-- Wirby billing state + server-side free-tier enforcement.
-- lp_subscriptions mirrors the payment provider (provider stays source of truth).
-- Only the service-role webhook writes it; users may read their own row.

create table if not exists public.lp_subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  plan                text not null default 'free' check (plan in ('free','plus')),
  status              text not null default 'inactive'
                        check (status in ('inactive','active','trialing','past_due','canceled')),
  provider            text not null default 'none' check (provider in ('none','stripe','paddle')),
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_end  timestamptz,
  updated_at          timestamptz not null default now()
);

alter table public.lp_subscriptions enable row level security;

-- Read-only for the owner; all writes happen via the service-role webhook,
-- which bypasses RLS. No client insert/update/delete policies on purpose.
create policy "lp_subscriptions_select_own" on public.lp_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------------
-- Server-side free-tier guard: a free user cannot exceed 25 items,
-- enforced in the database regardless of what the client sends.
-- ------------------------------------------------------------------
create or replace function public.lp_enforce_free_item_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  user_plan     text;
begin
  select plan into user_plan
    from public.lp_subscriptions
    where user_id = new.user_id
      and status in ('active','trialing');

  -- No active paid subscription => treated as free.
  if user_plan is distinct from 'plus' then
    select count(*) into current_count
      from public.lp_items
      where user_id = new.user_id;

    if current_count >= 25 then
      raise exception 'FREE_LIMIT_REACHED'
        using hint = 'Free accounts are limited to 25 items. Upgrade to Plus for unlimited.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lp_items_free_limit on public.lp_items;
create trigger lp_items_free_limit
  before insert on public.lp_items
  for each row execute function public.lp_enforce_free_item_limit();

-- Lock down: this is a trigger only, never callable via the REST RPC endpoint.
revoke execute on function public.lp_enforce_free_item_limit() from anon, authenticated, public;

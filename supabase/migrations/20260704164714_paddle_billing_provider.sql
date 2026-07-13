-- Migrate lp_subscriptions from Stripe-only to Paddle-only billing.
--
-- Status: add "paused" (a real Paddle subscription state with no Stripe
-- equivalent -- billing stops but the subscription isn't canceled). No
-- other status change needed; past_due/active/trialing/canceled/inactive
-- already match Paddle's vocabulary.
--
-- Provider: drop "stripe" entirely. There are zero rows in this table today
-- (pre-launch, zero auth.users), so there is no legacy data to preserve and
-- no reason to keep a Stripe fallback value alive per the migration's "no
-- half-active fallback" requirement.
alter table public.lp_subscriptions drop constraint lp_subscriptions_status_check;
alter table public.lp_subscriptions add constraint lp_subscriptions_status_check
  check (status in ('inactive','active','trialing','past_due','paused','canceled'));

alter table public.lp_subscriptions drop constraint lp_subscriptions_provider_check;
alter table public.lp_subscriptions add constraint lp_subscriptions_provider_check
  check (provider in ('none','paddle'));

alter table public.lp_subscriptions alter column provider set default 'none';

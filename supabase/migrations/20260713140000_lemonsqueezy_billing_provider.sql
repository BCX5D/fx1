-- Switch billing provider to Lemon Squeezy (a Merchant of Record).
--
-- lp_subscriptions has zero rows (pre-launch), so swapping the allowed
-- provider values is safe with no data to migrate.
--
-- Status vocabulary is unchanged: inactive/active/trialing/past_due/paused/
-- canceled already covers every Lemon Squeezy status the webhook normalizes
-- onto it (on_trial->trialing, cancelled/expired->canceled or active-until-
-- ends_at, unpaid->past_due, etc.).
alter table public.lp_subscriptions drop constraint if exists lp_subscriptions_provider_check;
alter table public.lp_subscriptions add constraint lp_subscriptions_provider_check
  check (provider in ('none','lemonsqueezy'));
alter table public.lp_subscriptions alter column provider set default 'none';

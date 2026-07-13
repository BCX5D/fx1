-- Switch billing provider from Paddle back to Stripe, and add reminder
-- send-tracking columns so the scheduled send-reminders Edge Function can
-- dedupe daily/weekly emails.
--
-- lp_subscriptions has zero rows (pre-launch, verified before applying), so
-- swapping the allowed provider values is safe with no data to migrate.

-- Provider: Stripe only now. 'none' remains the default until a checkout runs.
alter table public.lp_subscriptions drop constraint if exists lp_subscriptions_provider_check;
alter table public.lp_subscriptions add constraint lp_subscriptions_provider_check
  check (provider in ('none','stripe'));
alter table public.lp_subscriptions alter column provider set default 'none';

-- Status vocabulary unchanged: inactive/active/trialing/past_due/paused/canceled
-- already covers every Stripe status the webhook normalizes onto it.

-- ---------------------------------------------------------------------------
-- Reminder send tracking. One date each: the last day a due-soon alert /
-- weekly digest was sent to this user, so a double cron fire can't double-send.
-- ---------------------------------------------------------------------------
alter table public.lp_prefs
  add column if not exists last_due_soon_sent date,
  add column if not exists last_digest_sent   date;

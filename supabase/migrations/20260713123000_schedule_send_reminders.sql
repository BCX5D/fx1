-- Schedule the send-reminders Edge Function on a daily cron.
--
-- Uses pg_cron (scheduler) + pg_net (outbound HTTP) to POST the function once
-- a day at 13:00 UTC. The function itself decides per-user whether a due-soon
-- alert and/or (on Mondays) a weekly digest is warranted, and dedupes via
-- lp_prefs.last_due_soon_sent / last_digest_sent.
--
-- AUTH: the call carries an `x-cron-secret` header read at run time from
-- Vault (secret name `wirby_cron_secret`). The send-reminders function rejects
-- any request whose header doesn't match its CRON_SECRET env var. The secret
-- is NOT stored in this migration or the repo -- create it once with:
--   select vault.create_secret(
--     encode(extensions.gen_random_bytes(32), 'hex'),
--     'wirby_cron_secret', 'Shared secret for the send-reminders cron');
-- then set the same value as the CRON_SECRET Edge Function secret.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'wirby-send-reminders',
  '0 13 * * *',
  $$
    select net.http_post(
      url := 'https://kfhbmfaikejsfoxngmue.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'wirby_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);

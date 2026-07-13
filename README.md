# Wirby

A personal admin control center: bills, subscriptions, renewals, warranties, deadlines,
and documents in one calm dashboard that says what needs attention now.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

## Go-live runbook

Everything the code needs is built and deployed. These are the steps only you can do
(they involve accounts and secret keys). Do them in order.

### 1. Deploy the frontend

1. Push the repo to GitHub.
2. Import it into **Vercel** or **Netlify**. Build command `npm run build`, output `dist`.
   SPA routing is handled (`vercel.json` + `public/_redirects`).
3. Set these environment variables in the host dashboard (all client-safe):
   - `VITE_AUTH_MODE=supabase`
   - `VITE_SUPABASE_URL=https://kfhbmfaikejsfoxngmue.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`
   - `VITE_PLAUSIBLE_DOMAIN=wirby.app` (optional analytics)

   There is intentionally **no client-side billing variable** — checkout uses the
   server-generated Lemon Squeezy hosted-checkout redirect, so no billing key
   ships in the browser bundle. All Lemon Squeezy secrets live in Supabase Edge
   Function secrets (see "Payments" below).
4. Point `wirby.app` at the host (bought on Porkbun/Cloudflare).

### 2. Supabase auth settings (dashboard)

- **Authentication → URL config**: set Site URL and Redirect URLs to your real domain,
  and make sure `https://wirby.app/reset-password` (and the equivalent for any
  preview/staging domain) is in the allow-list — the password-reset email link
  will not work otherwise.
- **Turn email confirmation ON** for production (`signUp` already handles the
  "check your inbox" case with a dedicated success screen, not the error banner).
- **Enable leaked-password protection** (Authentication → Policies) — flagged by the
  advisor as off.
- Brand the auth email templates, including the "Reset password" template
  (used by the new `/forgot-password` flow) and the "Confirm signup" template.
- **Not yet independently re-verified in this pass**: whether email confirmation
  and leaked-password protection are actually toggled on in the dashboard today.
  Confirm both manually before launch.

### 3. Payments (Lemon Squeezy)

Wirby bills through **Lemon Squeezy**, a **Merchant of Record**. Lemon Squeezy is
the **seller of record**: it collects and remits sales tax / VAT worldwide, and
Wirby receives payouts. This is deliberately chosen so Wirby does not have to
register for VAT/OSS or act as the tax-collecting seller itself. (You still must
declare payout income to your own tax authority — an MoR handles tax toward the
*buyer*, not your personal/business income tax.) The legal pages (`Terms.tsx`,
`Privacy.tsx`, `RefundPolicy.tsx`) name Lemon Squeezy as merchant of record.

The code is deployed: three billing Edge Functions (`create-checkout`,
`customer-portal`, `lemonsqueezy-webhook`), the `lp_subscriptions` table, a
server-side free-item-limit trigger, and the Settings UI (upgrade / manage
subscription). A fourth Edge Function, `delete-account`, handles self-serve
account deletion and is unrelated to billing activation.

**Checkout shape**: hosted redirect flow. `create-checkout` (JWT-verified) builds a
Lemon Squeezy checkout server-side, stamping the verified Supabase user id into the
checkout's `custom` data, and returns the hosted URL; the client redirects the
browser there. Lemon Squeezy returns the user to `/app/settings?checkout=success`.
The subscription is created asynchronously and reported through
`lemonsqueezy-webhook`, which reads `meta.custom_data.supabase_user_id` and is the
only thing that ever flips `lp_subscriptions.plan` to `plus`. No billing SDK runs in
the browser, so there is no client-side billing key.

To activate billing:

1. Create a **Lemon Squeezy account** and a **Store** (test mode is on by default
   until you activate the store for live payments).
2. Create a Product "Wirby Plus" with a **$6/mo subscription variant** → note the
   numeric **variant id** and your **store id**.
3. Create an **API key** (Settings → API).
4. Add a **webhook** (Settings → Webhooks) pointing at:
   `https://kfhbmfaikejsfoxngmue.supabase.co/functions/v1/lemonsqueezy-webhook`
   Subscribe to the `subscription_*` events (created/updated/cancelled/resumed/
   expired/paused). Set a **signing secret** on the webhook and copy it.
5. Set the Edge Function **secrets** (Supabase dashboard → Edge Functions → Secrets,
   or `supabase secrets set`):
   - `LEMONSQUEEZY_API_KEY=...` (from step 3)
   - `LEMONSQUEEZY_STORE_ID=...` (from step 2)
   - `LEMONSQUEEZY_VARIANT_ID=...` (the Wirby Plus variant, from step 2)
   - `LEMONSQUEEZY_WEBHOOK_SECRET=...` (from step 4)
   - `APP_URL=https://www.wirby.app` (used for the checkout redirect)
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
   automatically.)
6. Test in test mode with Lemon Squeezy's [test card](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
   (`4242 4242 4242 4242`, any future expiry, any CVC). On success the webhook flips
   `lp_subscriptions.plan` to `plus` and the app unlocks unlimited items.
7. Before going live: activate the store for live payments and confirm the live
   webhook + signing secret.

**Security**: no billing key ever touches the frontend. The API key and webhook
signing secret live only in Edge Function secrets. The webhook is
signature-verified (HMAC-SHA256 hex over the raw body via the `X-Signature`
header, per Lemon Squeezy's documented algorithm — see
`supabase/functions/_shared/lemonSignature.ts`, unit-tested in
`tests/lemonSignature.test.ts`) and writes via service role.

### 4. Legal pages (required before accepting real payments)

Three pages ship at `/privacy`, `/terms`, `/refund-policy` (source in
`src/routes/legal/`), linked from the marketing footer and the sign-up form.
**They are a strong starting template, not a substitute for legal review.**

Domain (`wirby.app`) and support inbox (`support@wirby.app`) are live and
already wired into all three pages as the contact address. The pages now
promise something real: account deletion in Settings is fully implemented
(see below), not just documented. Still needed before launch:

1. Fill in the remaining placeholders, now marked in red on the rendered
   page as `[LAUNCH-BLOCKING PLACEHOLDER: ...]`: legal entity name, registered
   address, governing-law jurisdiction, and the Free-plan liability cap
   currency/amount (all in `Privacy.tsx` / `Terms.tsx`) — these depend on
   where/how you incorporate, which isn't decided yet.
   **`npm run build` now fails on purpose while any of these remain**, via
   `scripts/check-legal-placeholders.mjs`. This is intentional so an
   unfinished legal page can't ship by accident. Override for local/preview
   builds only with `ALLOW_LEGAL_PLACEHOLDERS=1 npm run build`.
2. Have a lawyer, or a service like [iubenda](https://www.iubenda.com), review
   the final text — especially liability limits and governing law, which are
   jurisdiction-specific.
3. With Lemon Squeezy as **merchant of record**, Lemon Squeezy is the seller of
   record and handles sales tax/VAT toward buyers — so Wirby does not register for
   VAT itself. The Terms/Privacy/Refund pages say exactly that; keep them accurate
   if the copy is edited later. You still declare payout income to your own tax
   authority.
4. Keep the pages in sync with the product: if pricing, data retention, or
   sub-processors change, update the matching section the same day.

The Privacy Policy already documents the real sub-processors in use (Supabase,
Lemon Squeezy, Resend, Plausible) and is honest that extraction is deterministic
pattern matching, not AI — don't let future copy drift from that.

### 5. Account deletion (implemented)

Settings → Danger zone → "Delete my account" calls a fourth Edge Function,
`delete-account`, which:
- Verifies the caller's own Supabase JWT (never trusts a user id from the request body).
- Refuses to proceed if the user has an active/trialing Wirby Plus subscription,
  so billing stays in a clean state — they're asked to cancel via the Lemon
  Squeezy customer portal first.
- Deletes the `auth.users` row via the service-role admin API, which cascades
  (`on delete cascade`) through `lp_items`, `lp_audit`, `lp_prefs`, and
  `lp_subscriptions`.
The client-side UI requires typing "delete" to confirm before the call fires.

### 6. Email reminders (implemented)

Reminder delivery is built and deployed. The `send-reminders` Edge Function reads
each user's `lp_prefs` + active `lp_items`, computes urgency (the same logic as
`src/lib/urgency.ts`, ported inline for Deno), and sends via **Resend**:

- a **due-soon alert** on any day the user has an overdue / due-today / due-soon
  item, and
- a **weekly digest** each Monday of the next 30 days.

Both are deduped per day via `lp_prefs.last_due_soon_sent` / `last_digest_sent`,
so a double cron fire can't double-send. A daily **pg_cron** job (13:00 UTC, see
migration `20260713123000_schedule_send_reminders.sql`) POSTs the function with an
`x-cron-secret` header read from Vault.

To activate:

1. Ensure `RESEND_API_KEY` is set as an Edge Function secret (already used by the
   `send-email` auth-email hook). Optionally set `SEND_EMAIL_FROM` to a verified
   Resend sender like `Wirby <noreply@wirby.app>`.
2. Set the `CRON_SECRET` Edge Function secret to match the Vault secret
   `wirby_cron_secret` created during setup. To read the generated value once, run
   in the SQL editor:
   `select decrypted_secret from vault.decrypted_secrets where name = 'wirby_cron_secret';`
   and paste it into the `CRON_SECRET` Edge Function secret. (If the Vault secret
   doesn't exist yet, create it: `select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'wirby_cron_secret', 'send-reminders cron');`)
3. To send a test run immediately, POST the function with header
   `x-cron-secret: <value>` and body `{"mode":"daily"}` or `{"mode":"weekly"}`.

## Marketing (easiest first)

- **Launch posts**: Product Hunt (Tue–Thu), Show HN, r/personalfinance & r/productivity
  (read self-promo rules). Free, high-intent.
- **Lead with the hook**: the "found subscriptions I forgot I was paying" story. It's
  concrete and shareable — put it above the fold and in every post.
- **Demo GIF**: 20s of upload → ranked attention list. Reuse everywhere.
- **SEO**: `robots.txt`, `sitemap.xml`, OG tags are in place. Add a couple of honest
  posts ("track subscription renewals", "annual renewals people forget"). Compounds.
- Skip paid ads until a free channel proves it converts.

## What's inside

| Area | Route | Notes |
|---|---|---|
| Marketing home | `/` | Editorial split hero with a live render of the product's attention list |
| Pricing | `/pricing` | Free / Plus, FAQ |
| Auth | `/signin`, `/signup` | Adapter-based: local PBKDF2 preview or server httpOnly-cookie sessions; protected routes gate on a resolved session check |
| Password reset | `/forgot-password`, `/reset-password` | Real Supabase flow: request a reset email, follow the link, set a new password. Success states never routed through the shared error banner |
| Onboarding | `/app/onboarding` | One screen: upload, paste, sample data, or empty start |
| Dashboard | `/app` | Urgency-ranked attention list, coming-up list, recurring-spend total, recent activity |
| Ingestion | `/app/add` | Upload (PDF/TXT/EML/MD/CSV), paste, or manual. Extraction with per-field confidence; nothing saves without review. PDF page limit is plan-aware (20 pages Free, 75 Plus) |
| Item detail | `/app/items/:id` | Edit, complete, snooze, archive, delete; source snippet; per-item history |
| Search & archive | `/app/search` | Text search, status tabs, type and urgency filters, undated filter |
| Settings | `/app/settings` | Plan/billing (upgrade via Lemon Squeezy checkout redirect, manage via Lemon Squeezy customer portal), reminder prefs, CSV/JSON export, sample data, delete-all-items, and real account deletion (type-to-confirm, calls a service-role Edge Function) |
| Audit log | `/app/audit` | Last 500 events: item changes, sign-ins, data events |

### Core behaviors worth knowing

- **Recurring items roll forward.** Marking a monthly bill "handled" advances its due date
  to the next occurrence instead of closing it. One-time items complete.
- **Snooze is honest.** A snoozed item shows as snoozed, leaves the attention list, and
  returns when the snooze expires. Every snooze is audited.
- **Extraction is deterministic, not AI.** `src/lib/extract.ts` is a pure
  regex/keyword engine over a hardcoded vendor list, run entirely in the browser.
  Nothing is sent to a server and there is no model. Its "confidence" scores are
  heuristic weights, not probabilities: fields below 0.7 get a visible "please
  confirm" flag, the source snippet is stored with the item, and junk text produces
  zero candidates rather than a guess. Marketing copy says exactly this — no AI is
  implied anywhere.

## Architecture

```
src/
  lib/        types, dates, urgency math, extraction engine, pdf reader (lazy),
              store (persistence boundary), auth, export, seed, audit labels
  state/      Auth / Data / Toast contexts
  components/ ui kit (Button, Field, Modal, Switch, Skeleton, EmptyState)
              app pieces (AppShell, ItemRow, ItemForm, SnoozeMenu, pills)
  routes/     marketing, auth, app screens
```

- **Design tokens** live in `src/styles/index.css` (Tailwind v4 `@theme`).
  Type: Newsreader (display) / Instrument Sans (UI) / Spline Sans Mono (amounts, dates).
  Palette: green paper base, deep pine accent, ember = due soon, clay red = overdue.
  Radius rule: controls 10px, panels 16px, badges pill. Theme locked light.
- **Motion** is CSS-only (`.rise` stagger, toast entrance) and fully gated behind
  `prefers-reduced-motion: no-preference`.
- **pdf.js is lazy-loaded** only when a PDF is actually uploaded (separate chunk).

## Production hardening map (what is demo-grade and where it swaps)

Auth and data are selected at runtime by `VITE_AUTH_MODE`. The production path
(`supabase`) is wired and active; the localStorage demo remains for offline dev.

### Backend setup (Supabase)

1. Copy the env template and fill in your project values:

   ```
   VITE_AUTH_MODE=supabase
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Both values are **client-safe** — the publishable key is meant to ship in the
   browser bundle. Security is enforced by Row-Level Security in Postgres, not by
   hiding the key. The `service_role` key is never used in the frontend.

2. Schema lives in `supabase/migrations/` (four tables, `lp_`-prefixed and isolated:
   `lp_items`, `lp_audit`, `lp_prefs`, `lp_subscriptions`). Each row is owned by
   `user_id -> auth.users(id)` and every table has RLS policies restricting all
   access to the authenticated owner (`auth.uid()`). Apply with `supabase db push`
   against a linked project.

   **Project identity — read before running any `supabase` CLI command:**
   The app's one and only production project is `kfhbmfaikejsfoxngmue` (see
   `VITE_SUPABASE_URL` above). This is now recorded durably in
   `supabase/config.toml` (`project_id = "kfhbmfaikejsfoxngmue"`), checked
   into the repo specifically so this can't silently drift again — unlike
   `supabase/.temp/`, which is a gitignored, machine-local CLI cache that
   previously ended up linked to an unrelated project
   (`wuvjiqqfbpapifcrhxgd`, since unlinked) hosting other apps' schemas.

   Before running `supabase db push`, `supabase link`, or `supabase gen types`,
   run `supabase link --project-ref kfhbmfaikejsfoxngmue` from an account that
   has been granted access to that project, and confirm it succeeds. If the
   CLI account you're logged in as doesn't have access (checked at the time
   of this fix: `supabase projects list` did not show this project for the
   currently authenticated account), request access first — do not link to a
   different project as a workaround.

3. Types are generated from the live schema into `src/lib/database.types.ts`
   (`supabase gen types --linked`).

### Auth adapter (`src/lib/auth.ts`)

`authAdapter` is selected by `VITE_AUTH_MODE`. Every adapter implements the same
interface: `signUp`, `signIn`, `signOut`, `currentSession`, `requestPasswordReset`,
`updatePassword`, and `deleteAccount`.

- **`supabase`** (production): real Supabase Auth. Sessions are JWT-backed, managed and
  refreshed by `supabase-js`, and verified against Supabase. `RequireAuth` waits for
  `currentSession()` to resolve before deciding. Every data query is additionally
  guarded by RLS, so route protection does not depend on client state.
  `requestPasswordReset` calls `auth.resetPasswordForEmail` with `redirectTo` set to
  `/reset-password`; `updatePassword` calls `auth.updateUser` while the one-time
  recovery session from that link is active; `deleteAccount` invokes the
  `delete-account` Edge Function (service-role, cascades through all `lp_*` tables).
- **`server`**: alternative custom backend using httpOnly session cookies
  (`credentials: "include"`, `GET /api/auth/session`). Endpoints are documented inline,
  including `POST /api/auth/password-reset-request`, `password-reset-confirm`, and
  `delete-account` (implement these three server-side to support this mode fully).
- **`local`** (dev only): client-only PBKDF2 store in localStorage. Password reset by
  email is intentionally unsupported (no mail transport exists offline) and throws a
  clear error; `deleteAccount` removes the local user and their local data directly.
  A build-time throw fires if this mode is used in a `PROD` build so it can't ship silently.

### Data layer (`src/lib/store.ts`)

The `Store` keeps a synchronous in-memory snapshot for the UI (`useSyncExternalStore`)
and delegates durable writes to a backend. `SupabaseBackend` reads/writes the `lp_*`
tables; `LocalBackend` uses localStorage in demo mode. Writes are optimistic and
reconverge with the database on error. No component code changed — the swap is entirely
below the store interface.

### Still needs infrastructure (not in this repo)

- **Email reminders**: preferences are stored; delivery needs a transactional mail
  provider triggered by a scheduled job reading the urgency math (`src/lib/urgency.ts`).
  Not sold on the pricing page — Plus currently only promises unlimited items and
  priority PDF extraction, both of which are actually implemented.
- **Billing**: pricing page ships; Lemon Squeezy checkout attaches to the Plus plan
  and is fully wired end-to-end (see "Payments" above for the manual dashboard setup
  still required). No billing code was faked.
- **Extraction** (`src/lib/extract.ts`): deterministic, in-browser, no model — by design.
- **Password reset email delivery** in `supabase` mode depends on Supabase's built-in
  auth email sending being configured (dashboard → Authentication → Email Templates /
  SMTP settings) — not independently re-verified as configured in this pass.

## Security hardening (this pass)

A dedicated security pass added the following. See the audit summary at the
end of this section for what's fixed vs. what still needs a manual dashboard
step.

- **Rate limiting on every Edge Function.** `lp_rate_limits` (service-role
  only, zero client policies) + `lp_check_rate_limit()` RPC implement a
  fixed-window counter. Limits: `delete-account` 5/hour/user,
  `create-checkout` 10/hour/user, `customer-portal` 20/hour/user,
  `lemonsqueezy-webhook` 120/hour/customer-id. All fail CLOSED (a DB error
  counts as "not allowed", never "allowed"). Auth endpoints themselves
  (`signin`/`signup`/`recover`) are rate-limited by Supabase Auth directly —
  see "Manual setup" below to confirm the dashboard limits fit your launch.
- **Edge Function CORS locked to Wirby's own origins** (`wirby.app`,
  `www.wirby.app`, `localhost:5173` for dev) instead of `Access-Control-Allow-
  Origin: *`, via `supabase/functions/_shared/security.ts`. JWTs aren't
  cookie-based here, so this wasn't a CSRF hole, but wildcard CORS let any
  site script a call with a token obtained another way; that's closed now.
- **Method + body-size limits on every function.** Each Edge Function now
  rejects non-POST methods and oversized request bodies before doing any
  work; the webhook additionally caps payload size before touching the
  signature check.
- **Fail-closed env var checks.** Every Edge Function throws at startup
  (refuses to boot) if a required secret (`LEMONSQUEEZY_API_KEY`,
  `LEMONSQUEEZY_WEBHOOK_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, Supabase
  URL/keys) is missing, instead of running half-configured and failing
  confusingly on the first real request.
- **Reduced PII in Edge Function logs.** `create-checkout` and
  `customer-portal` never log full Lemon Squeezy API response bodies (which can
  carry customer email/billing data) on error — only status codes.
- **Bounded database text/JSON fields.** `lp_items`, `lp_audit`, `lp_prefs`
  had no length caps on `title`/`vendor`/`notes`/`detail`/`email`/etc. A
  request that bypassed the client (hand-crafted against the REST API with a
  valid session) could write arbitrarily large rows. Added generous but firm
  `char_length`/`pg_column_size` CHECK constraints (see migration
  `wirby_security_hardening_constraints_and_rate_limits`). Verified: all four
  `lp_*` tables were empty at the time this was applied, so no existing data
  was affected.
- **Security response headers on every Edge Function response**
  (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`) via the shared `jsonResponse()` helper.
- **Browser security headers + CSP**, added to both `vercel.json` (Vercel)
  and `public/_headers` (Netlify) so either deploy target in the README's
  go-live runbook gets the same protection:
  `Content-Security-Policy` (scoped to `'self'` plus the exact third-party
  origins Wirby actually loads: Plausible, optional
  Cloudflare Turnstile, and the Supabase project), `X-Frame-Options: DENY` +
  `frame-ancestors 'none'` (clickjacking), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`, and HSTS (`Strict-Transport-Security`, effective once
  the domain is served over HTTPS by the host — see "Manual setup" below).
  No inline `<script>` execution is required by the app itself; the two
  JSON-LD blocks in `index.html` are static markup, not executed script, and
  Tailwind's runtime styling needs `style-src 'unsafe-inline'` (documented in
  the CSP itself — there's no realistic way to avoid this without SSR-time
  nonce plumbing this app doesn't have, and inline *styles* are a much lower
  injection risk than inline *scripts*, which stay blocked entirely).
- **Optional Cloudflare Turnstile bot protection** on sign-in, sign-up, and
  forgot-password (`src/lib/turnstile.ts`, `TurnstileWidget`). Opt-in via
  `VITE_TURNSTILE_SITE_KEY` — unset, nothing changes. The token is forwarded
  to Supabase as `options.captchaToken`; Supabase verifies it server-side if
  CAPTCHA protection is turned on in the dashboard (see "Manual setup").
  Without the dashboard toggle, this widget alone does not block anything —
  it produces a token, it doesn't enforce one.

### Manual security setup still required (dashboard/provider steps)

These cannot be done from code and need to happen before or shortly after
launch:

1. **Supabase → Authentication → Rate Limits**: review the default auth rate
   limits (signup/recover/OTP endpoints) against expected launch traffic. The
   defaults (documented in Supabase's own docs) are reasonable for a small
   launch; raise them only if you expect a large announcement spike.
2. **Supabase → Authentication → Policies → Enable leaked-password
   protection**: flagged by Supabase's own advisor as off. Turn it on.
3. **Supabase → Authentication → Providers → Email confirmation**: confirm
   this is ON in production (README already assumed this; not independently
   re-verified as toggled in this pass).
4. **Optional — Cloudflare Turnstile**: create a Turnstile site
   (dash.cloudflare.com), set `VITE_TURNSTILE_SITE_KEY` in the frontend host,
   and enable CAPTCHA protection + select Turnstile under Supabase →
   Authentication → Bot and Abuse Protection with the matching secret key.
   Without both sides configured, this is a no-op (by design — it never
   fails closed on its own, since an unconfigured half-integration blocking
   real sign-ups would be worse than no bot protection at all).
5. **HSTS preload**: the `Strict-Transport-Security` header is set, but real
   HSTS protection needs the domain served over HTTPS by the host (Vercel/
   Netlify do this automatically) and, optionally, submission to
   [hstspreload.org](https://hstspreload.org) once you're confident you'll
   never need to serve `wirby.app` over plain HTTP.
6. **Confirm `supabase/config.toml` project_id matches what's actually
   linked** before running any `supabase db push` — see the existing note in
   this README's "Backend setup" section. All migration files in
   `supabase/migrations/` now match what's applied to the live database
   (including the reminder cron `20260713123000_schedule_send_reminders.sql` and
   the Lemon Squeezy provider swap `20260713140000_lemonsqueezy_billing_provider.sql`).

### Known residual risks (not fixed in this pass, by design or scope)

- **Lemon Squeezy checkout / customer-portal open Lemon-Squeezy-hosted pages**
  via full browser navigation (not an embedded iframe), so no Lemon Squeezy
  origin is needed in the CSP `frame-src` at all — this is expected, documented
  behavior.
- **No CSRF token on Edge Functions**: not needed. Every sensitive Edge
  Function requires a Supabase JWT sent as `Authorization: Bearer`, never a
  cookie, so there is no ambient credential for a cross-site request to ride
  along with. The CORS allow-list added in this pass is the correct
  complementary control (stopping *scripted* cross-origin use of a token
  obtained some other way), not a CSRF fix layered on top of a cookie.
- **Fixed-window, not sliding-window, rate limiting**: chosen deliberately —
  see `_shared/security.ts` for the reasoning. Worst case is briefly ~2x the
  stated limit across a window boundary, which is acceptable at these
  volumes (single-digit-to-low-double-digit requests/hour per user).
- **No virus/malware scanning on uploaded files**: not applicable today —
  uploads are parsed for text client-side and never stored (see "Upload and
  extraction security" note below); there is no file storage or download
  path for another user to receive a malicious file through.

## Security posture

- **Real server-enforced auth + data isolation.** In `supabase` mode, sessions are
  JWT-backed and every `lp_*` row is protected by RLS scoped to `auth.uid()`. Verified:
  an authenticated user reads/writes only their own rows; an anonymous request with the
  publishable key returns zero rows.
- All `/app` routes wait for a resolved session check, then redirect unauthenticated
  visitors to `/signin`.
- Important actions (auth, edits, exports, deletions, pref changes) land in a capped
  audit log the user can read.
- Uploads are size-capped, parsed locally, and never stored: only extracted fields
  plus a short source snippet are kept.
- Export (CSV/JSON) and full deletion are one click each, by design.
- Demo (`local`) mode passwords are salted and PBKDF2-hashed (120k iterations);
  plaintext is never persisted and sign-in failure is a single generic message.
- **Account deletion is real and server-enforced.** The `delete-account` Edge Function
  verifies the caller's own JWT, uses the service-role admin API (never exposed to the
  client) to delete the `auth.users` row, and relies on `on delete cascade` foreign
  keys to remove every `lp_*` row the user owned. A user can only ever delete their
  own account — there is no path to pass a different user id.
- **Password reset never leaks account existence.** `requestPasswordReset` resolves
  identically whether or not the email has an account (matching Supabase's own
  behavior), and the UI shows one calm confirmation message either way.
- **CSV export neutralizes formula injection.** Fields starting with `=`, `+`, `-`,
  or `@` are prefixed with a `'` before being written, so a vendor/title field can't
  open as a live formula when the exported file is opened in Excel/Sheets.

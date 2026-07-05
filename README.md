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
   - `VITE_PADDLE_CLIENT_TOKEN=live_...` (or `test_...` in sandbox — see "Payments" below)
   - `VITE_PADDLE_ENVIRONMENT=production` (set to `sandbox` only for a staging deploy)
   - `VITE_PADDLE_PLUS_PRICE_ID=pri_...`
   - `VITE_PLAUSIBLE_DOMAIN=wirby.app` (optional analytics)
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

### 3. Payments (Paddle Billing)

Wirby bills through **Paddle**, not Stripe. Paddle acts as merchant of record for
Wirby Plus (it is the legal seller you're billed by, and it handles sales tax/VAT),
which is also why the legal pages (`Terms.tsx`, `Privacy.tsx`, `RefundPolicy.tsx`)
name Paddle directly rather than describing it as a generic "payment processor."

The code is deployed: three billing Edge Functions (`paddle-customer`,
`customer-portal`, `paddle-webhook`), the `lp_subscriptions` table, a server-side
free-item-limit trigger, and the Settings UI (upgrade / manage subscription). A
fourth Edge Function, `delete-account`, handles self-serve account deletion (see
"Legal pages" below) and is unrelated to billing activation.

**Why checkout looks different from a Stripe-style integration**: Paddle has no
server-generated Checkout Session URL to redirect to. Checkout opens client-side via
Paddle.js (an overlay), which is why `VITE_PADDLE_CLIENT_TOKEN` is a public,
client-safe token — same trust level as the Supabase publishable key — rather than a
secret. Before opening that overlay, the client calls the `paddle-customer` Edge
Function (JWT-verified) to establish a server-trusted Paddle customer id for the
signed-in user; the browser never invents or supplies that id itself. The purchase
itself is never "call an API, get a subscription back" — Paddle creates the
subscription asynchronously and reports it through `paddle-webhook`, which is the
only thing that ever flips `lp_subscriptions.plan` to `plus`.

To activate billing:

1. Create a **Paddle account** (start in [Sandbox](https://developer.paddle.com/sdks/sandbox)
   to test, then request a live/production account for real payments — Paddle
   reviews and approves live accounts, which can take a few business days).
2. Create a Product "Wirby Plus" with a **$6/mo recurring price** under
   Paddle > Catalog > Products → copy its price ID (`pri_...`).
3. Under Paddle > Checkout > Checkout settings, set and get approval for your
   **default payment link domain** (`wirby.app`, or `localhost` while testing in
   sandbox) — Paddle.js checkouts won't open on an unapproved domain.
4. Create a **client-side token** (Paddle > Developer tools > Authentication) and
   set it as `VITE_PADDLE_CLIENT_TOKEN` in your host's env vars. This is safe to
   ship in the browser bundle.
5. Create an **API key** (Paddle > Developer tools > Authentication → API keys) for
   server-side use.
6. Add a webhook destination in Paddle (Developer tools → Notifications) pointing at:
   `https://kfhbmfaikejsfoxngmue.supabase.co/functions/v1/paddle-webhook`
   Subscribe to: `subscription.created`, `subscription.updated`,
   `subscription.canceled`. Copy the destination's **secret key** (`pdl_ntfset_...`)
   — this is different from the API key above.
7. Set the Edge Function **secrets** (Supabase dashboard → Edge Functions → Secrets,
   or `supabase secrets set`):
   - `PADDLE_API_KEY=...` (from step 5)
   - `PADDLE_WEBHOOK_SECRET=pdl_ntfset_...` (from step 6)
   - `PADDLE_ENVIRONMENT=production` (set to `sandbox` while testing; controls which
     Paddle API host `paddle-customer` and `customer-portal` call)
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
   automatically.)
8. Set frontend env vars: `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENVIRONMENT`,
   `VITE_PADDLE_PLUS_PRICE_ID=pri_...` (from step 2).
9. Test in sandbox with [Paddle's test card](https://developer.paddle.com/concepts/payment-methods/card)
   (`4242 4242 4242 4242`, any future expiry, CVC `100`). On success the webhook
   flips `lp_subscriptions.plan` to `plus` and the app unlocks unlimited items.
10. Before going live: switch `PADDLE_ENVIRONMENT` / `VITE_PADDLE_ENVIRONMENT` to
    `production`, and swap in a live client-side token, live API key, and a webhook
    destination + secret created against the live (not sandbox) Paddle account —
    sandbox and live are entirely separate systems with separate IDs and keys.

**Security**: only the client-side token (public by design) ever touches the
frontend. The API key and webhook secret live only in Edge Function secrets. The
webhook is signature-verified (manual HMAC-SHA256 over `Paddle-Signature`, with a
5-second replay-attack tolerance, per Paddle's documented algorithm) and writes via
service role, exactly like the Stripe webhook did before it.

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
3. Paddle checks that these links work and are accurate before approving a live
   account, so this must be done before step 3 (Payments) goes live for real
   money. Paddle also requires the Terms/Privacy pages to correctly identify
   Paddle as merchant of record for the subscription — already done in this
   codebase; keep it that way if the copy is edited later.
4. Keep the pages in sync with the product: if pricing, data retention, or
   sub-processors change, update the matching section the same day.

The Privacy Policy already documents the real sub-processors in use (Supabase,
Paddle, Plausible) and is honest that extraction is deterministic pattern
matching, not AI — don't let future copy drift from that.

### 5. Account deletion (implemented)

Settings → Danger zone → "Delete my account" calls a fourth Edge Function,
`delete-account`, which:
- Verifies the caller's own Supabase JWT (never trusts a user id from the request body).
- Refuses to proceed if the user has an active/trialing Wirby Plus subscription,
  so Paddle stays in a clean state — they're asked to cancel via the customer
  portal first.
- Deletes the `auth.users` row via the service-role admin API, which cascades
  (`on delete cascade`) through `lp_items`, `lp_audit`, `lp_prefs`, and
  `lp_subscriptions`.
The client-side UI requires typing "delete" to confirm before the call fires.

### 6. Still needs a provider (not blocking launch)

- **Email reminders**: prefs are stored; add a mail provider (Resend/Postmark) + a
  scheduled function reading `src/lib/urgency.ts`. Pricing and Settings copy have
  been checked and do not currently promise email delivery is active.

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
| Settings | `/app/settings` | Plan/billing (upgrade via Paddle overlay checkout, manage via Paddle customer portal), reminder prefs, CSV/JSON export, sample data, delete-all-items, and real account deletion (type-to-confirm, calls a service-role Edge Function) |
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
- **Billing**: pricing page ships; Paddle Checkout attaches to the Plus plan and is
  fully wired end-to-end (see "Payments" above for the manual dashboard setup
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
  `paddle-customer` 10/hour/user, `customer-portal` 20/hour/user,
  `paddle-webhook` 60/hour/Paddle-customer-id. All fail CLOSED (a DB error
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
- **Fail-closed env var checks.** All four Edge Functions now throw at
  startup (refuse to boot) if a required secret (`PADDLE_API_KEY`,
  `PADDLE_WEBHOOK_SECRET`, Supabase URL/keys) is missing, instead of running
  half-configured and failing confusingly on the first real request.
- **Reduced PII in Edge Function logs.** `paddle-customer` and
  `customer-portal` no longer log full Paddle API response bodies (which can
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
  origins Wirby actually loads: Paddle.js/checkout, Plausible, optional
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
   this README's "Backend setup" section. This audit found the *deployed*
   database has one migration (`paddle_billing_provider`,
   `20260704164714`) with no corresponding file in `supabase/migrations/` in
   this checkout. That migration is already applied and the schema it
   produced was verified directly against the live database, so production
   is not at risk — but pull or regenerate that file so a future
   `supabase db push` from this repo doesn't drift from what's live.

### Known residual risks (not fixed in this pass, by design or scope)

- **Paddle checkout / customer-portal links open Paddle-hosted pages** — this
  is documented, expected behavior for a merchant-of-record integration, not
  a gap. The CSP's `frame-src` is scoped narrowly to Paddle's own checkout/
  buy domains for exactly this reason.
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

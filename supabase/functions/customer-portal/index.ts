import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Creates a Paddle customer portal session and returns the authenticated
 * "manage subscription" deep link for the caller's own subscription.
 *
 * Kept at the same route name (`customer-portal`) as the old Stripe function
 * so the client-side contract (`supabase.functions.invoke("customer-portal")`)
 * and its purpose -- "let the user manage their own billing" -- stay
 * unchanged; only the provider underneath it changed.
 *
 * Auth: requires a valid Supabase JWT (verify_jwt stays ON). The Paddle
 * customer/subscription is looked up from the authenticated user's own
 * lp_subscriptions row, never from the request body -- a caller can only ever
 * generate a portal link for themselves.
 *
 * Paddle-specific behavior (deliberately not treated like Stripe):
 * portal-session links are short-lived, single-use-ish authenticated tokens.
 * Paddle's own docs say these sessions "shouldn't be cached" and a fresh one
 * must be created every time. So this function never stores the returned URL
 * -- it mints one on every call and hands it straight back.
 */

const PADDLE_ENV = Deno.env.get("PADDLE_ENVIRONMENT") ?? "production";
const PADDLE_API_BASE = PADDLE_ENV === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

// Fail closed: refuse to boot rather than run with a missing secret.
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!PADDLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("customer-portal: missing required env vars (PADDLE_API_KEY / Supabase secrets).");
}

Deno.serve(async (req) => {
  const cors = restrictiveCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const methodErr = enforceMethod(req, ["POST"]);
  if (methodErr) return methodErr;
  const sizeErr = enforceMaxContentLength(req, 1024);
  if (sizeErr) return sizeErr;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await asUser.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Not authenticated." }, { status: 401, headers: cors });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // A user legitimately might open billing management a few times in a
    // session; cap well above that to stop scripted hammering of a
    // third-party API call.
    const rl = await checkRateLimit(admin, `customer-portal:user:${user.id}`, 20, 3600, cors);
    if (!rl.allowed) return rl.response!;

    const { data: sub } = await admin
      .from("lp_subscriptions")
      .select("provider_customer_id, provider_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.provider_customer_id) {
      return jsonResponse({ error: "No billing account yet." }, { status: 400, headers: cors });
    }

    const res = await fetch(
      `${PADDLE_API_BASE}/customers/${sub.provider_customer_id}/portal-sessions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, "Content-Type": "application/json" },
        // Passing the subscription id (when we have one) generates the
        // per-subscription "cancel" and "update payment method" deep links
        // in addition to the general portal overview link.
        body: JSON.stringify(
          sub.provider_subscription_id ? { subscription_ids: [sub.provider_subscription_id] } : {},
        ),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Do not log the response body: it can carry billing/customer PII.
      console.error("customer-portal: Paddle API error", res.status);
      return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
    }

    const urls = body.data?.urls;
    const subscriptionLinks = urls?.subscriptions?.[0];
    // Prefer the "manage" (cancel) deep link, since that's the primary
    // reason a user opens billing management; fall back to the general
    // portal overview if for some reason no subscription link came back.
    const url: string | undefined = subscriptionLinks?.cancel_subscription
      ?? subscriptionLinks?.update_subscription_payment_method
      ?? urls?.general?.overview;

    if (!url) {
      console.error("customer-portal: no usable URL in Paddle response");
      return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
    }

    return jsonResponse({ url }, { headers: cors });
  } catch (err) {
    console.error("customer-portal error:", err);
    return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Creates a Stripe Billing Portal session and returns the "manage
 * subscription" URL for the caller's own subscription.
 *
 * Kept at the same route name (`customer-portal`) and client contract
 * (`supabase.functions.invoke("customer-portal")` -> { url }) as before; only
 * the provider underneath changed from Paddle to Stripe.
 *
 * Auth: requires a valid Supabase JWT (verify_jwt stays ON). The Stripe
 * customer is looked up from the authenticated user's own lp_subscriptions
 * row, never from the request body -- a caller can only ever generate a
 * portal link for themselves.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.wirby.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Fail closed: refuse to boot rather than run with a missing secret.
if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("customer-portal: missing required env vars (STRIPE_SECRET_KEY / Supabase secrets).");
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

    const rl = await checkRateLimit(admin, `customer-portal:user:${user.id}`, 20, 3600, cors);
    if (!rl.allowed) return rl.response!;

    const { data: sub } = await admin
      .from("lp_subscriptions")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.provider_customer_id) {
      return jsonResponse({ error: "No billing account yet." }, { status: 400, headers: cors });
    }

    const res = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: sub.provider_customer_id,
        return_url: `${APP_URL}/app/settings`,
      }).toString(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.url) {
      // Do not log the response body: it can carry billing/customer PII.
      console.error("customer-portal: Stripe API error", res.status);
      return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
    }

    return jsonResponse({ url: body.url }, { headers: cors });
  } catch (err) {
    console.error("customer-portal error:", err);
    return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
  }
});

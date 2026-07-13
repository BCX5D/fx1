import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Returns the Lemon Squeezy customer portal URL for the caller's own
 * subscription (manage / cancel / update payment method).
 *
 * Kept at the same route name (`customer-portal`) and client contract
 * (`supabase.functions.invoke("customer-portal")` -> { url }) as before; only
 * the provider underneath changed to Lemon Squeezy.
 *
 * Auth: requires a valid Supabase JWT (verify_jwt stays ON). The subscription
 * is looked up from the authenticated user's own lp_subscriptions row, never
 * from the request body. Lemon Squeezy exposes a signed `customer_portal` URL
 * on the subscription object itself; we fetch it fresh each call (these links
 * are short-lived and shouldn't be cached).
 */

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";
const LS_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Fail closed: refuse to boot rather than run with a missing secret.
if (!LS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("customer-portal: missing required env vars (LEMONSQUEEZY_API_KEY / Supabase secrets).");
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
      .select("provider_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.provider_subscription_id) {
      return jsonResponse({ error: "No billing account yet." }, { status: 400, headers: cors });
    }

    const res = await fetch(`${LS_API_BASE}/subscriptions/${sub.provider_subscription_id}`, {
      headers: {
        Authorization: `Bearer ${LS_API_KEY}`,
        Accept: "application/vnd.api+json",
      },
    });
    const body = await res.json().catch(() => ({}));
    const urls = body?.data?.attributes?.urls;
    const url: string | undefined = urls?.customer_portal ?? urls?.update_payment_method;
    if (!res.ok || !url) {
      console.error("customer-portal: Lemon Squeezy API error", res.status);
      return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
    }

    return jsonResponse({ url }, { headers: cors });
  } catch (err) {
    console.error("customer-portal error:", err);
    return jsonResponse({ error: "Could not open billing portal." }, { status: 500, headers: cors });
  }
});

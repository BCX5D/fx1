import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Creates a Lemon Squeezy hosted checkout for Wirby Plus and returns its URL,
 * which the client redirects to. Lemon Squeezy is a Merchant of Record: it is
 * the legal seller and handles sales tax / VAT worldwide.
 *
 * Trust model: the caller is identified only by their own Supabase JWT
 * (verify_jwt stays ON). We build the checkout server-side and stamp the
 * verified Supabase user id into the checkout's `custom` data. The webhook
 * later reads that same server-set value from `meta.custom_data` to know which
 * user a subscription belongs to -- the browser never sets or supplies it.
 *
 * Unlike Stripe, there is no pre-created customer step: Lemon Squeezy creates
 * the customer at checkout time and reports the customer id in the webhook,
 * which is when lp_subscriptions.provider_customer_id gets written.
 */

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";
const LS_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY");
const LS_STORE_ID = Deno.env.get("LEMONSQUEEZY_STORE_ID");
const LS_VARIANT_ID = Deno.env.get("LEMONSQUEEZY_VARIANT_ID");
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.wirby.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Fail closed: refuse to boot rather than run half-configured.
if (!LS_API_KEY || !LS_STORE_ID || !LS_VARIANT_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "create-checkout: missing required env vars (LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID / Supabase secrets).",
  );
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

    const rl = await checkRateLimit(admin, `create-checkout:user:${user.id}`, 10, 3600, cors);
    if (!rl.allowed) return rl.response!;

    // Build a Lemon Squeezy checkout (JSON:API). custom.supabase_user_id is
    // server-set from the verified JWT and is the webhook's trust anchor.
    const res = await fetch(`${LS_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LS_API_KEY}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email ?? undefined,
              custom: { supabase_user_id: user.id },
            },
            product_options: {
              redirect_url: `${APP_URL}/app/settings?checkout=success`,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: String(LS_STORE_ID) } },
            variant: { data: { type: "variants", id: String(LS_VARIANT_ID) } },
          },
        },
      }),
    });

    const body = await res.json().catch(() => ({}));
    const url = body?.data?.attributes?.url;
    if (!res.ok || !url) {
      // Don't log the response body: it can carry customer/billing detail.
      console.error("create-checkout: Lemon Squeezy API error", res.status);
      return jsonResponse({ error: "Could not start checkout." }, { status: 500, headers: cors });
    }

    return jsonResponse({ url }, { headers: cors });
  } catch (err) {
    console.error("create-checkout error:", err);
    return jsonResponse({ error: "Could not start checkout." }, { status: 500, headers: cors });
  }
});

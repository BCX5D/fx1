import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Creates a Stripe Checkout Session for Wirby Plus and returns its hosted
 * URL, which the client redirects to. This is the Stripe model (a
 * server-generated Checkout Session URL you redirect to), replacing the old
 * Paddle client-side overlay: the frontend never touches the Stripe SDK and
 * never invents a customer id.
 *
 * Trust model: the caller is identified only by their own Supabase JWT
 * (verify_jwt stays ON). We create-or-fetch a Stripe customer server-side,
 * keyed off that verified identity, store the link in lp_subscriptions, and
 * stamp the Supabase user id into the session's client_reference_id and the
 * subscription metadata. The webhook later resolves which user a subscription
 * belongs to via the stored provider_customer_id, never by trusting anything
 * the browser sent.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_PLUS_PRICE_ID = Deno.env.get("STRIPE_PLUS_PRICE_ID");
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.wirby.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Fail closed: refuse to boot rather than run half-configured.
if (!STRIPE_SECRET_KEY || !STRIPE_PLUS_PRICE_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "create-checkout: missing required env vars (STRIPE_SECRET_KEY / STRIPE_PLUS_PRICE_ID / Supabase secrets).",
  );
}

/** Stripe's API is form-encoded; this posts application/x-www-form-urlencoded and parses the JSON reply. */
async function stripeFetch(path: string, params: Record<string, string>, method = "POST") {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: json };
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

    // Creating a Stripe customer + session is a real third-party API call.
    // Cap well above normal use but low enough to blunt scripted abuse.
    const rl = await checkRateLimit(admin, `create-checkout:user:${user.id}`, 10, 3600, cors);
    if (!rl.allowed) return rl.response!;

    // Reuse an existing Stripe customer if we already minted one for this user.
    const { data: existing } = await admin
      .from("lp_subscriptions")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existing?.provider_customer_id ?? "";

    if (!customerId) {
      const created = await stripeFetch("/customers", {
        email: user.email ?? "",
        "metadata[supabase_user_id]": user.id,
      });
      if (!created.ok || !created.body?.id) {
        console.error("create-checkout: Stripe customer create failed", created.status);
        return jsonResponse({ error: "Could not set up billing for your account." }, { status: 500, headers: cors });
      }
      customerId = created.body.id;

      // Establish the server-trusted customer link before checkout. plan/status
      // stay at defaults (free/inactive) until the webhook reports a real sub.
      const { error: upsertErr } = await admin.from("lp_subscriptions").upsert(
        { user_id: user.id, provider: "stripe", provider_customer_id: customerId, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (upsertErr) throw upsertErr;
    }

    const session = await stripeFetch("/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": STRIPE_PLUS_PRICE_ID,
      "line_items[0][quantity]": "1",
      client_reference_id: user.id,
      "subscription_data[metadata][supabase_user_id]": user.id,
      allow_promotion_codes: "true",
      success_url: `${APP_URL}/app/settings?checkout=success`,
      cancel_url: `${APP_URL}/app/settings?checkout=cancelled`,
    });

    if (!session.ok || !session.body?.url) {
      console.error("create-checkout: Stripe session create failed", session.status);
      return jsonResponse({ error: "Could not start checkout." }, { status: 500, headers: cors });
    }

    return jsonResponse({ url: session.body.url }, { headers: cors });
  } catch (err) {
    console.error("create-checkout error:", err);
    return jsonResponse({ error: "Could not start checkout." }, { status: 500, headers: cors });
  }
});

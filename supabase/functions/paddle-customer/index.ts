import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Ensures a Paddle Customer exists for the authenticated user and returns its
 * Paddle customer ID, so the client can open a Paddle.js checkout scoped to a
 * known, server-verified customer.
 *
 * Why this function has to exist at all (the key Paddle/Stripe difference):
 * Paddle checkout is opened client-side via Paddle.js -- there is no
 * server-generated Checkout Session URL to redirect to, unlike Stripe. That
 * means the client, not a trusted server call, decides what `customer` object
 * gets attached to the checkout. If we let the client just invent a
 * `customer.email` or pass an arbitrary Paddle customer id, a tampered client
 * could attribute a purchase to someone else's account. To keep billing state
 * server-trusted, we create (or fetch) the Paddle customer here -- server-side,
 * keyed off the caller's own verified Supabase JWT -- and hand back only the
 * resulting customer id. The webhook later resolves *which user* a Paddle
 * subscription belongs to by looking up this same customer id in
 * lp_subscriptions, never by trusting anything the browser sent at checkout
 * time.
 *
 * Auth: requires a valid Supabase JWT (verify_jwt stays ON). The user is
 * derived from the token, never from the request body.
 */

const PADDLE_ENV = Deno.env.get("PADDLE_ENVIRONMENT") ?? "production";
const PADDLE_API_BASE = PADDLE_ENV === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

// Fail closed: refuse to boot rather than run with a missing secret and a
// confusing runtime error on the first real request.
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!PADDLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("paddle-customer: missing required env vars (PADDLE_API_KEY / Supabase secrets).");
}

async function paddleFetch(path: string, init: RequestInit) {
  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
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

    // lp_subscriptions has no client-write policy (only the webhook, via
    // service role, writes it), so this ensure-customer step needs the
    // service-role client too, exactly like the old Stripe webhook did.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Creating a Paddle customer is a real API call against a third-party
    // billing provider -- cap it well above normal use (one call per new
    // user, ever, since the result is cached in lp_subscriptions) but low
    // enough to blunt scripted abuse racing this endpoint.
    const rl = await checkRateLimit(admin, `paddle-customer:user:${user.id}`, 10, 3600, cors);
    if (!rl.allowed) return rl.response!;

    // Idempotent: if we already minted a Paddle customer for this user, reuse it.
    const { data: existing } = await admin
      .from("lp_subscriptions")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.provider_customer_id) {
      return jsonResponse({ customerId: existing.provider_customer_id }, { headers: cors });
    }

    // Create the Paddle customer. custom_data is attached for auditability and
    // as a defensive fallback in the webhook, but it is never the primary
    // trust anchor -- provider_customer_id (written by us, below) is.
    let customerId: string;
    const created = await paddleFetch("/customers", {
      method: "POST",
      body: JSON.stringify({ email: user.email, custom_data: { supabase_user_id: user.id } }),
    });

    if (created.ok) {
      customerId = created.body.data.id;
    } else if (created.status === 409) {
      // A Paddle customer with this email already exists (e.g. created
      // directly in the Paddle dashboard). Look it up instead of failing.
      const found = await paddleFetch(`/customers?email=${encodeURIComponent(user.email ?? "")}`, { method: "GET" });
      const match = found.ok ? found.body.data?.[0] : undefined;
      if (!match) {
        console.error("paddle-customer: 409 on create but no matching customer found", created.status);
        return jsonResponse({ error: "Could not set up billing for your account." }, { status: 500, headers: cors });
      }
      customerId = match.id;
    } else {
      console.error("paddle-customer: Paddle API error", created.status);
      return jsonResponse({ error: "Could not set up billing for your account." }, { status: 500, headers: cors });
    }

    // Row may not exist yet for a brand-new user; upsert it. plan/status stay
    // at their defaults (free/inactive) until the webhook reports a real
    // subscription -- this call only ever establishes the customer link.
    const { error: upsertErr } = await admin.from("lp_subscriptions").upsert(
      { user_id: user.id, provider: "paddle", provider_customer_id: customerId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (upsertErr) throw upsertErr;

    return jsonResponse({ customerId }, { headers: cors });
  } catch (err) {
    console.error("paddle-customer error:", err);
    return jsonResponse({ error: "Could not set up billing for your account." }, { status: 500, headers: cors });
  }
});

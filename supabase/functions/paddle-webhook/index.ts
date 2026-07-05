import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, enforceMaxContentLength, enforceMethod } from "../_shared/security.ts";

/**
 * Paddle webhook -> lp_subscriptions sync. Paddle stays the source of truth.
 *
 * SECURITY: this function runs with verify_jwt = false because Paddle calls it
 * without a Supabase token. Its authenticity check is a manual HMAC-SHA256
 * verification of the `Paddle-Signature` header against PADDLE_WEBHOOK_SECRET
 * (Paddle's own recommended manual algorithm -- see
 * https://developer.paddle.com/webhooks/signature-verification). An unsigned,
 * mis-signed, or stale (>5s clock skew) request is rejected before the body is
 * ever parsed as JSON. It writes with the SERVICE ROLE key (bypasses RLS),
 * which is why lp_subscriptions has no client-write policies: only this
 * trusted path writes it.
 *
 * IDENTITY: unlike the old Stripe integration, which stashed the Supabase
 * user id in `client_reference_id` / `subscription_data.metadata` at checkout
 * time, Paddle checkout is opened entirely client-side via Paddle.js and never
 * touches our server. So this webhook cannot trust any "supabase_user_id" the
 * client might have supplied at checkout. Instead, every event carries a
 * Paddle `customer_id`, and lp_subscriptions.provider_customer_id is the
 * server-established link (written once, by the paddle-customer function,
 * from a verified Supabase session) between that Paddle customer and our
 * user. Every write in this file resolves the user by looking up
 * provider_customer_id, never by trusting event.data.custom_data.
 *
 * EVENTS HANDLED (per Paddle's "lean cache" recommendation -- see
 * https://developer.paddle.com/build/subscriptions/provision-access-webhooks):
 *   subscription.created  - new subscription; may arrive before or after
 *                            the customer row exists locally, so this upserts.
 *   subscription.updated  - covers renewals, upgrades/downgrades, and every
 *                            status transition (trialing/active/past_due/
 *                            paused/canceled) -- Paddle explicitly says you
 *                            don't need separate handlers for each.
 *   subscription.canceled - defense in depth; subscription.updated already
 *                            reports status: "canceled", but Paddle also
 *                            fires this dedicated event.
 * Deliberately NOT separately handled: subscription.activated,
 * subscription.paused, subscription.resumed, subscription.past_due,
 * subscription.trialing -- all of these are subsumed by subscription.updated
 * carrying the new `status`, exactly as Paddle's docs describe.
 */

// Fail closed: refuse to boot rather than accept webhook traffic with no way
// to verify it or write it anywhere trusted.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
  throw new Error("paddle-webhook: missing required env vars (PADDLE_WEBHOOK_SECRET / Supabase secrets).");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Paddle SDKs default to a 5s tolerance between `ts` and now; match that. */
const MAX_CLOCK_SKEW_SECONDS = 5;
/** Hard cap on webhook body size -- Paddle payloads are small JSON; refuse anything grossly oversized before hashing/parsing it. */
const MAX_BODY_BYTES = 256 * 1024;

/** Manual Paddle signature verification: ts=<unix>;h1=<hex> over "ts:rawBody". */
async function verifyPaddleSignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(";").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`));
  const computed = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time comparison.
  if (computed.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

interface PaddleSubscription {
  id: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  customer_id: string;
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  items?: Array<{ price?: { id?: string } }>;
}

/** Paddle status values map onto lp_subscriptions' vocabulary almost 1:1 already. */
function planStatusFrom(sub: PaddleSubscription): { plan: string; status: string } {
  const active = sub.status === "active" || sub.status === "trialing";
  return { plan: active ? "plus" : "free", status: sub.status };
}

async function upsertFromSubscription(sub: PaddleSubscription) {
  // Resolve the user by the Paddle customer id link established by
  // paddle-customer, NOT by anything in the webhook payload's custom_data.
  const { data: existing, error: lookupErr } = await admin
    .from("lp_subscriptions")
    .select("user_id")
    .eq("provider_customer_id", sub.customer_id)
    .maybeSingle();

  if (lookupErr) throw lookupErr;
  if (!existing) {
    // No local row links this Paddle customer to a Supabase user yet. This
    // can legitimately happen if the customer was created directly in the
    // Paddle dashboard rather than through paddle-customer. Log and skip
    // rather than guessing a user id -- there is nothing safe to write.
    console.error(`paddle-webhook: no lp_subscriptions row for customer_id=${sub.customer_id}; skipping`);
    return;
  }

  const { plan, status } = planStatusFrom(sub);
  const { error: upsertErr } = await admin.from("lp_subscriptions").upsert(
    {
      user_id: existing.user_id,
      plan,
      status,
      provider: "paddle",
      provider_customer_id: sub.customer_id,
      provider_subscription_id: sub.id,
      current_period_end: sub.current_billing_period?.ends_at ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsertErr) throw upsertErr;
}

const cors = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  // Webhooks are POST-only by definition; reject anything else before doing
  // any work (also blocks GET/HEAD probing for a 200 that reveals liveness).
  const methodErr = enforceMethod(req, ["POST"]);
  if (methodErr) return new Response("Method not allowed", { status: 405 });

  const sizeErr = enforceMaxContentLength(req, MAX_BODY_BYTES);
  if (sizeErr) return new Response("Payload too large", { status: 413 });

  const sigHeader = req.headers.get("paddle-signature");
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  // Verify authenticity BEFORE any rate-limit bookkeeping or JSON parsing --
  // an unsigned/forged request should never get to consume rate-limit budget
  // or trigger a database round trip beyond the signature check itself.
  if (!(await verifyPaddleSignature(rawBody, sigHeader))) {
    console.error("paddle-webhook: signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event_type: string; data: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Defense in depth against a compromised/leaked webhook secret being used
  // to spam subscription upserts for one customer: this is generous (Paddle
  // itself would never send this many events for one customer in an hour
  // under normal operation) but bounds the worst case.
  const customerId = (event.data as { customer_id?: string } | undefined)?.customer_id ?? "unknown";
  const rl = await checkRateLimit(admin, `paddle-webhook:customer:${customerId}`, 60, 3600, {});
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { ...cors, "Retry-After": "3600" },
    });
  }

  try {
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.canceled": {
        await upsertFromSubscription(event.data as PaddleSubscription);
        break;
      }
      default:
        break; // ignore other events (transaction.*, customer.*, etc.)
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: cors });
  } catch (err) {
    console.error("paddle-webhook handler error:", err);
    // 500 so Paddle retries (at-least-once delivery) rather than dropping
    // an event that failed for a transient reason (e.g. DB hiccup).
    return new Response("Handler error", { status: 500 });
  }
});

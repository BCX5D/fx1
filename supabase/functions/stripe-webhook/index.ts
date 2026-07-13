import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, enforceMaxContentLength, enforceMethod } from "../_shared/security.ts";
import { verifyStripeSignature } from "../_shared/stripeSignature.ts";

/**
 * Stripe webhook -> lp_subscriptions sync. Stripe stays the source of truth.
 *
 * SECURITY: runs with verify_jwt = false because Stripe calls it without a
 * Supabase token. Its authenticity check is manual HMAC-SHA256 verification
 * of the `Stripe-Signature` header against STRIPE_WEBHOOK_SECRET (Stripe's
 * documented algorithm -- see supabase/functions/_shared/stripeSignature.ts).
 * An unsigned, mis-signed, or stale (>300s) request is rejected before the
 * body is parsed as JSON. It writes with the SERVICE ROLE key (bypasses RLS),
 * which is why lp_subscriptions has no client-write policies: only this
 * trusted path writes it.
 *
 * IDENTITY: every subscription event carries a Stripe `customer` id, and
 * lp_subscriptions.provider_customer_id is the server-established link
 * (written by create-checkout from a verified Supabase session) between that
 * Stripe customer and our user. We resolve the user by that link, with a
 * fallback to the `supabase_user_id` we stamp into subscription metadata at
 * checkout time (covers the race where the subscription event lands before
 * the customer row was written).
 *
 * EVENTS HANDLED:
 *   checkout.session.completed        - fetch the created subscription and upsert.
 *   customer.subscription.created     - new subscription.
 *   customer.subscription.updated     - renewals, plan changes, every status
 *                                       transition (trialing/active/past_due/
 *                                       paused/canceled).
 *   customer.subscription.deleted     - subscription ended -> revert to free.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Fail closed: refuse to boot rather than accept webhook traffic with no way
// to verify it or write it anywhere trusted.
if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
  throw new Error("stripe-webhook: missing required env vars (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / Supabase secrets).");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Hard cap on webhook body size -- Stripe payloads are small JSON. */
const MAX_BODY_BYTES = 256 * 1024;

interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  current_period_end?: number | null;
  metadata?: { supabase_user_id?: string };
}

/**
 * Normalize Stripe's status vocabulary onto the set lp_subscriptions allows
 * (inactive/active/trialing/past_due/paused/canceled). Stripe can also emit
 * unpaid/incomplete/incomplete_expired, which have no dedicated column value.
 */
function planStatusFrom(sub: StripeSubscription): { plan: string; status: string } {
  const s = sub.status;
  const active = s === "active" || s === "trialing";
  let status: string;
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "paused":
    case "canceled":
      status = s;
      break;
    case "unpaid":
      status = "past_due";
      break;
    default: // incomplete, incomplete_expired, or anything unknown
      status = "inactive";
  }
  return { plan: active ? "plus" : "free", status };
}

/** Resolve our user id for a Stripe customer: prefer the stored link, fall back to checkout metadata. */
async function resolveUserId(sub: StripeSubscription): Promise<string | null> {
  const { data: existing, error } = await admin
    .from("lp_subscriptions")
    .select("user_id")
    .eq("provider_customer_id", sub.customer)
    .maybeSingle();
  if (error) throw error;
  if (existing?.user_id) return existing.user_id;
  return sub.metadata?.supabase_user_id ?? null;
}

async function upsertFromSubscription(sub: StripeSubscription) {
  const userId = await resolveUserId(sub);
  if (!userId) {
    console.error(`stripe-webhook: no user for customer=${sub.customer}; skipping`);
    return;
  }
  const { plan, status } = planStatusFrom(sub);
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const { error: upsertErr } = await admin.from("lp_subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status,
      provider: "stripe",
      provider_customer_id: sub.customer,
      provider_subscription_id: sub.id,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsertErr) throw upsertErr;
}

async function fetchSubscription(id: string): Promise<StripeSubscription | null> {
  const res = await fetch(`${STRIPE_API_BASE}/subscriptions/${id}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) {
    console.error("stripe-webhook: could not fetch subscription", res.status);
    return null;
  }
  return await res.json();
}

Deno.serve(async (req) => {
  const methodErr = enforceMethod(req, ["POST"]);
  if (methodErr) return new Response("Method not allowed", { status: 405 });

  const sizeErr = enforceMaxContentLength(req, MAX_BODY_BYTES);
  if (sizeErr) return new Response("Payload too large", { status: 413 });

  const sigHeader = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  // Verify authenticity BEFORE any rate-limit bookkeeping or JSON parsing.
  if (!(await verifyStripeSignature(rawBody, sigHeader, WEBHOOK_SECRET))) {
    console.error("stripe-webhook: signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Defense in depth against a leaked webhook secret being used to spam
  // upserts. Bucket by customer id when present.
  const obj = event.data?.object ?? {};
  const customerId = (obj.customer as string | undefined)
    ?? (obj.id as string | undefined)
    ?? "unknown";
  const rl = await checkRateLimit(admin, `stripe-webhook:customer:${customerId}`, 120, 3600, {});
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "3600" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const subId = obj.subscription as string | undefined;
        if (subId) {
          const sub = await fetchSubscription(subId);
          if (sub) {
            // The client_reference_id carries our user id; use it as a metadata
            // fallback in case the subscription object itself lacks metadata.
            if (!sub.metadata?.supabase_user_id && typeof obj.client_reference_id === "string") {
              sub.metadata = { supabase_user_id: obj.client_reference_id };
            }
            await upsertFromSubscription(sub);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(obj as unknown as StripeSubscription);
        break;
      }
      default:
        break; // ignore other events
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    // 500 so Stripe retries rather than dropping a transiently-failed event.
    return new Response("Handler error", { status: 500 });
  }
});

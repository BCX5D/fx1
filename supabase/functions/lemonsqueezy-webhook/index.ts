import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, enforceMaxContentLength, enforceMethod } from "../_shared/security.ts";
import { verifyLemonSignature } from "../_shared/lemonSignature.ts";

/**
 * Lemon Squeezy webhook -> lp_subscriptions sync. Lemon Squeezy stays the
 * source of truth. Lemon Squeezy is a Merchant of Record, so it (not Wirby) is
 * the legal seller and handles sales tax / VAT.
 *
 * SECURITY: runs with verify_jwt = false because Lemon Squeezy calls it without
 * a Supabase token. Its authenticity check is manual HMAC-SHA256 verification
 * of the `X-Signature` header against LEMONSQUEEZY_WEBHOOK_SECRET (see
 * supabase/functions/_shared/lemonSignature.ts). An unsigned or mis-signed
 * request is rejected before the body is parsed. It writes with the SERVICE
 * ROLE key (bypasses RLS), which is why lp_subscriptions has no client-write
 * policies: only this trusted path writes it.
 *
 * IDENTITY: at checkout, create-checkout stamps the verified Supabase user id
 * into the checkout's custom data (server-side, never from the browser). It
 * comes back here as `meta.custom_data.supabase_user_id`. We resolve the user
 * by that value first, falling back to an existing lp_subscriptions row keyed
 * by the Lemon Squeezy subscription id or customer id.
 *
 * ACCESS SEMANTICS: when a subscription is `cancelled` in Lemon Squeezy it
 * stays usable until `ends_at`, then a `subscription_expired` event fires. So a
 * cancelled-but-not-yet-ended subscription is stored as active (plan=plus) so
 * the user keeps what they paid for until the period actually ends.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");

// Fail closed: refuse to boot without a way to verify or write webhook traffic.
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
  throw new Error("lemonsqueezy-webhook: missing required env vars (LEMONSQUEEZY_WEBHOOK_SECRET / Supabase secrets).");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MAX_BODY_BYTES = 256 * 1024;

interface LsSubscriptionAttributes {
  status: string;
  customer_id: number | string;
  renews_at?: string | null;
  ends_at?: string | null;
}

/** Map a Lemon Squeezy subscription status onto lp_subscriptions' plan/status. */
function planStatusFrom(attrs: LsSubscriptionAttributes, now: number): { plan: string; status: string } {
  const endsAt = attrs.ends_at ? Date.parse(attrs.ends_at) : NaN;
  switch (attrs.status) {
    case "on_trial":
      return { plan: "plus", status: "trialing" };
    case "active":
      return { plan: "plus", status: "active" };
    case "paused":
      return { plan: "free", status: "paused" };
    case "past_due":
    case "unpaid":
      return { plan: "free", status: "past_due" };
    case "cancelled":
      // Still valid until ends_at -> keep access; otherwise fully cancelled.
      if (Number.isFinite(endsAt) && endsAt > now) return { plan: "plus", status: "active" };
      return { plan: "free", status: "canceled" };
    case "expired":
      return { plan: "free", status: "canceled" };
    default:
      return { plan: "free", status: "inactive" };
  }
}

async function resolveUserId(
  customUserId: string | undefined,
  subscriptionId: string,
  customerId: string,
): Promise<string | null> {
  if (customUserId) return customUserId;
  const bySub = await admin
    .from("lp_subscriptions")
    .select("user_id")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();
  if (bySub.data?.user_id) return bySub.data.user_id;
  const byCustomer = await admin
    .from("lp_subscriptions")
    .select("user_id")
    .eq("provider_customer_id", customerId)
    .maybeSingle();
  return byCustomer.data?.user_id ?? null;
}

Deno.serve(async (req) => {
  const methodErr = enforceMethod(req, ["POST"]);
  if (methodErr) return new Response("Method not allowed", { status: 405 });

  const sizeErr = enforceMaxContentLength(req, MAX_BODY_BYTES);
  if (sizeErr) return new Response("Payload too large", { status: 413 });

  const sigHeader = req.headers.get("x-signature");
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  // Verify authenticity BEFORE any rate-limit bookkeeping or JSON parsing.
  if (!(await verifyLemonSignature(rawBody, sigHeader, WEBHOOK_SECRET))) {
    console.error("lemonsqueezy-webhook: signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    meta?: { event_name?: string; custom_data?: { supabase_user_id?: string } };
    data?: { id?: string; attributes?: LsSubscriptionAttributes };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventName = event.meta?.event_name ?? "";
  const attrs = event.data?.attributes;
  const subscriptionId = event.data?.id ? String(event.data.id) : "";
  const customerId = attrs?.customer_id != null ? String(attrs.customer_id) : "unknown";

  const rl = await checkRateLimit(admin, `lemonsqueezy-webhook:customer:${customerId}`, 120, 3600, {});
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "3600" },
    });
  }

  try {
    if (eventName.startsWith("subscription_") && attrs && subscriptionId) {
      // subscription_created / _updated / _cancelled / _resumed / _paused /
      // _unpaused / _expired all carry the current subscription state; a single
      // upsert off the current `status` covers them all.
      const userId = await resolveUserId(
        event.meta?.custom_data?.supabase_user_id,
        subscriptionId,
        customerId,
      );
      if (!userId) {
        console.error(`lemonsqueezy-webhook: no user for subscription=${subscriptionId}; skipping`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { plan, status } = planStatusFrom(attrs, Date.now());
      const periodEnd = attrs.ends_at ?? attrs.renews_at ?? null;

      const { error: upsertErr } = await admin.from("lp_subscriptions").upsert(
        {
          user_id: userId,
          plan,
          status,
          provider: "lemonsqueezy",
          provider_customer_id: customerId,
          provider_subscription_id: subscriptionId,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (upsertErr) throw upsertErr;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("lemonsqueezy-webhook handler error:", err);
    // 500 so Lemon Squeezy retries rather than dropping a transiently-failed event.
    return new Response("Handler error", { status: 500 });
  }
});

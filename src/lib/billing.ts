import { supabase } from "./supabase";
import { ensurePaddle, onPaddleEvent } from "./paddle";

/**
 * Billing client, backed by Paddle Billing. Reads the user's plan from
 * lp_subscriptions (written only by the paddle-webhook Edge Function -- see
 * that function for why client-reported plan state is never trusted). The
 * Paddle API key and webhook secret live only in Edge Function secrets,
 * never here.
 *
 * Checkout shape differs from a Stripe-style integration on purpose: Paddle
 * has no server-generated Checkout Session URL to redirect to. Instead,
 * `openPlusCheckout` (1) asks the paddle-customer Edge Function to establish
 * a server-verified Paddle customer for the signed-in user, then (2) opens
 * Paddle's own client-side overlay checkout (Paddle.js) scoped to that
 * customer id. The purchase itself is never modeled as "call an API, get a
 * subscription back" -- Paddle creates the subscription asynchronously and
 * reports it through the webhook, which is the only thing that ever flips
 * lp_subscriptions to "plus".
 */

export const FREE_ITEM_LIMIT = 25;

/** Pages read from an uploaded PDF on the Free plan before extraction stops. */
export const FREE_PDF_PAGE_LIMIT = 20;
/** Pages read from an uploaded PDF on Wirby Plus ("priority extraction for long documents"). */
export const PLUS_PDF_PAGE_LIMIT = 75;

export type Plan = "free" | "plus";
/** "paused" is a real Paddle subscription state with no Stripe equivalent: billing stops but the subscription isn't canceled. */
export type SubStatus = "inactive" | "active" | "trialing" | "past_due" | "paused" | "canceled";

export interface Subscription {
  plan: Plan;
  status: SubStatus;
  currentPeriodEnd?: string;
}

export const FREE_SUB: Subscription = { plan: "free", status: "inactive" };

/** A user has Plus features when their subscription is active or trialing. */
export function isPlus(sub: Subscription): boolean {
  return sub.plan === "plus" && (sub.status === "active" || sub.status === "trialing");
}

export async function fetchSubscription(userId: string): Promise<Subscription> {
  if (!supabase) return FREE_SUB;
  const { data, error } = await supabase
    .from("lp_subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return FREE_SUB;
  return {
    plan: data.plan as Plan,
    status: data.status as SubStatus,
    currentPeriodEnd: data.current_period_end ?? undefined,
  };
}

const PADDLE_PLUS_PRICE_ID = import.meta.env.VITE_PADDLE_PLUS_PRICE_ID;

export type CheckoutOutcome = "completed" | "closed";

/**
 * Opens Paddle's overlay checkout for Wirby Plus.
 *
 * Steps, in order:
 *  1. Ask paddle-customer (server-side, JWT-verified) to establish or fetch
 *     this user's Paddle customer id. This is the trust anchor -- the
 *     browser never invents or supplies a customer id itself.
 *  2. Open Paddle.js's overlay checkout scoped to that customer id.
 *  3. Resolve once the user completes or closes the checkout. Completion
 *     does NOT mean the plan has flipped yet -- Paddle creates the
 *     subscription asynchronously and the webhook updates lp_subscriptions
 *     moments later, so callers should refetch subscription state (with a
 *     short retry) after a "completed" outcome rather than assuming it's
 *     immediate.
 */
export async function openPlusCheckout(): Promise<CheckoutOutcome> {
  if (!supabase) throw new Error("Billing is not configured.");
  if (!PADDLE_PLUS_PRICE_ID) throw new Error("Billing is not configured.");

  const { data, error } = await supabase.functions.invoke<{ customerId: string }>("paddle-customer", { body: {} });
  if (error || !data?.customerId) throw new Error(error?.message ?? "Could not set up billing for your account.");

  const Paddle = await ensurePaddle();

  return new Promise<CheckoutOutcome>((resolve, reject) => {
    const unsubscribe = onPaddleEvent((event) => {
      if (event.name === "checkout.completed") {
        unsubscribe();
        resolve("completed");
      } else if (event.name === "checkout.closed") {
        unsubscribe();
        resolve("closed");
      } else if (event.name === "checkout.error") {
        unsubscribe();
        reject(new Error("Checkout failed. Please try again."));
      }
    });

    try {
      // No successUrl: the user is already on /app/settings, where this
      // checkout was launched from, and Paddle's own overlay shows its own
      // "purchase complete" confirmation before closing. We react to
      // completion via the eventCallback above instead of a redirect.
      Paddle!.Checkout.open({
        items: [{ priceId: PADDLE_PLUS_PRICE_ID, quantity: 1 }],
        customer: { id: data.customerId },
      });
    } catch (err) {
      unsubscribe();
      reject(err instanceof Error ? err : new Error("Could not open checkout."));
    }
  });
}

/**
 * Creates a fresh Paddle customer portal session and returns the
 * authenticated "manage subscription" link. Per Paddle's own guidance these
 * session links are temporary and must not be cached -- call this again
 * every time the user wants to manage billing, and navigate immediately.
 */
export async function openBillingPortal(): Promise<string> {
  if (!supabase) throw new Error("Billing is not configured.");
  const { data, error } = await supabase.functions.invoke<{ url: string }>("customer-portal", { body: {} });
  if (error || !data?.url) throw new Error(error?.message ?? "Could not open billing portal.");
  return data.url;
}

import { supabase } from "./supabase";

/**
 * Billing client, backed by Stripe. Reads the user's plan from
 * lp_subscriptions (written only by the stripe-webhook Edge Function -- see
 * that function for why client-reported plan state is never trusted). The
 * Stripe secret key and webhook secret live only in Edge Function secrets,
 * never here.
 *
 * Checkout is the standard Stripe redirect flow: the client asks the
 * create-checkout Edge Function (JWT-verified) to build a Checkout Session
 * server-side, then redirects the browser to the returned hosted URL. On
 * completion Stripe redirects back to /app/settings?checkout=success and the
 * subscription is reported asynchronously through the webhook, which is the
 * only thing that ever flips lp_subscriptions to "plus". No Stripe.js runs in
 * the browser, so there is no client-side Stripe key to ship.
 */

export const FREE_ITEM_LIMIT = 25;

/** Pages read from an uploaded PDF on the Free plan before extraction stops. */
export const FREE_PDF_PAGE_LIMIT = 20;
/** Pages read from an uploaded PDF on Wirby Plus ("priority extraction for long documents"). */
export const PLUS_PDF_PAGE_LIMIT = 75;

export type Plan = "free" | "plus";
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

/**
 * Client-side mirror of the free-tier ceiling enforced server-side by the
 * `lp_items_free_limit` trigger (see supabase/migrations). This exists purely
 * for UX (so a free user sees a clear message before attempting a write that
 * the database would reject anyway) -- the trigger is the real backstop and
 * cannot be bypassed by calling this function differently.
 */
export function wouldExceedFreeLimit(currentItemCount: number, itemsToAdd: number, plan: Plan): boolean {
  if (plan === "plus") return false;
  return currentItemCount + itemsToAdd > FREE_ITEM_LIMIT;
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

/**
 * Asks the create-checkout Edge Function (server-side, JWT-verified) to build
 * a Stripe Checkout Session for Wirby Plus and returns its hosted URL. The
 * caller redirects the browser there (`window.location.href = url`). Stripe
 * sends the user back to /app/settings?checkout=success on completion; the
 * plan flip itself lands moments later via the webhook, so the return handler
 * should refetch subscription state with a short retry rather than assuming
 * it's immediate.
 */
export async function startPlusCheckout(): Promise<string> {
  if (!supabase) throw new Error("Billing is not configured.");
  const { data, error } = await supabase.functions.invoke<{ url: string }>("create-checkout", { body: {} });
  if (error || !data?.url) throw new Error(error?.message ?? "Could not start checkout.");
  return data.url;
}

/**
 * Creates a Stripe Billing Portal session and returns the "manage
 * subscription" URL. Navigate to it immediately; these links are short-lived.
 */
export async function openBillingPortal(): Promise<string> {
  if (!supabase) throw new Error("Billing is not configured.");
  const { data, error } = await supabase.functions.invoke<{ url: string }>("customer-portal", { body: {} });
  if (error || !data?.url) throw new Error(error?.message ?? "Could not open billing portal.");
  return data.url;
}

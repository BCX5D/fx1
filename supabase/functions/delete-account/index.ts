import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkRateLimit, enforceMaxContentLength, enforceMethod,
  jsonResponse, restrictiveCors,
} from "../_shared/security.ts";

/**
 * Permanently deletes the authenticated user's account and all owned data.
 *
 * Why this has to be an Edge Function, not a client call: deleting the
 * auth.users row itself requires the Supabase service-role key (admin API),
 * which must never reach the browser. The client only ever proves who it is
 * (via its own JWT); it can never pass a different user's id to delete.
 *
 * Order of operations matters: lp_items / lp_audit / lp_prefs / lp_subscriptions
 * all have `on delete cascade` foreign keys to auth.users(id), so deleting the
 * auth user is sufficient to remove every owned row. Deleting the
 * lp_subscriptions row's Paddle link explicitly first is NOT needed -- Paddle
 * itself is untouched by this (cancelling a live subscription is a separate,
 * deliberate action via the customer portal, not folded into account deletion
 * silently). If the user still has an active paid subscription we require
 * them to cancel it first, so they don't lose the ability to get a refund
 * receipt or manage a still-active Paddle subscription after their account
 * row disappears.
 */

// Fail closed: refuse to boot rather than run without a real signature check
// or admin access if the project isn't fully configured.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("delete-account: missing required Supabase env vars.");
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

    // Verify the caller's identity with their own JWT (anon key + their token).
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await asUser.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Not authenticated." }, { status: 401, headers: cors });
    }

    // Service-role client for the parts a user can never do to themselves.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Irreversible + destructive: cap at 5 attempts per user per hour. A real
    // user never needs more than one; this only exists to blunt a compromised
    // token or scripted abuse from hammering account deletion.
    const rl = await checkRateLimit(admin, `delete-account:user:${user.id}`, 5, 3600, cors);
    if (!rl.allowed) return rl.response!;

    // Refuse to delete an account with a live paid subscription. The user
    // must cancel in the Paddle customer portal first so Paddle stays in a
    // clean state and they keep access to their own billing history/receipts.
    const { data: sub } = await admin
      .from("lp_subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub && sub.plan === "plus" && (sub.status === "active" || sub.status === "trialing")) {
      return jsonResponse(
        { error: "Cancel your Wirby Plus subscription first, then delete your account." },
        { status: 409, headers: cors },
      );
    }

    // Deleting the auth user cascades (on delete cascade) through
    // lp_items, lp_audit, lp_prefs, and lp_subscriptions.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    // Audit trail for a destructive, irreversible action. No PII beyond the
    // user id (already gone) and email is logged -- see Logging note below.
    console.log(`delete-account: user ${user.id} deleted their account`);

    return jsonResponse({ ok: true }, { headers: cors });
  } catch (err) {
    console.error("delete-account error:", err);
    return jsonResponse(
      { error: "Could not delete your account. Please try again or contact support@wirby.app." },
      { status: 500, headers: cors },
    );
  }
});

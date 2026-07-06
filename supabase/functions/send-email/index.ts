import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

/**
 * Supabase Auth "Send Email" hook. Every auth email (signup confirmation,
 * password recovery, email change, etc.) is routed here instead of through
 * Supabase's built-in mailer, so Wirby fully controls sender identity,
 * subject, and body -- and isn't limited by the built-in mailer's 30/hour
 * cap. This hook is available on Supabase's Free plan (verified against
 * Supabase's docs), so no paid plan is required for this to work.
 *
 * How it's wired: Supabase Dashboard > Authentication > Hooks > "Send Email
 * hook" (HTTPS), pointed at this function's URL, with a Standard Webhooks
 * secret generated there. That secret -- not a Supabase JWT -- is this
 * function's authenticity check, which is why it must be deployed with
 * --no-verify-jwt / verify_jwt=false: Supabase Auth calls this hook before
 * a session exists, so it has no user JWT to send.
 *
 * Email delivery: Resend's HTTP API, called directly via fetch (no SDK
 * dependency) with RESEND_API_KEY. Swap the `sendEmail()` call for any
 * other provider's API without touching the rest of this file if you later
 * want to switch providers.
 *
 * SECURITY:
 *  - Payload authenticity is verified via the Standard Webhooks signature
 *    (webhook-id / webhook-timestamp / webhook-signature headers), not a
 *    Supabase JWT. An unsigned or mis-signed request is rejected before the
 *    email is ever sent.
 *  - Fails closed: refuses to boot if SEND_EMAIL_HOOK_SECRET or
 *    RESEND_API_KEY is missing, rather than silently no-op'ing or sending
 *    unverified requests.
 *  - The confirmation/recovery link itself (`token_hash` + `redirect_to`)
 *    comes straight from Supabase's payload -- this function only builds
 *    the email around it, it never mints or modifies auth tokens.
 */

const SEND_EMAIL_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Must be on a domain verified in Resend (Resend > Domains). Using Resend's
// shared sandbox address ("onboarding@resend.dev") works immediately with no
// domain setup, but Wirby should switch this to something like
// "Wirby <noreply@wirby.app>" once wirby.app is verified in Resend.
const FROM_ADDRESS = Deno.env.get("SEND_EMAIL_FROM") ?? "Wirby <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

if (!SEND_EMAIL_HOOK_SECRET || !RESEND_API_KEY || !SUPABASE_URL) {
  throw new Error(
    "send-email: missing required env vars (SEND_EMAIL_HOOK_SECRET / RESEND_API_KEY / SUPABASE_URL).",
  );
}

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
}

interface HookPayload {
  user: { email: string; user_metadata?: { name?: string } };
  email_data: EmailData;
}

/** Supabase's action types mapped to Wirby-branded subject + body copy. */
function renderEmail(actionType: string, confirmUrl: string, firstName: string) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey there,";

  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your Wirby account",
        html: emailShell(`
          <p>${greeting}</p>
          <p>Thanks for signing up for Wirby. Confirm your email to start tracking
          your bills, subscriptions, and renewals in one calm dashboard.</p>
          <p><a href="${confirmUrl}" style="${buttonStyle}">Confirm your email</a></p>
          <p style="${mutedStyle}">If you didn't create a Wirby account, you can safely ignore this email.</p>
        `),
      };
    case "recovery":
      return {
        subject: "Reset your Wirby password",
        html: emailShell(`
          <p>${greeting}</p>
          <p>We got a request to reset the password on your Wirby account.
          This link is valid for about an hour.</p>
          <p><a href="${confirmUrl}" style="${buttonStyle}">Set a new password</a></p>
          <p style="${mutedStyle}">If you didn't request this, you can safely ignore this email --
          your password will not change.</p>
        `),
      };
    case "email_change":
      return {
        subject: "Confirm your new email for Wirby",
        html: emailShell(`
          <p>${greeting}</p>
          <p>Confirm this address to finish updating the email on your Wirby account.</p>
          <p><a href="${confirmUrl}" style="${buttonStyle}">Confirm new email</a></p>
          <p style="${mutedStyle}">If you didn't request this change, contact support@wirby.app right away.</p>
        `),
      };
    default:
      return {
        subject: "Your Wirby sign-in link",
        html: emailShell(`
          <p>${greeting}</p>
          <p>Use the link below to continue with Wirby.</p>
          <p><a href="${confirmUrl}" style="${buttonStyle}">Continue</a></p>
        `),
      };
  }
}

const buttonStyle =
  "display:inline-block;background:#1a4531;color:#f3f3ed;padding:12px 22px;border-radius:10px;" +
  "text-decoration:none;font-weight:600;font-family:Arial,Helvetica,sans-serif;font-size:15px;";
const mutedStyle = "color:#6b7280;font-size:13px;margin-top:24px;";

/** Minimal inline-styled HTML shell -- email clients strip <style> blocks unreliably, so everything is inline. */
function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f3ed;font-family:Arial,Helvetica,sans-serif;color:#18211b;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <div style="font-size:18px;font-weight:700;color:#1a4531;margin-bottom:24px;">Wirby</div>
      <div style="background:#fcfcf9;border:1px solid #dfe2d6;border-radius:16px;padding:32px;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
      <p style="color:#9aa39a;font-size:12px;margin-top:24px;">
        Wirby · <a href="https://www.wirby.app" style="color:#9aa39a;">wirby.app</a> ·
        <a href="mailto:support@wirby.app" style="color:#9aa39a;">support@wirby.app</a>
      </p>
    </div>
  </body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });
  if (!res.ok) {
    // Do not log response body: could echo back the recipient address alongside provider internals.
    console.error("send-email: Resend API error", res.status);
    throw new Error("Failed to send email via Resend.");
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: HookPayload;
  try {
    const wh = new Webhook(SEND_EMAIL_HOOK_SECRET.replace("v1,whsec_", ""));
    data = wh.verify(payload, headers) as unknown as HookPayload;
  } catch (err) {
    console.error("send-email: webhook signature verification failed", err);
    return new Response(JSON.stringify({ error: "Invalid signature." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { user, email_data } = data;
    const confirmUrl =
      `${SUPABASE_URL}/auth/v1/verify?token=${email_data.token_hash}` +
      `&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

    const firstName = (user.user_metadata?.name ?? "").trim().split(" ")[0] ?? "";
    const { subject, html } = renderEmail(email_data.email_action_type, confirmUrl, firstName);

    await sendEmail(user.email, subject, html);

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email handler error:", err);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: "Failed to send email." } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

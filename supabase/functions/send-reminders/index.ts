import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Scheduled reminder sender. Turns the reminder preferences users have always
 * been able to set (lp_prefs) into actual email delivery -- the piece that was
 * previously "stored but not sent". Runs on a daily cron (see the
 * `wirby_reminders` migration) and does two jobs:
 *
 *   - Due-soon alert: users with due_soon_alerts on get one email per day IF
 *     they have at least one item that needs attention (overdue / due today /
 *     within its reminder window). Deduped by lp_prefs.last_due_soon_sent so a
 *     double cron fire can't double-send.
 *   - Weekly digest: users with weekly_digest on get a Monday summary of the
 *     week ahead. Deduped by lp_prefs.last_digest_sent.
 *
 * SECURITY: verify_jwt = false (cron calls it with no user token). Its
 * authenticity check is a shared secret in the `x-cron-secret` header matched
 * against CRON_SECRET. Reads/writes with the SERVICE ROLE key because it must
 * read every user's prefs+items to know who to email -- it is never callable
 * by a browser (no CORS is emitted; the secret gate rejects anyone without it).
 * Fails closed: refuses to boot if any required secret is missing.
 */

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = Deno.env.get("SEND_EMAIL_FROM") ?? "Wirby <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!CRON_SECRET || !RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("send-reminders: missing required env vars (CRON_SECRET / RESEND_API_KEY / Supabase secrets).");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- date + urgency helpers (mirrors src/lib/urgency.ts, kept minimal) ----

function todayISO(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysUntil(iso: string, today: string): number {
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

interface DbItem {
  title: string;
  vendor: string | null;
  amount: number | null;
  currency: string;
  next_due: string | null;
  remind_days_before: number;
  status: string;
  snoozed_until: string | null;
}

function isSnoozed(it: DbItem, today: string): boolean {
  return !!it.snoozed_until && it.snoozed_until > today;
}

type Urgency = "overdue" | "today" | "soon" | "upcoming" | "later" | "none";

function urgencyOf(it: DbItem, today: string): Urgency {
  if (it.status !== "active" || !it.next_due) return "none";
  if (isSnoozed(it, today)) return "later";
  const n = daysUntil(it.next_due, today);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  if (n <= it.remind_days_before) return "soon";
  if (n <= 30) return "upcoming";
  return "later";
}

function needsAttention(it: DbItem, today: string): boolean {
  const u = urgencyOf(it, today);
  return u === "overdue" || u === "today" || u === "soon";
}

function fmtAmount(it: DbItem): string {
  if (it.amount == null) return "";
  try {
    return ` — ${new Intl.NumberFormat("en-US", { style: "currency", currency: it.currency || "USD" }).format(it.amount)}`;
  } catch {
    return ` — ${it.amount} ${it.currency}`;
  }
}

function dueLabel(iso: string, today: string): string {
  const n = daysUntil(iso, today);
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return "1 day overdue";
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  return `in ${n} days`;
}

// ---- email rendering ----

const buttonStyle =
  "display:inline-block;background:#1a4531;color:#f3f3ed;padding:12px 22px;border-radius:10px;" +
  "text-decoration:none;font-weight:600;font-family:Arial,Helvetica,sans-serif;font-size:15px;";
const LOGO_URL = "https://www.wirby.app/email-logo.png";

function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f3ed;font-family:Arial,Helvetica,sans-serif;color:#18211b;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <img src="${LOGO_URL}" width="132" height="36" alt="Wirby" style="display:block;margin-bottom:28px;border:0;outline:none;" />
    <div style="background:#fcfcf9;border:1px solid #dfe2d6;border-radius:16px;padding:32px;font-size:15px;line-height:1.6;">
      ${bodyHtml}
    </div>
    <p style="color:#9aa39a;font-size:12px;margin-top:24px;">
      You're getting this because you turned on reminders in Wirby. Change this anytime in
      <a href="https://www.wirby.app/app/settings" style="color:#9aa39a;">Settings</a>.
    </p>
    <p style="color:#9aa39a;font-size:12px;margin-top:8px;">
      Wirby · <a href="https://www.wirby.app" style="color:#9aa39a;">wirby.app</a> ·
      <a href="mailto:support@wirby.app" style="color:#9aa39a;">support@wirby.app</a>
    </p>
  </div>
</body></html>`;
}

function itemLines(items: DbItem[], today: string): string {
  return items
    .map(
      (it) =>
        `<li style="margin-bottom:8px;"><strong>${escapeHtml(it.title)}</strong>${escapeHtml(fmtAmount(it))}` +
        `<br/><span style="color:#6b7280;font-size:13px;">${it.next_due ? dueLabel(it.next_due, today) : ""}` +
        `${it.vendor ? ` · ${escapeHtml(it.vendor)}` : ""}</span></li>`,
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function dueSoonEmail(items: DbItem[], today: string) {
  const count = items.length;
  return {
    subject: count === 1 ? "1 thing needs your attention" : `${count} things need your attention`,
    html: emailShell(`
      <p>Here's what needs attention on your Wirby dashboard:</p>
      <ul style="padding-left:18px;margin:16px 0;">${itemLines(items, today)}</ul>
      <p><a href="https://www.wirby.app/app" style="${buttonStyle}">Open Wirby</a></p>
    `),
  };
}

function digestEmail(items: DbItem[], today: string) {
  return {
    subject: "Your week ahead in Wirby",
    html: emailShell(`
      <p>Here's what's coming up in the next 30 days:</p>
      <ul style="padding-left:18px;margin:16px 0;">${itemLines(items, today)}</ul>
      <p><a href="https://www.wirby.app/app" style="${buttonStyle}">Open Wirby</a></p>
    `),
  };
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("send-reminders: Resend API error", res.status);
    return false;
  }
  return true;
}

interface PrefRow {
  user_id: string;
  due_soon_alerts: boolean;
  weekly_digest: boolean;
  email: string;
  last_due_soon_sent: string | null;
  last_digest_sent: string | null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const today = todayISO(now);
  const isMonday = now.getUTCDay() === 1;
  // Body can force a mode for manual testing; default derives from the day.
  const body = await req.json().catch(() => ({}));
  const mode: "auto" | "daily" | "weekly" = body?.mode ?? "auto";
  const runDigest = mode === "weekly" || (mode === "auto" && isMonday);
  const runDueSoon = mode === "daily" || mode === "auto";

  const { data: prefs, error } = await admin
    .from("lp_prefs")
    .select("user_id,due_soon_alerts,weekly_digest,email,last_due_soon_sent,last_digest_sent")
    .neq("email", "");
  if (error) {
    console.error("send-reminders: could not read prefs", error);
    return new Response(JSON.stringify({ error: "prefs read failed" }), { status: 500 });
  }

  let dueSoonSent = 0;
  let digestSent = 0;

  for (const p of (prefs ?? []) as PrefRow[]) {
    const wantsDueSoon = runDueSoon && p.due_soon_alerts && p.last_due_soon_sent !== today;
    const wantsDigest = runDigest && p.weekly_digest && p.last_digest_sent !== today;
    if (!wantsDueSoon && !wantsDigest) continue;

    const { data: items } = await admin
      .from("lp_items")
      .select("title,vendor,amount,currency,next_due,remind_days_before,status,snoozed_until")
      .eq("user_id", p.user_id)
      .eq("status", "active");
    const active = (items ?? []) as DbItem[];

    if (wantsDueSoon) {
      const attention = active
        .filter((it) => needsAttention(it, today))
        .sort((a, b) => (a.next_due ?? "9999").localeCompare(b.next_due ?? "9999"));
      if (attention.length > 0) {
        const { subject, html } = dueSoonEmail(attention, today);
        if (await sendEmail(p.email, subject, html)) {
          dueSoonSent++;
          await admin.from("lp_prefs").update({ last_due_soon_sent: today }).eq("user_id", p.user_id);
        }
      }
    }

    if (wantsDigest) {
      const upcoming = active
        .filter((it) => {
          const u = urgencyOf(it, today);
          return u === "overdue" || u === "today" || u === "soon" || u === "upcoming";
        })
        .sort((a, b) => (a.next_due ?? "9999").localeCompare(b.next_due ?? "9999"));
      if (upcoming.length > 0) {
        const { subject, html } = digestEmail(upcoming, today);
        if (await sendEmail(p.email, subject, html)) {
          digestSent++;
          await admin.from("lp_prefs").update({ last_digest_sent: today }).eq("user_id", p.user_id);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, dueSoonSent, digestSent, ranDigest: runDigest }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

/**
 * Shared hardening primitives for Wirby Edge Functions.
 *
 * Every function that touches billing, account deletion, or any other
 * sensitive/expensive operation should use `withSecurity` (or at minimum
 * `restrictiveCors` + `checkRateLimit`) rather than rolling its own CORS
 * headers and going unrated, which is what all four functions did before
 * this file existed.
 *
 * Design choices (documented so they aren't re-litigated per function):
 *  - CORS is an allow-list of Wirby's own origins, not "*". These functions
 *    are invoked with a Supabase JWT (Authorization: Bearer <token>), never
 *    a cookie, so wildcard CORS was not a classic CSRF hole -- but it did
 *    mean any third-party site could script a call using a token obtained
 *    another way (leaked/copy-pasted/malicious extension) with zero friction.
 *    Locking this to known origins costs nothing for legitimate use and
 *    closes that door.
 *  - Rate limiting uses the `lp_rate_limits` table + `lp_check_rate_limit`
 *    RPC (service-role only, see migration `wirby_security_hardening_...`).
 *    A fixed-window counter, not a sliding log: at the volumes these
 *    endpoints see (single-digit calls per user per hour), the worst case of
 *    a fixed window (briefly ~2x the limit across a window boundary) is an
 *    acceptable tradeoff against the complexity of a real sliding window.
 *  - Every check fails CLOSED: if the rate-limit RPC itself errors (e.g. the
 *    service role key is misconfigured), the request is rejected, not
 *    silently allowed through.
 */

export const ALLOWED_ORIGINS = new Set([
  "https://wirby.app",
  "https://www.wirby.app",
  // Local/preview dev only -- harmless in production since these origins
  // are never reachable by real users, and Vite's dev server always runs
  // on localhost.
  "http://localhost:5173",
]);

/** Builds a CORS header set scoped to the request's Origin, only if it's allow-listed. */
export function restrictiveCors(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/** Common security response headers: never let a browser sniff/frame/leak this JSON. */
export const SECURITY_HEADERS: HeadersInit = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

export function jsonResponse(body: unknown, init: { status?: number; headers?: HeadersInit } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...SECURITY_HEADERS, ...init.headers },
  });
}

/** Rejects any method outside a small allow-list before any other work happens. */
export function enforceMethod(req: Request, allowed: string[]): Response | null {
  if (req.method === "OPTIONS") return null;
  if (!allowed.includes(req.method)) {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }
  return null;
}

/** Rejects bodies above `maxBytes` using Content-Length when present (defense in depth; the real cap is per-call read limits). */
export function enforceMaxContentLength(req: Request, maxBytes: number): Response | null {
  const len = req.headers.get("content-length");
  if (len && Number(len) > maxBytes) {
    return jsonResponse({ error: "Request body too large." }, { status: 413 });
  }
  return null;
}

export interface RateLimitResult {
  allowed: boolean;
  response: Response | null;
}

/**
 * Checks and increments a fixed-window rate-limit counter via the
 * `lp_check_rate_limit` Postgres RPC (service-role only). Fails CLOSED: any
 * error talking to the database counts as "not allowed" so an outage never
 * turns into an open door for the operation being limited.
 *
 * @param admin service-role Supabase client (bypasses RLS; this table has no client policies at all)
 * @param key   unique bucket, e.g. `delete-account:user:<uuid>` or `paddle-customer:ip:<ip>`
 * @param max   max requests allowed inside the window
 * @param windowSeconds window length in seconds
 */
export async function checkRateLimit(
  // deno-lint-ignore no-explicit-any
  admin: any,
  key: string,
  max: number,
  windowSeconds: number,
  cors: HeadersInit,
): Promise<RateLimitResult> {
  const { data, error } = await admin.rpc("lp_check_rate_limit", {
    p_key: key,
    p_max_count: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error(`rate-limit check failed for key=${key}:`, error);
    return {
      allowed: false,
      response: jsonResponse(
        { error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503, headers: cors },
      ),
    };
  }

  if (!data) {
    return {
      allowed: false,
      response: jsonResponse(
        { error: "Too many requests. Please wait a bit before trying again." },
        { status: 429, headers: { ...cors, "Retry-After": String(windowSeconds) } },
      ),
    };
  }

  return { allowed: true, response: null };
}

/** Best-effort caller IP for per-IP rate-limit buckets (unauthenticated paths only). */
export function callerIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

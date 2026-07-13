/**
 * Stripe webhook signature verification, in its own module with ZERO
 * Deno-specific imports (only the standard Web Crypto API, which Node/Vitest
 * also provide) so the exact logic that runs in production is unit-testable
 * under Node/Vitest in the main repo -- not exercised for the first time by a
 * real Stripe webhook call.
 *
 * Algorithm per Stripe's docs (manual signature verification):
 * https://docs.stripe.com/webhooks#verify-manually
 *   header format:  "t=<unix_seconds>,v1=<hex_hmac_sha256>[,v1=...]"
 *   signed payload: `${t}.${rawBody}`
 *   secret:         the endpoint's signing secret (whsec_...), used as the
 *                   raw UTF-8 HMAC key.
 *   Stripe's own libraries default to a 300s tolerance window.
 */

export interface VerifyStripeSignatureOptions {
  /** Max allowed seconds between the signature's `t` and now. Stripe's SDKs default to 300s. */
  toleranceSeconds?: number;
  /** Injectable clock for deterministic tests. Defaults to Date.now(). */
  now?: () => number;
}

/**
 * Verifies a Stripe `Stripe-Signature` header against the raw (unparsed)
 * request body and the endpoint signing secret. Returns false for any
 * malformed, missing, stale, or mismatched signature -- never throws, so
 * callers treat "not true" as "reject" uniformly.
 *
 * Stripe may send several `v1` schemes in one header (during secret
 * rotation); a match against ANY of them is accepted, exactly like Stripe's
 * own libraries.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  options: VerifyStripeSignatureOptions = {},
): Promise<boolean> {
  if (!header || !secret) return false;

  const toleranceSeconds = options.toleranceSeconds ?? 300;
  const now = options.now ?? Date.now;

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(now() / 1000 - tsNum) > toleranceSeconds) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const computed = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time comparison against each provided v1 signature.
  let matched = false;
  for (const provided of signatures) {
    if (provided.length !== computed.length) continue;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ provided.charCodeAt(i);
    if (diff === 0) matched = true;
  }
  return matched;
}

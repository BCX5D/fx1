/**
 * Lemon Squeezy webhook signature verification, in its own module with ZERO
 * Deno-specific imports (only the standard Web Crypto API, which Node/Vitest
 * also provide) so the exact logic that runs in production is unit-testable
 * under Node/Vitest in the main repo.
 *
 * Algorithm per Lemon Squeezy's docs (https://docs.lemonsqueezy.com/help/webhooks):
 *   header:  `X-Signature` = hex-encoded HMAC-SHA256 of the raw request body,
 *            keyed with the webhook's signing secret.
 *   (Unlike Stripe/Paddle there is no timestamp in the signature.)
 */

/**
 * Verifies a Lemon Squeezy `X-Signature` header against the raw (unparsed)
 * request body and the webhook signing secret. Returns false for any missing
 * or mismatched signature -- never throws, so callers treat "not true" as
 * "reject" uniformly.
 */
export async function verifyLemonSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!header || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const provided = header.trim().toLowerCase();
  // Constant-time comparison to avoid leaking match length via timing.
  if (provided.length !== computed.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

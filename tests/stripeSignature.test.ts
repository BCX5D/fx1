import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "../supabase/functions/_shared/stripeSignature";

/**
 * Regression coverage for the exact signature-verification logic used by the
 * live `stripe-webhook` Edge Function (via _shared/stripeSignature.ts). This
 * is the single most security-sensitive piece of custom crypto in the app:
 * if it regressed to "always true" it would let forged webhooks flip a user
 * to Plus for free; if it regressed to "always false" every real Stripe
 * webhook would fail and permanently desync billing state.
 */

const SECRET = "whsec_test_secret";

async function sign(ts: number, rawBody: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${rawBody}`));
  const hex = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${ts},v1=${hex}`;
}

describe("verifyStripeSignature", () => {
  const body = JSON.stringify({ type: "customer.subscription.updated", data: { object: { id: "sub_123" } } });

  it("accepts a correctly signed, fresh payload", async () => {
    const nowSeconds = 1_700_000_000;
    const header = await sign(nowSeconds, body);
    expect(await verifyStripeSignature(body, header, SECRET, { now: () => nowSeconds * 1000 })).toBe(true);
  });

  it("accepts when one of several rotated v1 signatures matches", async () => {
    const nowSeconds = 1_700_000_000;
    const good = await sign(nowSeconds, body);
    const header = `${good},v1=deadbeef`;
    expect(await verifyStripeSignature(body, header, SECRET, { now: () => nowSeconds * 1000 })).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const nowSeconds = 1_700_000_000;
    const header = await sign(nowSeconds, body, "whsec_wrong");
    expect(await verifyStripeSignature(body, header, SECRET, { now: () => nowSeconds * 1000 })).toBe(false);
  });

  it("rejects a payload whose body was tampered with after signing", async () => {
    const nowSeconds = 1_700_000_000;
    const header = await sign(nowSeconds, body);
    const tampered = JSON.stringify({ type: "customer.subscription.updated", data: { object: { id: "sub_evil" } } });
    expect(await verifyStripeSignature(tampered, header, SECRET, { now: () => nowSeconds * 1000 })).toBe(false);
  });

  it("rejects a stale signature outside the tolerance window", async () => {
    const signedAt = 1_700_000_000;
    const header = await sign(signedAt, body);
    expect(await verifyStripeSignature(body, header, SECRET, { now: () => (signedAt + 400) * 1000 })).toBe(false);
  });

  it("accepts a signature at the edge of the tolerance window", async () => {
    const signedAt = 1_700_000_000;
    const header = await sign(signedAt, body);
    expect(await verifyStripeSignature(body, header, SECRET, {
      now: () => (signedAt + 300) * 1000,
      toleranceSeconds: 300,
    })).toBe(true);
  });

  it("rejects a missing header", async () => {
    expect(await verifyStripeSignature(body, null, SECRET)).toBe(false);
  });

  it("rejects a malformed header missing t or v1", async () => {
    expect(await verifyStripeSignature(body, "v1=deadbeef", SECRET)).toBe(false);
    expect(await verifyStripeSignature(body, "t=1700000000", SECRET)).toBe(false);
    expect(await verifyStripeSignature(body, "garbage", SECRET)).toBe(false);
  });

  it("rejects when the secret is empty", async () => {
    const nowSeconds = 1_700_000_000;
    const header = await sign(nowSeconds, body);
    expect(await verifyStripeSignature(body, header, "", { now: () => nowSeconds * 1000 })).toBe(false);
  });
});

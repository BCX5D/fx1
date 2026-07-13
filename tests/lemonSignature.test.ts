import { describe, expect, it } from "vitest";
import { verifyLemonSignature } from "../supabase/functions/_shared/lemonSignature";

/**
 * Regression coverage for the exact signature-verification logic used by the
 * live `lemonsqueezy-webhook` Edge Function (via _shared/lemonSignature.ts).
 * If this regressed to "always true" a forged webhook could flip a user to
 * Plus for free; if it regressed to "always false" every real Lemon Squeezy
 * webhook would fail and permanently desync billing state.
 */

const SECRET = "test-lemon-signing-secret";

async function sign(rawBody: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("verifyLemonSignature", () => {
  const body = JSON.stringify({ meta: { event_name: "subscription_created" }, data: { id: "1" } });

  it("accepts a correctly signed payload", async () => {
    expect(await verifyLemonSignature(body, await sign(body), SECRET)).toBe(true);
  });

  it("accepts an uppercase-hex signature header", async () => {
    const upper = (await sign(body)).toUpperCase();
    expect(await verifyLemonSignature(body, upper, SECRET)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    expect(await verifyLemonSignature(body, await sign(body, "wrong"), SECRET)).toBe(false);
  });

  it("rejects a tampered body", async () => {
    const header = await sign(body);
    const tampered = JSON.stringify({ meta: { event_name: "subscription_created" }, data: { id: "evil" } });
    expect(await verifyLemonSignature(tampered, header, SECRET)).toBe(false);
  });

  it("rejects a missing header", async () => {
    expect(await verifyLemonSignature(body, null, SECRET)).toBe(false);
  });

  it("rejects a garbage header", async () => {
    expect(await verifyLemonSignature(body, "not-a-real-signature", SECRET)).toBe(false);
  });

  it("rejects when the secret is empty", async () => {
    expect(await verifyLemonSignature(body, await sign(body), "")).toBe(false);
  });
});

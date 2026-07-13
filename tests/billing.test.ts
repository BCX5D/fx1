import { describe, expect, it } from "vitest";
import { FREE_ITEM_LIMIT, isPlus, wouldExceedFreeLimit } from "../src/lib/billing";

/**
 * Regression coverage for the free-tier ceiling logic. The real enforcement
 * lives in the `lp_items_free_limit` Postgres trigger (server-side, cannot
 * be bypassed) -- this covers the client-side mirror in src/lib/billing.ts
 * that produces the "you're at the limit" UX before that trigger ever runs,
 * so a future edit to the constant or the comparison can't silently drift
 * from the 25-item ceiling the database actually enforces.
 */

describe("wouldExceedFreeLimit", () => {
  it("never blocks a Plus plan regardless of count", () => {
    expect(wouldExceedFreeLimit(1000, 50, "plus")).toBe(false);
  });

  it("allows adding items while under the free ceiling", () => {
    expect(wouldExceedFreeLimit(0, 1, "free")).toBe(false);
    expect(wouldExceedFreeLimit(FREE_ITEM_LIMIT - 1, 1, "free")).toBe(false);
  });

  it("blocks adding items that would cross the free ceiling", () => {
    expect(wouldExceedFreeLimit(FREE_ITEM_LIMIT, 1, "free")).toBe(true);
    expect(wouldExceedFreeLimit(FREE_ITEM_LIMIT - 1, 2, "free")).toBe(true);
  });

  it("matches the exact ceiling the database trigger enforces (25)", () => {
    expect(FREE_ITEM_LIMIT).toBe(25);
  });
});

describe("isPlus", () => {
  it("is true only for plan=plus with an active or trialing status", () => {
    expect(isPlus({ plan: "plus", status: "active" })).toBe(true);
    expect(isPlus({ plan: "plus", status: "trialing" })).toBe(true);
  });

  it("is false for plus plan with a non-active status", () => {
    expect(isPlus({ plan: "plus", status: "past_due" })).toBe(false);
    expect(isPlus({ plan: "plus", status: "paused" })).toBe(false);
    expect(isPlus({ plan: "plus", status: "canceled" })).toBe(false);
  });

  it("is false for the free plan regardless of status", () => {
    expect(isPlus({ plan: "free", status: "active" })).toBe(false);
    expect(isPlus({ plan: "free", status: "inactive" })).toBe(false);
  });
});

import type { Item } from "./types";
import { addDays, todayISO } from "./dates";

/** Sample data, clearly tagged as such so it can be recognized and removed. */
export function sampleItems(): Item[] {
  const now = new Date().toISOString();
  const t = todayISO();
  const mk = (partial: Omit<Item, "id" | "createdAt" | "updatedAt" | "source" | "currency" | "status"> & { snippet: string }): Item => ({
    id: crypto.randomUUID(),
    currency: "USD",
    status: "active",
    source: { type: "sample", snippet: partial.snippet, addedAt: now },
    createdAt: now,
    updatedAt: now,
    ...partial,
  });

  return [
    mk({
      kind: "bill",
      title: "Electricity bill",
      vendor: "City Power & Light",
      amount: 84.2,
      cadence: "monthly",
      nextDue: addDays(t, -2),
      remindDaysBefore: 5,
      snippet: "Sample data: monthly utility bill, currently 2 days past due.",
    }),
    mk({
      kind: "deadline",
      title: "Quarterly tax payment",
      vendor: "IRS",
      amount: 1240,
      cadence: "quarterly",
      nextDue: t,
      remindDaysBefore: 7,
      snippet: "Sample data: estimated tax payment due today.",
    }),
    mk({
      kind: "subscription",
      title: "Netflix subscription",
      vendor: "Netflix",
      amount: 15.49,
      cadence: "monthly",
      nextDue: addDays(t, 3),
      remindDaysBefore: 3,
      snippet: "Sample data: streaming plan, renews in 3 days.",
    }),
    mk({
      kind: "renewal",
      title: "Car insurance renewal",
      vendor: "State Farm",
      amount: 648,
      cadence: "yearly",
      nextDue: addDays(t, 18),
      remindDaysBefore: 21,
      snippet: "Sample data: annual policy renewal in 18 days.",
    }),
    mk({
      kind: "subscription",
      title: "Spotify subscription",
      vendor: "Spotify",
      amount: 11.99,
      cadence: "monthly",
      nextDue: addDays(t, 12),
      remindDaysBefore: 3,
      snippet: "Sample data: music streaming plan.",
    }),
    mk({
      kind: "warranty",
      title: "MacBook AppleCare coverage",
      vendor: "Apple",
      cadence: "once",
      nextDue: addDays(t, 64),
      remindDaysBefore: 30,
      snippet: "Sample data: hardware coverage ends in about two months.",
    }),
    mk({
      kind: "renewal",
      title: "Passport renewal",
      vendor: "U.S. Department of State",
      cadence: "once",
      nextDue: addDays(t, 210),
      remindDaysBefore: 90,
      snippet: "Sample data: passport expires in about seven months.",
    }),
    mk({
      kind: "subscription",
      title: "Adobe Creative Cloud",
      vendor: "Adobe",
      amount: 59.99,
      cadence: "monthly",
      nextDue: addDays(t, 9),
      remindDaysBefore: 3,
      snippet: "Sample data: design software plan.",
    }),
  ];
}

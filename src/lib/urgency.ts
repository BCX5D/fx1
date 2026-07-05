import type { Item, Urgency } from "./types";
import { daysUntil, todayISO } from "./dates";

export function isSnoozed(item: Item): boolean {
  return !!item.snoozedUntil && item.snoozedUntil > todayISO();
}

export function urgencyOf(item: Item): Urgency {
  if (item.status !== "active" || !item.nextDue) return "none";
  if (isSnoozed(item)) return "later";
  const n = daysUntil(item.nextDue);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  if (n <= item.remindDaysBefore) return "soon";
  if (n <= 30) return "upcoming";
  return "later";
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue",
  today: "Due today",
  soon: "Due soon",
  upcoming: "Upcoming",
  later: "Later",
  none: "No date",
};

const URGENCY_RANK: Record<Urgency, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  upcoming: 3,
  later: 4,
  none: 5,
};

export function needsAttention(item: Item): boolean {
  const u = urgencyOf(item);
  return u === "overdue" || u === "today" || u === "soon";
}

export function sortByUrgency(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const r = URGENCY_RANK[urgencyOf(a)] - URGENCY_RANK[urgencyOf(b)];
    if (r !== 0) return r;
    const ad = a.nextDue ?? "9999-12-31";
    const bd = b.nextDue ?? "9999-12-31";
    return ad.localeCompare(bd);
  });
}

/** Normalized monthly cost of everything recurring and active. */
export function monthlyTotal(items: Item[]): number {
  let total = 0;
  for (const it of items) {
    if (it.status !== "active" || it.amount == null) continue;
    switch (it.cadence) {
      case "weekly": total += it.amount * 4.33; break;
      case "monthly": total += it.amount; break;
      case "quarterly": total += it.amount / 3; break;
      case "yearly": total += it.amount / 12; break;
      case "once": break;
    }
  }
  return total;
}

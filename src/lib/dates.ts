export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysUntil(iso: string): number {
  const a = parseISO(todayISO()).getTime();
  const b = parseISO(iso).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function fmtDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateShort(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtDateTime(isoTs: string): string {
  const d = new Date(isoTs);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "4 days overdue", "due today", "in 3 days" */
export function relativeDueLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return "1 day overdue";
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  if (n <= 45) return `in ${n} days`;
  return `on ${fmtDate(iso)}`;
}

/** Next occurrence of a recurring date, used when a recurring item is marked handled. */
export function nextOccurrence(iso: string, cadence: "weekly" | "monthly" | "quarterly" | "yearly" | "once"): string | undefined {
  if (cadence === "once") return undefined;
  const d = parseISO(iso);
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  if (cadence === "quarterly") d.setMonth(d.getMonth() + 3);
  if (cadence === "yearly") d.setFullYear(d.getFullYear() + 1);
  // keep advancing until the date is in the future
  const today = parseISO(todayISO()).getTime();
  while (d.getTime() <= today) {
    if (cadence === "weekly") d.setDate(d.getDate() + 7);
    else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
    else if (cadence === "quarterly") d.setMonth(d.getMonth() + 3);
    else d.setFullYear(d.getFullYear() + 1);
  }
  return toISODate(d);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

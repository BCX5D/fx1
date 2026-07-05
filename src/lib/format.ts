const fmtCache = new Map<string, Intl.NumberFormat>();

export function fmtMoney(amount: number, currency = "USD"): string {
  let f = fmtCache.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-US", { style: "currency", currency });
    } catch {
      f = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
    fmtCache.set(currency, f);
  }
  return f.format(amount);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

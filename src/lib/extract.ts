import type { Cadence, ConfidenceField, ItemKind } from "./types";
import { DEFAULT_LEAD_DAYS } from "./types";
import { toISODate, todayISO } from "./dates";

/**
 * Deterministic extraction engine. It reads pasted or uploaded text and proposes
 * structured items with per-field confidence. Nothing is saved without user review.
 * The same interface is where a server-side LLM call would plug in.
 */

export interface Candidate {
  kind: ItemKind;
  title: string;
  vendor?: string;
  amount?: number;
  currency: string;
  cadence: Cadence;
  nextDue?: string;
  remindDaysBefore: number;
  confidence: Partial<Record<ConfidenceField, number>>;
  snippet: string;
}

export interface ExtractionResult {
  candidates: Candidate[];
  warnings: string[];
}

const KNOWN_VENDORS = [
  "Netflix", "Spotify", "Adobe", "iCloud", "Apple", "Notion", "YouTube Premium", "YouTube",
  "Amazon Prime", "Amazon", "Disney+", "Dropbox", "1Password", "GitHub", "Google One", "Google",
  "HBO Max", "Max", "Audible", "Grammarly", "Figma", "Canva", "Microsoft 365", "Microsoft",
  "Slack", "Zoom", "LinkedIn", "Strava", "Duolingo", "Headspace", "Calm", "NordVPN", "ExpressVPN",
  "Hulu", "Paramount+", "Crunchyroll", "PlayStation", "Xbox", "Nintendo", "Steam",
  "T-Mobile", "Verizon", "AT&T", "Comcast", "Xfinity", "Spectrum", "State Farm", "Geico",
  "Progressive", "Allianz", "AXA", "Allstate", "USAA", "Planet Fitness", "Equinox",
  "New York Times", "The Economist", "Medium", "Substack", "Patreon", "Squarespace", "Wix",
  "Mailchimp", "Vercel", "Cloudflare", "AWS", "DigitalOcean",
];

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const CURRENCY_SIGNS: Record<string, string> = { "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY" };

interface DateHit { iso: string; index: number; confidence: number }
interface AmountHit { value: number; currency: string; index: number }

function parseAmountToken(raw: string): number | undefined {
  let s = raw.replace(/\s/g, "");
  // 1.234,56 (EU) vs 1,234.56 (US)
  if (/,\d{2}$/.test(s) && !s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : undefined;
}

function findAmounts(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  const re = /(USD|EUR|GBP|IDR|CAD|AUD|[$€£¥])\s?(\d[\d.,]*)|(\d[\d.,]*)\s?(USD|EUR|GBP|IDR|CAD|AUD)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sym = (m[1] ?? m[4] ?? "$").toUpperCase();
    const raw = m[2] ?? m[3] ?? "";
    const value = parseAmountToken(raw);
    if (value === undefined) continue;
    hits.push({ value, currency: CURRENCY_SIGNS[m[1] ?? ""] ?? (sym.length === 3 ? sym : "USD"), index: m.index });
  }
  return hits;
}

function validDate(y: number, mo: number, d: number): string | undefined {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return undefined;
  return toISODate(new Date(y, mo - 1, d));
}

function findDates(text: string): DateHit[] {
  const hits: DateHit[] = [];
  let m: RegExpExecArray | null;

  const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = iso.exec(text))) {
    const d = validDate(+m[1], +m[2], +m[3]);
    if (d) hits.push({ iso: d, index: m.index, confidence: 0.95 });
  }

  // "August 12, 2026" and "12 August 2026"
  const monthName = /\b(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})?(?:st|nd|rd|th)?,?\s+(20\d{2})\b/gi;
  while ((m = monthName.exec(text))) {
    const mo = MONTHS[m[2].toLowerCase()];
    const day = +(m[1] ?? m[3] ?? "1");
    const d = validDate(+m[4], mo, day);
    if (d) hits.push({ iso: d, index: m.index, confidence: 0.9 });
  }

  // 08/12/2026 or 08-12-2026: ambiguous month/day order, lower confidence
  const slash = /\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/g;
  while ((m = slash.exec(text))) {
    const a = +m[1];
    const b = +m[2];
    const d = a > 12 ? validDate(+m[3], b, a) : validDate(+m[3], a, b);
    if (d) hits.push({ iso: d, index: m.index, confidence: a > 12 || b > 12 ? 0.85 : 0.6 });
  }
  return hits;
}

const DUE_WORDS = /(due|renew(?:s|al)?|expir(?:es|y|ation)|valid (?:until|through|thru)|deadline|payment date|next (?:payment|billing|charge)|bill(?:ing)? date|ends? on)/gi;

function pickDueDate(text: string, dates: DateHit[]): { iso?: string; confidence: number } {
  if (dates.length === 0) return { confidence: 0 };
  const keywords: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DUE_WORDS.source, "gi");
  while ((m = re.exec(text))) keywords.push(m.index);
  let best: DateHit | undefined;
  let bestScore = -Infinity;
  for (const d of dates) {
    let score = d.confidence;
    const nearKeyword = keywords.some((k) => Math.abs(k - d.index) < 80);
    if (nearKeyword) score += 0.6;
    if (d.iso >= todayISO()) score += 0.2;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  if (!best) return { confidence: 0 };
  const conf = Math.min(0.97, bestScore > 1 ? best.confidence + 0.05 : best.confidence * 0.7);
  return { iso: best.iso, confidence: conf };
}

function detectCadence(text: string): { cadence: Cadence; confidence: number } {
  const t = text.toLowerCase();
  if (/(per month|monthly|\/\s?mo\b|every month|a month)/.test(t)) return { cadence: "monthly", confidence: 0.9 };
  if (/(per year|yearly|annual|\/\s?yr\b|every year|12 months)/.test(t)) return { cadence: "yearly", confidence: 0.9 };
  if (/(quarterly|every 3 months|per quarter)/.test(t)) return { cadence: "quarterly", confidence: 0.9 };
  if (/(weekly|per week|every week)/.test(t)) return { cadence: "weekly", confidence: 0.9 };
  return { cadence: "once", confidence: 0.4 };
}

function detectKind(text: string, hasCadence: boolean): { kind: ItemKind; confidence: number } {
  const t = text.toLowerCase();
  if (/(warranty|applecare|coverage (?:ends|expires)|protection plan)/.test(t)) return { kind: "warranty", confidence: 0.9 };
  if (/(insurance|policy|registration|passport|license|lease|contract (?:ends|renewal)|domain)/.test(t)) return { kind: "renewal", confidence: 0.85 };
  if (/(subscription|plan renews|membership|renews automatically|auto-renew)/.test(t)) return { kind: "subscription", confidence: 0.85 };
  if (/(invoice|amount due|bill(?:ing)? (?:date|period)|utility|electricity|water bill|gas bill|statement)/.test(t)) return { kind: "bill", confidence: 0.85 };
  if (/(deadline|application|tax|filing|submit(?: by)?|registration closes)/.test(t)) return { kind: "deadline", confidence: 0.8 };
  if (hasCadence) return { kind: "subscription", confidence: 0.6 };
  return { kind: "document", confidence: 0.4 };
}

function detectVendor(text: string): { vendor?: string; confidence: number } {
  for (const v of KNOWN_VENDORS) {
    const re = new RegExp(`\\b${v.replace(/[+.]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) return { vendor: v, confidence: 0.9 };
  }
  const from = text.match(/^from:\s*"?([^"<\n]+)"?/im);
  if (from) return { vendor: from[1].trim(), confidence: 0.7 };
  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 2 && l.length < 60 && !/\d{4}/.test(l));
  if (firstLine) return { vendor: firstLine.replace(/[^\w\s&.+-]/g, "").trim(), confidence: 0.35 };
  return { confidence: 0 };
}

function snippetAround(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf("\n", index - 1) + 1);
  let end = text.indexOf("\n", index + 1);
  if (end === -1) end = text.length;
  return text.slice(start, end).trim().slice(0, 200);
}

function buildCandidate(text: string, fullText?: string): Candidate | null {
  const amounts = findAmounts(text);
  const dates = findDates(text);
  const due = pickDueDate(text, dates);
  const cad = detectCadence(text);
  const kind = detectKind(text, cad.cadence !== "once");
  const ven = detectVendor(text);

  // require real signal: an amount, a date, or a confidently recognized vendor
  if (amounts.length === 0 && dates.length === 0 && ven.confidence < 0.6) return null;

  // prefer the amount nearest a "total / amount due" phrase
  let amount: AmountHit | undefined;
  const totalKw = /(total|amount due|you(?:'ll)? pay|charged|price)/i.exec(text);
  if (totalKw && amounts.length > 0) {
    amount = amounts.reduce((a, b) =>
      Math.abs(a.index - totalKw.index) <= Math.abs(b.index - totalKw.index) ? a : b);
  } else {
    amount = amounts[0];
  }

  const kindLabelMap: Record<ItemKind, string> = {
    subscription: "subscription", bill: "bill", renewal: "renewal",
    deadline: "deadline", warranty: "warranty", document: "document",
  };
  const title = ven.vendor
    ? `${ven.vendor} ${kindLabelMap[kind.kind]}`
    : `Untitled ${kindLabelMap[kind.kind]}`;

  const src = fullText ?? text;
  const anchorIdx = totalKw?.index ?? amounts[0]?.index ?? dates[0]?.index ?? 0;

  return {
    kind: kind.kind,
    title,
    vendor: ven.vendor,
    amount: amount?.value,
    currency: amount?.currency ?? "USD",
    cadence: cad.cadence,
    nextDue: due.iso,
    remindDaysBefore: DEFAULT_LEAD_DAYS[kind.kind],
    confidence: {
      kind: kind.confidence,
      title: ven.confidence * 0.9,
      vendor: ven.confidence,
      amount: amount ? (totalKw ? 0.9 : 0.7) : 0,
      nextDue: due.confidence,
      cadence: cad.confidence,
    },
    snippet: snippetAround(src, anchorIdx),
  };
}

/** Lines that look like "Netflix  $15.49  monthly" (bank statement / subscription list). */
function tryLineList(text: string): Candidate[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: Candidate[] = [];
  for (const line of lines) {
    const amounts = findAmounts(line);
    if (amounts.length === 0) continue;
    const ven = detectVendor(line);
    if (!ven.vendor || ven.confidence < 0.6) continue;
    const cad = detectCadence(line);
    const dates = findDates(line);
    const due = pickDueDate(line, dates);
    rows.push({
      kind: "subscription",
      title: `${ven.vendor} subscription`,
      vendor: ven.vendor,
      amount: amounts[0].value,
      currency: amounts[0].currency,
      cadence: cad.cadence === "once" ? "monthly" : cad.cadence,
      nextDue: due.iso,
      remindDaysBefore: DEFAULT_LEAD_DAYS.subscription,
      confidence: {
        kind: 0.75,
        title: ven.confidence,
        vendor: ven.confidence,
        amount: 0.85,
        nextDue: due.confidence,
        cadence: cad.cadence === "once" ? 0.5 : cad.confidence,
      },
      snippet: line.slice(0, 200),
    });
  }
  return rows;
}

export function extractFromText(text: string): ExtractionResult {
  const warnings: string[] = [];
  const clean = text.replace(/\r/g, "").trim();
  if (clean.length < 8) {
    return { candidates: [], warnings: ["There is not enough text here to read. Paste the full message or document text."] };
  }

  const looksLikeSingleDoc = /(invoice|policy|warranty|receipt|statement of|confirmation)/i.test(clean.slice(0, 400));
  const listRows = tryLineList(clean);

  if (listRows.length >= 2 && !looksLikeSingleDoc) {
    warnings.push(`Read ${listRows.length} recurring charges from this list. Check amounts and cadence before saving.`);
    return { candidates: listRows, warnings };
  }

  const single = buildCandidate(clean);
  if (!single) {
    return {
      candidates: [],
      warnings: ["No amounts, dates, or known vendors were found. You can still add this item manually."],
    };
  }
  if ((single.confidence.nextDue ?? 0) < 0.5 && single.nextDue) {
    warnings.push("The due date is a best guess from an ambiguous format. Please confirm it.");
  }
  if (!single.nextDue) {
    warnings.push("No due or renewal date was found. Add one so Wirby can remind you.");
  }
  return { candidates: [single], warnings };
}

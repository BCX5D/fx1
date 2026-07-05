import type { ReactNode } from "react";
import { Seo } from "../../lib/seo";

/**
 * Shared chrome for legal documents (Privacy, Terms, Refund Policy).
 *
 * IMPORTANT FOR WHOEVER PUBLISHES THIS: these documents are a solid starting
 * template, not a substitute for legal review. Before going live:
 *   1. Fill in every "[LAUNCH-BLOCKING PLACEHOLDER: ...]" below with real values
 *      (legal entity name, registered address, governing-law jurisdiction,
 *      liability cap). These are marked in red in the rendered page and, per
 *      `scripts/check-legal-placeholders.mjs`, will FAIL `npm run build` until
 *      resolved -- this is intentional, so an unfinished legal page can't ship
 *      by accident. Other "[PLACEHOLDER — not launch-blocking: ...]" markers
 *      (e.g. the email provider name) don't block the build since they
 *      describe optional infrastructure that isn't live yet, not a legal gap.
 *   2. Have a lawyer (or a service like iubenda) review the final text,
 *      especially the governing-law and liability sections, which are
 *      jurisdiction-specific and cannot be correct for every country by default.
 *   3. Keep these pages in sync with what the product actually does. If a
 *      feature changes (pricing, data retention, sub-processors), update the
 *      matching section the same day.
 */

export function LegalLayout({
  title,
  updated,
  children,
  seoDescription,
  path,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  /** Unique per-page meta description; required so legal pages don't duplicate metadata. */
  seoDescription: string;
  path: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-16 sm:px-8 lg:py-24">
      <Seo title={`${title} — Wirby`} description={seoDescription} path={path} />
      <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-[42px]">
        {title}
      </h1>
      <p className="mt-3 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-faint">
        Last updated {updated}
      </p>
      <div className="mt-10 space-y-10">{children}</div>
    </div>
  );
}

export function LSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="font-display text-2xl font-medium tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

export function LP({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-ink-soft">{children}</p>;
}

export function LUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">{children}</ul>;
}

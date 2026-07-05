import { ArrowRight, Check } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Seo } from "../../lib/seo";

const FREE = [
  "Up to 25 tracked items",
  "Document and text extraction",
  "Urgency dashboard and reminders",
  "Search, archive, and audit log",
  "Full CSV and JSON export",
];

const PLUS = [
  "Unlimited tracked items",
  "Priority extraction: read up to 75 pages per PDF instead of 20",
  "Everything in Free, always",
];

const FAQ = [
  {
    q: "What counts as an item?",
    a: "One thing Wirby watches for you: a subscription, a bill, a renewal, a warranty, a deadline, or a document. Editing or completing an item never costs anything.",
  },
  {
    q: "Do I need to connect my bank?",
    a: "No. Wirby works from what you give it: uploads, pasted text, or manual entries. There is nothing to connect before it becomes useful.",
  },
  {
    q: "What happens to my data if I leave?",
    a: "Export everything as CSV or JSON in one click, then delete your account. Deletion is immediate and complete.",
  },
  {
    q: "How does billing work?",
    a: "Plus is billed monthly through Paddle, our checkout and billing partner, and you can cancel anytime. Downgrading keeps your first 25 items active and archives nothing.",
  },
  {
    q: "Can Wirby track warranties and renewals, not just bills?",
    a: "Yes. Bills, subscriptions, renewals, warranties, and one-off deadlines all live in the same ranked list, since they all share one thing that matters: a date you can't afford to miss.",
  },
];

// Two schema objects, both matching what's literally on this page:
// the two plans with their real prices, and the FAQ accordion below them.
const PRICING_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Wirby",
    url: "https://www.wirby.app/pricing",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      {
        "@type": "Offer",
        name: "Plus",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "6",
          priceCurrency: "USD",
          billingDuration: "P1M",
          unitText: "MONTH",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export function Pricing() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-24">
      <Seo
        title="Pricing — Wirby Subscription & Bill Tracker"
        description="Wirby is free for up to 25 tracked items. Wirby Plus is $6/month for unlimited subscriptions, bills, renewals, and priority document extraction."
        path="/pricing"
        jsonLd={PRICING_JSONLD}
      />
      <div className="max-w-xl">
        <h1 className="rise font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
          Two plans. No decoys.
        </h1>
        <p className="rise mt-4 text-lg leading-relaxed text-ink-soft" style={{ "--i": 1 } as React.CSSProperties}>
          Free covers a real household. Plus is for people whose admin outgrew it.
        </p>
      </div>

      <div className="rise mt-12 grid gap-4 lg:grid-cols-12" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="flex flex-col rounded-2xl border border-line bg-panel p-8 lg:col-span-5">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Free</h2>
          <p className="mt-1 text-sm text-ink-faint">For getting your footing back.</p>
          <p className="mt-6 font-mono text-4xl text-ink">$0</p>
          <ul className="mt-8 flex-1 space-y-3">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
                <Check size={18} className="mt-0.5 shrink-0 text-pine-600" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <Button to="/signup" variant="secondary" size="lg" className="mt-8 w-full">
            Start free
          </Button>
        </div>

        <div className="relative flex flex-col rounded-2xl bg-pine-900 p-8 shadow-(--shadow-float) lg:col-span-7">
          <span className="absolute -top-3 left-8 rounded-full bg-paper px-3 py-1 text-[12px] font-semibold text-pine-900 ring-1 ring-pine-200">
            For heavy admin
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-paper">Plus</h2>
          <p className="mt-1 text-sm text-pine-200">For freelancers, families, and subscription collectors.</p>
          <p className="mt-6 font-mono text-4xl text-paper">
            $6<span className="text-lg text-pine-200"> / month</span>
          </p>
          <ul className="mt-8 flex-1 space-y-3">
            {PLUS.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[15px] text-pine-100">
                <Check size={18} className="mt-0.5 shrink-0 text-pine-200" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <Button to="/signup" size="lg" variant="inverse" className="mt-8 w-full">
            Start free
            <ArrowRight size={18} aria-hidden />
          </Button>
          <p className="mt-3 text-center text-[13px] text-pine-200">
            Every account starts on Free. Upgrade from settings when you hit the ceiling.
          </p>
        </div>
      </div>

      <div className="mt-20 max-w-2xl lg:ml-[16%]">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">Fair questions</h2>
        <div className="mt-6 divide-y divide-line border-t border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink transition-colors hover:text-pine-700 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-ink-faint transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-[15px] text-ink-soft">
          Not sure which plan fits? See{" "}
          <Link to="/" className="text-pine-700 underline hover:no-underline">how Wirby works</Link>{" "}
          on the homepage, or read the{" "}
          <Link to="/refund-policy" className="text-pine-700 underline hover:no-underline">refund policy</Link>{" "}
          before you upgrade.
        </p>
      </div>
    </div>
  );
}

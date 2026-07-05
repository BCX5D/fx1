import { ArrowRight, Check, FileArrowUp, ListMagnifyingGlass } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { MiniDashboard } from "../../components/marketing/MiniDashboard";
import { UrgencyPill } from "../../components/app/UrgencyPill";
import { Seo } from "../../lib/seo";

// Kept intentionally minimal: only claims that match what's actually visible
// on THIS page. The $6/mo Plus price lives on /pricing and gets its own
// schema there — mirroring it here would describe content this page doesn't
// show, which is the kind of markup/content mismatch Google explicitly
// penalizes.
const HOME_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Wirby",
  url: "https://www.wirby.app",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Wirby is a personal admin dashboard that tracks subscriptions, bills, renewals, warranties, and deadlines, and ranks them by urgency.",
  offers: {
    "@type": "Offer",
    name: "Free plan",
    price: "0",
    priceCurrency: "USD",
    description: "Free for up to 25 tracked items.",
  },
};

export function Home() {
  return (
    <>
      <Seo
        title="Wirby — Subscription, Bill & Renewal Tracker"
        description="Track subscriptions, bills, renewals, warranties, and deadlines in one ranked list. Wirby flags what needs attention before it costs you."
        path="/"
        jsonLd={HOME_JSONLD}
      />
      {/* Hero: asymmetric split, real product render on the right */}
      <section className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-pine-50/80 to-transparent" />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:pb-32 lg:pt-20">
          <div className="lg:col-span-5">
            <h1 className="rise font-display text-5xl font-medium leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-[68px]">
              Life admin,
              <br />
              <em className="pb-1 leading-[1.1] text-pine-700">off your mind.</em>
            </h1>
            <p className="rise mt-6 max-w-md text-lg leading-relaxed text-ink-soft" style={{ "--i": 1 } as React.CSSProperties}>
              Bills, subscriptions, renewals, and deadlines in one calm place.
              Wirby flags what needs attention before it costs you.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ "--i": 2 } as React.CSSProperties}>
              <Button to="/signup" size="lg">
                Start free
                <ArrowRight size={18} aria-hidden />
              </Button>
              <Button to="/pricing" size="lg" variant="secondary">
                See pricing
              </Button>
            </div>
          </div>
          <div className="rise lg:col-span-7 lg:pl-8" style={{ "--i": 3 } as React.CSSProperties}>
            <MiniDashboard />
          </div>
        </div>
      </section>

      {/* Problem: editorial manifesto, offset left margin on purpose */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-3xl lg:ml-[16%]">
            <h2 className="font-display text-[34px] font-medium leading-[1.18] tracking-tight text-ink sm:text-5xl">
              Right now, your renewals live in inboxes, screenshots,
              bank statements, and <em className="pb-1 text-pine-700">memory.</em>
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
              Missing one means late fees, lapsed coverage, or paying another year
              for something you forgot you had.
            </p>
          </div>
        </div>
      </section>

      {/* How it works: sticky heading left, sequence right */}
      <section className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                From pile to plan in a minute.
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                No setup marathon. Upload one document or paste one email,
                and the dashboard starts earning its place.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <ol className="space-y-12">
              <li className="grid grid-cols-[44px_1fr] gap-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-pine-100 text-pine-700">
                  <FileArrowUp size={22} aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">Capture</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-ink-soft">
                    Drop in a PDF, paste an email, or type it yourself.
                    Anything with a date or an amount counts.
                  </p>
                </div>
              </li>
              <li className="grid grid-cols-[44px_1fr] gap-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-pine-100 text-pine-700">
                  <ListMagnifyingGlass size={22} aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">Detect</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-ink-soft">
                    Pattern matching pulls out amounts, dates, vendors, and cadence,
                    right in your browser. No AI guesswork, nothing sent to a server.
                    Anything uncertain is flagged for you to confirm before it saves.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
                    <span className="font-mono text-[13px] text-ink-soft">"renews automatically on Mar 14"</span>
                    <ArrowRight size={14} className="text-ink-faint" aria-hidden />
                    <UrgencyPill urgency="soon" label="Renewal · Mar 14" />
                  </div>
                </div>
              </li>
              <li className="grid grid-cols-[44px_1fr] gap-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-pine-100 text-pine-700">
                  <Check size={22} aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">Act</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-ink-soft">
                    The dashboard ranks everything by urgency. Handle it, snooze it,
                    or archive it. Recurring items roll forward on their own.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Capabilities: bento with exact cell count and varied backgrounds */}
      <section className="mx-auto w-full max-w-[1200px] px-5 pb-20 sm:px-8 lg:pb-28">
        <h2 className="mb-3 max-w-lg font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Built for the thirty-second check-in.
        </h2>
        <p className="mb-10 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          One dashboard for subscriptions, bills, renewals, warranties, and deadlines,
          ranked so the thing due soonest is always on top.
        </p>
        <div className="grid gap-4 md:grid-cols-6">
          <div className="rounded-2xl border border-line bg-panel p-6 md:col-span-4">
            <h3 className="text-lg font-semibold tracking-tight text-ink">One list, ranked by urgency</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">
              Overdue first, then today, then what is coming. Never a wall of equal-looking cards.
            </p>
            <div className="mt-5 space-y-2.5" aria-hidden="true">
              <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-2.5">
                <span className="text-sm font-medium text-ink">Electricity bill</span>
                <UrgencyPill urgency="overdue" />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-2.5">
                <span className="text-sm font-medium text-ink">Quarterly tax payment</span>
                <UrgencyPill urgency="today" />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-2.5">
                <span className="text-sm font-medium text-ink">Car insurance renewal</span>
                <UrgencyPill urgency="soon" />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-pine-800 p-6 text-paper md:col-span-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Your real recurring spend</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-pine-200">
                Weekly, monthly, and yearly charges normalized into one honest number.
              </p>
            </div>
            <p className="mt-6 font-mono text-3xl">$186.40<span className="text-base text-pine-200"> / mo</span></p>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6 md:col-span-2">
            <h3 className="text-lg font-semibold tracking-tight text-ink">Search everything</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Every item, every source, every archived thing. Found in a keystroke.
            </p>
            <div className="mt-4 flex h-10 items-center rounded-[10px] border border-line-strong bg-paper px-3.5 font-mono text-[13px] text-ink-faint" aria-hidden="true">
              passport
            </div>
          </div>
          <div className="rounded-2xl bg-pine-50 p-6 md:col-span-2">
            <h3 className="text-lg font-semibold tracking-tight text-ink">A memory of every change</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Edits, snoozes, and sign-ins land in an audit trail you can read.
            </p>
            <div className="mt-4 space-y-1.5" aria-hidden="true">
              <p className="font-mono text-[12px] text-pine-800">Snoozed “Gym membership”</p>
              <p className="font-mono text-[12px] text-ink-faint">Exported 31 items as CSV</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6 md:col-span-2">
            <h3 className="text-lg font-semibold tracking-tight text-ink">Leave with your data</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Full CSV and JSON export, one click, no retention tricks.
            </p>
            <div className="mt-4 flex gap-2" aria-hidden="true">
              <span className="rounded-full bg-pine-100 px-3 py-1 font-mono text-[12px] font-medium text-pine-800 ring-1 ring-inset ring-pine-200/70">.csv</span>
              <span className="rounded-full bg-pine-100 px-3 py-1 font-mono text-[12px] font-medium text-pine-800 ring-1 ring-inset ring-pine-200/70">.json</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust: the one dark block on the page */}
      <section className="bg-pine-950">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl font-medium tracking-tight text-paper sm:text-4xl">
                Built like it holds your keys.
              </h2>
              <p className="mt-4 max-w-sm leading-relaxed text-pine-200">
                Because it does. Life admin is sensitive by definition,
                so the boring security work came first.
              </p>
            </div>
            <div className="space-y-8 lg:col-span-6 lg:col-start-7">
              <div className="border-l-2 border-pine-700 pl-5">
                <h3 className="font-semibold text-paper">Least data, least privilege</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-pine-200">
                  We store what a reminder needs and nothing else. No bank logins required to get value.
                </p>
              </div>
              <div className="border-l-2 border-pine-700 pl-5">
                <h3 className="font-semibold text-paper">Every important action logged</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-pine-200">
                  Sign-ins, edits, exports, and deletions all land in an audit trail you can inspect yourself.
                </p>
              </div>
              <div className="border-l-2 border-pine-700 pl-5">
                <h3 className="font-semibold text-paper">Deletion means deletion</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-pine-200">
                  Remove an item, a source, or your whole account. It is gone, and the export button works first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <figure className="mx-auto max-w-2xl text-center">
          <blockquote className="font-display text-[26px] font-medium italic leading-[1.35] text-ink sm:text-3xl">
            “I found four subscriptions I had been quietly paying since 2023.
            Wirby paid for itself in the first ten minutes.”
          </blockquote>
          <figcaption className="mt-6 text-sm text-ink-faint">
            Maren Kowalczyk, freelance photographer
          </figcaption>
        </figure>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-pine-200/60 bg-pine-100 px-8 py-12 sm:flex-row sm:items-center lg:px-14">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              Start with one upload.
            </h2>
            <p className="mt-2.5 max-w-md text-[15px] text-ink-soft">
              Free for your first 25 items. See{" "}
              <Link to="/pricing" className="underline hover:no-underline">what Plus adds</Link>{" "}
              when you outgrow that.
            </p>
          </div>
          <Button to="/signup" size="lg" className="shrink-0">
            Start free
            <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      </section>
    </>
  );
}

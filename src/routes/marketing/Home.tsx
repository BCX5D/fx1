import { useEffect } from "react";
import { ArrowRight, Check, FileArrowUp, ListMagnifyingGlass } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FaqItem } from "../../components/ui/FaqItem";
import { MiniDashboard } from "../../components/marketing/MiniDashboard";
import { UrgencyPill } from "../../components/app/UrgencyPill";
import { KindIcon } from "../../components/app/KindIcon";
import { KIND_LABEL, type ItemKind } from "../../lib/types";
import { Seo } from "../../lib/seo";

// Kept intentionally minimal: only claims that match what's actually visible
// on THIS page. The $6/mo Plus price lives on /pricing and gets its own
// schema there — mirroring it here would describe content this page doesn't
// show, which is the kind of markup/content mismatch Google explicitly
// penalizes.
const HOME_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Wirby",
    url: "https://www.wirby.app",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description:
      "Wirby is a subscription tracker and bill reminder app that tracks subscriptions, bills, renewals, warranties, and deadlines, and ranks them by urgency.",
    offers: {
      "@type": "Offer",
      name: "Free plan",
      price: "0",
      priceCurrency: "USD",
      description: "Free for up to 25 tracked items.",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Wirby?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Wirby is a subscription tracker and bill reminder app. It brings your bills, subscriptions, renewals, warranties, and deadlines into one dashboard, ranked by how soon they're due, so nothing lapses without you knowing.",
        },
      },
      {
        "@type": "Question",
        name: "Is Wirby a bill reminder app?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Wirby reminds you before bills, subscriptions, and renewals are due. Add an item by upload, paste, or manual entry, and Wirby tracks the due date and alerts you ahead of time.",
        },
      },
      {
        "@type": "Question",
        name: "Can Wirby track recurring subscriptions and renewals?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Subscriptions and renewals are core to Wirby. It reads the cadence (weekly, monthly, quarterly, yearly) and rolls recurring items forward automatically after you handle them, and totals your recurring spend into one monthly number.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to connect my bank account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Wirby works from what you give it directly: a document upload, pasted text, or a manual entry. There is no bank connection required to get value.",
        },
      },
      {
        "@type": "Question",
        name: "Is my data private and secure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Document extraction runs in your browser, not on a server, and only the fields you confirm are saved. Every sign-in, edit, export, and deletion is recorded in an audit trail you can read, and you can export or delete your data at any time.",
        },
      },
      {
        "@type": "Question",
        name: "How much does Wirby cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Wirby is free for up to 25 tracked items. Wirby Plus removes that limit for $6 per month. See the pricing page for full details.",
        },
      },
    ],
  },
];

const KIND_COPY: Record<ItemKind, string> = {
  subscription: "Streaming, software, and memberships. Anything that renews on a cadence.",
  bill: "Utilities, phone, and rent. Anything with a due date and an amount.",
  renewal: "Insurance, domains, and licenses. Anything that lapses if you miss it.",
  warranty: "Appliances and electronics. Anything with a coverage window worth remembering.",
  deadline: "Taxes, applications, and permits. Anything with a date and no cadence.",
  document: "Contracts and statements. Anything you just want stored where you can find it.",
};

const KIND_ORDER: ItemKind[] = ["subscription", "bill", "renewal", "warranty", "deadline", "document"];

export function Home() {
  const { hash } = useLocation();

  // React Router doesn't scroll to in-page anchors on its own (that's a
  // browser default for full navigations only). Handle it for the footer's
  // /#what-is-wirby and /#faq links so they actually land on the section.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <>
      <Seo
        title="Wirby — Subscription Tracker & Bill Reminder App"
        description="Wirby is a subscription tracker and bill reminder app. Track bills, subscriptions, renewals, and due dates in one dashboard ranked by urgency."
        path="/"
        jsonLd={HOME_JSONLD}
      />
      {/* Hero: asymmetric split, real product render on the right */}
      <section className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-pine-50/80 to-transparent" />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:pb-32 lg:pt-20">
          <div className="lg:col-span-5">
            <h1 className="rise font-display text-5xl font-medium leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-[64px]">
              Track subscriptions, bills, and renewals
              <br />
              <em className="pb-1 leading-[1.1] text-pine-700">before they cost you.</em>
            </h1>
            <p className="rise mt-6 max-w-md text-lg leading-relaxed text-ink-soft" style={{ "--i": 1 } as React.CSSProperties}>
              Wirby is a subscription tracker and bill reminder dashboard.
              It ranks your renewals, due dates, and recurring payments by
              urgency, so you always know what needs attention first.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ "--i": 2 } as React.CSSProperties}>
              <Button to="/signup" size="lg">
                Start tracking free
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

      {/* What is Wirby: explicit plain-language category definition for humans and crawlers */}
      <section id="what-is-wirby" className="border-y border-line bg-panel">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-[32px] font-medium leading-[1.18] tracking-tight text-ink sm:text-4xl">
              What is Wirby?
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Wirby is a subscription tracker, bill tracker, and renewal tracker,
              built into one due-date dashboard. If it has an amount and a date,
              it belongs here, not scattered across inboxes, screenshots, and
              bank statements.
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              Add an item by uploading a document, pasting an email, or typing
              it in yourself. Wirby reads the vendor, amount, due date, and
              cadence, ranks it by urgency, and reminds you before it's due.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {KIND_ORDER.map((kind) => (
              <div key={kind} className="flex items-start gap-3.5 rounded-2xl border border-line bg-paper p-5">
                <KindIcon kind={kind} />
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">{KIND_LABEL[kind]}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-faint">{KIND_COPY[kind]}</p>
                </div>
              </div>
            ))}
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
                How the bill and renewal tracker works.
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
          A due-date dashboard for the thirty-second check-in.
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
                Privacy and security, built in.
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

      {/* FAQ: natural search-style questions, answers mirror the FAQPage JSON-LD above */}
      <section id="faq" className="border-t border-line">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl lg:ml-[16%]">
            <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-line border-t border-line">
              {[
                {
                  q: "What is Wirby?",
                  a: "Wirby is a subscription tracker and bill reminder app. It brings your bills, subscriptions, renewals, warranties, and deadlines into one dashboard, ranked by how soon they're due, so nothing lapses without you knowing.",
                },
                {
                  q: "Is Wirby a bill reminder app?",
                  a: "Yes. Wirby reminds you before bills, subscriptions, and renewals are due. Add an item by upload, paste, or manual entry, and Wirby tracks the due date and alerts you ahead of time.",
                },
                {
                  q: "Can Wirby track recurring subscriptions and renewals?",
                  a: "Yes. Subscriptions and renewals are core to Wirby. It reads the cadence (weekly, monthly, quarterly, yearly) and rolls recurring items forward automatically after you handle them, and totals your recurring spend into one monthly number.",
                },
                {
                  q: "Do I need to connect my bank account?",
                  a: "No. Wirby works from what you give it directly: a document upload, pasted text, or a manual entry. There is no bank connection required to get value.",
                },
                {
                  q: "Is my data private and secure?",
                  a: "Document extraction runs in your browser, not on a server, and only the fields you confirm are saved. Every sign-in, edit, export, and deletion is recorded in an audit trail you can read, and you can export or delete your data at any time.",
                },
                {
                  q: "How much does Wirby cost?",
                  a: (
                    <>
                      Wirby is free for up to 25 tracked items. Wirby Plus removes that limit for $6 per month. See{" "}
                      <Link to="/pricing" className="text-pine-700 underline hover:no-underline">pricing</Link> for full details.
                    </>
                  ),
                },
              ].map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </div>
        </div>
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
            Start tracking free
            <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      </section>
    </>
  );
}

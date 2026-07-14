import { Link } from "react-router-dom";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { FaqItem } from "../../components/ui/FaqItem";
import { Seo } from "../../lib/seo";

interface FaqItem { q: string; a: React.ReactNode }
interface FaqGroup { title: string; items: FaqItem[] }

// Every answer here describes something that's actually implemented (see
// README.md). Don't add a question whose answer promises a feature that
// doesn't exist yet.
const GROUPS: FaqGroup[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "How do I add my first item?",
        a: (
          <>
            From the dashboard, go to{" "}
            <Link to="/app/add" className="text-pine-700 underline hover:no-underline">Add item</Link>{" "}
            and pick one of three ways: upload a document, paste text, or type it in
            yourself. Uploads accept PDF, TXT, EML, MD, or CSV files up to 10 MB.
          </>
        ),
      },
      {
        q: "What counts as \"a document\"?",
        a: "Anything with a due date, a vendor, or an amount on it: a bill, an insurance renewal notice, a subscription receipt, a warranty card, or a screenshot's worth of text pasted in. Common examples: electricity or phone bills, Netflix/Spotify-style subscriptions, car insurance or passport renewals, appliance warranties, and tax deadlines.",
      },
      {
        q: "Do I need to upload a file, or can I just type it in?",
        a: "Typing it in works just as well. Upload and paste are shortcuts that pre-fill the form for you; the manual form is always available and just as fast for a single item.",
      },
      {
        q: "The extraction got a field wrong. What do I do?",
        a: "Every field extracted from a document or pasted text is editable before you save it, and nothing is saved automatically. Fields the extraction wasn't confident about are visibly flagged so you know what to double-check. If it's consistently wrong for a certain vendor, just correct it manually; there's no penalty for editing.",
      },
    ],
  },
  {
    title: "Reminders and staying on top of things",
    items: [
      {
        q: "How do reminders work?",
        a: (
          <>
            Each item has a due date and a "remind me X days before" setting. Once
            you're inside that window, it surfaces in the dashboard's "Needs
            attention" list. Turn on an email address in{" "}
            <Link to="/app/settings" className="text-pine-700 underline hover:no-underline">Settings → Reminders</Link>{" "}
            to also get a due-soon email alert and a Monday weekly digest.
          </>
        ),
      },
      {
        q: "What happens when I mark a recurring item handled?",
        a: "It doesn't disappear. A recurring bill or subscription rolls forward to its next due date automatically. Only one-time items (like a passport renewal) get marked fully done.",
      },
      {
        q: "Can I snooze something without losing track of it?",
        a: "Yes. Snoozing hides an item from the attention list until the date you pick, then it comes back on its own. Every snooze is recorded in the audit log, so it's never silent.",
      },
    ],
  },
  {
    title: "Plans and billing",
    items: [
      {
        q: "What's the difference between Free and Plus?",
        a: (
          <>
            Free tracks up to 25 items, with PDF reading capped at the first 20
            pages of a document. Wirby Plus removes the item limit and reads up to
            75 pages of a PDF. See{" "}
            <Link to="/pricing" className="text-pine-700 underline hover:no-underline">pricing</Link>{" "}
            for the full comparison.
          </>
        ),
      },
      {
        q: "How do I upgrade, downgrade, or cancel?",
        a: (
          <>
            Everything is in{" "}
            <Link to="/app/settings" className="text-pine-700 underline hover:no-underline">Settings → Plan</Link>.
            Upgrading opens a secure Lemon Squeezy checkout; managing or cancelling
            opens Lemon Squeezy's customer portal. Cancelling stops future billing,
            but you keep Plus access until the end of the period you already paid for.
          </>
        ),
      },
      {
        q: "Who processes my payment?",
        a: "Lemon Squeezy, acting as merchant of record. They're the seller you're billed by, and they handle sales tax/VAT. Wirby never sees or stores your card details.",
      },
      {
        q: "What if I go over the Free plan's 25 items?",
        a: (
          <>
            Adding more is blocked with a clear message and a link to upgrade — nothing
            is deleted or hidden. See our{" "}
            <Link to="/refund-policy" className="text-pine-700 underline hover:no-underline">Refund Policy</Link>{" "}
            for how billing and cancellations work.
          </>
        ),
      },
    ],
  },
  {
    title: "Your data and privacy",
    items: [
      {
        q: "Is my document stored on your servers?",
        a: "No. Files are read locally in your browser. Only the fields you confirm (title, amount, date, and so on) plus a short text snippet are saved — never the original file.",
      },
      {
        q: "Is any of this AI-generated?",
        a: "No. Extraction is deterministic pattern matching over known formats, not a language model. Nothing you upload or paste is sent to a third-party AI service.",
      },
      {
        q: "Can I get my data out?",
        a: (
          <>
            Yes, anytime, from{" "}
            <Link to="/app/settings" className="text-pine-700 underline hover:no-underline">Settings → Your data</Link>:
            a full CSV or JSON export of everything, including archived and completed items.
          </>
        ),
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Danger zone → Delete my account. This is permanent and removes your items, audit log, and preferences. If you have an active Plus subscription, cancel it first from Manage subscription.",
      },
    ],
  },
  {
    title: "Account and sign-in",
    items: [
      {
        q: "I forgot my password.",
        a: (
          <>
            Use{" "}
            <Link to="/forgot-password" className="text-pine-700 underline hover:no-underline">Forgot password</Link>{" "}
            on the sign-in page. You'll get a reset link by email; it never reveals
            whether an account exists for that address.
          </>
        ),
      },
      {
        q: "I didn't get my confirmation or reset email.",
        a: (
          <>
            Check spam first. If it's still missing after a few minutes, email us at{" "}
            <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>{" "}
            and we'll look into it.
          </>
        ),
      },
    ],
  },
];

export function Support() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-16 sm:px-8 lg:py-24">
      <Seo
        title="Support & FAQ — Wirby"
        description="Answers to common questions about adding items, reminders, billing, your data, and your Wirby account. Can't find it here? Email support@wirby.app."
        path="/support"
      />

      <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-[42px]">
        Support
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
        Answers to the questions people actually ask. If yours isn't here,
        just email us — a person reads every message.
      </p>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-panel px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-pine-100 text-pine-700">
            <EnvelopeSimple size={20} aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-medium text-ink">Still stuck?</p>
            <p className="text-[13px] text-ink-faint">We typically reply within one business day.</p>
          </div>
        </div>
        <a
          href="mailto:support@wirby.app"
          className="press inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-pine-700 bg-pine-700 px-3 text-[13px] font-medium text-paper hover:bg-pine-800 hover:border-pine-800"
        >
          Email support@wirby.app
        </a>
      </div>

      <div className="mt-12 space-y-12">
        {GROUPS.map((group) => (
          <section key={group.title} aria-labelledby={`${group.title}-h`}>
            <h2
              id={`${group.title}-h`}
              className="mb-1 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint"
            >
              {group.title}
            </h2>
            <div className="divide-y divide-line border-t border-line">
              {group.items.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-line bg-panel px-6 py-8 text-center">
        <p className="text-[15px] font-medium text-ink">Didn't find your answer?</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-faint">
          Email us directly and describe what happened. Include your account
          email so we can look you up quickly.
        </p>
        <a
          href="mailto:support@wirby.app"
          className="press mt-4 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-pine-700 bg-pine-700 px-4 text-sm font-medium text-paper hover:bg-pine-800 hover:border-pine-800"
        >
          <EnvelopeSimple size={16} aria-hidden />
          Email support@wirby.app
        </a>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardText, FileArrowUp } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Logo } from "../../components/ui/Logo";
import { KindIcon } from "../../components/app/KindIcon";
import { useAuth } from "../../state/AuthContext";
import { useData } from "../../state/DataContext";
import { KIND_LABEL, type ItemKind } from "../../lib/types";

interface Choice {
  icon: Icon;
  title: string;
  body: string;
  go: () => void;
}

/** What kind of thing this actually tracks, spelled out concretely instead of left abstract. */
const EXAMPLES: { kind: ItemKind; example: string }[] = [
  { kind: "bill", example: "Electricity, phone, internet" },
  { kind: "subscription", example: "Netflix, Spotify, gym" },
  { kind: "renewal", example: "Car insurance, passport, ID" },
  { kind: "warranty", example: "Laptop, appliance coverage" },
  { kind: "deadline", example: "Tax payment, application due date" },
];

export function Onboarding() {
  const { session } = useAuth();
  const { store } = useData();
  const navigate = useNavigate();
  const firstName = (session?.name ?? "there").split(" ")[0];

  const finish = (dest: string) => {
    store.setOnboarded();
    navigate(dest, { replace: true });
  };

  const choices: Choice[] = [
    {
      icon: FileArrowUp,
      title: "Upload a document",
      body: "A PDF bill, a policy document, or a .txt/.eml/.md/.csv file. Wirby reads the dates, amounts, and vendor from it.",
      go: () => finish("/app/add"),
    },
    {
      icon: ClipboardText,
      title: "Paste an email or text",
      body: "Copy the renewal email sitting in your inbox and paste it in. No file needed.",
      go: () => finish("/app/add?tab=paste"),
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-12">
      <Logo to="/app" />
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-lg">
          <h1 className="rise font-display text-4xl font-medium leading-tight tracking-tight text-ink">
            Welcome, {firstName}.
          </h1>
          <p className="rise mt-3 text-lg leading-relaxed text-ink-soft" style={{ "--i": 1 } as React.CSSProperties}>
            Wirby tracks the things with a date attached: bills, subscriptions,
            renewals, warranties, deadlines. Add your first one below.
          </p>

          <div className="rise mt-8 rounded-2xl border border-line bg-panel p-5" style={{ "--i": 2 } as React.CSSProperties}>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
              What people track
            </p>
            <ul className="space-y-3">
              {EXAMPLES.map((e) => (
                <li key={e.kind} className="flex items-center gap-3">
                  <KindIcon kind={e.kind} size={16} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{KIND_LABEL[e.kind]}</p>
                    <p className="truncate text-[13px] text-ink-faint">{e.example}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="rise mt-8 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint" style={{ "--i": 3 } as React.CSSProperties}>
            Add your first item
          </p>
          <div className="mt-3 space-y-3">
            {choices.map((c, i) => (
              <button
                key={c.title}
                type="button"
                onClick={c.go}
                className="rise press group flex w-full items-center gap-4 rounded-2xl border border-line bg-panel p-5 text-left transition-colors hover:border-pine-600 hover:bg-pine-50/40"
                style={{ "--i": i + 4 } as React.CSSProperties}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-pine-100 text-pine-700">
                  <c.icon size={22} aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{c.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-faint">{c.body}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-pine-700" aria-hidden />
              </button>
            ))}
          </div>

          <p className="rise mt-4 text-[12px] leading-relaxed text-ink-faint" style={{ "--i": 6 } as React.CSSProperties}>
            Supported files: PDF, TXT, EML, MD, or CSV, up to 10 MB. Files are read on your
            device and never stored — only the extracted fields and a short snippet are kept.
          </p>

          <button
            type="button"
            onClick={() => finish("/app")}
            className="rise press mt-6 text-sm font-medium text-ink-faint underline hover:text-ink"
            style={{ "--i": 7 } as React.CSSProperties}
          >
            Start with an empty dashboard instead
          </button>
        </div>
      </div>
    </div>
  );
}

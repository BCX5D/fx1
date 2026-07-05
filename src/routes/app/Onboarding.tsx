import { useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardText, FileArrowUp, Flask } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../state/AuthContext";
import { useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";
import { sampleItems } from "../../lib/seed";

interface Choice {
  icon: Icon;
  title: string;
  body: string;
  go: () => void;
}

export function Onboarding() {
  const { session } = useAuth();
  const { store } = useData();
  const { toast } = useToast();
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
      body: "A bill, a policy, a renewal notice. Wirby detects the dates and amounts.",
      go: () => finish("/app/add"),
    },
    {
      icon: ClipboardText,
      title: "Paste an email or text",
      body: "That renewal email sitting in your inbox is a perfectly good starting point.",
      go: () => finish("/app/add?tab=paste"),
    },
    {
      icon: Flask,
      title: "Explore with sample data",
      body: "Eight realistic items, clearly tagged as samples and removable in one click.",
      go: () => {
        store.addItems(sampleItems(), "data.sample_loaded");
        toast("Sample data loaded. Everything is tagged “Sample data”.");
        finish("/app");
      },
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
            One small step makes the dashboard useful.
            Pick whichever is closest at hand.
          </p>
          <div className="mt-10 space-y-3">
            {choices.map((c, i) => (
              <button
                key={c.title}
                type="button"
                onClick={c.go}
                className="rise press group flex w-full items-center gap-4 rounded-2xl border border-line bg-panel p-5 text-left transition-colors hover:border-pine-600 hover:bg-pine-50/40"
                style={{ "--i": i + 2 } as React.CSSProperties}
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
          <button
            type="button"
            onClick={() => finish("/app")}
            className="rise press mt-8 text-sm font-medium text-ink-faint underline hover:text-ink"
            style={{ "--i": 5 } as React.CSSProperties}
          >
            Start with an empty dashboard instead
          </button>
        </div>
      </div>
    </div>
  );
}

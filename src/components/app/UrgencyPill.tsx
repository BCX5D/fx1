import type { Urgency } from "../../lib/types";
import { URGENCY_LABEL } from "../../lib/urgency";

const TONE: Record<Urgency, string> = {
  overdue: "bg-alert-100 text-alert-800 ring-alert-200/70",
  today: "bg-alert-100 text-alert-800 ring-alert-200/70",
  soon: "bg-ember-100 text-ember-800 ring-ember-200/70",
  upcoming: "bg-pine-100 text-pine-800 ring-pine-200/70",
  later: "bg-line/60 text-ink-soft ring-line-strong/50",
  none: "bg-line/60 text-ink-faint ring-line-strong/50",
};

export function UrgencyPill({ urgency, label }: { urgency: Urgency; label?: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${TONE[urgency]}`}>
      {label ?? URGENCY_LABEL[urgency]}
    </span>
  );
}

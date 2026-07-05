import { CheckCircle } from "@phosphor-icons/react";
import { UrgencyPill } from "../app/UrgencyPill";
import { KindIcon } from "../app/KindIcon";
import type { ItemKind, Urgency } from "../../lib/types";

/**
 * A real render of the product's attention list with sample data.
 * Not a screenshot, not a fake div mock: these are the actual app components.
 */

const ROWS: { kind: ItemKind; title: string; meta: string; amount: string; urgency: Urgency }[] = [
  { kind: "bill", title: "Electricity bill", meta: "City Power & Light · Monthly", amount: "$84.20", urgency: "overdue" },
  { kind: "deadline", title: "Quarterly tax payment", meta: "IRS · Quarterly", amount: "$1,240.00", urgency: "today" },
  { kind: "renewal", title: "Car insurance renewal", meta: "State Farm · Yearly", amount: "$648.00", urgency: "soon" },
];

export function MiniDashboard() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative select-none">
      <div className="absolute -right-4 top-6 h-full w-full rounded-2xl bg-pine-100" />
      <div className="relative rounded-2xl border border-line bg-panel p-5 shadow-(--shadow-float) sm:p-6">
        <div className="mb-1 flex items-center justify-between">
          <p className="font-display text-lg font-medium text-ink">Needs attention</p>
          <span className="rounded-full bg-alert-100 px-2.5 py-1 text-[12px] font-semibold text-alert-800">3 items</span>
        </div>
        <p className="mb-3 text-[13px] text-ink-faint">Tuesday, before anything gets expensive</p>
        <div className="divide-y divide-line">
          {ROWS.map((r) => (
            <div key={r.title} className="flex items-center gap-3 py-3">
              <KindIcon kind={r.kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{r.title}</p>
                <p className="truncate text-[13px] text-ink-faint">{r.meta}</p>
              </div>
              <span className="hidden font-mono text-sm text-ink sm:block">{r.amount}</span>
              <UrgencyPill urgency={r.urgency} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-pine-50 px-4 py-3">
          <span className="text-[13px] text-ink-soft">Tracked recurring spend</span>
          <span className="font-mono text-sm font-medium text-pine-800">$186.40 / month</span>
        </div>
      </div>
      {/* the app's real toast styling, layered for depth */}
      <div className="absolute -bottom-6 left-5 flex items-center gap-2.5 rounded-xl border border-pine-800 bg-pine-900 px-4 py-3 text-sm text-paper shadow-(--shadow-float) sm:left-10">
        <CheckCircle size={18} weight="fill" className="shrink-0 text-pine-200" aria-hidden />
        <span>Electricity bill handled. Next due Aug 2.</span>
      </div>
    </div>
  );
}

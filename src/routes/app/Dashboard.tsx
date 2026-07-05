import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, FileArrowUp, Plus } from "@phosphor-icons/react";
import { useAuth } from "../../state/AuthContext";
import { useDB, useData } from "../../state/DataContext";
import { needsAttention, monthlyTotal, sortByUrgency, urgencyOf } from "../../lib/urgency";
import { daysUntil, fmtDateShort, greeting } from "../../lib/dates";
import { fmtMoney } from "../../lib/format";
import { auditSentence } from "../../lib/auditLabel";
import { fmtDateTime } from "../../lib/dates";
import { ItemRow } from "../../components/app/ItemRow";
import { DashboardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";

export function Dashboard() {
  const { session } = useAuth();
  const { ready } = useData();
  const db = useDB();

  if (!ready) return <DashboardSkeleton />;

  const active = db.items.filter((it) => it.status === "active");
  const urgent = sortByUrgency(active.filter(needsAttention));
  const upcoming = sortByUrgency(
    active.filter((it) => !needsAttention(it) && it.nextDue && daysUntil(it.nextDue) <= 45),
  );
  const undated = active.filter((it) => !it.nextDue);
  const spend = monthlyTotal(db.items);
  const recurringCount = active.filter((it) => it.cadence !== "once").length;
  const firstName = (session?.name ?? "there").split(" ")[0];

  const summary =
    urgent.length === 0
      ? "Nothing is urgent right now. That is the whole point."
      : urgent.length === 1
        ? "One item needs your attention."
        : `${urgent.length} items need your attention.`;

  if (active.length === 0 && db.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <h1 className="rise font-display text-[32px] font-medium leading-tight tracking-tight text-ink">
          {greeting()}, {firstName}.
        </h1>
        <p className="rise mt-2 text-[15px] text-ink-soft" style={{ "--i": 1 } as React.CSSProperties}>
          Your dashboard is quiet because it is empty, not because you are done.
        </p>
        <div className="rise mt-10" style={{ "--i": 2 } as React.CSSProperties}>
          <EmptyState
            icon={FileArrowUp}
            title="Add the first thing on your mind"
            body="Upload a bill, paste a renewal email, or type in the deadline that keeps resurfacing at 2am."
            action={
              <Button to="/app/add">
                <Plus size={16} aria-hidden />
                Add your first item
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <header className="rise mb-9">
          <p className="mb-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-[34px] font-medium leading-tight tracking-tight text-ink">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">{summary}</p>
        </header>

        <section aria-labelledby="urgent-h" className="rise" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="mb-3 flex items-center justify-between">
            <h2 id="urgent-h" className="text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
              Needs attention
            </h2>
            {urgent.length > 0 && (
              <span className="rounded-full bg-alert-100 px-2.5 py-0.5 text-[12px] font-semibold text-alert-800">
                {urgent.length}
              </span>
            )}
          </div>
          {urgent.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-5">
              <CheckCircle size={22} weight="fill" className="shrink-0 text-pine-600" aria-hidden />
              <p className="text-[15px] text-ink-soft">
                All clear. Nothing is overdue and nothing is due soon.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line bg-panel px-5">
              {urgent.map((it) => <ItemRow key={it.id} item={it} />)}
            </div>
          )}
        </section>

        <section aria-labelledby="upcoming-h" className="rise mt-10" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="mb-3 flex items-center justify-between">
            <h2 id="upcoming-h" className="text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
              Coming up
            </h2>
            <Link to="/app/search" className="text-[13px] font-medium text-pine-700 hover:underline">
              View everything
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-5 py-5 text-[15px] text-ink-faint">
              Nothing on the horizon for the next 45 days.
            </p>
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line bg-panel px-5">
              {upcoming.slice(0, 7).map((it) => <ItemRow key={it.id} item={it} />)}
            </div>
          )}
          {undated.length > 0 && (
            <p className="mt-3 text-[13px] text-ink-faint">
              {undated.length === 1 ? "1 item has" : `${undated.length} items have`} no date yet.{" "}
              <Link to="/app/search?undated=1" className="text-pine-700 underline hover:no-underline">
                Give them one
              </Link>{" "}
              so they can remind you.
            </p>
          )}
        </section>
      </div>

      <aside className="rise space-y-6 lg:pt-24" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="rounded-2xl bg-pine-900 p-5 text-paper shadow-(--shadow-panel)">
          <p className="text-[13px] text-pine-200">Tracked recurring spend</p>
          <p className="mt-2 font-mono text-[28px] leading-none">
            {fmtMoney(spend)}<span className="text-sm text-pine-200"> / mo</span>
          </p>
          <p className="mt-4 border-t border-pine-800 pt-3 text-[13px] text-pine-200">
            Across {recurringCount} recurring {recurringCount === 1 ? "item" : "items"}
          </p>
        </div>

        <Button to="/app/add" variant="secondary" className="w-full">
          <Plus size={16} aria-hidden />
          Add item
        </Button>

        <div>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Recent activity</h2>
          {db.audit.length === 0 ? (
            <p className="text-[13px] text-ink-faint">Actions you take will show up here.</p>
          ) : (
            <ul className="space-y-3">
              {db.audit.slice(0, 5).map((ev) => (
                <li key={ev.id} className="text-[13px] leading-snug">
                  <p className="text-ink">{auditSentence(ev)}</p>
                  <p className="font-mono text-[11px] text-ink-faint">{fmtDateTime(ev.at)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/audit" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-pine-700 hover:underline">
            Full audit log
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

        {upcoming.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="text-[13px] leading-relaxed text-ink-faint">
              Next up: <span className="font-medium text-ink">{upcoming[0].title}</span>
              {upcoming[0].nextDue ? ` on ${fmtDateShort(upcoming[0].nextDue)}` : ""}
              {urgencyOf(upcoming[0]) === "later" ? " (snoozed)" : ""}.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

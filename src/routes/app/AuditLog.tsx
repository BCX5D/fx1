import { useState } from "react";
import { Link } from "react-router-dom";
import { ClockCounterClockwise, Key, Package, SlidersHorizontal } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { PageHeader } from "../../components/app/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { useDB, useData } from "../../state/DataContext";
import { auditCategory, auditSentence, type AuditCategory } from "../../lib/auditLabel";
import { fmtDateTime } from "../../lib/dates";

const FILTERS: { id: AuditCategory | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "item", label: "Item changes" },
  { id: "auth", label: "Sign-ins" },
  { id: "data", label: "Data events" },
];

const CATEGORY_ICON: Record<AuditCategory, Icon> = {
  item: Package,
  auth: Key,
  data: SlidersHorizontal,
  prefs: SlidersHorizontal,
  onboarding: SlidersHorizontal,
};

export function AuditLog() {
  const { ready } = useData();
  const db = useDB();
  const [filter, setFilter] = useState<AuditCategory | "all">("all");

  const events = db.audit.filter((ev) => filter === "all" || auditCategory(ev.action) === filter);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Audit log"
        sub="Every important action on this account, newest first. The last 500 events are kept."
      />

      <div role="tablist" aria-label="Filter events" className="mb-6 inline-flex rounded-[10px] border border-line bg-panel p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`press rounded-lg px-3.5 py-1.5 text-sm font-medium ${
              filter === f.id ? "bg-pine-700 text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!ready ? (
        <ListSkeleton />
      ) : events.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwise}
          title="No events recorded yet"
          body="Adding, editing, snoozing, exporting, and signing in all leave a trace here. That is a feature, not surveillance: it is your account's memory."
        />
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-panel px-5">
          {events.map((ev) => {
            const cat = auditCategory(ev.action);
            const IconCmp = CATEGORY_ICON[cat] ?? SlidersHorizontal;
            return (
              <div key={ev.id} className="flex items-start gap-3.5 py-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-pine-50 text-pine-700">
                  <IconCmp size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink">
                    {ev.targetId && db.items.some((it) => it.id === ev.targetId) ? (
                      <Link to={`/app/items/${ev.targetId}`} className="hover:text-pine-700 hover:underline">
                        {auditSentence(ev)}
                      </Link>
                    ) : (
                      auditSentence(ev)
                    )}
                  </p>
                  <p className="text-[13px] text-ink-faint">by {ev.actor}</p>
                </div>
                <span className="shrink-0 font-mono text-[12px] text-ink-faint">{fmtDateTime(ev.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

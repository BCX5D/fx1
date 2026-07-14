import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, ArrowCounterClockwise, MagnifyingGlass, Trash, Tray } from "@phosphor-icons/react";
import { PageHeader } from "../../components/app/PageHeader";
import { ItemRow } from "../../components/app/ItemRow";
import { useItemActions } from "../../components/app/itemActions";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useDB, useData } from "../../state/DataContext";
import { KIND_LABEL, type ItemKind, type ItemStatus } from "../../lib/types";
import { sortByUrgency, urgencyOf } from "../../lib/urgency";
import type { Urgency } from "../../lib/types";

const STATUS_TABS: { id: ItemStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "done", label: "Completed" },
  { id: "archived", label: "Archived" },
];

const URGENCY_FILTERS: { id: Urgency | "all"; label: string }[] = [
  { id: "all", label: "Any urgency" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "soon", label: "Due soon" },
  { id: "upcoming", label: "Upcoming" },
  { id: "later", label: "Later or snoozed" },
];

export function SearchArchive() {
  const [params, setParams] = useSearchParams();
  const { ready } = useData();
  const db = useDB();
  const actions = useItemActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const q = params.get("q") ?? "";
  const status = (params.get("status") as ItemStatus) || "active";
  const kind = (params.get("kind") as ItemKind | "all") || "all";
  const urgency = (params.get("urgency") as Urgency | "all") || "all";
  const undated = params.get("undated") === "1";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all" || value === "0") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = db.items.filter((it) => {
      if (it.status !== status) return false;
      if (kind !== "all" && it.kind !== kind) return false;
      if (status === "active" && urgency !== "all" && urgencyOf(it) !== urgency) return false;
      if (undated && it.nextDue) return false;
      if (needle) {
        const hay = `${it.title} ${it.vendor ?? ""} ${it.notes ?? ""} ${it.source.fileName ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return status === "active"
      ? sortByUrgency(filtered)
      : [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db.items, q, status, kind, urgency, undated]);

  // Selection only makes sense within the currently visible result set, so drop
  // anything that scrolled out of view when filters change or an item is mutated away.
  useEffect(() => {
    const visibleIds = new Set(results.map((it) => it.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [results]);

  const selectedItems = results.filter((it) => selected.has(it.id));
  const allSelected = results.length > 0 && selected.size === results.length;

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(results.map((it) => it.id)));
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="Search & archive"
        sub="Everything you have ever tracked, including what is finished."
      />

      <div className="mb-5">
        <label htmlFor="search-input" className="sr-only">Search items</label>
        <div className="relative max-w-lg">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            id="search-input"
            type="search"
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search by name, vendor, notes, or file"
            className="h-11 w-full rounded-[10px] border border-line-strong bg-panel pl-10 pr-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-pine-600 focus:outline-none focus:ring-2 focus:ring-pine-200"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Status" className="inline-flex rounded-[10px] border border-line bg-panel p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={status === t.id}
              onClick={() => setParam("status", t.id)}
              className={`press rounded-lg px-3.5 py-1.5 text-sm font-medium ${
                status === t.id ? "bg-pine-700 text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by type"
          value={kind}
          onChange={(e) => setParam("kind", e.target.value)}
          className="h-9 rounded-[10px] border border-line-strong bg-panel px-3 text-sm text-ink focus:border-pine-600 focus:outline-none"
        >
          <option value="all">All types</option>
          {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {status === "active" && (
          <select
            aria-label="Filter by urgency"
            value={urgency}
            onChange={(e) => setParam("urgency", e.target.value)}
            className="h-9 rounded-[10px] border border-line-strong bg-panel px-3 text-sm text-ink focus:border-pine-600 focus:outline-none"
          >
            {URGENCY_FILTERS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={undated}
            onChange={(e) => setParam("undated", e.target.checked ? "1" : "0")}
            className="h-4 w-4 rounded accent-pine-700"
          />
          Missing a date
        </label>
      </div>

      {!ready ? (
        <ListSkeleton />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Tray}
          title={q ? `Nothing matches “${q}”` : "Nothing here yet"}
          body={
            status === "active"
              ? "Try a different word, loosen the filters, or add the thing you are looking for."
              : status === "done"
                ? "Completed one-time items will land here once you mark them handled."
                : "Archived items will land here. Archiving keeps history without the noise."
          }
          action={status === "active" ? <Button to="/app/add">Add an item</Button> : undefined}
        />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[13px] text-ink-faint">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all results"
                className="h-4 w-4 rounded accent-pine-700"
              />
              {selected.size > 0
                ? `${selected.size} selected`
                : `${results.length} ${results.length === 1 ? "item" : "items"}`}
            </label>
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {status === "active" && (
                  <Button variant="secondary" size="sm" onClick={() => { actions.bulkArchive(selectedItems); setSelected(new Set()); }}>
                    <Archive size={15} aria-hidden />
                    Archive selected
                  </Button>
                )}
                {(status === "done" || status === "archived") && (
                  <Button variant="secondary" size="sm" onClick={() => { actions.bulkRestore(selectedItems); setSelected(new Set()); }}>
                    <ArrowCounterClockwise size={15} aria-hidden />
                    {status === "done" ? "Reopen selected" : "Restore selected"}
                  </Button>
                )}
                {status !== "active" && (
                  <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)}>
                    <Trash size={15} aria-hidden />
                    Delete selected
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="divide-y divide-line rounded-2xl border border-line bg-panel px-5">
            {results.map((it) => (
              <ItemRow key={it.id} item={it} selected={selected.has(it.id)} onSelectChange={(v) => toggleOne(it.id, v)} />
            ))}
          </div>
        </>
      )}

      <Modal open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} title="Delete selected items?">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"} will be permanently
          removed, along with their reminders. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmBulkDelete(false)}>Keep them</Button>
          <Button
            variant="danger"
            onClick={() => {
              actions.bulkRemove(selectedItems);
              setSelected(new Set());
              setConfirmBulkDelete(false);
            }}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

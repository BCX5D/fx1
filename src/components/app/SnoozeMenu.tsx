import { useEffect, useRef, useState } from "react";
import { ClockAfternoon } from "@phosphor-icons/react";
import type { Item } from "../../lib/types";
import { isSnoozed } from "../../lib/urgency";
import { useItemActions } from "./itemActions";

const OPTIONS = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
];

export function SnoozeMenu({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actions = useItemActions();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Snooze ${item.title}`}
        title="Snooze"
        onClick={() => setOpen((o) => !o)}
        className="press rounded-[10px] border border-transparent p-2 text-ink-faint hover:border-line hover:bg-pine-50 hover:text-pine-700"
      >
        <ClockAfternoon size={18} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="toast-in absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-panel p-1.5 shadow-(--shadow-float)"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Snooze for</p>
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              type="button"
              role="menuitem"
              onClick={() => { actions.snooze(item, o.days); setOpen(false); }}
              className="press block w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-pine-50"
            >
              {o.label}
            </button>
          ))}
          {isSnoozed(item) && (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => { actions.unsnooze(item); setOpen(false); }}
                className="press block w-full rounded-lg px-2.5 py-2 text-left text-sm text-pine-700 hover:bg-pine-50"
              >
                Wake up now
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

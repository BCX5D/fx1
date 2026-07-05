import { Link } from "react-router-dom";
import { ArrowCounterClockwise, Check } from "@phosphor-icons/react";
import type { Item } from "../../lib/types";
import { CADENCE_LABEL } from "../../lib/types";
import { fmtMoney } from "../../lib/format";
import { relativeDueLabel } from "../../lib/dates";
import { isSnoozed, urgencyOf } from "../../lib/urgency";
import { UrgencyPill } from "./UrgencyPill";
import { KindIcon } from "./KindIcon";
import { useItemActions } from "./itemActions";
import { SnoozeMenu } from "./SnoozeMenu";

export function ItemRow({ item }: { item: Item }) {
  const actions = useItemActions();
  const urgency = urgencyOf(item);
  const snoozed = isSnoozed(item);

  return (
    <div className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-paper/70 sm:gap-4">
      <KindIcon kind={item.kind} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/app/items/${item.id}`}
          className="block truncate text-[15px] font-medium text-ink hover:text-pine-700 hover:underline"
        >
          {item.title}
        </Link>
        <p className="truncate text-[13px] text-ink-faint">
          {[item.vendor, item.cadence !== "once" ? CADENCE_LABEL[item.cadence] : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {item.amount != null && (
        <span className="hidden font-mono text-sm text-ink sm:block">{fmtMoney(item.amount, item.currency)}</span>
      )}
      {item.nextDue && item.status === "active" && (
        <span className="hidden w-28 text-right font-mono text-[13px] text-ink-soft md:block">
          {relativeDueLabel(item.nextDue)}
        </span>
      )}
      <UrgencyPill urgency={urgency} label={snoozed ? "Snoozed" : undefined} />
      <div className="flex items-center gap-0.5">
        {item.status === "active" ? (
          <>
            <button
              type="button"
              aria-label={`Mark ${item.title} handled`}
              title="Mark handled"
              onClick={() => actions.complete(item)}
              className="press rounded-[10px] border border-transparent p-2 text-ink-faint hover:border-line hover:bg-pine-50 hover:text-pine-700"
            >
              <Check size={18} aria-hidden />
            </button>
            <SnoozeMenu item={item} />
          </>
        ) : (
          <button
            type="button"
            aria-label={`Restore ${item.title}`}
            title={item.status === "done" ? "Reopen" : "Restore"}
            onClick={() => (item.status === "done" ? actions.reopen(item) : actions.restore(item))}
            className="press rounded-[10px] border border-transparent p-2 text-ink-faint hover:border-line hover:bg-pine-50 hover:text-pine-700"
          >
            <ArrowCounterClockwise size={18} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

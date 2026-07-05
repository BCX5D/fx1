import type { Item } from "../../lib/types";
import { addDays, fmtDate, nextOccurrence, todayISO } from "../../lib/dates";
import { useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";

/** All item state transitions live here so every screen behaves identically and everything is audited. */
export function useItemActions() {
  const { store } = useData();
  const { toast } = useToast();

  return {
    complete(item: Item) {
      if (item.cadence !== "once" && item.nextDue) {
        const next = nextOccurrence(item.nextDue, item.cadence)!;
        store.updateItem(item.id, { nextDue: next, snoozedUntil: undefined }, "item.completed", `handled, next due ${fmtDate(next)}`);
        toast(`${item.title} handled. Next due ${fmtDate(next)}.`);
      } else {
        store.updateItem(item.id, { status: "done", snoozedUntil: undefined }, "item.completed");
        toast(`${item.title} marked done.`);
      }
    },
    snooze(item: Item, days: number) {
      const until = addDays(todayISO(), days);
      store.updateItem(item.id, { snoozedUntil: until }, "item.snoozed", `until ${fmtDate(until)}`);
      toast(`${item.title} snoozed until ${fmtDate(until)}.`);
    },
    unsnooze(item: Item) {
      store.updateItem(item.id, { snoozedUntil: undefined }, "item.unsnoozed");
      toast(`${item.title} is back on your list.`);
    },
    archive(item: Item) {
      store.updateItem(item.id, { status: "archived" }, "item.archived");
      toast(`${item.title} archived.`);
    },
    restore(item: Item) {
      store.updateItem(item.id, { status: "active", snoozedUntil: undefined }, "item.restored");
      toast(`${item.title} restored.`);
    },
    reopen(item: Item) {
      store.updateItem(item.id, { status: "active" }, "item.reopened");
      toast(`${item.title} reopened.`);
    },
    remove(item: Item) {
      store.deleteItem(item.id);
      toast(`${item.title} deleted.`);
    },
  };
}

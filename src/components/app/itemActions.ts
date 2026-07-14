import type { Item } from "../../lib/types";
import { addDays, fmtDate, nextOccurrence, todayISO } from "../../lib/dates";
import { useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";

/** Undo toasts stay visible longer so there is real time to notice and click them. */
export const UNDO_DURATION_MS = 6000;

/** All item state transitions live here so every screen behaves identically and everything is audited. */
export function useItemActions() {
  const { store } = useData();
  const { toast } = useToast();

  return {
    complete(item: Item) {
      const prevNextDue = item.nextDue;
      const prevSnoozedUntil = item.snoozedUntil;
      if (item.cadence !== "once" && item.nextDue) {
        const next = nextOccurrence(item.nextDue, item.cadence)!;
        store.updateItem(item.id, { nextDue: next, snoozedUntil: undefined }, "item.completed", `handled, next due ${fmtDate(next)}`);
        toast(`${item.title} handled. Next due ${fmtDate(next)}.`, "ok", {
          actionLabel: "Undo",
          durationMs: UNDO_DURATION_MS,
          onAction: () => {
            store.updateItem(item.id, { nextDue: prevNextDue, snoozedUntil: prevSnoozedUntil }, "item.updated", "undid marking handled");
            toast(`${item.title} is back on your list.`);
          },
        });
      } else {
        store.updateItem(item.id, { status: "done", snoozedUntil: undefined }, "item.completed");
        toast(`${item.title} marked done.`, "ok", {
          actionLabel: "Undo",
          durationMs: UNDO_DURATION_MS,
          onAction: () => {
            store.updateItem(item.id, { status: "active", snoozedUntil: prevSnoozedUntil }, "item.reopened", "undid marking done");
            toast(`${item.title} reopened.`);
          },
        });
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
      toast(`${item.title} archived.`, "ok", {
        actionLabel: "Undo",
        durationMs: UNDO_DURATION_MS,
        onAction: () => {
          store.updateItem(item.id, { status: "active" }, "item.restored", "undid archive");
          toast(`${item.title} restored.`);
        },
      });
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
    /** Archives every item in the list, with one summary toast and one undo that restores all of them. */
    bulkArchive(items: Item[]) {
      if (items.length === 0) return;
      for (const item of items) store.updateItem(item.id, { status: "archived" }, "item.archived");
      toast(`${items.length} ${items.length === 1 ? "item" : "items"} archived.`, "ok", {
        actionLabel: "Undo",
        durationMs: UNDO_DURATION_MS,
        onAction: () => {
          for (const item of items) store.updateItem(item.id, { status: "active" }, "item.restored", "undid archive");
          toast(`${items.length === 1 ? "Item" : "Items"} restored.`);
        },
      });
    },
    /** Restores archived items and reopens completed items back to active, in one pass. */
    bulkRestore(items: Item[]) {
      if (items.length === 0) return;
      for (const item of items) {
        if (item.status === "done") store.updateItem(item.id, { status: "active" }, "item.reopened");
        else store.updateItem(item.id, { status: "active", snoozedUntil: undefined }, "item.restored");
      }
      toast(`${items.length} ${items.length === 1 ? "item" : "items"} restored.`);
    },
    /** Permanently deletes every item in the list. Irreversible, so callers must confirm first. */
    bulkRemove(items: Item[]) {
      if (items.length === 0) return;
      for (const item of items) store.deleteItem(item.id);
      toast(`${items.length} ${items.length === 1 ? "item" : "items"} deleted.`);
    },
  };
}

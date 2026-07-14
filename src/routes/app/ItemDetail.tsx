import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Archive, ArrowLeft, Check, FileMagnifyingGlass, Trash } from "@phosphor-icons/react";
import type { Item } from "../../lib/types";
import { KIND_LABEL } from "../../lib/types";
import { useDB, useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";
import { useItemActions } from "../../components/app/itemActions";
import { ItemForm, draftFromItem, draftToPatch, validateDraft, type DraftErrors, type ItemDraft } from "../../components/app/ItemForm";
import { UrgencyPill } from "../../components/app/UrgencyPill";
import { SnoozeMenu } from "../../components/app/SnoozeMenu";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import { auditSentence } from "../../lib/auditLabel";
import { fmtDate, fmtDateTime } from "../../lib/dates";
import { isSnoozed, urgencyOf } from "../../lib/urgency";

const SOURCE_LABEL = { manual: "Added manually", paste: "Pasted text", file: "Uploaded file", sample: "Sample data" } as const;

export function ItemDetail() {
  const { id } = useParams();
  const { ready } = useData();
  const db = useDB();

  if (!ready) return <DetailSkeleton />;

  const item = db.items.find((it) => it.id === id);
  if (!item) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <EmptyState
          icon={FileMagnifyingGlass}
          title="This item does not exist"
          body="It may have been deleted, or the link is stale. Everything you still track is on the dashboard."
          action={<Button to="/app">Back to overview</Button>}
        />
      </div>
    );
  }
  return <Detail key={item.id} item={item} />;
}

function Detail({ item }: { item: Item }) {
  const { store } = useData();
  const db = useDB();
  const { toast } = useToast();
  const actions = useItemActions();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ItemDraft>(() => draftFromItem(item));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const history = db.audit.filter((ev) => ev.targetId === item.id).slice(0, 12);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFromItem(item));

  const save = () => {
    const errs = validateDraft(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    store.updateItem(item.id, draftToPatch(draft), "item.updated");
    toast("Changes saved.");
  };

  return (
    <div>
      <Link to="/app" className="press mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} aria-hidden />
        Overview
      </Link>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight text-ink">{item.title}</h1>
        <UrgencyPill urgency={urgencyOf(item)} label={isSnoozed(item) && item.snoozedUntil ? `Snoozed to ${fmtDate(item.snoozedUntil)}` : undefined} />
        {item.status !== "active" && (
          <span className="rounded-full bg-line/70 px-2.5 py-1 text-[12px] font-medium capitalize text-ink-soft">{item.status}</span>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
            <ItemForm draft={draft} onChange={setDraft} errors={errors} confidence={item.confidence} />
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={save} disabled={!dirty}>Save changes</Button>
              {dirty && (
                <Button variant="ghost" onClick={() => { setDraft(draftFromItem(item)); setErrors({}); }}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Where this came from</h2>
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm font-medium text-ink">
                {SOURCE_LABEL[item.source.type]}
                {item.source.fileName ? `: ${item.source.fileName}` : ""}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-faint">Added {fmtDateTime(item.source.addedAt)}</p>
              {item.source.snippet && (
                <blockquote className="mt-3 rounded-xl bg-paper px-4 py-3 font-mono text-[13px] leading-relaxed text-ink-soft">
                  “{item.source.snippet}”
                </blockquote>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-panel p-4">
            <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Actions</h2>
            <div className="flex flex-col gap-1.5">
              {item.status === "active" ? (
                <>
                  <Button variant="secondary" className="justify-start" onClick={() => actions.complete(item)}>
                    <Check size={16} aria-hidden />
                    Mark handled
                  </Button>
                  <div className="flex items-center justify-between rounded-[10px] border border-line-strong bg-panel px-4 py-2">
                    <span className="text-sm font-medium text-ink">Snooze</span>
                    <SnoozeMenu item={item} />
                  </div>
                  <Button variant="secondary" className="justify-start" onClick={() => { actions.archive(item); }}>
                    <Archive size={16} aria-hidden />
                    Archive
                  </Button>
                </>
              ) : (
                <Button variant="secondary" className="justify-start" onClick={() => (item.status === "done" ? actions.reopen(item) : actions.restore(item))}>
                  <Check size={16} aria-hidden />
                  {item.status === "done" ? "Reopen" : "Restore"}
                </Button>
              )}
              <Button variant="danger" className="justify-start" onClick={() => setConfirmDelete(true)}>
                <Trash size={16} aria-hidden />
                Delete
              </Button>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">History</h2>
            {history.length === 0 ? (
              <p className="text-[13px] text-ink-faint">No recorded changes yet.</p>
            ) : (
              <ul className="space-y-3 border-l-2 border-line pl-4">
                {history.map((ev) => (
                  <li key={ev.id} className="text-[13px] leading-snug">
                    <p className="text-ink">{auditSentence(ev)}</p>
                    <p className="font-mono text-[11px] text-ink-faint">{fmtDateTime(ev.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this item?">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {item.title} will be removed permanently, along with its reminder. This cannot be undone.
          If you might need it later, archive it instead.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
          <Button
            variant="danger"
            onClick={() => { actions.remove(item); navigate("/app"); }}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

import { useRef, useState, type DragEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ClipboardText, FileArrowUp, ListMagnifyingGlass, PencilSimple, Trash, WarningCircle } from "@phosphor-icons/react";
import { PageHeader } from "../../components/app/PageHeader";
import { Button } from "../../components/ui/Button";
import { TextArea } from "../../components/ui/Field";
import {
  ItemForm, draftFromCandidate, draftToPatch, emptyDraft, validateDraft,
  type DraftErrors, type ItemDraft,
} from "../../components/app/ItemForm";
import { extractFromText } from "../../lib/extract";
import type { ConfidenceField, Item, SourceType } from "../../lib/types";
import { useDB, useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";
import { FREE_ITEM_LIMIT, FREE_PDF_PAGE_LIMIT, PLUS_PDF_PAGE_LIMIT, isPlus, wouldExceedFreeLimit } from "../../lib/billing";

type Tab = "upload" | "paste" | "manual";
type Phase = "input" | "reading" | "review";

interface ReviewEntry {
  draft: ItemDraft;
  confidence: Partial<Record<ConfidenceField, number>>;
  snippet: string;
  errors?: DraftErrors;
}

interface ReviewState {
  entries: ReviewEntry[];
  warnings: string[];
  sourceType: SourceType;
  fileName?: string;
}

const MAX_FILE_MB = 10;

export function AddSource() {
  const [params] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "upload";
  const [tab, setTab] = useState<Tab>(["upload", "paste", "manual"].includes(initialTab) ? initialTab : "upload");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [manualDraft, setManualDraft] = useState<ItemDraft>(() => emptyDraft());
  const [manualErrors, setManualErrors] = useState<DraftErrors>({});
  const [dragOver, setDragOver] = useState(false);
  const [readingLabel, setReadingLabel] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const { store, subscription } = useData();
  const db = useDB();
  const { toast } = useToast();
  const navigate = useNavigate();

  const plus = isPlus(subscription);
  const activeCount = db.items.length;
  const remaining = FREE_ITEM_LIMIT - activeCount;
  const atLimit = !plus && remaining <= 0;

  const runExtraction = (text: string, sourceType: SourceType, fileName?: string, extraWarnings: string[] = []) => {
    const result = extractFromText(text);
    if (result.candidates.length === 0) {
      setPhase("input");
      setError(
        result.warnings[0] ??
          "Nothing recognizable was found in that text. Try the manual form instead.",
      );
      return;
    }
    setError("");
    setReview({
      entries: result.candidates.map((c) => ({
        draft: draftFromCandidate(c),
        confidence: c.confidence,
        snippet: c.snippet,
      })),
      warnings: [...extraWarnings, ...result.warnings],
      sourceType,
      fileName,
    });
    setPhase("review");
  };

  const handleFile = async (file: File) => {
    setError("");
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is over ${MAX_FILE_MB} MB. Try a smaller document or paste the relevant text.`);
      return;
    }
    const name = file.name.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|heic)$/.test(name) || file.type.startsWith("image/")) {
      setError("Screenshots cannot be read in this local preview. Paste the text from the image, or use the manual form.");
      return;
    }
    setReadingLabel(file.name);
    setPhase("reading");
    try {
      let text: string;
      const extraWarnings: string[] = [];
      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        const { extractPdfText } = await import("../../lib/pdf");
        const pageLimit = plus ? PLUS_PDF_PAGE_LIMIT : FREE_PDF_PAGE_LIMIT;
        const result = await extractPdfText(await file.arrayBuffer(), pageLimit);
        text = result.text;
        if (result.truncated) {
          extraWarnings.push(
            plus
              ? `Only the first ${result.pagesRead} of ${result.totalPages} pages were read.`
              : `Only the first ${result.pagesRead} of ${result.totalPages} pages were read on the free plan. Upgrade to Plus to read up to ${PLUS_PDF_PAGE_LIMIT} pages.`,
          );
        }
      } else {
        text = await file.text();
      }
      runExtraction(text, "file", file.name, extraWarnings);
    } catch (err) {
      setPhase("input");
      setError(err instanceof Error ? err.message : "That file could not be read. Try pasting its text instead.");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const saveReview = () => {
    if (!review) return;
    const validated = review.entries.map((en) => ({ ...en, errors: validateDraft(en.draft) }));
    if (validated.some((en) => Object.keys(en.errors!).length > 0)) {
      setReview({ ...review, entries: validated });
      return;
    }
    const now = new Date().toISOString();
    const items: Item[] = review.entries.map((en) => ({
      id: crypto.randomUUID(),
      status: "active" as const,
      currency: en.draft.currency,
      cadence: en.draft.cadence,
      remindDaysBefore: en.draft.remindDaysBefore,
      title: en.draft.title.trim(),
      kind: en.draft.kind,
      ...draftToPatch(en.draft),
      source: { type: review.sourceType, fileName: review.fileName, snippet: en.snippet, addedAt: now },
      confidence: en.confidence,
      createdAt: now,
      updatedAt: now,
    }));
    // Client-side guard for good UX; the database trigger is the real backstop.
    if (wouldExceedFreeLimit(activeCount, items.length, plus ? "plus" : "free")) {
      toast(`Free accounts hold ${FREE_ITEM_LIMIT} items. Upgrade to Plus for unlimited.`, "error");
      navigate("/app/settings");
      return;
    }
    store.addItems(items);
    toast(items.length === 1 ? `${items[0].title} added.` : `${items.length} items added.`);
    navigate("/app");
  };

  const saveManual = () => {
    const errors = validateDraft(manualDraft);
    setManualErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (atLimit) {
      toast(`Free accounts hold ${FREE_ITEM_LIMIT} items. Upgrade to Plus for unlimited.`, "error");
      navigate("/app/settings");
      return;
    }
    const now = new Date().toISOString();
    const item: Item = {
      id: crypto.randomUUID(),
      status: "active" as const,
      currency: manualDraft.currency,
      cadence: manualDraft.cadence,
      remindDaysBefore: manualDraft.remindDaysBefore,
      title: manualDraft.title.trim(),
      kind: manualDraft.kind,
      ...draftToPatch(manualDraft),
      source: { type: "manual", addedAt: now },
      createdAt: now,
      updatedAt: now,
    };
    store.addItems([item]);
    toast(`${item.title} added.`);
    navigate("/app");
  };

  const itemCount = db.items.length;

  if (phase === "review" && review) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => { setPhase("input"); setReview(null); }}
          className="press mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden />
          Start over
        </button>
        <PageHeader
          title={review.entries.length === 1 ? "Check what was read" : `Check the ${review.entries.length} items that were read`}
          sub="Nothing saves until you confirm it. Fields the extraction was unsure about are marked."
        />
        {review.warnings.map((w) => (
          <div key={w} className="mb-4 flex items-start gap-2.5 rounded-xl border border-ember-200 bg-ember-100 px-4 py-3 text-sm text-ember-800">
            <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
            {w}
          </div>
        ))}
        <div className="space-y-6">
          {review.entries.map((en, i) => (
            <div key={i} className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
              {review.entries.length > 1 && (
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{en.draft.title || "Untitled item"}</p>
                  <button
                    type="button"
                    aria-label={`Remove ${en.draft.title || "this item"} from the list`}
                    onClick={() => setReview({ ...review, entries: review.entries.filter((_, j) => j !== i) })}
                    className="press rounded-[10px] p-2 text-ink-faint hover:bg-alert-100 hover:text-alert-700"
                  >
                    <Trash size={16} aria-hidden />
                  </button>
                </div>
              )}
              <ItemForm
                draft={en.draft}
                confidence={en.confidence}
                errors={en.errors}
                onChange={(d) => setReview({
                  ...review,
                  entries: review.entries.map((x, j) => (j === i ? { ...x, draft: d } : x)),
                })}
              />
              {en.snippet && (
                <figure className="mt-4 rounded-xl bg-paper px-4 py-3">
                  <figcaption className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Read from {review.fileName ?? "pasted text"}
                  </figcaption>
                  <blockquote className="font-mono text-[13px] leading-relaxed text-ink-soft">“{en.snippet}”</blockquote>
                </figure>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={saveReview} size="lg">
            Save {review.entries.length === 1 ? "item" : `${review.entries.length} items`}
          </Button>
          <Button variant="ghost" onClick={() => { setPhase("input"); setReview(null); }}>
            Discard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add to your list"
        sub={itemCount === 0
          ? "Start with whatever is nagging you most. One document is enough."
          : "Upload, paste, or type. Amounts and dates are detected for you to confirm."}
      />

      {!plus && (
        atLimit ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-ember-200 bg-ember-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ember-800">
              You have reached the {FREE_ITEM_LIMIT}-item free limit. Upgrade to Plus for unlimited items.
            </p>
            <Button to="/app/settings" size="sm" className="shrink-0">Upgrade to Plus</Button>
          </div>
        ) : remaining <= 5 ? (
          <p className="mb-6 text-[13px] text-ink-faint">
            {remaining} of {FREE_ITEM_LIMIT} free items remaining.{" "}
            <Link to="/app/settings" className="text-pine-700 underline hover:no-underline">Upgrade to Plus</Link> for unlimited.
          </p>
        ) : null
      )}

      <div role="tablist" aria-label="How to add" className="mb-6 inline-flex rounded-[10px] border border-line bg-panel p-1">
        {([
          { id: "upload", label: "Upload file", icon: FileArrowUp },
          { id: "paste", label: "Paste text", icon: ClipboardText },
          { id: "manual", label: "Type it in", icon: PencilSimple },
        ] as const).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setError(""); }}
            className={`press flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ${
              tab === t.id ? "bg-pine-700 text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            <t.icon size={16} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-alert-200 bg-alert-100 px-4 py-3 text-sm text-alert-800">
          <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            {error}{" "}
            <button type="button" onClick={() => { setError(""); setTab("manual"); }} className="font-medium underline hover:no-underline">
              Open the manual form
            </button>
          </div>
        </div>
      )}

      {phase === "reading" ? (
        <div className="rounded-2xl border border-line bg-panel p-8" aria-busy="true">
          <div className="flex items-center gap-3">
            <ListMagnifyingGlass size={20} className="text-pine-600" aria-hidden />
            <p className="text-[15px] font-medium text-ink">Scanning {readingLabel}…</p>
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="skeleton h-3.5 w-3/4" />
            <div className="skeleton h-3.5 w-1/2" />
            <div className="skeleton h-3.5 w-2/3" />
          </div>
        </div>
      ) : tab === "upload" ? (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
              dragOver ? "border-pine-600 bg-pine-50" : "border-line-strong bg-panel"
            }`}
          >
            <FileArrowUp size={28} className="mb-3 text-pine-700" aria-hidden />
            <p className="text-[15px] font-medium text-ink">Drop a document here</p>
            <p className="mt-1 text-sm text-ink-faint">PDF, TXT, EML, MD, or CSV, up to {MAX_FILE_MB} MB</p>
            <Button variant="secondary" className="mt-5" onClick={() => fileInput.current?.click()}>
              Choose a file
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,.eml,.csv,text/plain,application/pdf"
              className="sr-only"
              aria-label="Choose a file to upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
            Files are read on your device in this preview. Only the extracted fields and a short
            source snippet are stored, never the file itself.
          </p>
        </div>
      ) : tab === "paste" ? (
        <div className="space-y-4">
          <TextArea
            label="Paste an email, receipt, or statement"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Your Netflix membership renews on August 2 for $15.49/month…"}
            className="min-h-48"
            helper="Renewal emails, invoices, and bank-statement lines all work."
          />
          <Button
            size="lg"
            disabled={pasteText.trim().length < 8}
            onClick={() => { setPhase("reading"); setReadingLabel("pasted text"); setTimeout(() => runExtraction(pasteText, "paste"), 350); }}
          >
            <ListMagnifyingGlass size={17} aria-hidden />
            Find items
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
          <ItemForm draft={manualDraft} onChange={setManualDraft} errors={manualErrors} />
          <div className="mt-6">
            <Button size="lg" onClick={saveManual}>Save item</Button>
          </div>
        </div>
      )}
    </div>
  );
}

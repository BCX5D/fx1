import type { Candidate } from "../../lib/extract";
import type { Cadence, ConfidenceField, Item, ItemKind } from "../../lib/types";
import { CADENCE_LABEL, DEFAULT_LEAD_DAYS, KIND_LABEL } from "../../lib/types";
import { SelectInput, TextArea, TextInput } from "../ui/Field";

export interface ItemDraft {
  kind: ItemKind;
  title: string;
  vendor: string;
  amount: string;
  currency: string;
  cadence: Cadence;
  nextDue: string;
  remindDaysBefore: number;
  notes: string;
}

export function emptyDraft(defaultLead = 7): ItemDraft {
  return {
    kind: "bill", title: "", vendor: "", amount: "", currency: "USD",
    cadence: "once", nextDue: "", remindDaysBefore: defaultLead, notes: "",
  };
}

export function draftFromCandidate(c: Candidate): ItemDraft {
  return {
    kind: c.kind,
    title: c.title,
    vendor: c.vendor ?? "",
    amount: c.amount != null ? String(c.amount) : "",
    currency: c.currency,
    cadence: c.cadence,
    nextDue: c.nextDue ?? "",
    remindDaysBefore: c.remindDaysBefore,
    notes: "",
  };
}

export function draftFromItem(it: Item): ItemDraft {
  return {
    kind: it.kind,
    title: it.title,
    vendor: it.vendor ?? "",
    amount: it.amount != null ? String(it.amount) : "",
    currency: it.currency,
    cadence: it.cadence,
    nextDue: it.nextDue ?? "",
    remindDaysBefore: it.remindDaysBefore,
    notes: it.notes ?? "",
  };
}

export interface DraftErrors { title?: string; amount?: string }

export function validateDraft(d: ItemDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!d.title.trim()) errors.title = "Give this item a name.";
  if (d.amount.trim() && !Number.isFinite(Number(d.amount))) errors.amount = "Amounts are plain numbers, like 12.99.";
  return errors;
}

export function draftToPatch(d: ItemDraft): Partial<Item> {
  return {
    kind: d.kind,
    title: d.title.trim(),
    vendor: d.vendor.trim() || undefined,
    amount: d.amount.trim() ? Math.round(Number(d.amount) * 100) / 100 : undefined,
    currency: d.currency,
    cadence: d.cadence,
    nextDue: d.nextDue || undefined,
    remindDaysBefore: d.remindDaysBefore,
    notes: d.notes.trim() || undefined,
  };
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "IDR"];

interface ItemFormProps {
  draft: ItemDraft;
  onChange: (d: ItemDraft) => void;
  confidence?: Partial<Record<ConfidenceField, number>>;
  errors?: DraftErrors;
}

const NEEDS_CONFIRM = 0.7;

export function ItemForm({ draft, onChange, confidence, errors }: ItemFormProps) {
  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => onChange({ ...draft, [key]: value });
  const flagged = (f: ConfidenceField) =>
    confidence != null && confidence[f] != null && confidence[f]! < NEEDS_CONFIRM;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextInput
          label="Title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors?.title}
          flagged={flagged("title")}
          placeholder="Car insurance renewal"
        />
      </div>
      <SelectInput label="Type" value={draft.kind} flagged={flagged("kind")}
        onChange={(e) => {
          const kind = e.target.value as ItemKind;
          onChange({ ...draft, kind, remindDaysBefore: DEFAULT_LEAD_DAYS[kind] });
        }}>
        {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </SelectInput>
      <TextInput
        label="Vendor"
        value={draft.vendor}
        onChange={(e) => set("vendor", e.target.value)}
        flagged={flagged("vendor")}
        placeholder="Who is this with?"
      />
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <TextInput
          label="Amount"
          inputMode="decimal"
          value={draft.amount}
          onChange={(e) => set("amount", e.target.value)}
          error={errors?.amount}
          flagged={flagged("amount")}
          placeholder="0.00"
        />
        <SelectInput label="Currency" value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectInput>
      </div>
      <SelectInput label="Repeats" value={draft.cadence} flagged={flagged("cadence")}
        onChange={(e) => set("cadence", e.target.value as Cadence)}>
        {Object.entries(CADENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </SelectInput>
      <TextInput
        label="Next due date"
        type="date"
        value={draft.nextDue}
        onChange={(e) => set("nextDue", e.target.value)}
        flagged={flagged("nextDue")}
        helper={draft.nextDue ? undefined : "Without a date, Wirby cannot remind you."}
      />
      <TextInput
        label="Remind me (days before)"
        type="number"
        min={0}
        max={120}
        value={String(draft.remindDaysBefore)}
        onChange={(e) => set("remindDaysBefore", Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
      />
      <div className="sm:col-span-2">
        <TextArea
          label="Notes"
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything future-you should know."
        />
      </div>
    </div>
  );
}

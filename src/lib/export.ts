import type { Item } from "./types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportJSON(items: Item[]) {
  download(
    `wirby-export-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(items, null, 2),
    "application/json",
  );
}

const CSV_COLS: (keyof Item)[] = [
  "title", "kind", "vendor", "amount", "currency", "cadence", "nextDue",
  "remindDaysBefore", "status", "notes", "createdAt",
];

export function exportCSV(items: Item[]) {
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Neutralize CSV/formula injection: a field starting with =, +, -, or @
    // opens as a live formula in Excel/Sheets when the file is double-clicked.
    // Prefixing with a single quote forces it to render as plain text there,
    // while any well-formed CSV reader (including our own re-import path)
    // treats the quote as ordinary content, not a delimiter.
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    CSV_COLS.join(","),
    ...items.map((it) => CSV_COLS.map((c) => esc(it[c])).join(",")),
  ];
  download(
    `wirby-export-${new Date().toISOString().slice(0, 10)}.csv`,
    rows.join("\n"),
    "text/csv",
  );
}

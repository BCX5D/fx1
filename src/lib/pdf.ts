export interface PdfExtraction {
  text: string;
  /** True if the document had more pages than the caller's plan limit allows. */
  truncated: boolean;
  pagesRead: number;
  totalPages: number;
}

/** Lazy PDF text extraction. pdf.js is only downloaded when a PDF is actually uploaded. */
export async function extractPdfText(data: ArrayBuffer, pageLimit: number): Promise<PdfExtraction> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data }).promise;
  const maxPages = Math.min(doc.numPages, pageLimit);
  const parts: string[] = [];
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    parts.push(line);
  }
  const totalPages = doc.numPages;
  await doc.destroy();
  const text = parts.join("\n").replace(/[ \t]+/g, " ").trim();
  if (!text) {
    throw new Error(
      "This PDF has no readable text layer (it may be a scan). Paste the text instead, or add the item manually.",
    );
  }
  return { text, truncated: totalPages > maxPages, pagesRead: maxPages, totalPages };
}

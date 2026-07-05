#!/usr/bin/env node
/**
 * Pre-build safety net: fails the build if any legal page still contains an
 * unresolved "[LAUNCH-BLOCKING PLACEHOLDER: ...]" marker (legal entity name,
 * registered address, governing jurisdiction, liability cap -- values that
 * need a real decision or legal review, not a guess from this script).
 *
 * Non-blocking placeholders (marked "[PLACEHOLDER — not launch-blocking: ...]",
 * e.g. "email provider name, once one is connected") are intentionally left
 * alone: they describe optional infrastructure that isn't live yet, not a
 * legal gap, and are safe to ship as-is.
 *
 * Override (CI previews, local iteration on unrelated code) with:
 *   ALLOW_LEGAL_PLACEHOLDERS=1 npm run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const LEGAL_DIR = path.join(here, "..", "src", "routes", "legal");
const FILES = ["Privacy.tsx", "Terms.tsx", "RefundPolicy.tsx"];
const MARKER = /\[LAUNCH-BLOCKING PLACEHOLDER:[^\]]*\]/g;

if (process.env.ALLOW_LEGAL_PLACEHOLDERS === "1") {
  console.warn("[check-legal-placeholders] Skipped via ALLOW_LEGAL_PLACEHOLDERS=1.");
  process.exit(0);
}

let found = [];
for (const file of FILES) {
  const filePath = path.join(LEGAL_DIR, file);
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    continue; // file doesn't exist in this checkout; nothing to check
  }
  const matches = content.match(MARKER);
  if (matches) {
    for (const m of matches) found.push({ file, marker: m });
  }
}

if (found.length > 0) {
  console.error("\n[check-legal-placeholders] Build blocked: unresolved legal placeholders found.\n");
  for (const { file, marker } of found) {
    console.error(`  ${file}: ${marker}`);
  }
  console.error(
    "\nThese need a real decision (legal entity name, registered address,\n" +
      "governing jurisdiction, liability cap) before this can go live with real\n" +
      "users or real payments. Resolve them in src/routes/legal/, or set\n" +
      "ALLOW_LEGAL_PLACEHOLDERS=1 to build anyway for local/preview work.\n",
  );
  process.exit(1);
}

console.log("[check-legal-placeholders] OK: no unresolved legal placeholders.");

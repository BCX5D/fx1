#!/usr/bin/env node
/**
 * Regenerates public/email-logo.png from scripts/email-logo.svg.
 *
 * Why a separate PNG from og-image.png: email clients (Outlook, Gmail image
 * proxying, etc.) have poor/inconsistent SVG support and no CSS-background
 * rendering guarantees, so the send-email Edge Function's HTML template
 * references this PNG directly via a hosted <img> tag instead. Rendered at
 * 2x (880x240 physical pixels for a 440x120 logical size) so it stays crisp
 * on high-DPI phone screens without emails feeling image-heavy.
 *
 * Run this whenever the brand mark or wordmark changes.
 * Usage: node scripts/generate-email-logo.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "email-logo.svg");
const out = path.join(here, "..", "public", "email-logo.png");

await sharp(src).resize(880, 240).png().toFile(out);
console.log(`[generate-email-logo] Wrote ${out} (880x240, 2x for 440x120 logical size)`);

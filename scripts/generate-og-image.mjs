#!/usr/bin/env node
/**
 * Regenerates public/og-image.png from scripts/og-image.svg.
 * Run this whenever the brand mark, colors, or headline copy changes.
 *
 * Usage: node scripts/generate-og-image.mjs
 * (sharp is a devDependency; this is a one-off asset build, not a runtime dep)
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "og-image.svg");
const out = path.join(here, "..", "public", "og-image.png");

await sharp(src).resize(1200, 630).png().toFile(out);
console.log(`[generate-og-image] Wrote ${out} (1200x630)`);

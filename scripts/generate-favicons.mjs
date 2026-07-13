#!/usr/bin/env node
/**
 * Regenerates public/favicon-*.png, public/favicon.ico, and
 * public/apple-touch-icon.png from public/favicon.svg.
 *
 * Why: Google Search (and many older browsers/OS surfaces) don't reliably
 * index SVG-only favicons, so we need PNG/ICO fallbacks alongside the SVG
 * that index.html already links. Rendered straight from the existing brand
 * mark SVG so all sizes stay pixel-consistent with the in-app favicon.
 *
 * Run this whenever the brand mark changes.
 * Usage: node scripts/generate-favicons.mjs
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "public", "favicon.svg");
const publicDir = path.join(here, "..", "public");

const pngSizes = [16, 32, 48, 180, 192, 512];

const pngBuffers = await Promise.all(
  pngSizes.map((size) => sharp(src).resize(size, size).png().toBuffer())
);

await Promise.all(
  pngSizes.map((size, i) =>
    fs.writeFile(path.join(publicDir, `favicon-${size}.png`), pngBuffers[i])
  )
);

// apple-touch-icon.png is the conventional filename iOS looks for at the root.
await fs.writeFile(
  path.join(publicDir, "apple-touch-icon.png"),
  pngBuffers[pngSizes.indexOf(180)]
);

// favicon.ico bundles the small sizes for legacy browsers / OS chrome.
const icoSizes = [16, 32, 48];
const icoBuffer = await pngToIco(
  icoSizes.map((size) => pngBuffers[pngSizes.indexOf(size)])
);
await fs.writeFile(path.join(publicDir, "favicon.ico"), icoBuffer);

console.log(
  `[generate-favicons] Wrote favicon-{${pngSizes.join(",")}}.png, apple-touch-icon.png, and favicon.ico`
);

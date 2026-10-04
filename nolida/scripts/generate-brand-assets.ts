/**
 * scripts/generate-brand-assets.ts
 * Phase 2 — derive every brand asset from the NOlida app icon.
 *
 * Usage: npm run generate:brand
 * Source: public/branding/logo-source.jpg
 *
 * Corner treatment
 * ----------------
 * Favicons (16/32 + .ico) are masked to a rounded rectangle so the source
 * JPG's dark square corners disappear against light and dark browser chrome.
 * PWA icons (192/512) and apple-touch-icon stay fully opaque on purpose:
 * iOS composites transparency onto black and re-masks the image anyway, and
 * maskable PWA icons are expected to bleed to the edge of their safe zone.
 */

import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT: string = process.cwd();
const SOURCE: string = path.join(ROOT, "public", "branding", "logo-source.jpg");
const OUT_DIR: string = path.join(ROOT, "public", "branding");
/** Next.js serves src/app/favicon.ico at /favicon.ico. */
const ROUTER_FAVICON: string = path.join(ROOT, "src", "app", "favicon.ico");

interface AssetTarget {
  readonly fileName: string;
  readonly size: number;
  readonly rounded: boolean;
}

interface IcoImage {
  readonly size: number;
  readonly png: Uint8Array;
}

const TARGETS: readonly AssetTarget[] = [
  { fileName: "favicon-16.png", size: 16, rounded: true },
  { fileName: "favicon-32.png", size: 32, rounded: true },
  { fileName: "logo-app-icon-192.png", size: 192, rounded: false },
  { fileName: "logo-app-icon-512.png", size: 512, rounded: false },
  { fileName: "apple-touch-icon.png", size: 180, rounded: false },
];

/** Sizes embedded inside favicon.ico. */
const ICO_SIZES: readonly number[] = [16, 32, 48];

/** Radius as a fraction of the icon edge — matches the app icon's own corner. */
const CORNER_RATIO = 0.22;

function roundedMask(size: number): Buffer {
  const radius = Math.round(size * CORNER_RATIO);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#ffffff"/>` +
    `</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * Minimal ICO encoder: an ICONDIR header plus one ICONDIRENTRY per image,
 * each entry pointing at an embedded PNG (allowed since Windows Vista).
 * sharp cannot encode .ico, and this avoids pulling in a `to-ico` dependency.
 */
function buildIco(images: readonly IcoImage[]): Uint8Array {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;

  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let dataOffset = HEADER_SIZE + ENTRY_SIZE * images.length;
  const entries: Uint8Array[] = [];

  for (const image of images) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    // 0 in these bytes means 256px; our largest size is 48.
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2); // palette colours
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    entries.push(entry);
    dataOffset += image.png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => Buffer.from(i.png))]);
}

async function renderToPng(size: number, rounded: boolean): Promise<Uint8Array> {
  const pipeline = sharp(SOURCE, { failOn: "none" })
    .resize({ width: size, height: size, fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, effort: 8 });

  if (rounded) {
    pipeline.composite([{ input: roundedMask(size), blend: "dest-in" }]);
  }

  return new Uint8Array(await pipeline.toBuffer());
}

async function main(): Promise<void> {
  try {
    await access(SOURCE);
  } catch {
    console.error(
      `[generate:brand] Source image not found:\n  ${SOURCE}\n` +
        "Place the NOlida app icon there as logo-source.jpg and re-run."
    );
    process.exit(1);
  }

  const metadata = await sharp(SOURCE).metadata();
  console.log(
    `[generate:brand] source ${path.relative(ROOT, SOURCE)} ` +
      `(${metadata.width ?? "?"}x${metadata.height ?? "?"}, ${metadata.format ?? "?"})\n`
  );

  const written: { rel: string; bytes: number }[] = [];

  for (const target of TARGETS) {
    const png = await renderToPng(target.size, target.rounded);
    const filePath = path.join(OUT_DIR, target.fileName);
    await writeFile(filePath, png);
    written.push({ rel: path.relative(ROOT, filePath), bytes: png.length });
  }

  const icoImages: IcoImage[] = [];
  for (const size of ICO_SIZES) {
    icoImages.push({ size, png: await renderToPng(size, true) });
  }
  const ico = buildIco(icoImages);
  const icoPath = path.join(OUT_DIR, "favicon.ico");
  await writeFile(icoPath, ico);
  written.push({ rel: path.relative(ROOT, icoPath), bytes: ico.length });

  // Keep the App Router's automatic /favicon.ico in sync with the brand.
  await writeFile(ROUTER_FAVICON, ico);
  written.push({ rel: path.relative(ROOT, ROUTER_FAVICON), bytes: ico.length });

  const width = written.reduce((max, f) => Math.max(max, f.rel.length), 0);
  for (const file of written) {
    const kb = (file.bytes / 1024).toFixed(1).padStart(6);
    console.log(`  wrote ${file.rel.padEnd(width)}  ${kb} kB`);
  }
  console.log(`\n[generate:brand] ${written.length} files written.`);
}

main().catch((error: unknown) => {
  console.error(`[generate:brand] failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

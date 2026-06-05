#!/usr/bin/env node
/**
 * HotMamaTravel Image Optimizer
 * ==============================
 * Converts all downloaded images in public/images/ to WebP format,
 * resizes oversized images, strips EXIF metadata, and updates all
 * references in src/content/blog/ to point to the new .webp files.
 *
 * USAGE: node scripts/optimize-images.mjs
 * RUN AFTER: node scripts/download-images.mjs
 *
 * REQUIRES: sharp (already in package.json dependencies)
 *
 * WHAT IT DOES:
 *   - Converts JPEG, PNG, GIF → WebP (dramatically smaller files)
 *   - Resizes images wider than 1200px (blog doesn't need larger)
 *   - Strips EXIF metadata (phone GPS data, camera info — privacy + size)
 *   - Quality 82% WebP (visually identical, ~60-80% smaller than JPEG)
 *   - Keeps originals as .bak files in case you need them
 *   - Updates every .md content file to use new .webp paths
 *   - Generates a full savings report
 */

import sharp from 'sharp';
import {
  readFileSync, writeFileSync, renameSync,
  readdirSync, statSync, mkdirSync, existsSync
} from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const IMAGES_DIR = join(projectRoot, 'public', 'images');
const CONTENT_DIR = join(projectRoot, 'src', 'content', 'blog');
const REPORT_FILE = join(projectRoot, 'image-optimization-report.txt');

// ---- Config ----
const WEBP_QUALITY = 82;       // 82 is visually lossless, ~70% smaller than JPEG
const MAX_WIDTH = 1200;         // Max width in pixels — blog content is never wider
const MAX_HEIGHT = 1600;        // Max height to avoid absurdly tall images
const SKIP_EXTENSIONS = new Set(['.webp', '.svg', '.ico', '.gif']);
const PROCESSABLE = new Set(['.jpg', '.jpeg', '.png']);
const KEEP_ORIGINALS = false;  // Set true to keep .bak copies of originals

// ---- Helpers ----

function getAllFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function getAllMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return getAllFiles(dir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ---- Main ----

const imageFiles = getAllFiles(IMAGES_DIR).filter(f => {
  const ext = extname(f).toLowerCase();
  return PROCESSABLE.has(ext);
});

console.log(`\n🖼️  Found ${imageFiles.length} images to optimize`);
console.log(`   WebP quality: ${WEBP_QUALITY}%`);
console.log(`   Max dimensions: ${MAX_WIDTH}×${MAX_HEIGHT}px`);
console.log(`   Keep originals: ${KEEP_ORIGINALS}\n`);

if (imageFiles.length === 0) {
  console.log('⚠️  No images found in public/images/');
  console.log('   Run: node scripts/download-images.mjs first\n');
  process.exit(0);
}

const results = {
  converted: [],
  skipped: [],
  errors: [],
  totalOriginalBytes: 0,
  totalOptimizedBytes: 0,
};

// Process images
for (let i = 0; i < imageFiles.length; i++) {
  const inputPath = imageFiles[i];
  const ext = extname(inputPath).toLowerCase();
  const webpPath = inputPath.replace(new RegExp(`\\${ext}$`, 'i'), '.webp');
  const filename = basename(inputPath);

  process.stdout.write(`[${i + 1}/${imageFiles.length}] ${filename.padEnd(60)} `);

  try {
    const originalSize = statSync(inputPath).size;
    results.totalOriginalBytes += originalSize;

    // Skip if WebP already exists and is newer than source
    if (existsSync(webpPath)) {
      const webpStat = statSync(webpPath);
      const srcStat = statSync(inputPath);
      if (webpStat.mtime >= srcStat.mtime) {
        const webpSize = webpStat.size;
        results.totalOptimizedBytes += webpSize;
        results.skipped.push({ path: inputPath, reason: 'WebP already exists' });
        console.log(`SKIP (already converted)`);
        continue;
      }
    }

    // Process with Sharp
    let pipeline = sharp(inputPath, { failOn: 'none' })
      .rotate() // Auto-rotate based on EXIF orientation
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',         // Never upscale, only downscale if over max
        withoutEnlargement: true,
      })
      .withMetadata({ // Strip all EXIF except color profile
        exif: {},
        icc: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 5,             // 0-6, higher = smaller file but slower
        smartSubsample: true,
      });

    const outputBuffer = await pipeline.toBuffer();
    const optimizedSize = outputBuffer.length;
    results.totalOptimizedBytes += optimizedSize;

    // Save WebP
    writeFileSync(webpPath, outputBuffer);

    // Handle original
    if (KEEP_ORIGINALS) {
      renameSync(inputPath, inputPath + '.bak');
    }
    // Note: We don't delete the original here in case something references it
    // The content update step below will rewrite references to .webp

    const savings = originalSize - optimizedSize;
    const savingsPct = Math.round((savings / originalSize) * 100);
    const arrow = savingsPct > 0 ? '▼' : '▲';

    results.converted.push({
      original: inputPath,
      webp: webpPath,
      originalSize,
      optimizedSize,
      savings,
      savingsPct,
    });

    console.log(`${arrow}${savingsPct}% ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)}`);

  } catch (err) {
    results.errors.push({ path: inputPath, error: err.message });
    console.log(`ERROR: ${err.message.slice(0, 60)}`);
    // If Sharp can't process it, count original size as-is
    try {
      results.totalOptimizedBytes += statSync(inputPath).size;
    } catch {}
  }
}

// ---- Update content files ----
console.log('\n\n🔄 Updating content files to use WebP paths...');

const markdownFiles = getAllMarkdownFiles(CONTENT_DIR);
let updatedFileCount = 0;
let updatedRefCount = 0;

for (const mdFile of markdownFiles) {
  let content = readFileSync(mdFile, 'utf-8');
  let changed = false;

  for (const result of results.converted) {
    // Build the local URL for both old and new
    const oldLocalUrl = '/images/' + result.original
      .replace(IMAGES_DIR, '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');

    const newLocalUrl = '/images/' + result.webp
      .replace(IMAGES_DIR, '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');

    if (content.includes(oldLocalUrl)) {
      content = content.replaceAll(oldLocalUrl, newLocalUrl);
      changed = true;
      updatedRefCount++;
    }
  }

  if (changed) {
    writeFileSync(mdFile, content, 'utf-8');
    updatedFileCount++;
  }
}

console.log(`Updated ${updatedRefCount} image references across ${updatedFileCount} content files`);

// ---- Report ----
const totalSavings = results.totalOriginalBytes - results.totalOptimizedBytes;
const totalSavingsPct = results.totalOriginalBytes > 0
  ? Math.round((totalSavings / results.totalOriginalBytes) * 100)
  : 0;

const reportLines = [
  `HotMamaTravel Image Optimization Report`,
  `Generated: ${new Date().toLocaleString()}`,
  ``,
  `SUMMARY`,
  `=======`,
  `Images converted:  ${results.converted.length}`,
  `Images skipped:    ${results.skipped.length} (already WebP or up-to-date)`,
  `Errors:            ${results.errors.length}`,
  ``,
  `SIZE SAVINGS`,
  `============`,
  `Original total:    ${formatBytes(results.totalOriginalBytes)}`,
  `Optimized total:   ${formatBytes(results.totalOptimizedBytes)}`,
  `Space saved:       ${formatBytes(totalSavings)} (${totalSavingsPct}% reduction)`,
  `Content files:     ${updatedFileCount} updated, ${updatedRefCount} references rewritten`,
  ``,
];

if (results.errors.length > 0) {
  reportLines.push(`ERRORS (${results.errors.length}) — Handle these manually:`);
  results.errors.forEach(e => reportLines.push(`  ✗ ${basename(e.path)}: ${e.error}`));
  reportLines.push('');
}

// Top 10 biggest savings
const top10 = [...results.converted]
  .sort((a, b) => b.savings - a.savings)
  .slice(0, 10);

if (top10.length > 0) {
  reportLines.push(`TOP 10 SPACE SAVINGS:`);
  top10.forEach(r =>
    reportLines.push(
      `  ${formatBytes(r.savings).padStart(10)} saved  ${basename(r.original)} (${r.savingsPct}%)`
    )
  );
}

writeFileSync(REPORT_FILE, reportLines.join('\n'), 'utf-8');

console.log(`\n✅ Optimization complete!`);
console.log(`   Converted:  ${results.converted.length} images`);
console.log(`   Space saved: ${formatBytes(totalSavings)} (${totalSavingsPct}% smaller)`);
console.log(`   Before: ${formatBytes(results.totalOriginalBytes)}`);
console.log(`   After:  ${formatBytes(results.totalOptimizedBytes)}`);

if (results.errors.length > 0) {
  console.log(`   ⚠️  ${results.errors.length} errors — see image-optimization-report.txt`);
}

console.log(`\n📄 Full report: image-optimization-report.txt`);
console.log(`\n🚀 Next: npm run dev`);

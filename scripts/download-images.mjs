#!/usr/bin/env node
/**
 * HotMamaTravel Image Downloader
 * ================================
 * Downloads all images referenced in your Astro content files
 * from their original WordPress URLs (hotmamatravel.com/wp-content/uploads/...)
 * into the local public/images/ folder.
 *
 * This ensures the site is self-contained and doesn't depend on SiteGround.
 *
 * USAGE: node scripts/download-images.mjs
 *
 * REQUIRES: Node.js 18+ (uses native fetch)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const CONTENT_DIR = join(projectRoot, 'src', 'content', 'blog');
const OUTPUT_DIR = join(projectRoot, 'public', 'images');
const REPORT_FILE = join(projectRoot, 'image-download-report.txt');

// ---- Config ----
const CONCURRENT_DOWNLOADS = 4;
const DELAY_MS = 100; // polite delay between requests
const WP_BASE = 'https://hotmamatravel.com/wp-content/uploads/';

// ---- Helpers ----

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url, outputPath) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HotMamaTravel-Migration/1.0',
        'Referer': 'https://hotmamatravel.com',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    writeFileSync(outputPath, Buffer.from(buffer));
    return { success: true, size: buffer.byteLength };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getAllMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractImageUrls(content) {
  const urls = new Set();

  // Markdown image syntax: ![alt](url)
  const mdImages = content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g);
  for (const match of mdImages) urls.add(match[1]);

  // HTML img tags: <img src="url">
  const htmlImages = content.matchAll(/<img[^>]+src=["'](https?:\/\/[^"'\s>]+)["']/gi);
  for (const match of htmlImages) urls.add(match[1]);

  // Frontmatter heroImage: "https://..."
  const heroImages = content.matchAll(/heroImage:\s*["'](https?:\/\/[^"'\n]+)["']/g);
  for (const match of heroImages) urls.add(match[1]);

  return [...urls];
}

function urlToLocalPath(url) {
  // Convert https://hotmamatravel.com/wp-content/uploads/2022/06/image.jpg
  // To: public/images/2022/06/image.jpg
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.replace('/wp-content/uploads/', '').split('/');
    return {
      relativePath: pathParts.join('/'),
      localPath: join(OUTPUT_DIR, ...pathParts),
      localUrl: '/images/' + pathParts.join('/'),
    };
  } catch {
    return null;
  }
}

// ---- Main ----

console.log('🔍 Scanning content files for image URLs...\n');
mkdirSync(OUTPUT_DIR, { recursive: true });

const markdownFiles = getAllMarkdownFiles(CONTENT_DIR);
console.log(`📁 Found ${markdownFiles.length} content files`);

// Collect all unique image URLs
const allImageUrls = new Set();
const urlToFiles = new Map(); // url → [filenames that use it]

for (const file of markdownFiles) {
  const content = readFileSync(file, 'utf-8');
  const urls = extractImageUrls(content);
  const filename = basename(file);
  for (const url of urls) {
    allImageUrls.add(url);
    if (!urlToFiles.has(url)) urlToFiles.set(url, []);
    urlToFiles.get(url).push(filename);
  }
}

// Filter to only WordPress-hosted images
const wpImages = [...allImageUrls].filter(url =>
  url.includes('hotmamatravel.com/wp-content/uploads/')
);
const externalImages = [...allImageUrls].filter(url =>
  !url.includes('hotmamatravel.com/wp-content/uploads/') &&
  url.startsWith('http')
);

console.log(`🖼️  Total images found: ${allImageUrls.size}`);
console.log(`   WordPress images: ${wpImages.length}`);
console.log(`   External images:  ${externalImages.length} (skipped)`);
console.log(`\n⬇️  Downloading WordPress images...\n`);

const results = { success: [], failed: [], skipped: [] };

// Process in batches
for (let i = 0; i < wpImages.length; i += CONCURRENT_DOWNLOADS) {
  const batch = wpImages.slice(i, i + CONCURRENT_DOWNLOADS);

  await Promise.all(batch.map(async (url) => {
    const pathInfo = urlToLocalPath(url);
    if (!pathInfo) { results.skipped.push({ url, reason: 'Invalid URL' }); return; }

    const { localPath, localUrl, relativePath } = pathInfo;

    // Skip if already downloaded
    if (existsSync(localPath)) {
      results.skipped.push({ url, reason: 'Already exists' });
      process.stdout.write('.');
      return;
    }

    // Create parent directory
    const dir = join(localPath, '..');
    mkdirSync(dir, { recursive: true });

    const result = await downloadImage(url, localPath);
    if (result.success) {
      results.success.push({ url, localUrl, size: result.size });
      process.stdout.write('✓');
    } else {
      results.failed.push({ url, error: result.error });
      process.stdout.write('✗');
    }
    await sleep(DELAY_MS);
  }));

  // Progress indicator
  console.log(` ${Math.min(i + CONCURRENT_DOWNLOADS, wpImages.length)}/${wpImages.length}`);
}

// ---- Update content files with local image paths ----
console.log('\n\n🔄 Updating content files to use local image paths...');

let updatedFiles = 0;
for (const file of markdownFiles) {
  let content = readFileSync(file, 'utf-8');
  let changed = false;

  for (const { url, localUrl } of results.success) {
    if (content.includes(url)) {
      content = content.replaceAll(url, localUrl);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(file, content, 'utf-8');
    updatedFiles++;
  }
}

console.log(`Updated ${updatedFiles} content files`);

// ---- Report ----
const totalBytes = results.success.reduce((sum, r) => sum + (r.size ?? 0), 0);
const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

const reportContent = [
  `HotMamaTravel Image Download Report`,
  `Generated: ${new Date().toLocaleString()}`,
  ``,
  `SUMMARY`,
  `=======`,
  `Downloaded:  ${results.success.length} images (${totalMB} MB)`,
  `Skipped:     ${results.skipped.length} (already existed)`,
  `Failed:      ${results.failed.length}`,
  `Content files updated: ${updatedFiles}`,
  ``,
  results.failed.length > 0 ? `FAILED DOWNLOADS — Add these manually:` : `ALL DOWNLOADS SUCCEEDED 🎉`,
  ...results.failed.map(f => `  ✗ ${f.url}\n    Error: ${f.error}`),
  ``,
  `External images (not downloaded — hosted elsewhere):`,
  ...externalImages.map(url => `  → ${url}`),
].join('\n');

writeFileSync(REPORT_FILE, reportContent, 'utf-8');

console.log(`\n✅ Image download complete!`);
console.log(`   Downloaded: ${results.success.length} images (${totalMB} MB)`);
console.log(`   Failed:     ${results.failed.length}`);
if (results.failed.length > 0) {
  console.log(`   ⚠️  Check image-download-report.txt for failed downloads`);
}
console.log(`\n🚀 Next: npm run dev`);

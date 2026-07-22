#!/usr/bin/env node
/**
 * HotMamaTravel Sanity Media Uploader
 * ====================================
 * Uploads all original images from public/images/ to Sanity CMS,
 * making them fully searchable and reusable in the Sanity Studio editor.
 * Filters out duplicate resized thumbnails (e.g., -200x300.jpg).
 *
 * USAGE: node scripts/upload-images-to-sanity.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync, createReadStream } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@sanity/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const IMAGES_DIR = join(projectRoot, 'public', 'images');

// ---- Parse .env manually ----
const envPath = join(projectRoot, '.env');
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const projectId = env.PUBLIC_SANITY_PROJECT_ID || 'ogxrlxz8';
const dataset = env.PUBLIC_SANITY_DATASET || 'production';
const token = env.SANITY_WRITE_TOKEN;

if (!token) {
  console.error('ERROR: SANITY_WRITE_TOKEN is missing in your .env file!');
  process.exit(1);
}

// ---- Initialize Sanity Client ----
const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false,
  apiVersion: '2024-03-19'
});

// ---- Match extensions ----
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

// RegEx to identify WordPress thumbnail size suffixes (e.g., -200x300, -150x150)
const THUMBNAIL_REGEX = /-\d+x\d+$/i;

async function run() {
  console.log(`Starting Sanity upload from: ${IMAGES_DIR}`);
  console.log(`Project ID: ${projectId} | Dataset: ${dataset}`);

  if (!existsSync(IMAGES_DIR)) {
    console.error(`ERROR: Images directory does not exist: ${IMAGES_DIR}`);
    process.exit(1);
  }

  // 1. Gather all files
  const allEntries = readdirSync(IMAGES_DIR);
  const imagesToUpload = [];

  for (const filename of allEntries) {
    const filePath = join(IMAGES_DIR, filename);
    const stat = statSync(filePath);

    if (stat.isDirectory()) continue;

    const ext = extname(filename).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const nameWithoutExt = basename(filename, ext);

    // Filter out thumbnail duplicates (e.g. -200x300.jpg)
    if (THUMBNAIL_REGEX.test(nameWithoutExt)) {
      // Check if original exists. If so, skip this thumbnail.
      const originalNamePart = nameWithoutExt.replace(THUMBNAIL_REGEX, '');
      const potentialOriginals = [
        originalNamePart + ext,
        originalNamePart + '.jpg',
        originalNamePart + '.png',
        originalNamePart + '.jpeg'
      ];
      const originalExists = potentialOriginals.some(name => allEntries.includes(name));
      if (originalExists) {
        // Safe to skip since the full resolution file is also here
        continue;
      }
    }

    imagesToUpload.push({ filename, filePath });
  }

  console.log(`Found ${imagesToUpload.length} original images to process (after filtering thumbnails).`);

  // 2. Query existing asset filenames from Sanity to prevent duplicate uploads
  console.log('Querying existing assets from Sanity to avoid duplicates...');
  const existingAssets = await client.fetch(
    `*[_type == "sanity.imageAsset"]{ "filename": originalFilename, "label": label }`
  );

  const existingFilenames = new Set();
  existingAssets.forEach(asset => {
    if (asset.filename) existingFilenames.add(asset.filename);
    if (asset.label) existingFilenames.add(asset.label);
  });

  console.log(`Already uploaded assets in Sanity: ${existingFilenames.size}`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 3. Sequential upload
  for (let i = 0; i < imagesToUpload.length; i++) {
    const { filename, filePath } = imagesToUpload[i];
    const percent = Math.round(((i + 1) / imagesToUpload.length) * 100);

    if (existingFilenames.has(filename)) {
      console.log(`[${percent}%] [${i + 1}/${imagesToUpload.length}] Skipped (exists): ${filename}`);
      skippedCount++;
      continue;
    }

    console.log(`[${percent}%] [${i + 1}/${imagesToUpload.length}] Uploading: ${filename}...`);
    try {
      const readStream = createReadStream(filePath);
      await client.assets.upload('image', readStream, {
        filename,
        label: filename
      });
      console.log(`  ✓ Successfully uploaded: ${filename}`);
      successCount++;
      // Prevent hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      console.error(`  ✗ Error uploading ${filename}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log('Upload task complete!');
  console.log(`Successfully uploaded: ${successCount}`);
  console.log(`Skipped (already in Sanity): ${skippedCount}`);
  console.log(`Errors encountered: ${errorCount}`);
  console.log('========================================');
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

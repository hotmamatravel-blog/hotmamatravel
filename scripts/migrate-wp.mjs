#!/usr/bin/env node
/**
 * HotMamaTravel WordPress → Astro Migration Script
 * ================================================
 * Converts WordPress XML export to Astro-compatible Markdown files
 * in src/content/blog/
 *
 * USAGE:
 *   1. Export from WordPress: Admin → Tools → Export → All Content → Download
 *   2. Save as "wp-export.xml" in the project root (same folder as this script's parent)
 *   3. Run from project root: node scripts/migrate-wp.mjs
 *
 * OUTPUT:
 *   Creates .md files in src/content/blog/ — one per post
 *   Also creates a migration-report.txt with warnings and stats
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const INPUT_FILE = join(projectRoot, 'wp-export.xml');
const OUTPUT_DIR = join(projectRoot, 'src', 'content', 'blog');
const REPORT_FILE = join(projectRoot, 'migration-report.txt');

// ---- Helpers ----

function extractText(xml, tag) {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'm'));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'm'));
  return plainMatch ? plainMatch[1].trim() : '';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function cleanHtml(html) {
  if (!html) return '';

  // Strip WordPress shortcodes
  let cleaned = html
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g, '$1')
    .replace(/\[gallery[^\]]*\]/g, '\n\n<!-- Gallery removed: recreate manually -->\n\n')
    .replace(/\[\/?(vc_row|vc_column|vc_column_text|et_pb_\w+|fusion_\w+)[^\]]*\]/g, '')
    .replace(/<!--\s*more\s*-->/g, '\n\n---\n\n')
    .replace(/\[\/?\w[\w-]*[^\]]*\]/g, '') // remaining shortcodes

  // Fix encoding
    .replace(/&amp;amp;/g, '&amp;')
    .replace(/&amp;nbsp;/g, ' ')
    .replace(/&amp;lt;/g, '<')
    .replace(/&amp;gt;/g, '>')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')

  // Remove WP block editor classes
    .replace(/(<(?:p|h[1-6]|ul|ol|li|blockquote|figure|figcaption))\s+class="wp-block-[^"]*"/g, '$1')

  // Clean empty paragraphs
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

function extractFirstImage(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function extractImageAlt(html) {
  if (!html) return '';
  const match = html.match(/<img[^>]+alt=["']([^"']*)["']/i);
  return match ? match[1] : '';
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return new Date().toISOString().split('T')[0];
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function extractCategories(itemXml) {
  const cats = [];
  const regex = /<category domain="category"[^>]*><!?\[CDATA\[([^\]]+)\]\]><\/category>/g;
  let match;
  while ((match = regex.exec(itemXml)) !== null) {
    cats.push(match[1].trim());
  }
  return cats;
}

function extractTags(itemXml) {
  const tags = [];
  const regex = /<category domain="post_tag"[^>]*><!?\[CDATA\[([^\]]+)\]\]><\/category>/g;
  let match;
  while ((match = regex.exec(itemXml)) !== null) {
    tags.push(match[1].trim());
  }
  return tags;
}

// ---- Main ----

if (!existsSync(INPUT_FILE)) {
  console.error(`\n❌ ERROR: wp-export.xml not found at: ${INPUT_FILE}`);
  console.error('   Please export your WordPress content (Admin → Tools → Export → All Content)');
  console.error('   and save the file as "wp-export.xml" in your project root.\n');
  process.exit(1);
}

console.log('📖 Reading WordPress export...');
const xmlContent = readFileSync(INPUT_FILE, 'utf-8');

// Split into items
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
const items = [];
let match;
while ((match = itemRegex.exec(xmlContent)) !== null) {
  items.push(match[1]);
}

console.log(`📊 Found ${items.length} total items in export`);

mkdirSync(OUTPUT_DIR, { recursive: true });

const report = [];
let postCount = 0;
let pageCount = 0;
let skippedCount = 0;
const warnings = [];

for (const item of items) {
  const postType = extractText(item, 'wp:post_type');
  const status = extractText(item, 'wp:status');

  // Only process published posts and pages
  if (!['post', 'page'].includes(postType)) continue;
  if (!['publish', 'draft'].includes(status)) { skippedCount++; continue; }

  const title = extractText(item, 'title') || 'Untitled';
  const rawSlug = extractText(item, 'wp:post_name') || slugify(title);
  const slug = rawSlug || slugify(title);
  const pubDate = parseDate(extractText(item, 'pubDate') || extractText(item, 'wp:post_date'));
  const modDate = parseDate(extractText(item, 'wp:post_modified'));
  const rawContent = extractText(item, 'content:encoded');
  const excerpt = extractText(item, 'excerpt:encoded');
  const wpId = extractText(item, 'wp:post_id');

  const categories = extractCategories(item);
  const tags = extractTags(item);
  const primaryCategory = categories[0] || 'Family Travel';

  const heroImage = extractFirstImage(rawContent);
  const heroImageAlt = heroImage ? extractImageAlt(rawContent) : '';
  const cleanedContent = cleanHtml(rawContent);

  const isDraft = status === 'draft';

  // Build YAML frontmatter
  const frontmatter = [
    `---`,
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(excerpt || '')}`,
    `pubDate: ${pubDate}`,
    modDate && modDate !== pubDate ? `updatedDate: ${modDate}` : null,
    heroImage ? `heroImage: ${JSON.stringify(heroImage)}` : null,
    heroImage && heroImageAlt ? `heroImageAlt: ${JSON.stringify(heroImageAlt)}` : null,
    `category: ${JSON.stringify(primaryCategory)}`,
    `tags: [${[...categories, ...tags].map(t => JSON.stringify(t)).join(', ')}]`,
    isDraft ? `draft: true` : null,
    `wpId: ${wpId}`,
    `wpSlug: ${JSON.stringify(rawSlug)}`,
    `author: "Amanda Keeley-Thurman"`,
    `---`,
    ``,
    cleanedContent,
  ].filter(line => line !== null).join('\n');

  // Write file
  const filename = `${slug}.md`;
  const filepath = join(OUTPUT_DIR, filename);

  try {
    writeFileSync(filepath, frontmatter, 'utf-8');
    if (postType === 'post') postCount++;
    if (postType === 'page') pageCount++;

    // Check for potential issues
    if (cleanedContent.includes('[') && cleanedContent.includes(']')) {
      warnings.push(`⚠️  ${filename}: May contain unprocessed shortcodes — review manually`);
    }
    if (!heroImage) {
      warnings.push(`📸 ${filename}: No hero image found — consider adding one`);
    }
  } catch (err) {
    warnings.push(`❌ ${filename}: Write error — ${err.message}`);
  }
}

// Write report
const reportContent = [
  `HotMamaTravel Migration Report`,
  `Generated: ${new Date().toLocaleString()}`,
  ``,
  `SUMMARY`,
  `=======`,
  `Posts migrated:  ${postCount}`,
  `Pages migrated:  ${pageCount}`,
  `Items skipped:   ${skippedCount} (non-published, non-post types)`,
  `Total files:     ${postCount + pageCount}`,
  ``,
  `WARNINGS (${warnings.length})`,
  `=======`,
  ...warnings,
  ``,
  `NEXT STEPS`,
  `==========`,
  `1. Review files in src/content/blog/ for any remaining issues`,
  `2. Run: node scripts/download-images.mjs  (to download all WP images locally)`,
  `3. Run: npm run dev  (to preview the site)`,
  `4. Check migration-report.txt warnings above`,
].join('\n');

writeFileSync(REPORT_FILE, reportContent, 'utf-8');

console.log(`\n✅ Migration complete!`);
console.log(`   Posts:    ${postCount}`);
console.log(`   Pages:    ${pageCount}`);
console.log(`   Skipped:  ${skippedCount}`);
console.log(`   Warnings: ${warnings.length}`);
console.log(`\n📄 Full report: migration-report.txt`);
console.log(`\n🔍 Next: node scripts/download-images.mjs`);

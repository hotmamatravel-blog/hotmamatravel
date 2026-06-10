import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blogDir = join(__dirname, '..', 'src', 'content', 'blog');

// Walk directory recursively to find all .md files
function walkDir(dir, callback) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filepath = join(dir, file);
    const stat = statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (stat.isFile() && filepath.endsWith('.md')) {
      callback(filepath);
    }
  }
}

// Clean Gutenberg UGB Heading layout wrappers from content
export function cleanContent(content) {
  let cleaned = content;

  // 1. Remove opening wp-block-ugb-heading wrappers with style tags
  // Example: <div class="wp-block-ugb-heading ugb-heading ugb-fd1ebb6 ugb-main-block"><style>...</style><div class="ugb-inner-block"><div class="ugb-block-content">
  cleaned = cleaned.replace(/<div class="wp-block-ugb-heading ugb-heading ugb-[a-zA-Z0-9]+ ugb-main-block"><style>[\s\S]*?<\/style><div class="ugb-inner-block"><div class="ugb-block-content">/g, '');

  // 2. Remove the unclosed ugb-heading__bottom-line wrappers
  // Example: <div class="ugb-heading__bottom-line">
  cleaned = cleaned.replace(/<div class="ugb-heading__bottom-line">/g, '');

  // 3. Clean up any double blank lines that might have been introduced
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

// Main execution
let processedCount = 0;
let modifiedCount = 0;

console.log(`🧹 Scanning markdown files in ${blogDir} for UGB headings...`);

walkDir(blogDir, (filepath) => {
  processedCount++;
  const original = readFileSync(filepath, 'utf-8');
  const cleaned = cleanContent(original);
  
  if (original !== cleaned) {
    writeFileSync(filepath, cleaned, 'utf-8');
    modifiedCount++;
    console.log(`✅ Cleaned: ${filepath.split(/[\\/]/).pop()}`);
  }
});

console.log(`\n🎉 Scan complete!`);
console.log(`   Total files scanned:  ${processedCount}`);
console.log(`   Total files modified: ${modifiedCount}`);

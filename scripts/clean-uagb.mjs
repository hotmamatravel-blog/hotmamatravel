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

// Clean Gutenberg HTML layout wrappers from content
export function cleanContent(content) {
  let cleaned = content;

  // 1. Remove advanced headings with separator:
  cleaned = cleaned.replace(/<div class="wp-block-uagb-advanced-heading[^>]*>\s*([\s\S]*?)\s*<div class="uagb-separator"><\/div><\/div>/g, '$1');

  // 2. Remove advanced headings without separator:
  cleaned = cleaned.replace(/<div class="wp-block-uagb-advanced-heading[^>]*>\s*([\s\S]*?)\s*<\/div>/g, '$1');

  // 3. Remove opening section wrappers (which contain overlay and inner-wrap divs):
  cleaned = cleaned.replace(/<section class="wp-block-uagb-section[^>]*>\s*<div class="uagb-section__overlay"><\/div>\s*<div class="uagb-section__inner-wrap">/g, '');
  cleaned = cleaned.replace(/<section class="wp-block-uagb-section[^>]*>\s*<div class="uagb-container-inner-blocks-wrap">/g, '');

  // 4. Remove opening container wrappers (which contain inner-blocks-wrap):
  cleaned = cleaned.replace(/<div class="wp-block-uagb-container[^>]*>\s*<div class="uagb-container-inner-blocks-wrap">/g, '');
  cleaned = cleaned.replace(/<div class="wp-block-uagb-container[^>]*>/g, '');

  // 5. Remove any leftover standalone inner-wrap/overlay/separator divs:
  cleaned = cleaned.replace(/<div class="uagb-section__overlay"><\/div>/g, '');
  cleaned = cleaned.replace(/<div class="uagb-section__inner-wrap">/g, '');
  cleaned = cleaned.replace(/<div class="uagb-container-inner-blocks-wrap">/g, '');
  cleaned = cleaned.replace(/<div class="uagb-separator"><\/div>/g, '');

  // 6. Remove closing tags:
  cleaned = cleaned.replace(/<\/div>\s*<\/section>/g, '');
  cleaned = cleaned.replace(/<\/div>\s*<\/div>/g, '');
  cleaned = cleaned.replace(/<\/section>/g, '');

  // 7. Clean up any double blank lines that might have been introduced:
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

// Main execution
let processedCount = 0;
let modifiedCount = 0;

console.log(`🧹 Scanning markdown files in ${blogDir}...`);

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

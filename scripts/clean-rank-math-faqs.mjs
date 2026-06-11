import fs from 'fs';
import path from 'path';

const blogDir = './src/content/blog';

if (!fs.existsSync(blogDir)) {
  console.error(`Directory not found: ${blogDir}`);
  process.exit(1);
}

const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const rankMathRegex = /<div class="wp-block-rank-math-faq-block">([\s\S]*?)<\/div>/g;

  if (content.includes('wp-block-rank-math-faq-block')) {
    content = content.replace(rankMathRegex, (match, blockContent) => {
      let cleaned = blockContent;
      cleaned = cleaned.replace(/<div class="rank-math-faq-item">/g, '');
      cleaned = cleaned.replace(/<div class="rank-math-answer">/g, '');
      cleaned = cleaned.replace(/<\/div>/g, '');
      return cleaned;
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${file}`);
      updatedCount++;
    }
  }
}

console.log(`Done! Cleaned Rank Math FAQs in ${updatedCount} files.`);

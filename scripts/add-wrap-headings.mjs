import fs from 'fs';
import path from 'path';

const xmlPath = 'wp-export.xml';
const blogDir = './src/content/blog';

if (!fs.existsSync(xmlPath)) {
  console.error(`XML file not found at: ${xmlPath}`);
  process.exit(1);
}

if (!fs.existsSync(blogDir)) {
  console.error(`Blog directory not found at: ${blogDir}`);
  process.exit(1);
}

console.log('📖 Reading WordPress export XML...');
const xml = fs.readFileSync(xmlPath, 'utf8');

// Build a map of published posts and their "That's a Wrap!" status + succeeding text
console.log('🔍 Indexing posts in XML...');
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
const xmlPosts = new Map(); // slug -> { hasWrap: boolean, succeedingText: string|null }

function getFirstParagraphText(html) {
  let cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');
  cleanHtml = cleanHtml.replace(/<style[\s\S]*?<\/style>/g, '');
  const regex = /<(p|li|blockquote|h[2-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = regex.exec(cleanHtml)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 20) {
      return text;
    }
  }
  return null;
}

while ((match = itemRegex.exec(xml)) !== null) {
  const itemContent = match[1];
  const postType = itemContent.match(/<wp:post_type>([^]*?)<\/wp:post_type>/)?.[1];
  const status = itemContent.match(/<wp:status>([^]*?)<\/wp:status>/)?.[1];
  
  if (postType && postType.includes('post') && status && status.includes('publish')) {
    const postName = itemContent.match(/<wp:post_name><!\[CDATA\[([^]*?)\]\]><\/wp:post_name>/)?.[1] || 
                     itemContent.match(/<wp:post_name>([^]*?)<\/wp:post_name>/)?.[1];
    
    if (postName) {
      const content = itemContent.match(/<content:encoded>([^]*?)<\/content:encoded>/)?.[1] || '';
      const wrapMatch = content.match(/That['’]s a Wrap/i);
      
      if (wrapMatch) {
        const afterWrap = content.substring(wrapMatch.index + wrapMatch[0].length);
        const succeedingText = getFirstParagraphText(afterWrap);
        xmlPosts.set(postName.trim(), { hasWrap: true, succeedingText });
      } else {
        xmlPosts.set(postName.trim(), { hasWrap: false, succeedingText: null });
      }
    }
  }
}

console.log(`Indexed ${xmlPosts.size} published posts from XML.`);

const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
let cleanCount = 0;
let insertCount = 0;
let skippedCount = 0;

for (const file of files) {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const slug = file.replace(/\.md$/, '');
  
  // Skip drafts if set in frontmatter
  if (/draft:\s*true/i.test(content)) {
    continue;
  }
  
  const originalContent = content;
  
  // 1. Remove any existing "That's a Wrap!" headings (clean baseline)
  // Normalize Windows newlines first
  content = content.replace(/\r\n/g, '\n');
  content = content.replace(/\n*##\s+That['’]s\s+[Aa]\s+[Ww]rap!?\s*\n+/gi, '\n\n');
  content = content.replace(/\n{3,}/g, '\n\n'); // normalize spacing
  
  // 2. Check if we should insert the heading based on XML
  const xmlInfo = xmlPosts.get(slug);
  
  if (xmlInfo && xmlInfo.hasWrap) {
    let inserted = false;
    
    if (xmlInfo.succeedingText) {
      // Search for a match in markdown
      const cleanSearchText = xmlInfo.succeedingText.replace(/\s+/g, ' ').substring(0, 60);
      const lines = content.split('\n');
      let matchIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const lineClean = lines[i].replace(/\s+/g, ' ');
        if (lineClean.includes(cleanSearchText)) {
          matchIndex = i;
          break;
        }
      }
      
      if (matchIndex !== -1) {
        // Insert above the matching paragraph
        lines.splice(matchIndex, 0, '## That\'s a Wrap!', '');
        content = lines.join('\n');
        inserted = true;
      }
    }
    
    if (!inserted) {
      // Fallback: if succeeding text lookup failed, or succeedingText was null, try a heuristic
      const lines = content.split('\n');
      let pinItIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].toLowerCase().includes('like it? pin it!')) {
          pinItIndex = i;
          break;
        }
      }
      
      let insertAt = -1;
      if (pinItIndex !== -1) {
        // Scan upwards from pinItIndex - 1 to find where text ends/starts
        for (let i = pinItIndex - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line === '') continue;
          if (
            line.startsWith('<figure') || 
            line.startsWith('</figure>') || 
            line.startsWith('<img') || 
            line.startsWith('<iframe') ||
            line.toLowerCase().startsWith('*disclaimer') ||
            line.toLowerCase().startsWith('disclaimer')
          ) {
            continue;
          }
          if (
            line.startsWith('#') ||
            line.startsWith('-') ||
            line.startsWith('*') ||
            /^\d+\./.test(line) ||
            line.includes('(/go/') ||
            line.toLowerCase().includes('book it!') ||
            line.startsWith('<div') ||
            line.endsWith('</div>')
          ) {
            insertAt = i + 1;
            break;
          }
        }
      }
      
      if (insertAt !== -1 && insertAt < lines.length) {
        lines.splice(insertAt, 0, '## That\'s a Wrap!', '');
        content = lines.join('\n');
        inserted = true;
      } else {
        if (pinItIndex !== -1) {
          lines.splice(pinItIndex, 0, '## That\'s a Wrap!', '');
          content = lines.join('\n');
          inserted = true;
        }
      }
    }
    
    if (inserted) {
      insertCount++;
    }
  } else {
    // Post did not originally have wrap heading
    skippedCount++;
  }
  
  // Restore Windows newlines if original file had them
  if (originalContent.includes('\r\n')) {
    content = content.replace(/\n/g, '\r\n');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    cleanCount++;
  }
}

console.log(`\n🎉 Processed ${files.length} posts.`);
console.log(`   Added/aligned wrap heading in: ${insertCount} files.`);
console.log(`   Skipped/removed heading in:    ${skippedCount} files.`);
console.log(`   Modified contents of:          ${cleanCount} files.`);
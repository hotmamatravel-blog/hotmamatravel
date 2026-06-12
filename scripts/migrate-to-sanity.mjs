import fs from 'fs';
import path from 'path';
import { createClient } from '@sanity/client';

// 1. Load env variables manually from .env
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found. Please create it first.');
  process.exit(1);
}
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts[1].trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const projectId = env.PUBLIC_SANITY_PROJECT_ID;
const dataset = env.PUBLIC_SANITY_DATASET || 'production';
const token = env.SANITY_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('❌ Missing PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN in .env');
  process.exit(1);
}

// Initialize Sanity Client
const client = createClient({
  projectId,
  dataset,
  token,
  useCdn: false, // write operations should not use CDN
  apiVersion: '2026-06-11',
});

const blogDir = './src/content/blog';
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

console.log(`🚀 Starting migration of ${files.length} posts to Sanity...`);

// Helper to parse simple frontmatter
function parseMarkdown(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  
  if (!match) {
    return { frontmatter: {}, body: fileContent };
  }
  
  const yaml = match[1];
  const body = match[2];
  
  const frontmatter = {};
  yaml.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.substring(0, idx).trim();
      let val = line.substring(idx + 1).trim();
      
      // Clean quotes
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      
      // Handle array tags
      if (key === 'tags' && val.startsWith('[') && val.endsWith(']')) {
        try {
          const jsonVal = val.replace(/'/g, '"');
          frontmatter[key] = JSON.parse(jsonVal);
        } catch {
          frontmatter[key] = val.substring(1, val.length - 1).split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
        }
      } else {
        frontmatter[key] = val;
      }
    }
  });
  
  return { frontmatter, body };
}

function generateKey() {
  return Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
}

function decodeEntities(text) {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function parseInline(rawText) {
  const text = decodeEntities(rawText);
  const children = [];
  const markDefs = [];
  
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    let nextLink = text.indexOf('[', currentIndex);
    let nextBold = text.indexOf('**', currentIndex);
    let nextItalic = text.indexOf('*', currentIndex);
    
    if (nextBold !== -1 && nextItalic === nextBold) {
      nextItalic = text.indexOf('*', nextBold + 2);
    }
    
    const indices = [
      { type: 'link', index: nextLink },
      { type: 'bold', index: nextBold },
      { type: 'italic', index: nextItalic }
    ].filter(item => item.index >= currentIndex).sort((a, b) => a.index - b.index);
    
    if (indices.length === 0) {
      children.push({
        _key: generateKey(),
        _type: 'span',
        text: text.substring(currentIndex),
        marks: []
      });
      break;
    }
    
    const nextToken = indices[0];
    
    if (nextToken.index > currentIndex) {
      children.push({
        _key: generateKey(),
        _type: 'span',
        text: text.substring(currentIndex, nextToken.index),
        marks: []
      });
    }
    
    if (nextToken.type === 'link') {
      const closeBracket = text.indexOf(']', nextToken.index);
      const openParen = text.indexOf('(', closeBracket);
      const closeParen = text.indexOf(')', openParen);
      
      if (closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1) {
        const linkText = text.substring(nextToken.index + 1, closeBracket);
        const linkUrl = text.substring(openParen + 1, closeParen);
        const linkKey = 'link-' + generateKey();
        
        markDefs.push({
          _key: linkKey,
          _type: 'link',
          href: linkUrl
        });
        
        if (linkText.startsWith('**') && linkText.endsWith('**')) {
          children.push({
            _key: generateKey(),
            _type: 'span',
            text: linkText.substring(2, linkText.length - 2),
            marks: [linkKey, 'strong']
          });
        } else if (linkText.startsWith('*') && linkText.endsWith('*')) {
          children.push({
            _key: generateKey(),
            _type: 'span',
            text: linkText.substring(1, linkText.length - 1),
            marks: [linkKey, 'em']
          });
        } else {
          children.push({
            _key: generateKey(),
            _type: 'span',
            text: linkText,
            marks: [linkKey]
          });
        }
        
        currentIndex = closeParen + 1;
      } else {
        children.push({
          _key: generateKey(),
          _type: 'span',
          text: '[',
          marks: []
        });
        currentIndex = nextToken.index + 1;
      }
    } else if (nextToken.type === 'bold') {
      const closeBold = text.indexOf('**', nextToken.index + 2);
      if (closeBold !== -1) {
        const boldText = text.substring(nextToken.index + 2, closeBold);
        
        if (boldText.startsWith('[') && boldText.includes('](')) {
          const openB = boldText.indexOf('[');
          const closeB = boldText.indexOf(']');
          const openP = boldText.indexOf('(');
          const closeP = boldText.indexOf(')');
          if (closeB !== -1 && openP === closeB + 1 && closeP !== -1) {
            const linkText = boldText.substring(openB + 1, closeB);
            const linkUrl = boldText.substring(openP + 1, closeP);
            const linkKey = 'link-' + generateKey();
            
            markDefs.push({
              _key: linkKey,
              _type: 'link',
              href: linkUrl
            });
            
            children.push({
              _key: generateKey(),
              _type: 'span',
              text: linkText,
              marks: [linkKey, 'strong']
            });
          } else {
            children.push({
              _key: generateKey(),
              _type: 'span',
              text: boldText,
              marks: ['strong']
            });
          }
        } else {
          children.push({
            _key: generateKey(),
            _type: 'span',
            text: boldText,
            marks: ['strong']
          });
        }
        currentIndex = closeBold + 2;
      } else {
        children.push({
          _key: generateKey(),
          _type: 'span',
          text: '**',
          marks: []
        });
        currentIndex = nextToken.index + 2;
      }
    } else if (nextToken.type === 'italic') {
      const closeItalic = text.indexOf('*', nextToken.index + 1);
      if (closeItalic !== -1) {
        const italicText = text.substring(nextToken.index + 1, closeItalic);
        children.push({
          _key: generateKey(),
          _type: 'span',
          text: italicText,
          marks: ['em']
        });
        currentIndex = closeItalic + 1;
      } else {
        children.push({
          _key: generateKey(),
          _type: 'span',
          text: '*',
          marks: []
        });
        currentIndex = nextToken.index + 1;
      }
    }
  }
  
  return { children, markDefs };
}

function extractHtmlImage(html) {
  // Check if it has an <img ...> tag
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
  if (!imgMatch) return null;
  
  const src = imgMatch[1];
  
  // Extract alt
  const altMatch = html.match(/alt="([^"]*)"/i);
  const alt = altMatch ? altMatch[1] : '';
  
  // Extract link href if wrapped in a link
  const linkMatch = html.match(/<a[^>]+href="([^"]+)"/i);
  const href = linkMatch ? linkMatch[1] : null;
  
  // Extract caption if present (e.g. <figcaption>Text</figcaption>)
  const captionMatch = html.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
  const caption = captionMatch ? captionMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  
  return { src, alt, href, caption };
}

// Convert markdown/HTML content to Portable Text block array
function convertToPortableText(bodyText) {
  // 1. Remove table of contents blocks completely
  let cleanText = bodyText.replace(/<nav class="[^"]*table-of-contents[^"]*"[^>]*>[\s\S]*?<\/nav>/gi, '');

  // 2. Convert raw <blockquote>...</blockquote> tags to Markdown blockquotes
  cleanText = cleanText.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, p1) => {
    return '\n\n' + p1.trim().split(/\r?\n/).map(line => `> ${line.trim()}`).join('\n') + '\n\n';
  });

  const blocks = [];
  const lines = cleanText.split(/\r?\n\r?\n/);
  
  for (const block of lines) {
    const text = block.trim();
    if (!text) continue;

    // 3. Skip paragraph blocks that are disclaimers
    const lowerText = text.toLowerCase();
    const isDisclaimer = lowerText.startsWith('disclaimer:') || 
                         lowerText.startsWith('*disclaimer:') ||
                         (text.includes('participant in the Amazon Services LLC Associates Program') && text.includes('affiliate advertising program'));
    if (isDisclaimer) {
      continue;
    }
    
    // Check if it's H2 or H3 heading
    if (text.startsWith('## ')) {
      const parsed = parseInline(text.substring(3).trim());
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'h2',
        children: parsed.children,
        markDefs: parsed.markDefs
      });
      continue;
    }
    
    if (text.startsWith('### ')) {
      const parsed = parseInline(text.substring(4).trim());
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'h3',
        children: parsed.children,
        markDefs: parsed.markDefs
      });
      continue;
    }
    
    if (text.startsWith('#### ')) {
      const parsed = parseInline(text.substring(5).trim());
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'h4',
        children: parsed.children,
        markDefs: parsed.markDefs
      });
      continue;
    }

    // Check if blockquote
    if (text.startsWith('> ')) {
      const quoteText = text.replace(/^>\s*/gm, '').trim();
      const parsed = parseInline(quoteText);
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'blockquote',
        children: parsed.children,
        markDefs: parsed.markDefs
      });
      continue;
    }

    // Check if list
    if (text.startsWith('- ') || text.startsWith('* ')) {
      const listItems = text.split(/\r?\n/);
      for (const item of listItems) {
        const itemText = item.substring(2).trim();
        const parsed = parseInline(itemText);
        blocks.push({
          _key: generateKey(),
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          children: parsed.children,
          markDefs: parsed.markDefs
        });
      }
      continue;
    }
    
    // Check if it's an image markup block (e.g. <figure> or <div> containing <img)
    if ((text.startsWith('<figure') || text.startsWith('<div') || text.startsWith('<a')) && text.includes('<img')) {
      const imgInfo = extractHtmlImage(text);
      if (imgInfo) {
        blocks.push({
          _key: generateKey(),
          _type: 'localImage',
          src: imgInfo.src,
          alt: imgInfo.alt,
          caption: imgInfo.caption || '',
          href: imgInfo.href || undefined
        });
        continue;
      }
    }
    
    // Check if raw HTML element
    if (text.startsWith('<div') || text.startsWith('<figure') || text.startsWith('<iframe') || text.startsWith('<style') || text.includes('</')) {
      blocks.push({
        _key: generateKey(),
        _type: 'rawHtml',
        html: text
      });
      continue;
    }
    
    // Default text paragraph
    const parsed = parseInline(text);
    blocks.push({
      _key: generateKey(),
      _type: 'block',
      style: 'normal',
      children: parsed.children,
      markDefs: parsed.markDefs
    });
  }
  
  return blocks;
}

async function startMigration() {
  const BATCH_SIZE = 25;
  let migratedCount = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const tx = client.transaction();
    
    for (const file of batch) {
      const filePath = path.join(blogDir, file);
      const { frontmatter, body } = parseMarkdown(filePath);
      
      const slug = file.replace(/\.md$/, '');
      const docId = `post-${slug}`;
      const pubDate = frontmatter.pubDate || new Date().toISOString().split('T')[0];
      
      const doc = {
        _type: 'post',
        _id: docId,
        title: frontmatter.title || slug,
        slug: {
          _type: 'slug',
          current: slug
        },
        pubDate,
        updatedDate: frontmatter.updatedDate || null,
        description: frontmatter.description || '',
        heroImage: frontmatter.heroImage || null,
        heroImageAlt: frontmatter.heroImageAlt || '',
        category: frontmatter.category || 'Family Travel',
        tags: frontmatter.tags || [],
        draft: frontmatter.draft === 'true' || frontmatter.draft === true,
        wpId: frontmatter.wpId ? parseInt(frontmatter.wpId, 10) : null,
        wpSlug: frontmatter.wpSlug || slug,
        author: frontmatter.author || 'Amanda Keeley-Thurman',
        body: convertToPortableText(body)
      };
      
      tx.createOrReplace(doc);
    }
    
    try {
      await tx.commit();
      migratedCount += batch.length;
      console.log(`✅ Migrated batch: ${i + 1} to ${Math.min(i + BATCH_SIZE, files.length)}`);
    } catch (err) {
      console.error(`❌ Failed migrating batch starting at index ${i}:`, err.message);
    }
  }

  console.log(`\n🎉 Done! Successfully migrated ${migratedCount} posts to Sanity.`);
}

async function seedAffiliateLinks() {
  const redirectsPath = './src/data/affiliate-redirects.json';
  if (!fs.existsSync(redirectsPath)) {
    console.log('⚠️ affiliate-redirects.json not found, skipping seeder.');
    return;
  }
  
  const redirects = JSON.parse(fs.readFileSync(redirectsPath, 'utf8'));
  console.log(`🚀 Seeding ${redirects.length} affiliate redirect links to Sanity...`);
  
  const BATCH_SIZE = 100;
  let count = 0;
  
  for (let i = 0; i < redirects.length; i += BATCH_SIZE) {
    const batch = redirects.slice(i, i + BATCH_SIZE);
    const tx = client.transaction();
    
    for (const item of batch) {
      const docId = `afflink-${item.slug}`;
      tx.createOrReplace({
        _type: 'affiliateLink',
        _id: docId,
        slug: item.slug,
        destUrl: item.destUrl
      });
    }
    
    try {
      await tx.commit();
      count += batch.length;
      console.log(`✅ Seeded batch: ${i + 1} to ${Math.min(i + BATCH_SIZE, redirects.length)}`);
    } catch (err) {
      console.error(`❌ Failed seeding batch starting at index ${i}:`, err.message);
    }
  }
  console.log(`🎉 Successfully seeded ${count} affiliate links to Sanity.`);
}

async function main() {
  await seedAffiliateLinks();
  await startMigration();
}

main();


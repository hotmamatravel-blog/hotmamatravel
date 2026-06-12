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

// Convert markdown/HTML content to Portable Text block array
function convertToPortableText(bodyText) {
  const blocks = [];
  const lines = bodyText.split(/\r?\n\r?\n/);
  
  for (const block of lines) {
    const text = block.trim();
    if (!text) continue;
    
    // Check if it's H2 or H3 heading
    if (text.startsWith('## ')) {
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'h2',
        children: [{ _key: generateKey(), _type: 'span', text: text.substring(3).trim() }]
      });
      continue;
    }
    
    if (text.startsWith('### ')) {
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'h3',
        children: [{ _key: generateKey(), _type: 'span', text: text.substring(4).trim() }]
      });
      continue;
    }
    
    if (text.startsWith('#### ')) {
      blocks.push({
        _key: generateKey(),
        _type: 'block',
        style: 'h4',
        children: [{ _key: generateKey(), _type: 'span', text: text.substring(5).trim() }]
      });
      continue;
    }

    // Check if list
    if (text.startsWith('- ') || text.startsWith('* ')) {
      const listItems = text.split(/\r?\n/);
      for (const item of listItems) {
        const itemText = item.substring(2).trim();
        blocks.push({
          _key: generateKey(),
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          children: [{ _key: generateKey(), _type: 'span', text: itemText }]
        });
      }
      continue;
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
    blocks.push({
      _key: generateKey(),
      _type: 'block',
      style: 'normal',
      children: [{ _key: generateKey(), _type: 'span', text }]
    });
  }
  
  return blocks;
}

async function startMigration() {
  let migratedCount = 0;

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    const { frontmatter, body } = parseMarkdown(filePath);
    
    const slug = file.replace(/\.md$/, '');
    const docId = `post-${slug}`;
    
    // Format publish date
    const pubDate = frontmatter.pubDate || new Date().toISOString().split('T')[0];
    
    // Prepare Sanity Document
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
    
    try {
      await client.createOrReplace(doc);
      migratedCount++;
      console.log(`✅ Migrated: ${file} -> Sanity Document ID: ${docId}`);
    } catch (err) {
      console.error(`❌ Failed migrating ${file}:`, err.message);
    }
  }

  console.log(`\n🎉 Done! Successfully migrated ${migratedCount} posts to Sanity.`);
}

startMigration();
